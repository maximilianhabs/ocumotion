# Ocumotion — Konzept Augen, Blickrichtung, Nystagmus

Stand 31.10.2026, nach externem Review überarbeitet. Gebaut ist `app/index.html` mit den
MediaPipe-Irispunkten, ohne eigene Randanalyse. Am Auge ist noch nichts gemessen. Kalibrierung und
geplante Untersuchungen stehen in `KONZEPT_OKULOMOTORIK.md`. Kameradaten aus Abschnitt 1 sind ausgelesen, alle Winkel und Rauschwerte sind
Rechnungen unter genannten Annahmen. Grundlage ist `KONZEPT-okulomotorik.md` im Vision Lab, angepasst an diese Kamera.

## Kurzantwort

| Frage | Einschätzung |
|---|---|
| Augen im Bild finden | ja, liefert der Face Landmarker schon |
| Blick links, Mitte, rechts | sehr wahrscheinlich ja |
| Mittelpunkt der **Iris** | ja, das ist die eigentliche Messgröße |
| Mittelpunkt der **Pupille** direkt | nur bei hellen Augen, bei dunklen vermutlich nicht |
| Deutlicher horizontaler Rucknystagmus: Richtung und Frequenz | plausibel, Nachweis steht aus |
| Feiner Nystagmus unter etwa 2° | vermutlich nicht |
| Pupillometrie, Torsion, schnelle Phase | nein |

**Entscheidung:** Gemessen wird die Irismitte relativ zum Kopf. Sie ersetzt die
Pupillenmitte, weil beide nah beieinander liegen und der Rand zwischen Iris und weißer
Lederhaut bei jeder Augenfarbe sichtbar ist.

**Erster Prüfgegenstand:** horizontale Augenposition bei stabilisiertem Kopf. Alles
Weitere hängt davon ab, ob diese eine Messgröße trägt.

## 1. Was die Kamera vorgibt

| Eigenschaft | Wert | Folge |
|---|---|---|
| Modi | 1280×720 und 640×480, fest 30 fps | nur 720p kommt infrage |
| Bildabstand | 33,3 ms | vorläufige Auswertungsobergrenze 7,5 Hz, siehe Abschnitt 3 |
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

**Der Irisdurchmesser ist das Lineal.** Er wird in jedem Bild mitgemessen und macht die
Messung weitgehend unabhängig von Abstand und Bildwinkel.

**Primäre Messgrößen sind Bildpunkte und die normierte Irisverschiebung, nicht Grad.** Die
Umrechnung über einen festen Drehradius vernachlässigt perspektivische Verkürzung,
individuelle Augengeometrie, Lidverdeckung und Kopfdrehung. Die Spalte „Grad je Bildpunkt“
ist deshalb nur eine Größenabschätzung. Gradwerte gibt es erst nach einer persönlichen
Blickzielkalibrierung, geprüft an eigenen, dafür nicht verwendeten Zielpunkten.

## 3. Zeit: was 30 Hz hergibt

**7,5 Hz ist eine vorläufige Auswertungsobergrenze, keine nachgewiesene Messgrenze.** Die
Regel Analyserate ÷ 4 stammt aus der Kalibrierung im Vision Lab. Ob eine Frequenz darunter
messbar ist, hängt zusätzlich von Belichtung, Ausfällen, Modellglättung, Signalform,
Amplitude und Rauschen ab. Bewegungen oberhalb der Grenze können außerdem als langsamere
erscheinen (Aliasing); sie nicht auszugeben, verhindert das nicht.

| Größe | Bereich | Bei 30 Hz |
|---|---|---|
| Blickrichtung, Blickwechsel | statisch | gut |
| Blickfolge | 0,2–1 Hz | gut |
| Nystagmus-Schlagfrequenz | 1–5 Hz | 30 bis 6 Bilder je Schlag, plausibel |
| Langsame Phase als Mittelwert | 2–100 °/s | möglich, siehe unten |
| Langsame Phase je Einzelschlag | 2–100 °/s | zu ungenau |
| Schnelle Phase | 20–50 ms | ein Sprung, nur Zeitpunkt und Richtung |
| Sakkaden-Spitzengeschwindigkeit | 300–500 °/s | nicht messbar |

Theoretische Abschätzung für die Geschwindigkeit der langsamen Phase bei 0,5° unabhängigem
Rauschen, Steigung aus einer Geraden:

| Dauer | Bilder | je Schlag | Mittel aus 60 Schlägen |
|---|---|---|---|
| 100 ms | 3 | ±10,6 °/s | ±1,4 °/s |
| 200 ms | 6 | ±3,6 °/s | ±0,5 °/s |
| 300 ms | 9 | ±1,9 °/s | ±0,25 °/s |

Die Auffälligkeitsschwelle liegt bei 2–4 °/s. **Ein Mittelwert über viele Schläge könnte
unter geprüften Voraussetzungen ausreichend präzise werden.** Glättung, Kopfdrift, falscher
Maßstab und falsche Phasengrenzen verschwinden durch mehr Schläge nicht. Jeder Wert nennt
deshalb Zahl und Dauer der gültigen Phasen, ihre Streuung und die Ausschlussgründe. Eine
Messung dauert mindestens 30 Sekunden.

Das iPhone mit 60 fps verbessert die Werte etwa um den Faktor 1,4 bis 2 und hebt die
Grenze auf 15 Hz. Es bleibt die Rückfalloption, falls die interne Kamera scheitert.

## 4. Die Hürden

### 4.1 Kopfbewegung

**1 mm Kopfversatz wirkt wie 4,8° Augenbewegung.** Daher gilt:

- **Kopfbezug:** Gemessen wird die Irismitte relativ zu Lidwinkeln und weiteren
  kopffesten Punkten, nie die Bildposition.
- **Kinnstütze für Nystagmus:** Bücherstapel oder Stütze. Für links/rechts unnötig.
- **Kopfbewegung erfassen statt herausrechnen:** Translation und Drehung werden als eigene
  Zeitreihen gespeichert. Bei zu viel Bewegung lautet das Ergebnis „nicht auswertbar“.
- **Keine Glättung des Kopfbezugs in der ersten Version:** Ein geglätteter Bezug läuft
  einer Kopfbewegung hinterher und erzeugt so selbst eine scheinbare Augenbewegung.
  Glättung kommt nur infrage, wenn der Kopf-Störtest zeigt, dass sie kein Signal erzeugt.
- **Gleiche Frequenz ist kein Artefaktbeweis:** Echte kompensatorische Augenbewegungen
  sind an Kopfbewegungen gekoppelt. Die Kopfspur ist ein Warnhinweis für die Bewertung,
  keine automatische Zuordnung.

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
  ├─ Irisrand je Auge im Originalbild, nur kleine Augenausschnitte:
  │    seitliche Kanten über mehrere Zeilen, Lider und Reflexe maskiert,
  │    zuerst Mitte aus gegenüberliegenden Randpunkten, dann robuste Kreisanpassung im Vergleich
  │
  ├─ Augenposition = Irismitte − geglätteter Kopfbezug, in Grad über das Iris-Lineal
  │
  ├─ Güte je Bild: Kontrast, Randabdeckung, Lidöffnung, Stabilität, Kopfbewegung, Zeitlücken
  │
  └─ Auswertung: Lidschläge entfernen, Phasenform prüfen, Richtung, Vergleich beider Augen
```

**Warum nicht nur MediaPipe?** Laut Google wird bei `numFaces: 1` zeitlich geglättet, und
genau so ist die Testseite eingestellt. Ein ruhiges Signal beweist daher keine Präzision,
es kann auch kleine reale Bewegungen unterdrücken. Die eigene Randanpassung ist ein
Vergleichskandidat, noch nicht der bessere Weg: Aus kurzen seitlichen Bögen kann ein Kreis
einen scheinbar präzisen, aber geometrisch schwachen Mittelpunkt liefern. A1 entscheidet.

**Güte:** Merkmale und Ablehnungsgründe bleiben erhalten. Ein Wert von 0 bis 100 ist ohne
Validierung keine Wahrscheinlichkeit. Ungültige Bilder ergeben Lücken, keine gehaltenen Werte;
Lidschläge werden mit Randbereich ausgeschlossen, lange Lücken nicht interpoliert.

**Warum im Browser?** Die Messung läuft immer im Vordergrund, die Drosselung verdeckter
Tabs stört hier also nicht. Die Testseite läuft bereits, der Face Landmarker ist darin
vorhanden und die Randanpassung geht ohne Bibliothek direkt auf den Canvas-Pixeln.
A0 bis A4 brauchen keine Installation. Ein Umzug nach Python bleibt später möglich. Vor
belastbaren Messungen wandert die Analyse in einen Web Worker, weil die Erkennung sonst den
Hauptthread blockiert. Die Testseite nutzt bisher `requestVideoFrameCallback`, der an der
Darstellung hängt. Vorgesehen ist `MediaStreamTrackProcessor`, der in einem ersten Test ohne
sichtbares Fenster weiterlieferte.

**Lichtbedingungen:** Frontal und diffus, Bildschirm hell, keine Fenster oder Lampen als
Spiegelung im Auge, ohne Brille, Video-Effekte von macOS aus.

## 6. Fahrplan

Jede Stufe hat eine Schwelle. Wird sie verfehlt, folgt keine weitere Stufe.

| Stufe | Inhalt | Weiter, wenn |
|---|---|---|
| A0 | Lineal im Bild, Bildschärfe bei 25–50 cm, Belichtungsverhalten | Iris mindestens 30 px und scharf |
| A1 | Augenmodus: horizontale Rohkurve mit Gültigkeit; künstliches Auge im RAM mit Stillstand, Sinus, Sägezahn, Kopfversatz, Verdeckung, Kontrastwechsel | Ruhe ergibt 0; Frequenz, Richtung und Amplitude stimmen; Fehlalarme gezählt |
| A2 | Ruhiger Blick und bekannte Bewegung, je Verfahren | Rauschen höchstens 0,5° gleichwertig, bekannte Bewegung bleibt erhalten |
| A3 | Physisches Testobjekt vor der Kamera | Kamera erhält bekannte Bewegung, Dämpfung ist beziffert |
| A4 | Bildschirmziele mit Kalibrierung und getrennten Prüfzielen, Kopf-Störtest | Winkelfehler unter 2°, die Korrektur erzeugt kein Scheinsignal |
| A5 | Optokinetischer Nystagmus, horizontale Reize | Schlagrichtung in beiden Reizrichtungen korrekt |
| A6 | Früher VOG- oder EyeSeeCam-Vergleich an wenigen Gesunden | Maßstab und Geschwindigkeit bekannt |
| A7 | Nystagmus-Auswertung mit Grenzen und Güteangabe | Nachweisbarkeit gemessen und dokumentiert |

Das künstliche Auge kommt bewusst zuerst: Es trennt Softwarefehler von Grenzen der Kamera,
kann deren Eignung aber nicht belegen, weil es sie umgeht. Dafür gibt es A3.

A2 beantwortet zwei getrennte Fragen: Wie stark schwankt das Signal bei ruhigem Blick, und
wie viel einer bekannten Bewegung bleibt erhalten? Die erste allein kann Glättung nicht von
Präzision unterscheiden. Scheitert die interne Kamera hier, wird das iPhone geprüft.

A5 ist ein Funktionstest: Der optokinetische Nystagmus lässt sich bei Gesunden gezielt
auslösen, seine Richtung ergibt sich aus dem Reiz. Die Streifengeschwindigkeit ist aber
keine Referenz für die erreichte Augengeschwindigkeit. Quantitative Werte in Grad und °/s
brauchen deshalb A6. Die Verlässlichkeit bei Patientenbefunden belegt keine dieser Stufen.

## 7. Ausgabe

Zunächst wird nur horizontaler Rucknystagmus untersucht. Pendelförmige Bewegungen brauchen
eine eigene Beschreibung. Eine dominante Frequenz zeigt nur eine periodische Bewegung; sie
belegt weder Rucknystagmus noch Schlagrichtung. Dafür braucht es Phasenform, Rückstellbewegungen,
Wiederholbarkeit und den Ausschluss von Artefakten.

Eine Messung endet immer in einem von drei Ergebnissen:

- **Rucknystagmus nachweisbar:** Schlagrichtung, Frequenz, mittlere langsame Phase mit Zahl und
  Streuung der gültigen Phasen, beide Augen.
- **Kein Nystagmus über der Nachweisgrenze:** Die Grenze nennt Amplitude, Frequenz oder
  Geschwindigkeit der langsamen Phase und die Messqualität, nie schlicht „kein Nystagmus“.
- **Nicht auswertbar:** mit Grund, etwa Lidschläge, Kopfbewegung oder Licht.

Frequenzen über der vorläufigen Obergrenze aus Abschnitt 3 werden nicht ausgegeben.
Eine Kreisanpassung liefert immer einen Kreis, auch auf einem geschlossenen Lid. Ohne
Güte je Bild entsteht eine Kurve, die wie ein Nystagmus aussieht und keiner ist.

## 8. Datenschutz und Einsatz

- **Die Iris ist ein starkes biometrisches Merkmal.** Augenausschnitte werden nie gespeichert,
  auch nicht zur Fehlersuche. Gespeichert werden nur Zeitreihen und Kennwerte.
- **Kein Medizinprodukt.** Die Ausgabe ist ein Forschungsbefund und ersetzt weder Untersuchung
  noch VOG.
- **Patientenmessungen** erst nach bestandenem A7, mit Einwilligung und pseudonymisiert.
  Die Stufen A0 bis A7 laufen an gesunden Freiwilligen.
- **Reize:** Bewegte Streifen können Übelkeit oder Schwindel auslösen, also kurz halten und
  jederzeit abbrechbar machen.

## 9. Literaturlage

Geprüft ist bisher nur der Abstract von EyePhone. Alle anderen Angaben stammen aus
Suchergebnissen; diese Originale wurden nicht gelesen. Vor jeder Weiterverwendung gegenlesen.

| Quelle | Ergebnis laut Suche | Bedeutung |
|---|---|---|
| [ConVNG, J Neurol 2022](https://link.springer.com/10.1007/s00415-022-11493-1) | Smartphone, 10 Personen, OKN; Genauigkeit vergleichbar mit VOG, präziser als MediaPipe, unpräziser als VOG | stützt den eigenen Detektor und A5 |
| [EyePhone, JAHA 2024](https://pubmed.ncbi.nlm.nih.gov/38226513/) | Smartphone gegen VOG, 10 Gesunde, induzierter OKN, Kalibrierung; AUC 0,87 bei 2 °/s, r = 0,98 horizontal | Vorbild für A5 und A6; belegt nichts für diese Webcam |
| [VertiGo, 2020](https://doaj.org/article/21a74a904d6544c983004605869b7bc2) | Webcam, kalorischer Nystagmus, Genauigkeit 59,64 % | Warnung: Webcam-Erfolg ist nicht selbstverständlich |
| [Sci Rep 2023](https://www.nature.com/articles/s41598-023-40796-0) | dunkle Iriden im sichtbaren Licht schwer trennbar | stützt die Entscheidung für den Irisrand |
| [IEEE Access 2024](https://doaj.org/article/21ad3ac72299486a9497a31f1eb60713) | Face Mesh mit 5-Punkt-Kalibrierung, etwa 1,1–1,3°; Zuordnung unsicher | Erwartung für Blickrichtung nach Kalibrierung |

Keine dieser Arbeiten belegt Nystagmusmessung mit einer MacBook-Kamera bei 30 fps.
