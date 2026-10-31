# Implementierungsnotiz (Codex) mit Prüfvermerk

Der Prüfvermerk stammt aus der Claude-Sitzung vom 31.10.2026. Die Notiz darunter ist
unverändert. Bei Widerspruch gilt der Vermerk, darüber `CLAUDE.md`.

## Prüfvermerk

**In der Testseite umgesetzt:** Treffer je Modell, Benennung der Präsentationsrate, getrennte
Messsegmente, tatsächliche `getSettings`, gesperrte Start/Stop-Abläufe, Löschen alter Werte,
Blinkzustand je Segment, Warmlauf von 1 s, Verwerfen nicht steigender Bildzeiten, `ended`-Ereignis.

**Offen:** Web Worker, Modulaufteilung, Horizontalkurve, synthetische Augen, lokale Modelle.

**Abweichungen von der Notiz:**

| Thema | Notiz | Entscheidung | Grund |
|---|---|---|---|
| Bildquelle | `requestVideoFrameCallback`, dann `createImageBitmap` | zuerst `MediaStreamTrackProcessor` prüfen, Notizweg als Rückfall | liefert Bilder unabhängig von der Darstellung mit eigenem Zeitstempel, siehe unten |
| Bildzeit | immer `mediaTime` | Quelle je nach Weg, in der Oberfläche sichtbar | `VideoFrame.timestamp` ist beim neuen Weg die naheliegende Bildzeit |
| Stop | beendet den Worker | Worker bleibt, nur die Sitzung wird entwertet | Modelle bleiben geladen, der Neustart dauert sonst Sekunden |

**Geprüft am 31.10.2026 in Chromium 152 mit Testvideo:** Im ausgeblendeten Browserfenster gab
`MediaStreamTrackProcessor` im Hauptthread 61 Bilder in 2 s mit streng steigenden Zeitstempeln;
`requestVideoFrameCallback` lieferte dort keine. Im Worker fehlt die Klasse, `VideoFrame` und
`OffscreenCanvas` samt WebGL2 sind dort vorhanden. Vorgesehen ist also: Bilder im Hauptthread lesen
und als `VideoFrame` in den Worker übertragen.

**Einschränkung:** Laut MDN stellen Browser `MediaStreamTrackProcessor` unterschiedlich bereit, teils nur im
Worker, teils nur im Hauptfenster. Der Rückfall über `requestVideoFrameCallback` ist also Pflicht.

**Noch nicht belegt:** MediaPipe GPU im Worker, Annahme von `VideoFrame` durch MediaPipe, Verhalten
mit echter Kamera, normales Chrome und Safari. Das klärt ein kleiner Vortest vor dem Umbau.

---

# Mac Vision – technische Übergabe

31.10.2026 · Zielort: `docs/IMPLEMENTIERUNGSNOTIZ_CODEX.md` im Repository.
Empfehlungen nach Code-Review, keine neuen Kameramessungen. `CLAUDE.md` gilt weiterhin.

## Stack und Architektur

Den Browser-Prototyp zuerst zu einem belastbaren Messplatz für horizontale Augenbewegung
ausbauen: JavaScript-ES-Module, MediaPipe Tasks Vision, Web Worker, OffscreenCanvas/Canvas 2D.
Kein Framework, Bundler oder zusätzliche Dependency nötig. Python bleibt der spätere Weg
für Hintergrundgesten. Zunächst nur Gesicht im Augenmodus rechnen, Hand/Pose abschalten.

Module unter `testseite/js/`:
- `session.js`: idle/starting/running/stopping/error, monotone sessionId, serialisierte Starts.
- `capture.js`: getUserMedia, requestVideoFrameCallback, tatsächliche getSettings/getCapabilities.
- `vision.worker.js`: besitzt MediaPipe-Instanz und Canvas, verarbeitet Bilder seriell.
- `eye.js`: Iris-ROI, Randlokalisation, Kopfbezug, Gütemerkmale.
- `metrics.js`: modellgetrennte Raten, Zeitlücken, p50/p95 der Rechenzeiten.
- `signal.js`: gültige Segmente, Kalibrierung, spätere Phasen-/Frequenzanalyse.

## Frame-Verarbeitung konkret

Hauptthread: requestVideoFrameCallback → createImageBitmap(video) → Transfer zum Worker.
Pro Worker maximal ein Bild in Arbeit; währenddessen neue Callback-Bilder überspringen
und zählen. Keine wachsende Warteschlange. Busy-Flag bereits vor dem asynchronen
Bitmap-Aufbau setzen; nach await Sitzung prüfen, veraltete Bitmaps sofort schließen.

```js
// Hauptthread → Worker; bitmap als Transferable übergeben.
{ type: 'frame', sessionId, frameId, mediaTimeMs, callbackTimeMs, bitmap }
// Worker → Hauptthread; Ergebnis nur für aktuelle Sitzung übernehmen.
{ type: 'result', sessionId, frameId, mediaTimeMs, inferenceMs, eyeMs,
  left: { xNorm, yNorm, valid, reasons, qualityFeatures },
  right: { xNorm, yNorm, valid, reasons, qualityFeatures } }
```

Bildzeit: `metadata.mediaTime * 1000`; performance.now() nur für Rechenzeit und passend
referenzierte Latenz. Medienzeit nicht direkt von der Performance-Zeit abziehen.
mediaTime ist kein garantierter Sensor-Aufnahmezeitpunkt; asynchronen Bitmap-Snapshot
nicht als garantiert exakte Zuordnung zum Callback-Frame darstellen. Doppelte/nicht
steigende Bildzeiten verwerfen, Zeitbasis beim Sitzungsneustart sauber zurücksetzen.

Worker/GPU-Unterstützung im Zielbrowser zuerst klein testen; CPU-Fallback sichtbar
markieren und separat messen. Bitmap im finally schließen. Stop entwertet sessionId,
bricht Frame-Callback ab, stoppt Tracks und beendet Worker. Kamera-/Modellfehler und
track.onended behandeln. Alte Anzeigen bei Verlust/Stop invalidieren.

## MediaPipe und Irisdetektor

- FaceLandmarker: VIDEO, numFaces=1; Blendshapes im reinen Augenmodus aus. Kopfmatrix
  nur aktivieren, wenn verwendet. CPU/GPU mit echtem Gesicht und gültigen Augenpunkten/s
  vergleichen, nicht nur auf leerem Bild. Bei numFaces=1 ist Modellglättung aktiv:
  geringe Ruhevarianz ist kein Genauigkeitsbeweis; Amplitudentreue separat prüfen.
- MediaPipe-Irispunkte als Initialisierung und Vergleichskanal behalten. Eigene
  Randanalyse unabhängig auf Originalpixeln ausführen, nicht aus Modellpunkten ableiten.
- 720p behalten, nur kleine Augen-ROIs per getImageData lesen. Im Worker gegebenenfalls
  2D-Kontext mit willReadFrequently testen. Upscaling liefert keine neue Bildinformation.
- Erst seitliche Iris-Sklera-Kanten auf mehreren Zeilen lokalisieren; Lider/Reflexe
  maskieren. Mitte aus gegenüberliegenden Randpunkten als einfache Baseline verwenden;
  dann robuste Kreis-/Ellipsenfits vergleichen. Randabdeckung und Stabilität mitprüfen:
  ein kleiner Fitfehler auf kurzem Bogen garantiert keinen korrekten Mittelpunkt.
- Augenbezogenes Koordinatensystem aus Lidwinkeln; Kopfrotation separat erfassen.
  Referenzpunkte nicht blind stärker als Iris glätten: Verzögerung erzeugt Artefakte.
  Kopfbewegung zunächst begrenzen/verwerfen statt kompliziert kompensieren.
- Zunächst Pixel und Iris-normalisierte Einheiten. Grad erst nach individueller
  Mehrpunktkalibrierung mit unabhängigen Prüfpunkten; Irisradius-Modell nur als Schätzung.
- Güte: Kontrast, Randabdeckung, Lidöffnung, Fit-Stabilität, Kopfbewegung und Zeitlücken.
  Merkmale/Ablehnungsgründe erhalten; 0–100 ist ohne Validierung keine Wahrscheinlichkeit.
  Ungültige Bilder ergeben Lücken, keine gehaltenen Werte. Blinzeln mit Randbereich
  ausschließen; lange Lücken nicht für Nystagmusauswertung interpolieren.

## Vorher Fehler der Testseite beheben

`hit` ist derzeit das ODER aller Modelle: Treffer/Gültigkeit je Modell und Auge zählen.
presentedFrames als Präsentationsrate benennen, nicht als gesicherte Sensorrate.
Warmlauf ausklammern; Modellwechsel, Neustarts und Tab-Sichtbarkeit trennen Segmente.
Verdeckten Tab im Messmodus pausieren. Tatsächliche getSettings statt Wunsch-FPS anzeigen.
Start/Stop gegen überlappende Aufrufe absichern und Sitzung auch nach await prüfen.
Alte Gesichts-/Gestenwerte löschen, Blinkzustand sitzungsbezogen zurücksetzen.
Rate/4 gemäß CLAUDE.md als vorläufige Obergrenze beibehalten; verhindert kein Aliasing
und belegt keine Amplituden- oder Geschwindigkeitstreue.

## Reihenfolge und Abnahme

1. Zeitbasis, Lebenszyklus und Statistik korrigieren; Analyse in Worker auslagern.
2. Horizontale Rohkurve mit Gültigkeit bauen; keine zusätzlichen klinischen Kennzahlen.
3. Synthetische Augen im RAM: Stillstand, Sinus, sägezahnartige Bewegung, Kopfversatz,
   Verdeckung und Kontrastwechsel. Frequenz, Richtung, Amplitude und Fehlalarme prüfen.
4. Separat reale Optik testen: 30/40/50 cm, Licht, CPU/GPU, interne/iPhone-Kamera;
   Fixation und Kopf-Störtest, Rohsignal gegen geglättetes Signal vergleichen.
5. Lomb-Scargle nur auf geeigneten gültigen Segmenten. Spektralpeak ist kein Nystagmus;
   Rucknystagmus benötigt explizite langsame/schnelle Phasen. Grad und °/s früh mit VOG
   vergleichen. OKN-Reizgeschwindigkeit ist keine Referenz für tatsächliche Augen-SPV.

Erster Meilenstein: horizontale Kurve mit sauberer Zeitbasis, Güte und Ausfallgründen,
bestandenen synthetischen Tests und Kopf-Störtest. Keine Leistungsversprechen vor Messung.
Nach Freigabe Modelle/Laufzeit lokal mit Version und SHA256 bereitstellen statt `latest`;
Messungen mit Softwarestand, Konfiguration und Kalibrierung verknüpfen.
Keine Installationen, Commits oder Pushes ohne Ansage. Keine Bilder/ROIs speichern.

Referenzen:
- https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
