# Experimente

Nicht Teil der Hauptsoftware, ohne Pflege und ohne Prüfung. Die Ergebnisse stehen in `docs/MESSUNGEN.md`.

| Teil | Zweck | Aufruf |
|---|---|---|
| `KONZEPT_GESTEN.md` | früherer Entwurf für Gesten und Tracking, nicht mehr verfolgt | lesen |
| `handtest/` | Hand, Gesten, Gesicht und Körper mit MediaPipe, lädt Code und Modelle aus dem Netz | `make handtest`, dann `http://127.0.0.1:5602` |
| `werkzeuge/kamera_modi.swift`, `kamera_details.swift` | Kameramodi und Eigenschaften, ohne die Kamera zu öffnen | `make kamera`, `make kamera-details` |
| `werkzeuge/kamera_takt.swift` | zählt echte Bilder vom iPhone ohne Browser | `make kamera-takt` |
| `werkzeuge/kamera_bruecke.swift` | iPhone mit 60 fps an die App, nur `127.0.0.1:5601` | `make kamera-bruecke`, App mit `?experimente` öffnen |
| `werkzeuge/guetetest_auswertung.py` | Auswertung alter Gütetest-Dateien | von Hand |

Die iPhone-Kamera erscheint in der App erst mit `?experimente`, zum Beispiel `http://127.0.0.1:5600/?experimente`.
