// Reicht iPhone-Bilder mit 60 fps an die Testseite weiter, weil Safari und Chrome das nicht koennen.
// Bilder bleiben im Arbeitsspeicher und gehen nur ueber 127.0.0.1 an die eigene Seite. Nichts wird gespeichert.
// Die Kamera ist nur offen, solange die Seite verbunden ist. --testbild ersetzt die Kamera durch ein Kunstbild.
import AVFoundation
import Network

let PORT: NWEndpoint.Port = 5601
let ALLOWED_ORIGINS: Set<String> = ["http://127.0.0.1:5600", "http://localhost:5600"]
let WIDTH = 1280
let HEIGHT = 720
let HEADER_BYTES = 24
let TEST_IMAGE = CommandLine.arguments.contains("--testbild")

final class Bridge: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    let queue = DispatchQueue(label: "bruecke")
    var connection: NWConnection?
    var session: AVCaptureSession?
    var timer: DispatchSourceTimer?
    var inFlight = false
    var sequence: UInt32 = 0
    var dropped: UInt32 = 0

    // Nur die eigene Seite: Sonst koennte jede Webseite im Browser das Kamerabild abgreifen.
    func listen() throws {
        let socket = NWProtocolWebSocket.Options()
        socket.setClientRequestHandler(queue) { _, headers in
            let origin = headers.first { $0.name.lowercased() == "origin" }?.value ?? ""
            let accepted = ALLOWED_ORIGINS.contains(origin)
            if !accepted { print("abgelehnt: Herkunft \(origin)") }
            return NWProtocolWebSocket.Response(status: accepted ? .accept : .reject, subprotocol: nil)
        }
        let parameters = NWParameters.tcp
        parameters.defaultProtocolStack.applicationProtocols.insert(socket, at: 0)
        parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: PORT)
        parameters.allowLocalEndpointReuse = true
        let listener = try NWListener(using: parameters)
        listener.newConnectionHandler = { [weak self] connection in self?.accept(connection) }
        listener.start(queue: queue)
        print("Brücke bereit auf 127.0.0.1:\(PORT). Beenden mit ctrl-C.")
    }

    func accept(_ next: NWConnection) {
        connection?.cancel()
        finishCapture()
        connection = next
        next.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            switch state {
            case .ready:
                print("Seite verbunden")
                self.inFlight = false
                self.sequence = 0
                self.dropped = 0
                self.startCapture()
            case .failed, .cancelled:
                if self.connection === next {
                    print("Seite getrennt")
                    self.connection = nil
                    self.finishCapture()
                }
            default:
                break
            }
        }
        next.start(queue: queue)
        watch(next)
    }

    func watch(_ peer: NWConnection) {
        peer.receiveMessage { [weak self] _, _, _, error in
            if error == nil { self?.watch(peer) }
        }
    }

    func startCapture() {
        if TEST_IMAGE {
            startTestImage()
            return
        }
        let found = AVCaptureDevice.DiscoverySession(deviceTypes: [.external, .continuityCamera], mediaType: .video,
                                                     position: .unspecified).devices
        guard let device = found.first(where: { $0.modelID.hasPrefix("iPhone") }) else {
            print("kein iPhone gefunden")
            connection?.cancel()
            return
        }
        do {
            let capture = AVCaptureSession()
            capture.addInput(try AVCaptureDeviceInput(device: device))
            let output = AVCaptureVideoDataOutput()
            output.alwaysDiscardsLateVideoFrames = true
            output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
                                    kCVPixelBufferWidthKey as String: WIDTH, kCVPixelBufferHeightKey as String: HEIGHT]
            output.setSampleBufferDelegate(self, queue: queue)
            capture.addOutput(output)
            capture.startRunning()
            // Erst nach dem Start setzen, sonst stellt die Sitzung das Format zurueck.
            let format = device.formats.first { format in
                let size = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
                return size.width == 1920 && size.height == 1080
                    && format.videoSupportedFrameRateRanges.contains { $0.maxFrameRate >= 59 }
            }
            guard let format else {
                print("kein Format mit 60 fps")
                capture.stopRunning()
                connection?.cancel()
                return
            }
            try device.lockForConfiguration()
            device.activeFormat = format
            device.activeVideoMinFrameDuration = CMTime(value: 1, timescale: 60)
            device.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: 60)
            device.unlockForConfiguration()
            session = capture
            print("Kamera offen: \(device.modelID), 1920×1080 mit 60 fps, gesendet \(WIDTH)×\(HEIGHT)")
        } catch {
            print("Kamera nicht offen: \(error.localizedDescription)")
            connection?.cancel()
        }
    }

    func finishCapture() {
        timer?.cancel()
        timer = nil
        session?.stopRunning()
        session = nil
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput buffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let pixels = CMSampleBufferGetImageBuffer(buffer) else { return }
        CVPixelBufferLockBaseAddress(pixels, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixels, .readOnly) }
        guard let base = CVPixelBufferGetBaseAddress(pixels) else { return }
        send(base, rowBytes: CVPixelBufferGetBytesPerRow(pixels), width: CVPixelBufferGetWidth(pixels),
             height: CVPixelBufferGetHeight(pixels), ms: CMSampleBufferGetPresentationTimeStamp(buffer).seconds * 1000)
    }

    func send(_ base: UnsafeRawPointer, rowBytes: Int, width: Int, height: Int, ms: Double) {
        sequence &+= 1
        guard let peer = connection, !inFlight else {
            dropped &+= 1
            return
        }
        var data = Data(count: HEADER_BYTES + width * height * 4)
        data.withUnsafeMutableBytes { (bytes: UnsafeMutableRawBufferPointer) in
            bytes.storeBytes(of: ms, toByteOffset: 0, as: Double.self)
            bytes.storeBytes(of: UInt32(width), toByteOffset: 8, as: UInt32.self)
            bytes.storeBytes(of: UInt32(height), toByteOffset: 12, as: UInt32.self)
            bytes.storeBytes(of: sequence, toByteOffset: 16, as: UInt32.self)
            bytes.storeBytes(of: dropped, toByteOffset: 20, as: UInt32.self)
            let target = bytes.baseAddress!.advanced(by: HEADER_BYTES)
            for row in 0..<height {
                // BGRA nach RGBA fuer ImageData.
                let from = base.advanced(by: row * rowBytes).assumingMemoryBound(to: UInt32.self)
                let to = target.advanced(by: row * width * 4).assumingMemoryBound(to: UInt32.self)
                for column in 0..<width {
                    let pixel = from[column]
                    to[column] = (pixel & 0xFF00FF00) | ((pixel & 0xFF) << 16) | ((pixel >> 16) & 0xFF)
                }
            }
        }
        inFlight = true
        let metadata = NWProtocolWebSocket.Metadata(opcode: .binary)
        let context = NWConnection.ContentContext(identifier: "bild", metadata: [metadata])
        peer.send(content: data, contentContext: context, isComplete: true, completion: .contentProcessed { [weak self] _ in
            self?.inFlight = false
        })
    }

    func startTestImage() {
        var image = [UInt32](repeating: 0xFF44_4444, count: WIDTH * HEIGHT)
        var frame = 0
        let source = DispatchSource.makeTimerSource(queue: queue)
        source.schedule(deadline: .now(), repeating: .nanoseconds(1_000_000_000 / 60), leeway: .microseconds(500))
        source.setEventHandler { [weak self] in
            guard let self else { return }
            frame += 1
            let bar = (frame * 4) % WIDTH
            image.withUnsafeMutableBufferPointer { pixels in
                for row in 0..<HEIGHT {
                    for column in 0..<WIDTH {
                        pixels[row * WIDTH + column] = abs(column - bar) < 20 ? 0xFF99_9999 : 0xFF44_4444
                    }
                }
                self.send(UnsafeRawPointer(pixels.baseAddress!), rowBytes: WIDTH * 4, width: WIDTH, height: HEIGHT,
                          ms: Double(DispatchTime.now().uptimeNanoseconds) / 1_000_000)
            }
        }
        timer = source
        source.resume()
        print("Kunstbild läuft, \(WIDTH)×\(HEIGHT) mit 60 fps")
    }
}

setbuf(stdout, nil)
if !TEST_IMAGE {
    let answer = DispatchSemaphore(value: 0)
    var allowed = false
    AVCaptureDevice.requestAccess(for: .video) { allowed = $0; answer.signal() }
    answer.wait()
    guard allowed else {
        print("kein Kamerazugriff: Bitte im Terminal starten und erlauben.")
        exit(2)
    }
}
let bridge = Bridge()
try bridge.listen()
dispatchMain()
