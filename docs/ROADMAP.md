# Mac Vision — Fahrplan

Stand 31.10.2026. Begründungen stehen in `KONZEPT.md`. Jede Etappe endet mit einer
Messung oder einer sichtbaren Funktion, nicht mit Code allein.

| Etappe | Inhalt | Fertig, wenn | Stand |
|---|---|---|---|
| E0 | Projekt, Konzept, Kameramodi | `make kamera` läuft, Konzept steht | **erledigt** |
| E1 | Livebild, Handmodell, Overlay, Machbarkeit | Analyserate mit Hand im Bild ist gemessen | als Nächstes |
| E2 | Hand, Gesicht und Körper zusammen | Tabelle: Rate und Auslastung je Kombination | offen |
| E3 | Statische Gesten in der App | Fehlauslöser in 10 min normaler Arbeit gezählt | offen |
| E4 | Wischgesten und eigene Gesten | eigene Geste mit wenigen Beispielen angelernt | offen |
| E5 | Steuerung des Mac | Freigabeliste, Not-Aus, sichtbarer Zustand laufen | offen |
| E6 | Messen, Güte, Speichern | Taktgeber-Kalibrierung intern und iPhone liegt vor | offen |
| E7 | Analysen: Tapping, Tremor, Gesicht | Vortests bestanden, Grenzen dokumentiert | offen |
| E8 | Optional: Apple Vision, Sprachmodell | Vergleich gegen MediaPipe liegt vor | offen |

## E1 im Detail

1. venv mit `/opt/homebrew/bin/python3.13` anlegen, nur nach Freigabe der Abhängigkeiten.
2. Benötigt werden voraussichtlich `mediapipe`, `fastapi`, `uvicorn`.
3. Modell mit SHA256-Prüfung nach `models/` laden.
4. Kamera öffnen und die tatsächliche Bildrate bei Tageslicht und bei wenig Licht messen.
5. Erkennung im eigenen Thread, Livebild mit Overlay auf `127.0.0.1:5600`.
6. Messen: Analysen/s **mit** Hand im Bild, ms je Durchlauf, CPU, RAM und Akku-Verbrauch.
7. Zum Vergleich dieselbe Messung in MediaPipe Web als einfache Testseite.

Ergebnisse kommen nach `docs/MESSUNGEN.md`. Hält keiner der Wege annähernd die Kamerarate,
wird die Architekturentscheidung aus `KONZEPT.md` Abschnitt 4 neu getroffen.
