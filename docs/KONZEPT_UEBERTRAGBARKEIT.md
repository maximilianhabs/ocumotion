# Ocumotion — Konzept Übertragbarkeit

Stand 31.10.2026. Der Browseransatz lässt sich auf andere Geräte übertragen, geprüft ist aber nur ein
MacBook Pro M1 mit interner Kamera. Alles andere ist Plan.

## Erledigt

- Filter, Datenmenge und Kopfgrenze rechnen in Millisekunden, nicht in Bildern. Bei 30 fps blieben die drei
  echten Läufe praktisch gleich (Abweichung höchstens 0,01).
- Kamerawunsch ist wählbar, die tatsächlich gelieferten Werte stehen unter „Ausgehandelt“.
- Bildschirmbreite ist eine Einstellung. Ein abweichendes Seitenverhältnis erzeugt eine Warnung; Ziele, die
  nicht auf den Bildschirm passen, verhindern den Start.

## Noch gerätegebunden

- Alle Bewertungsschwellen stammen von 30 fps und dieser Kamera. Sie gelten anderswo nicht automatisch.
- Die Geschwindigkeitsschwelle für Sakkaden (50 °/s) hängt vom Rauschen ab, das sich mit der Bildrate ändert.
- Die Warnung erkennt fremde Bildschirme nur am Seitenverhältnis; ein 16:10-Monitor bleibt unbemerkt.
- Die Bildschirmgröße muss von Hand eingetragen werden. Geplant ist ein Rechteck, das an eine Karte oder ein
  A4-Blatt angepasst wird. Diese Zuordnung muss nach Zoom, Bildschirmwechsel oder Drehung neu erfolgen.

## Reihenfolge

1. **MacBook plus iPhone als Kamera:** zweite geprüfte Konfiguration mit dem Gütetest. Center Stage und andere
   automatische Bildausschnitte ausschalten. Der Vergleich zeigt, was mehr Bildrate wirklich bringt. Chrome listet das iPhone nicht,
   Safari liefert nur 30 fps; 60 fps kommen über die Kamerabrücke, siehe `MESSUNGEN.md`. Sie nimmt Verbindungen nur von der eigenen Seite an
   und öffnet die Kamera nur, solange die Seite verbunden ist.
2. **Eigene Irisrand-Analyse:** Das FaceMesh-Modell arbeitet laut Google mit 256 × 256 Eingang. Mehr Kamerapixel
   kommen dort vermutlich nicht an, die eigene Analyse auf Originalpixeln kann sie nutzen.
3. **Windows und Safari:** gezielt testen. Die Bildquelle unterscheidet sich je Browser.
4. **Eigenständiges iPhone:** eigener Versuchsaufbau, denn der kleine Bildschirm erlaubt nur kleine Blickwinkel.
   Das braucht HTTPS; die Mac-Adresse per HTTP reicht nicht.
5. **Native iPhone-App:** nur wenn der Browser nachweislich Kamerazugriff oder Bildrate begrenzt oder die Vertikale am
   Mac nicht zu lösen ist. Geprüfter Vorschlag in `KONZEPT_IPHONE_MODUS.md`.

## Bewusst noch nicht

Sechs getrennte Module (`FrameSource`, `Detector`, `DisplayGeometry` und weitere) und ein automatischer
Fähigkeitstest sind sinnvoll, aber verfrüht. Mit einem einzigen Aufbau wären die Schnittstellen geraten. Sie
entstehen, wenn der zweite Aufbau zeigt, was sich tatsächlich unterscheidet. Am Ziel bleibt: Jedes Gerät zeigt
offen, welche Prüfungen bestanden sind und welche Kennwerte gesperrt bleiben.

## Quellen

- [Google Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)
- [MDN MediaStreamTrackProcessor](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor)
