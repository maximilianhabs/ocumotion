# Mac Vision — Konzept Kalibrierung und Okulomotorik-Untersuchung

Stand 31.10.2026. Baut auf `KONZEPT_AUGEN.md` auf. Gebaut ist nur die Kalibrierung in
`testseite/augen.html`, mit echtem Gesicht noch unbestätigt. Die Untersuchungen aus Abschnitt 4
sind Plan. Alle Schwellen sind vorläufig. Forschungsprototyp, keine Diagnose.

## 1. Ziel

Eine geführte Untersuchung am Bildschirm, die Blickrichtung, Sakkaden, Blickfolge und
Nystagmus in Primärposition misst und mit Unsicherheit bewertet. Grundlage ist eine
individuelle Kalibrierung in Grad.

## 2. Kalibrierung (gebaut)

**Aufbau:** Bekannt sind Bildschirmbreite (28,6 cm) und Abstand Auge–Bildschirm. Daraus ergibt
sich für jeden Blickpunkt der Winkel: `Versatz = tan(Winkel) × Abstand`. Die Kamera misst den
Abstand nicht; die Person misst ihn einmal von Hand.

**Empfohlener Abstand: 40 cm.** Der Bildschirm reicht dort rund ±19,7° horizontal und ±12,6°
vertikal, die Iris liegt rechnerisch bei 27–36 Bildpunkten. Das ist ein Kompromiss aus Auflösung
und Reichweite und muss noch gegen die reale Bildschärfe geprüft werden. Auch 30 und 50 cm sind wählbar.

**Ablauf:** rund eine Minute im Vollbild auf hellem Grund. Je Ziel 1,2 s Einschwingen, dann 2,8 s
Datensammlung.

| Rolle | Ziele |
|---|---|
| Anpassung | Mitte, rechts 15°, Mitte, links 15°, Mitte, oben 10°, Mitte, unten 10° |
| Prüfung | rechts 7°, links 7°, oben 5°, unten 5°, rechts oben, links unten |

**Modell je Auge:** `Grad = c0 + c1·x + c2·y`, getrennt für horizontal und vertikal, als kleinste
Quadrate über den Median je Ziel. Prüfziele gehen nicht in die Anpassung ein.

**Bestanden:** Das wird je Auge entschieden. Alle Schwellen sind experimentell. An jedem Prüfziel
zählen beide Achsen, auch die erwartete Nullkomponente.

| Prüfung | Schwelle |
|---|---|
| Prüffehler RMS horizontal / vertikal | höchstens 2° / 3° |
| Größter Fehler an einem Ziel | höchstens 4° |
| Streuung am unruhigsten Ziel horizontal / vertikal | höchstens 1,5° / 2,5° |
| Anteil gültiger Bilder | mindestens 70 %, je Ziel mindestens 10 Bilder |
| Längste Lücke an einem Ziel | höchstens 600 ms |

Besteht keines der Augen, bleibt die Anzeige ohne Grad.

**Gültigkeit:** Die Kalibrierung liegt nur im Arbeitsspeicher und endet mit dem Stopp. Sie verfällt
beim Modellwechsel und wenn die Irisbreite im 3-s-Median um mehr als 8 % abweicht oder der Kopf um
mehr als einen Irisdurchmesser wandert. Esc, verdecktes Fenster, Bildstillstand und Kamerastopp
brechen den Lauf sofort ab; Kamerastopp bleibt jederzeit möglich. Der Bezug „Irisbreite × gemessener Abstand“ kann später den Abstand laufend schätzen.

**Grenzen:** Die Abbildung ist linear und gilt für ±15°. Für den Blick darüber hinaus braucht es
Ziele außerhalb des Bildschirms oder ein Augenmodell. Ein falscher Abstand oder Bildschirmwert
verschiebt alle Grad um denselben Faktor, ohne dass der Prüffehler das zeigt, weil auch die
Prüfziele damit berechnet sind. Den wahren Maßstab klärt erst der VOG-Vergleich.

## 2a. Positionierungshilfe (gebaut, mit echtem Gesicht ungeprüft)

**Bewertung:** sinnvoll, aber als Positionierungshilfe, nicht als Abstandsmessung. Gesichts- und
Irisgröße allein sind mehrdeutig, solange Kamera und Person nicht bekannt sind. Der Abstand bleibt
einmal von Hand gemessen.

**Ablauf:**

1. Vor der Kalibrierung zeigt das gespiegelte Bild einen festen, breiten Zielbereich: dünnes Oval,
   Band für die Augenhöhe, Marke für die Mitte. Er bleibt stehen und folgt dem Gesicht nicht.
2. Immer nur ein Hinweis mit Toleranz und Hysterese: näher, zurück, seitlich, höher, gerade. Vor dem
   Merken sind die Hinweise nur grob und sperren nichts, denn der gemessene Abstand geht vor.
3. Nach dem gemessenen Abstand merkt sich die Seite Irisbreite, Lidwinkelabstand, Gesichtsmitte,
   Kopfhaltung, Kamera und Auflösung als persönliche Referenz im RAM. Der Zielbereich passt sich an.
4. Abstand laufend aus Irisbreite und Lidwinkelabstand relativ zur Referenz, nur als Mehrsekunden-Median.
   Widersprechen sich beide um mehr als 10 %, lautet die Anzeige „unsicher“.
5. Kalibrieren geht erst nach dem Merken. Während Reizen ist die Hilfe aus. Weicht ein Ziel um mehr als
   8 % Abstand oder einen Irisdurchmesser von der Referenz ab, bricht die Kalibrierung ab.

**Grenzen und Ergänzungen aus der Prüfung:**

- Bei 27–36 Bildpunkten Iris entspricht ein Bildpunkt 3–4 %, also 1,1–1,5 cm bei 40 cm. Einzelbilder
  taugen dafür nicht. Die Warnschwelle von 8 % entspricht rund 3 cm.
- Google nennt für die Iris 11,7 ± 0,5 mm und im eigenen Test 4,3 % mittleren Fehler, braucht aber die
  Brennweite. Für diese Kamera ist sie unbekannt, eine automatische Erstschätzung entfällt vorerst.
- Die Augenhöhe ist noch offen. Die Rechnung nimmt an, dass die Augen vor der Bildschirmmitte liegen.
  Sitzen sie 5–9 cm höher, weicht das 10°-Ziel rechnerisch um 0,4–0,8° ab. Weil die Kamera am
  oberen Rand sitzt und der Deckel geneigt ist, muss das Band empirisch bestimmt werden.
- Abstand und Kopfhaltung werden in der ersten Fassung nur überwacht und führen zu Markierung oder
  Abbruch. Sie werden nicht herausgerechnet.
- Eine Referenz über die Sitzung hinaus wäre personenbezogen und braucht einen ausdrücklichen,
  löschbaren Speicherort. Vorerst bleibt sie im RAM.
- Kopfdrehung lässt sich zunächst aus Augenlinie und Verhältnis der Augenbreiten schätzen. Die
  Kopfmatrix von MediaPipe bleibt aus, bis sie gebraucht wird.

**Noch ungeprüft:** Beim Blick auf 15° sieht die Kamera die Iris verkürzt, rechnerisch um gut 3 %. Ob
die Schwelle von 8 % dabei Fehlabbrüche auslöst, zeigt erst der echte Lauf.

## 3. Zusammenführung beider Augen

**Stufe 1, gebaut: gewichteter Mittelwert, je Achse getrennt.** Gewicht je Auge und Achse:
`1 / (Unruhe² + Prüffehler²)`. Das ist eine Heuristik, keine validierte Unsicherheit. Das genauere Auge zählt mehr, ein durchgefallenes zählt nicht, bei Ausfall trägt das andere
allein. Durch die Kalibrierung liegen beide auf derselben Gradskala, ein Augenwechsel springt also
kaum. Weichen beide Augen auf einer Achse um mehr als 3° (vorläufig) ab, bleibt dort der Mittelwert
leer, beide Einzelkurven laufen weiter, und die Ursache wird nicht gedeutet.

**Stufe 2, geplant: Bildgüte je Frame.** Lidöffnung, Randabdeckung und Kontrast verändern das
Gewicht laufend.

**Stufe 3, geplant: Kalman-Filter** über beide Augen. Nur als zusätzliche Spur, weil er die
schnelle Phase dämpfen kann.

**Stufe 4, später: lernendes Modell („KI-Mittelwert“).** Erst mit Vergleichsdaten aus der VOG.
Ohne Referenz gibt es kein Lernziel, und ein Modell würde Kurven glätten oder Muster erfinden.

**Harte Regeln:**

- Rohspuren beider Augen bleiben immer erhalten und sichtbar. Eine schöne Kurve darf nie die einzige sein.
- Keine Glättung, die Sakkaden oder schnelle Phasen abschwächt.
- Der Mittelwert setzt gleichsinnige Augen voraus. Das stimmt bei Normalbefund und vielen
  Nystagmen, nicht aber bei internukleärer Ophthalmoplegie, Paresen oder dissoziiertem Nystagmus.
  Unter der Schwelle von 3° kann er solche Unterschiede weiterhin verdecken.

## 4. Okulomotorik-Untersuchung (Plan)

Alle Prüfungen laufen nach bestandener Kalibrierung, mit gestütztem Kopf und auf dieselbe Weise:
Reiz am Bildschirm, Zeitreihe, Kennwerte, Güte, Bewertung gegen vorläufige Bereiche.

| Prüfung | Reiz | Kennwerte | Bewertung | Mit 30 Hz |
|---|---|---|---|---|
| **Primärposition** | 30–60 s Mittelpunkt, zusätzlich reizlose Fläche | Drift, Rucke, Schlagrichtung, Frequenz, langsame Phase | kein Nachweis über Grenze / Nystagmus / nicht auswertbar | möglich, unter Fixation |
| **Sakkaden** | Sprünge ±10° und ±15°, horizontal und vertikal, zufälliger Zeitpunkt | Latenz, Amplitude, Gain = Amplitude ÷ Ziel, Korrektursakkaden, Seitenvergleich | normometrisch / hypometrisch / hypermetrisch | Gain gut, Latenz grob (±33 ms), Spitzengeschwindigkeit nein |
| **Blickfolge langsam** | Sinus 0,2–0,4 Hz, ±10° | Gain, Phase, Zahl und Amplitude von Aufholsakkaden | glatt / sakkadiert | gut |
| **Blickfolge schnell** | Sinus 0,6–1 Hz oder Rampe | wie oben | glatt / sakkadiert | möglich, Zuverlässigkeit prüfen |
| **Blickhaltung** | exzentrische Ziele halten | Rückdrift, Rucke | Blickrichtungsnystagmus ja/nein | nur bis Bildschirmrand, Ziele außerhalb nötig |
| **Optokinetik** | bewegte Streifen | Schlagrichtung, Seitenvergleich | erhalten / asymmetrisch | Funktionstest |

**Sakkadenbewertung:** Gemessen wird die erste Sakkade vor einer Korrektur. Hypometrie heißt
Gain unter 1 mit Korrektur in Zielrichtung, Hypermetrie Gain über 1 mit Rückkorrektur. Eine
leichte Hypometrie ist auch beim Gesunden üblich, die Bereiche müssen also aus Normdaten kommen.

**Zeitmessung:** Latenzen brauchen zusätzlich den tatsächlichen Darstellungszeitpunkt des Reizes.
Die Zeitreihe führt Bildzeit, Callback-Zeit, Analysebeginn und -ende getrennt, den Reizzeitpunkt noch nicht.

**Blickfolgebewertung:** Aufholsakkaden werden über Geschwindigkeitssprünge erkannt und aus der
glatten Komponente entfernt. Gain = Augengeschwindigkeit ÷ Zielgeschwindigkeit.

**Gemeinsame Grenzen:** Fixation bleibt möglich, die schnelle Phase ist nicht vermessbar, Torsion
fehlt, und die vertikale Messung ist schwächer. Das Lid folgt dem Blick nach unten. Ein iPhone mit
60 fps verbessert Latenz und Sakkadenerkennung, ersetzt aber keine VOG mit mehr als 200 Hz.

**Ergebnisbericht:** Je Prüfung Rohkurve, Kennwerte mit Streuung, Zahl gültiger Durchgänge, Güte
und Einordnung. Die Ausgabe beschreibt Messwerte; sie stellt keine Diagnose. Normbereiche fehlen
bisher, also braucht es Vergleichsdaten Gesunder je Altersgruppe.

## 5. Reihenfolge

1. Kalibrierung mit echtem Gesicht prüfen, Prüffehler und Unruhe protokollieren, Wiederholbarkeit
   über mehrere Läufe messen, Schwellen an diesen Daten festlegen.
2. Worker, unabhängige Bildquelle und eigene Irisrandanalyse (`IMPLEMENTIERUNGSNOTIZ_CODEX.md`).
3. Künstliches Auge und Kopf-Störtest, jetzt auch mit Sakkaden und Blickfolge.
4. Blickfolge langsam: einfachste Prüfung mit bekanntem Sollsignal.
5. Sakkaden, dann Primärposition, dann schnelle Blickfolge und Optokinetik.
6. VOG-Vergleich und Normdaten an Gesunden.
7. Ergebnisbericht, Stufe 2 und 3 der Zusammenführung.

Patientenmessungen erst danach, mit Einwilligung und pseudonymisiert.
