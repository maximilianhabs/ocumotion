# Messungen

Laufendes Protokoll. Es bleibt die Auswertung, nie das Bildmaterial.

## 31.10.2026 — Kameramodi

Mit `make kamera`, ohne die Kamera zu öffnen.

| Kamera | Auflösung | Bildrate |
|---|---|---|
| FaceTime HD (MacBookPro17,1) | 1280×720, 640×480 | fest 30 fps |
| iPhone 17 Pro Max, Kontinuitätskamera | 640×480 bis 1920×1440 | bis 60 fps |

Das sind die vom System gemeldeten Modi. Die tatsächliche Bildrate ist noch nicht gemessen.

## 31.10.2026 — Kameraeigenschaften

Mit `make kamera-details`, ohne die Kamera zu öffnen. FaceTime HD und iPhone melden über
AVFoundation weder feste noch automatische Belichtung, Fokus oder Weißabgleich. Der
Bildwinkel steht auf 0, ist also unbekannt. Das Verhalten im laufenden Betrieb ist ungeprüft.

## 31.10.2026 — Testseite, Modelle auf leerem Bild

MediaPipe Web 1.2.0, GPU, schwarzes Bild 1280×720, Median aus 12 Durchläufen, ohne Kamera.

| Modell | Laden | Durchlauf |
|---|---|---|
| Gesture Recognizer | 8,2 s (erster Aufruf) | 9,5 ms |
| Face Landmarker | 0,9 s | 6,2 ms |
| Pose Landmarker full | 4,7 s | 10,8 ms |

**Das ist nicht die Analyserate.** Ohne Treffer läuft nur der Detektor; die maßgebliche
Zahl mit Hand im Bild steht noch aus. Laut Protokoll rechnet der Gestenklassifikator trotz
GPU-Wahl auf der CPU, die Blendshapes ebenfalls.

## 31.10.2026 — Erster Live-Test

Testseite im normalen Browser mit echter Kamera: läuft und funktioniert laut Nutzer
„prinzipiell sehr gut“. Das ist ein Eindruck, keine Messung. Analysen/s mit Hand im Bild,
Bildrate bei wenig Licht und die Seitenzuordnung der Hände sind weiter offen.

## 31.10.2026 — Prüfung der überarbeiteten Testseite

Mit künstlichem Canvas-Video statt Kamera, ohne erkennbare Hand oder Gesicht. Bestätigt sind nur
Abläufe, keine Leistungswerte: Dreifachklick ergibt einen Start, Neustart und Stopp beenden alle
Videospuren, nach dem Stopp sind die Anzeigen leer. Die Zeitbasis war dabei `mediaTime`; ob die
echte Kamera `captureTime` liefert, ist offen. Modellwechsel lief ohne Fehler.

Bei ausgeblendetem Browserfenster blieben alle Bild-Callbacks aus, auch in einem unabhängigen
Zähler, obwohl die Seite als sichtbar galt und das Testvideo weiterlief. Die Erkennung läuft also
nur, solange das Fenster dargestellt wird. Die Seite meldet das nach 1,5 s und beendet das
Messsegment. Die Regel Analyserate ÷ 4 gilt hier als vorläufige Obergrenze.

## 31.10.2026 — Bildquelle unabhängig von der Darstellung

Chromium 152, Testvideo 30 Bilder/s, Browserfenster ausgeblendet: `MediaStreamTrackProcessor`
im Hauptthread lieferte 61 Bilder in 2 s, Zeitstempel streng steigend. Im Worker ist die Klasse
nicht verfügbar. Mit echter Kamera, normalem Chrome und Safari noch ungeprüft.
