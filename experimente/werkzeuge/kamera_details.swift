// Liest die fuer Augenmessung wichtigen Kameraeigenschaften aus.
// Oeffnet keine Session: kein Bild, keine Kamerafreigabe, die Kamera-LED bleibt aus.
// Aufruf: make kamera-details
import AVFoundation

let discovery = AVCaptureDevice.DiscoverySession(
    deviceTypes: [.builtInWideAngleCamera, .external, .continuityCamera],
    mediaType: .video,
    position: .unspecified
)

func yesNo(_ value: Bool) -> String { value ? "ja" : "nein" }

for device in discovery.devices {
    print("== \(device.localizedName)")
    print("Belichtung fest: \(yesNo(device.isExposureModeSupported(.locked)))")
    print("Belichtung auto: \(yesNo(device.isExposureModeSupported(.continuousAutoExposure)))")
    print("Fokus fest: \(yesNo(device.isFocusModeSupported(.locked)))")
    print("Fokus auto: \(yesNo(device.isFocusModeSupported(.continuousAutoFocus)))")
    print("Weissabgleich fest: \(yesNo(device.isWhiteBalanceModeSupported(.locked)))")
    print("Aktuelles Format: \(device.activeFormat.formatDescription.dimensions)")
    print("Minimale Bilddauer: \(device.activeVideoMinFrameDuration.seconds) s")
    for format in device.formats {
        // Unter macOS nicht als Swift-Eigenschaft nutzbar, daher ueber KVC.
        let fieldOfView = (format as NSObject).value(forKey: "videoFieldOfView") ?? "unbekannt"
        print("\(format.formatDescription.dimensions) Bildwinkel: \(fieldOfView)")
    }
}
