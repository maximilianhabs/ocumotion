# Mac Vision — Konzept

Stand 31.10.2026. Noch ist keine Erkennung gebaut. Abschnitt 2 ist gemessen, alle
Leistungsangaben darüber hinaus sind Erwartungen, bis Etappe E1 sie bestätigt.

## 1. Ziel

Die eingebaute Kamera des MacBook Pro M1 wird zum lokalen Sensor für drei Dinge:

1. **Tracking:** Hand, Gesicht und Körper live als Landmarken.
2. **Gestensteuerung:** Gesten lösen Aktionen aus, zuerst in der App, später am Mac.
3. **Analyse:** Bewegung, Mimik und Haltung als Messung mit Gütewert, nach dem Vorbild
   des Vision Lab auf dem Beelink.

Alles läuft auf dem Gerät. Kein Bild und keine Landmarke verlässt den Mac.

**Abgrenzung zum Vision Lab:** Das Vision Lab bleibt der stationäre Messplatz (C922,
720p60, Beelink, `homeserver/services/vision-lab/`). Mac Vision ist das interaktive
Gegenstück: spontan am Arbeitsplatz, mit mehr Rechenleistung, aber schwächerer Kamera.
Beide Projekte bleiben getrennt.

## 2. Gemessene Ausgangslage

| Größe | Wert | Quelle |
|---|---|---|
| Rechner | MacBookPro17,1 (13 Zoll), M1, 4+4 Kerne, 16 GB | `system_profiler` |
| Freier Speicher | 63 GB | `df` |
| Interne Kamera | **1280×720 und 640×480, beide fest 30 fps**, Format 420v | `make kamera` |
| iPhone 17 Pro Max (Kontinuitätskamera) | bis 1920×1440, **bis 60 fps** | `make kamera` |
| MediaPipe Python | 1.2.0 mit `macosx_11_0_arm64`-Wheel (`py3-none`), Upload 27.10.2026 | PyPI |
| MediaPipe Web | `@mediapipe/tasks-vision` 1.2.0, Apache-2.0 | npm |
| Modelle Hand, Geste, Gesicht, Pose | alle per HTTP 200 erreichbar | `curl -I` |
| Vision Lab zum Vergleich | MediaPipe 1.0.1, Python 3.11 | `requirements.txt`, `Dockerfile` |

Nicht bekannt: die tatsächliche Bildrate bei wenig Licht, die Analyserate mit Hand im
Bild und die Frage, ob MediaPipe in Python auf dem Mac die GPU nutzt.

## 3. Was sich gegenüber dem Vision Lab ändert

| Thema | Vision Lab | Mac Vision |
|---|---|---|
| Engpass | Rechenleistung (N150, vier Kerne, keine GPU) | **Kamera** (30 fps, 720p, Weitwinkel) |
| Modelle | immer nur eines gleichzeitig | vermutlich mehrere, in E2 zu messen |
| Messgrenze | 5,0 Hz bei 20,1 Analysen/s | höchstens **7,5 Hz** bei 30 fps intern, höchstens 15 Hz mit iPhone |
| Betrieb | Dienst im Docker-Container | Prozess im Vordergrund, nur bei Bedarf |
| Kamera | feste Position, frei wählbar | im Deckel: Winkel und Bildausschnitt ändern sich |

Die Messgrenze folgt der Kalibrierung vom 29.08.: belastbar ist nur, was unter einem
Viertel der Analyserate liegt. Die Regel gilt hier zunächst als Annahme und wird in E6
gegen den Taktgeber neu geprüft.

## 4. Architekturentscheidung

**Entscheidung: Python-Prozess mit MediaPipe als Erkennung, Web-Oberfläche auf
`127.0.0.1:5600` zur Anzeige.** Die Erkennung sitzt hinter einer schmalen
`Detector`-Schnittstelle, damit ein zweites Backend ohne Umbau dazukommen kann.

| Weg | Stärken | Schwächen | Urteil |
|---|---|---|---|
| **Python + MediaPipe** | gleiche Modelle wie im Vision Lab, dessen Module sind nutzbar, läuft im Hintergrund weiter | GPU-Nutzung ungeklärt, Kamerafreigabe hängt am startenden Programm | **gewählt** |
| Browser + MediaPipe Web | keine Installation, GPU über den Browser, Overlay fast geschenkt | Browser drosseln verdeckte Tabs; Gesten sollen aber gerade wirken, während eine andere App vorne ist | als Vergleich in E1, nicht als Grundlage |
| Swift + Apple Vision | Apple-Hardware optimal genutzt, sparsam | Neubau in anderer Sprache, nichts aus dem Vision Lab nutzbar, andere Landmarken | optionales zweites Backend (E8) |

Den Ausschlag geben zwei Gründe. Die Gestensteuerung muss weiterlaufen, wenn die App
nicht vorne ist, und die Analyse soll Bewegungs-, Güte- und Speichermodule aus dem
Vision Lab weiterverwenden. Sollte E1 zeigen, dass Python die Kamerarate nicht hält,
wird diese Entscheidung neu getroffen.

## 5. Pipeline

```text
Kamera (AVFoundation über OpenCV)
  │  nur das jeweils neueste Bild, im RAM
  ▼
Detector (eigener Thread, zieht die Kamera nicht herunter)
  │  Landmarken mit echtem Zeitstempel
  ├──► Overlay und Livebild      → Web-Oberfläche
  ├──► Gesten-Zustandsautomat    → Ereignisse → Aktionen
  └──► Bewegung, Güte, Speicher  → SQLite in data/
```

Zeitstempel kommen vom Bild, nicht vom Analysezeitpunkt. Die Auswertung rechnet auf den
echten Zeitpunkten (Lomb-Scargle wie in `tools/frequenzanalyse.py`), nicht auf einem
angenommenen festen Raster.

## 6. Modelle

Alle Modelle laufen lokal. Größen stammen aus dem Fahrplan des Vision Lab.

| Modell | Größe | Liefert | Einsatz |
|---|---|---|---|
| Hand Landmarker | 7,8 MB | 21 Punkte je Hand | Gesten, Tapping, Tremor |
| Gesture Recognizer | 8,4 MB | sieben Standardgesten plus Handpunkte | schneller Einstieg in E3 |
| Face Landmarker | 3,8 MB | 478 Punkte, 52 Blendshapes | Blick, Lidschlag, Asymmetrie |
| Pose Landmarker lite/full | 5,8 / 9,4 MB | 33 Punkte | Haltung, Oberkörper |

Eigene Gesten brauchen kein neues Bildmodell: Ein kleiner Klassifikator auf normierten
Handpunkten genügt und lässt sich mit wenigen Beispielen lokal anlernen. Ein lokales
Sprachmodell über Ollama ist nur als spätere Ergänzung vorgesehen. Es formuliert
Befunde aus Kennwerten, die Messung selbst übernimmt es nie.

## 7. Gestensteuerung

Das Hauptrisiko sind Fehlauslöser: Wer vor dem Rechner gestikuliert, redet oder sich
am Kinn kratzt, darf nichts auslösen. Daher gelten diese Regeln von Anfang an:

- **Scharfschalten:** Aktionen wirken nur nach einer eigenen Aktivierungsgeste und
  fallen nach kurzer Zeit ohne Eingabe von selbst zurück in den Ruhezustand.
- **Haltezeit und Hysterese:** Eine Geste zählt erst, wenn sie stabil gehalten wird.
  Ein- und Ausschaltschwelle liegen auseinander, sonst flackert der Zustand.
- **Sperrzeit:** Nach jeder Aktion folgt eine Pause, damit sie nicht mehrfach feuert.
- **Bezug auf die Person:** Schwellen werden auf die Handgröße normiert, damit der
  Abstand zur Kamera keine Rolle spielt.
- **Sichtbarer Zustand:** Ruhe, scharf und ausgelöst sind jederzeit zu erkennen.
- **Freigabeliste:** Es gibt nur fest eingetragene, harmlose Aktionen. Nichts, was
  löscht, sendet oder bestätigt, ist per Geste erreichbar.
- **Not-Aus:** Eine Tastenkombination beendet die Steuerung sofort.

Erster Aktionssatz: Wiedergabe/Pause, Lautstärke, Vor/Zurück, Fenster oder Schreibtisch
wechseln. Aktionen am System brauchen unter macOS die Bedienungshilfen-Freigabe. Sie
kommen deshalb erst in E5, nachdem die Fehlauslöserate in der App gemessen wurde.

## 8. Analyse: was diese Kamera kann

Die Tabelle gilt nur, wenn die Analyse die volle Kamerarate hält. Sie ist die
Obergrenze, kein Versprechen.

| Vorgang | Frequenz | Intern (bis 7,5 Hz) | iPhone 60 fps (bis 15 Hz) |
|---|---|---|---|
| Blinzelrate, Mimikwechsel, Hypomimie | unter 1 Hz | ja | ja |
| Gesichtsasymmetrie | statisch | ja, Modelldämpfung erst prüfen | ja, dito |
| Finger-Tapping | etwa 2–5 Hz | ja | ja |
| Parkinson-Ruhetremor | 4–6 Hz | ja, zu kalibrieren | ja |
| Essenzieller Tremor | bis 12 Hz | nur unterer Bereich | ja, zu kalibrieren |
| Silbenrate der Sprache | 4–7 Hz | grenzwertig | ja, zu kalibrieren |
| Orthostatischer Tremor | 13–18 Hz | nein | nur unterer Rand |
| Lidschluss-Kinematik | 20–30 Hz | nein | nein |

**Ganganalyse:** Mit dem MacBook auf dem Tisch nur eingeschränkt sinnvoll, denn die
Person läuft auf die Kamera zu, der Bildwinkel ist fest und der Abstand im Raum klein.
Dafür bleibt das Vision Lab der richtige Ort. Hier sind Oberkörper, Haltung und
Sitz-Steh-Abläufe realistisch.

**Weiter ausgeschlossen:** Emotionserkennung. Wie im Vision Lab gibt es Bewegungs- und
Asymmetrie-Kennwerte, keine Aussage über Gefühle und keine Diagnose.

## 9. Übernahme aus dem Vision Lab

Module werden bei Bedarf kopiert und angepasst, kein gemeinsames Paket.

| Quelle in `services/vision-lab/` | Verwendung | Etappe |
|---|---|---|
| `app/tracking.py` | Erkennung im eigenen Thread | E1 |
| `app/overlays.py` | Zeichnen der Landmarken | E1 |
| `app/motion.py` | Amplitude, Frequenz, aktiv/ruhig | E6 |
| `app/quality.py` | Gütewert 0–100, Gewichte neu prüfen | E6 |
| `app/storage.py` | SQLite, benannte Messungen | E6 |
| `tools/frequenzanalyse.py` | Lomb-Scargle-Auswertung | E6 |
| `KONZEPT-gesicht.md` | Asymmetrie-Vortest, Lidschlag | E7 |

## 10. Datenschutz

- **Kein Bild auf Platte.** Frames liegen nur im RAM und werden überschrieben. Auch
  Kontroll-Schnappschüsse werden am Sitzungsende gelöscht.
- **Kamera nur bei Bedarf.** Sie ist nur offen, solange Tracking läuft.
- **Nur `127.0.0.1`.** Die Oberfläche ist nie im Netz erreichbar.
- **Landmarken sind personenbezogen.** Sie werden nur nach ausdrücklichem Start als
  benannte Messung gespeichert, sind sichtbar aufgelistet und einzeln löschbar.
- **Keine Gesichtserkennung als Identität.** Weitere Personen im Bild werden nicht
  zugeordnet oder gespeichert.

## 11. Offene Fragen und Fallen

| Frage | Klärung |
|---|---|
| Hält Python 30 Analysen/s mit Hand im Bild? | E1, **mit** Hand messen; im Vision Lab halbierte sich die Rate |
| Nutzt MediaPipe in Python auf dem Mac die GPU? | E1, Rate und Auslastung vergleichen |
| Sinkt die Bildrate bei wenig Licht unter 30 fps? | E1, trotz fest gemeldeter 30 fps tatsächlich messen |
| Wem gehört die Kamerafreigabe, wenn die Claude-App startet? | E1, sonst aus dem Terminal starten |
| Werden links und rechts vertauscht? | E1, MediaPipe erwartet gespiegelte Bilder |
| Passt `opencv-contrib-python` aus den MediaPipe-Abhängigkeiten zu unserem Aufbau? | E1, beim Einrichten |
| Läuft das erst vier Tage alte MediaPipe 1.2.0 stabil? | E1, sonst 1.0.1 wie im Vision Lab |
| Wie stabil läuft das iPhone als Messkamera? | E6, gegen den Taktgeber |
