// Zaehlt, wie viele Bilder das iPhone dem Mac wirklich liefert, ohne Browser. Speichert keine Bilder.
// Das Format wird nach dem Start gesetzt und zurueckgelesen, weil die Sitzung es sonst zuruecksetzen kann.
import AVFoundation

final class Counter: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    var times: [Double] = []
    func captureOutput(_ output: AVCaptureOutput, didOutput buffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        times.append(CMSampleBufferGetPresentationTimeStamp(buffer).seconds)
    }
}

func report(_ label: String, _ device: AVCaptureDevice, _ times: [Double]) {
    let size = CMVideoFormatDescriptionGetDimensions(device.activeFormat.formatDescription)
    let ranges = device.activeFormat.videoSupportedFrameRateRanges.map { "\($0.minFrameRate)-\($0.maxFrameRate)" }.joined(separator: ", ")
    let minimum = device.activeVideoMinFrameDuration.seconds
    print("\(label): aktiv \(size.width)x\(size.height), Format \(ranges) fps, kuerzester Bildabstand \(String(format: "%.1f", minimum * 1000)) ms")
    guard times.count > 2, let first = times.first, let last = times.last, last > first else {
        print("  zu wenige Bilder: \(times.count)")
        return
    }
    let steps = zip(times.dropFirst(), times).map { ($0 - $1) * 1000 }.sorted()
    let rate = Double(times.count - 1) / (last - first)
    print("  Bilder \(times.count), Rate \(String(format: "%.1f", rate)), Abstand P5/Median/P95 "
        + String(format: "%.1f / %.1f / %.1f ms, max %.0f ms", steps[steps.count / 20], steps[steps.count / 2], steps[steps.count * 19 / 20], steps.last!))
}

let found = AVCaptureDevice.DiscoverySession(deviceTypes: [.external, .continuityCamera], mediaType: .video, position: .unspecified).devices
guard let device = found.first(where: { $0.modelID.hasPrefix("iPhone") }) else {
    print("kein iPhone gefunden")
    exit(1)
}
let answer = DispatchSemaphore(value: 0)
var allowed = false
AVCaptureDevice.requestAccess(for: .video) { allowed = $0; answer.signal() }
answer.wait()
guard allowed else {
    print("kein Kamerazugriff")
    exit(2)
}

let session = AVCaptureSession()
session.addInput(try AVCaptureDeviceInput(device: device))
let output = AVCaptureVideoDataOutput()
let counter = Counter()
let queue = DispatchQueue(label: "bilder")
output.setSampleBufferDelegate(counter, queue: queue)
session.addOutput(output)
session.startRunning()

for (width, height) in [(1920, 1080), (1280, 720)] {
    let format = device.formats.first { format in
        let size = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
        return Int(size.width) == width && Int(size.height) == height
            && format.videoSupportedFrameRateRanges.contains { $0.maxFrameRate >= 59 }
    }
    guard let format else {
        print("\(width)x\(height): kein Format mit 60 fps")
        continue
    }
    try device.lockForConfiguration()
    device.activeFormat = format
    device.activeVideoMinFrameDuration = CMTime(value: 1, timescale: 60)
    device.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: 60)
    device.unlockForConfiguration()
    Thread.sleep(forTimeInterval: 2)
    queue.sync { counter.times = [] }
    Thread.sleep(forTimeInterval: 4)
    report("\(width)x\(height) mit 60 fps verlangt", device, queue.sync { counter.times })
}
session.stopRunning()
