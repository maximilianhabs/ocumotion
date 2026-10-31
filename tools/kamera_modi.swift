// Listet alle Kameramodi auf, die macOS anbietet.
// Oeffnet keine Session: kein Bild, keine Kamerafreigabe, die Kamera-LED bleibt aus.
// Aufruf: make kamera
import AVFoundation
import CoreMedia

let discovery = AVCaptureDevice.DiscoverySession(
    deviceTypes: [.builtInWideAngleCamera, .external, .continuityCamera],
    mediaType: .video,
    position: .unspecified
)

func fourCC(_ code: FourCharCode) -> String {
    let bytes = [24, 16, 8, 0].map { UInt8((code >> $0) & 0xff) }
    return String(bytes: bytes, encoding: .ascii) ?? "?"
}

if discovery.devices.isEmpty {
    print("Keine Kamera gefunden.")
}

for device in discovery.devices {
    print("== \(device.localizedName) | \(device.modelID)")
    for format in device.formats {
        let description = format.formatDescription
        let size = CMVideoFormatDescriptionGetDimensions(description)
        let rates = format.videoSupportedFrameRateRanges
            .map { String(format: "%.1f-%.1f", $0.minFrameRate, $0.maxFrameRate) }
            .joined(separator: ", ")
        let code = fourCC(CMFormatDescriptionGetMediaSubType(description))
        print("\(size.width)x\(size.height) \(code) fps \(rates)")
    }
}
