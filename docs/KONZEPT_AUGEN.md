# Mac Vision — Konzept Augen, Blickrichtung, Nystagmus

Stand 31.10.2026. Nichts davon ist gebaut oder am Auge gemessen. Kameradaten aus
Abschnitt 1 sind ausgelesen, alle Winkel und Rauschwerte sind Rechnungen unter genannten
Annahmen. Grundlage ist `KONZEPT-okulomotorik.md` im Vision Lab, angepasst an diese Kamera.

## Kurzantwort

| Frage | Einschätzung |
|---|---|
| Augen im Bild finden | ja, liefert der Face Landmarker schon |
| Blick links, Mitte, rechts | sehr wahrscheinlich ja |
| Mittelpunkt der **Iris** | ja, das ist die eigentliche Messgröße |
| Mittelpunkt der **Pupille** direkt | nur bei hellen Augen, bei dunklen vermutlich nicht |
| Deutlicher Nystagmus: Richtung und Frequenz | plausibel bis etwa 7,5 Hz, Nachweis steht aus |
| Feiner Nystagmus unter etwa 2° | vermutlich nicht |
| Pupillometrie, Torsion, schnelle Phase | nein |

**Entscheidung:** Gemessen wird die Irismitte relativ zum Kopf. Sie ersetzt die
Pupillenmitte, weil beide nah beieinander liegen und der Rand zwischen Iris und weißer
Lederhaut bei jeder Augenfarbe sichtbar ist.

## 1. Was die Kamera vorgibt

| Eigenschaft | Wert | Folge |
|---|---|---|
| Modi | 1280×720 und 640×480, fest 30 fps | nur 720p kommt infrage |
| Bildabstand | 33,3 ms | Grenze 7,5 Hz nach der Regel Analyserate ÷ 4 |
| Belichtung, Fokus, Weißabgleich | System meldet keine Steuerung | Belichtung kann springen, jedes Bild braucht eine Helligkeitsprüfung |
| Bildwinkel | System meldet 0, also unbekannt | muss mit Lineal gemessen werden |
| Infrarot | nicht nutzbar, vermutlich Sperrfilter (ungeprüft) | Pupille kann nicht wie in der klinischen VOG freigestellt werden |
| Bildschirm | 28,6 × 17,9 cm | dient zugleich als Reizgeber und Lichtquelle |

Die Einstellmöglichkeiten stammen von AVFoundation und sollten zusätzlich im Browser mit
`getCapabilities()` geprüft werden. Bewegungsunschärfe, Bildkompression und Rolling Shutter
dieser Kamera sind unbekannt.

## 2. Auflösung

Annahmen: Bildwinkel horizontal 55–70° (geschätzt), Iris 11,7 mm, Pupille 3 mm,
Drehradius 12 mm. Daraus folgen 0,209 mm je Grad Augendrehung.

| Abstand | Iris | Pupille | Grad je Bildpunkt | Rauschen bei 0,3–0,5 px |
|---|---|---|---|---|
| 30 cm | 36–48 px | 9–12 px | 1,2–1,6 | 0,35–0,8° |
| 40 cm | 27–36 px | 7–9 px | 1,6–2,1 | 0,5–1,0° |
| 50 cm | 21–29 px | 6–7 px | 1,9–2,6 | 0,6–1,3° |

**Arbeitsabstand 30 cm**, sofern die fest eingestellte Schärfe das zulässt; das ist
ungeprüft. Bei 40 cm wird der Abstand zur klinischen Genauigkeit von etwa 0,5° deutlich.
Die Annahme 0,3–0,5 px ist vorsichtiger als im Vision Lab, weil dieses Bild stärker
verarbeitet sein dürfte.

**Der Irisdurchmesser ist das Lineal.** Er wird in jedem Bild mitgemessen und ergibt mm je
Bildpunkt ohne bekannten Abstand oder Bildwinkel. Der Fehler durch die individuelle
Irisgröße bleibt einige Prozent und betrifft nur den Maßstab, nicht Frequenz oder Richtung.

## 3. Zeit: was 30 Hz hergibt

| Größe | Bereich | Bei 30 Hz |
|---|---|---|
| Blickrichtung, Blickwechsel | statisch | gut |
| Blickfolge | 0,2–1 Hz | gut |
| Nystagmus-Schlagfrequenz | 1–5 Hz | 30 bis 6 Bilder je Schlag, brauchbar |
| Langsame Phase als Mittelwert | 2–100 °/s | erreichbar, siehe unten |
| Langsame Phase je Einzelschlag | 2–100 °/s | zu ungenau |
| Schnelle Phase | 20–50 ms | ein Sprung, nur Zeitpunkt und Richtung |
| Sakkaden-Spitzengeschwindigkeit | 300–500 °/s | nicht messbar |

Geschwindigkeit der langsamen Phase bei 0,5° Rauschen, Steigung aus einer Geraden:

| Dauer | Bilder | je Schlag | Mittel aus 60 Schlägen |
|---|---|---|---|
| 100 ms | 3 | ±10,6 °/s | ±1,4 °/s |
| 200 ms | 6 | ±3,6 °/s | ±0,5 °/s |
| 300 ms | 9 | ±1,9 °/s | ±0,25 °/s |

Die Auffälligkeitsschwelle liegt bei 2–4 °/s. **Nur der Mittelwert über viele Schläge ist
tragfähig**, und nur, wenn das Rauschen nicht mit dem Signal zusammenhängt. Eine Messung
dauert deshalb mindestens 30 Sekunden.

Das iPhone mit 60 fps verbessert die Werte etwa um den Faktor 1,4 bis 2 und hebt die
Grenze auf 15 Hz. Es bleibt die Rückfalloption, falls die interne Kamera scheitert.

## 4. Die Hürden

### 4.1 Kopfbewegung

**1 mm Kopfversatz wirkt wie 4,8° Augenbewegung.** Daher gilt:

- **Kopfbezug:** Gemessen wird die Irismitte relativ zu Lidwinkeln und weiteren
  kopffesten Punkten, nie die Bildposition.
- **Kinnstütze für Nystagmus:** Bücherstapel oder Stütze. Für links/rechts unnötig.
- **Bezugspunkte glätten:** Der Kopf bewegt sich auf der Stütze langsam, also dürfen die
  Bezugspunkte zeitlich geglättet werden. Das senkt ihr Rauschen, ohne das Augensignal
  zu dämpfen. Ohne diesen Schritt kann das Rauschen der Lidwinkel die Messung beherrschen.
- **Kopfspur:** Die Kopfbewegung wird als eigene Zeitreihe gespeichert. Schwingt der Kopf
  in derselben Frequenz wie das Auge, gilt die Messung als Kopfartefakt.

### 4.2 Pupille gegen Iris

Im sichtbaren Licht schluckt Melanin das Licht, bei dunklen Iriden verschwindet der
Pupillenrand. Klinische Geräte umgehen das mit Infrarot, diese Kamera nicht. Die
Irismitte liegt nah an der Pupillenmitte; der Versatz bleibt bei gleichem Licht weitgehend
konstant und stört die Bewegungsmessung deshalb kaum. Bei hellen Augen kann die Pupille
in A1 zusätzlich als Kanal getestet werden.

### 4.3 Lider

Oberlid und Unterlid verdecken den Irisrand, vor allem beim Blick nach unten. Darum zählen
nur die seitlichen Randbögen. **Vertikale Messung ist damit deutlich schwächer** als
horizontale und wird anfangs nur als Hinweis ausgegeben. Lidschläge werden erkannt und
samt Umgebung verworfen.

### 4.4 Fixation

Wie im Vision Lab: Bei Licht kann fixiert werden, das unterdrückt vestibulären
Spontannystagmus. Ein Normalbefund schließt ihn also nicht aus. Einen Versuch wert ist
eine vollständig weiße, reizlose Bildschirmfläche: Sie verringert die Fixation vielleicht
etwas und beleuchtet zugleich das Auge. Das ist eine ungeprüfte Idee, kein Ersatz für
eine Frenzel- oder VOG-Brille.

### 4.5 Bildschirmgrenzen

Bei 30 cm reicht der Bildschirm etwa ±25° horizontal und ±17° vertikal, bei 40 cm ±20° und
±13°. Für Blickrichtungsnystagmus in Endstellung reicht das nicht. Dafür braucht es
Markierungen neben dem Rechner.

## 5. Verfahren

```text
720p-Bild
  │
  ├─ Face Landmarker: Augenbereiche, Lidwinkel, 10 Irispunkte, Kopfhaltung
  │
  ├─ Irisrand je Auge im Originalbild:
  │    Strahlen von der Irismitte, seitliche Bögen, Kante subpixelgenau,
  │    robuste Kreisanpassung (RANSAC), Radius aus dem Median
  │
  ├─ Augenposition = Irismitte − geglätteter Kopfbezug, in Grad über das Iris-Lineal
  │
  ├─ Güte je Bild: Kanten-Anteil, Lidöffnung, Helligkeitssprung, Kopfgeschwindigkeit
  │
  └─ Auswertung: Lidschläge entfernen, Lomb-Scargle, Phasen, Richtung, Vergleich beider Augen
```

**Warum nicht nur MediaPipe?** Die Irispunkte sind eine Modellschätzung und könnten kleine
Bewegungen glätten. Sie sind der schnelle Einstieg, die eigene Randanpassung ist der
Messweg. Ob sie besser ist, entscheidet A1.

**Warum im Browser?** Die Messung läuft immer im Vordergrund, die Drosselung verdeckter
Tabs stört hier also nicht. Die Testseite läuft bereits, der Face Landmarker ist darin
vorhanden und die Randanpassung geht ohne Bibliothek direkt auf den Canvas-Pixeln.
A0 bis A3 brauchen keine Installation. Ein Umzug nach Python bleibt später möglich.

**Lichtbedingungen:** Frontal und diffus, Bildschirm hell, keine Fenster oder Lampen als
Spiegelung im Auge, ohne Brille, Video-Effekte von macOS aus.

## 6. Fahrplan

Jede Stufe hat eine Schwelle. Wird sie verfehlt, folgt keine weitere Stufe.

| Stufe | Inhalt | Weiter, wenn |
|---|---|---|
| A0 | Lineal im Bild, Bildschärfe bei 25–50 cm, Belichtungsverhalten | Iris mindestens 30 px und scharf |
| A1 | Ruhiger Blick, 30 s: Rauschen je Verfahren, Sichtbarkeit der Pupille | Rauschen höchstens 0,5°, sonst iPhone prüfen |
| A2 | Künstliches Auge auf Canvas mit bekannter Bewegung | Ruhe ergibt 0; Frequenz und Richtung stimmen |
| A3 | Bildschirmziele: Blickpunkte, Sakkaden, Blickfolge 0,25–1 Hz, Kopf-Störtest | Winkelfehler unter 2°, Kopfbewegung kein Scheinnystagmus |
| A4 | Optokinetischer Nystagmus mit Streifen auf dem Bildschirm | Schlagrichtung in beiden Reizrichtungen korrekt |
| A5 | Nystagmus-Auswertung mit Grenzen und Güteangabe | Nachweisgrenze gemessen und dokumentiert |
| A6 | Optional: Vergleich mit EyeSeeCam oder VOG | Abweichung bekannt |

A4 ist der Kerntest: Optokinetischer Nystagmus lässt sich bei Gesunden gezielt auslösen,
und seine Richtung ergibt sich aus dem Reiz. Das ist ein echter Nystagmus mit bekannter
Antwort. Die Verlässlichkeit bei echten Patientenbefunden belegt er noch nicht.

## 7. Ausgabe

Eine Messung endet immer in einem von drei Ergebnissen:

- **Nystagmus nachweisbar:** Schlagrichtung, Frequenz, mittlere langsame Phase, beide Augen.
- **Kein Nystagmus über der Nachweisgrenze:** mit dieser Grenze in Grad, nie als „kein Nystagmus“.
- **Nicht auswertbar:** mit Grund, etwa Lidschläge, Kopfbewegung oder Licht.

Die Grenze aus Abschnitt 3 gilt auch hier: Frequenzen über 7,5 Hz werden nicht ausgegeben.
Eine Kreisanpassung liefert immer einen Kreis, auch auf einem geschlossenen Lid. Ohne
Güte je Bild entsteht eine Kurve, die wie ein Nystagmus aussieht und keiner ist.

## 8. Datenschutz und Einsatz

- **Die Iris ist ein starkes biometrisches Merkmal.** Augenausschnitte werden nie gespeichert,
  auch nicht zur Fehlersuche. Gespeichert werden nur Zeitreihen und Kennwerte.
- **Kein Medizinprodukt.** Die Ausgabe ist ein Forschungsbefund und ersetzt weder Untersuchung
  noch VOG.
- **Patientenmessungen** erst nach bestandenem A5, mit Einwilligung und pseudonymisiert.
  Die Stufen A0 bis A5 laufen an gesunden Freiwilligen.
- **Reize:** Bewegte Streifen können Übelkeit oder Schwindel auslösen, also kurz halten und
  jederzeit abbrechbar machen.

## 9. Literaturlage

Die Angaben stammen aus Suchergebnissen. Die Originale ließen sich nicht öffnen und wurden
nicht gelesen. Vor jeder Weiterverwendung gegenlesen.

| Quelle | Ergebnis laut Suche | Bedeutung |
|---|---|---|
| [ConVNG, J Neurol 2022](https://link.springer.com/10.1007/s00415-022-11493-1) | Smartphone, 10 Personen, OKN; Genauigkeit vergleichbar mit VOG, präziser als MediaPipe, unpräziser als VOG | stützt den eigenen Detektor und A4 |
| EyePhone, JAHA 2023 | Smartphone gegen VOG, 10 Personen, AUC 0,87 bei 2 °/s | ungefähre Erwartung, Stichprobe klein |
| [VertiGo, 2020](https://doaj.org/article/21a74a904d6544c983004605869b7bc2) | Webcam, kalorischer Nystagmus, Genauigkeit 59,64 % | Warnung: Webcam-Erfolg ist nicht selbstverständlich |
| [Sci Rep 2023](https://www.nature.com/articles/s41598-023-40796-0) | dunkle Iriden im sichtbaren Licht schwer trennbar | stützt die Entscheidung für den Irisrand |
| [IEEE Access 2024](https://doaj.org/article/21ad3ac72299486a9497a31f1eb60713) | Face Mesh mit 5-Punkt-Kalibrierung, etwa 1,1–1,3°; Zuordnung unsicher | Erwartung für Blickrichtung nach Kalibrierung |

Keine dieser Arbeiten belegt Nystagmusmessung mit einer MacBook-Kamera bei 30 fps.
