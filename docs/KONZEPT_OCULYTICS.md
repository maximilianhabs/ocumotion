# Konzept Oculytics: Bericht und Einordnung

Stand 01.11.2026. Plan, nichts davon gebaut. Grundlage sind die Wünsche des Nutzers und eine Vorrecherche. **Kein Original wurde gelesen**, alle Literaturzahlen stammen aus Suchtreffern und sind vor der Übernahme im Volltext zu prüfen.
Die Bauweise des Berichts ergänzt `KONZEPT_VISUELLER_OKULOMOTORIKREPORT.md`.

## Leitlinien

**Drei Zonen je Test.** Jeder Test zeigt, wo der Wert liegt und wie weit er von der Grenze entfernt ist: Grün, Gelb oder Rot. Daneben gibt es einen vierten Zustand **nicht beurteilbar**, wenn die Güte nicht reicht. Er ist kein Befund und wird nie als Grün gezeigt.

**Erst die Aussage, dann die Zahl.** Ein Satz je Test, darunter die Abbildung, ganz hinten die Tabellen. Beispiel: „Kein Hinweis auf Spontannystagmus unter Fixation.“

**Eine verneinende Aussage ist die stärkste.** „Kein Hinweis auf“ setzt voraus, dass die Messung den Befund hätte zeigen können. Die Erkennung hat bisher nie einen echten Nystagmus gesehen. Der Satz braucht deshalb drei Bedingungen: Güte ausreichend, Mindestdauer erreicht, und die Erkennung hat konstruierte Nystagmen in dieser Stärke sicher gefunden.

**Jede Grenze nennt ihre Herkunft.** Arbeitsgrenzen heißen so, belegte Grenzen tragen die Quelle. Ein Wert aus einem anderen Gerät gilt nicht automatisch für 30 fps und eine Laptop-Kamera.

**Bedingungen stehen im Satz.** Immer „unter Fixation“; oft zeigt sich ein Spontannystagmus erst ohne Fixation, etwa unter der Frenzelbrille. Ein unauffälliges Ergebnis schließt ihn also nicht aus.

## Die Tests

### Spontan- und Blickrichtungsnystagmus

| Punkt | Plan |
|---|---|
| Ergebnis | Kein Hinweis, Grauzone oder Nystagmus mit Schlagrichtung, horizontal und vertikal getrennt |
| Kennwert | Geschwindigkeit der langsamen Phase, Richtung, Schläge je Sekunde, Anteil gleicher Richtung |
| Heute | Arbeitsgrenze 2 und 4 °/s |
| Literatur | widersprüchlich: über 3 °/s horizontal und 7 °/s vertikal in einer Studie, 6 °/s in einer Herstellersoftware; Gesunde bis in den Bereich einzelner °/s |
| Abbildung | Spur mit markierten Schlägen; Skala mit den Zonen und dem eigenen Wert; Blickfeldkreuz Mitte, rechts, links, oben, unten mit Pfeil je Position |
| Hinweis | Endstellungsnystagmus abgrenzen, Grenze und Exzentrizität sind noch nicht belegt |

### Sakkaden

| Punkt | Plan |
|---|---|
| Ergebnis | Normometrisch, Tendenz hypometrisch oder hypermetrisch, hypometrisch oder hypermetrisch, je Richtung |
| Kennwert | Gain, Landefehler, Korrektursakkaden, Latenz nur grob; Spitzengeschwindigkeit bleibt gesperrt, 30 fps reichen dafür nicht |
| Heute | Arbeitsgrenze Gain 0,75 bis 1,25 normal, 0,6 bis 1,4 grenzwertig; ohne belegte Quelle |
| Abbildung | Trefferbild: Landepunkte um das Ziel, je Sprung ein Punkt; Gain als Balken mit Zonen; Rechts-Links-Vergleich |
| Hinweis im Bericht | Die Aufgabe hängt von Aufmerksamkeit und Sehschärfe ab. Im Zweifel mit Brille testen, obwohl das die Erkennung erschweren kann |

Bei Demenz und leichter kognitiver Störung trennen laut Suchtreffern vor allem **Antisakkaden**, die Befunde zur Latenz einfacher Sakkaden sind widersprüchlich. Unser Modul misst einfache Sakkaden. Antisakkaden wären ein eigenes Modul und kommen ins Backlog; eine Aussage über Kognition macht der Bericht nicht.

### Blickfolge

| Punkt | Plan |
|---|---|
| Bahn | ±12° statt ±10°. ±15° senkte den gemessenen Gain deutlich, siehe `MESSUNGEN.md` |
| Geschwindigkeit | 0,2 und 0,4 Hz; ergibt bei ±12° Spitzen von 15,1 und 30,2 °/s |
| Stand der Technik | Ein offizielles Protokoll wurde noch nicht belegt. Eine Herstellerangabe nennt 0,4 Hz, ab 50 Jahren 0,3 Hz; BSA 2015 ist zu lesen, bevor das festgeschrieben wird |
| Grenzen | Arbeitsgrenze Gain 0,7 und 0,5. Gain sinkt mit dem Alter. Für Sakkadierung ist keine belegte Grenze bekannt |
| Abbildung | Sollkurve und Augenspur übereinander, Sakkaden markiert; Gain mit Zonen |

### Optokinetik

Bewusst einfach: **auslösbar**, **nicht sicher auslösbar** oder **nicht beurteilbar**, je Richtung. Keine Grenzwerte, kein Gain als Befund. Das passt zum Stand: In den eigenen Läufen war er bisher nicht nachweisbar. Ein Satz „nicht auslösbar“ wäre ohne Kenntnis der Reizwirkung zu stark, auch weil das Bildfeld kein Ganzfeld ist.

## Kreative Auswertungen

- **Übersichtsseite als Blickfeld:** eine Schemazeichnung, je Test ein Feld mit Zone und Kurzsatz.
- **Zonen-Skala je Test:** dasselbe Bild überall, der eigene Wert als Marke, die Unsicherheit als Band.
- **Trefferbild der Sakkaden:** auf einen Blick, wie punktgenau die Sprünge landen.
- **Rechts-Links-Spiegel:** dieselben Kennwerte gegenübergestellt, Asymmetrien fallen sofort auf.
- **Verlauf im Lauf:** ob Werte gegen Ende nachlassen, als Hinweis auf Ermüdung oder Aufmerksamkeit.
- **Gütestreifen:** unter jeder Abbildung, welche Abschnitte zuverlässig waren.

## Einordnung nach Muster

Der Nutzer möchte, dass der Bericht versucht, Muster einer Region zuzuordnen, etwa zerebellär, zentral-vestibulär, mesenzephal oder pontin. Fachlich sinnvoll, aber das ist der heikelste Teil.

- **Konflikt:** Die Projektregel lautet „keine Diagnose“, `ROAD_TO_PUBLIC.md` empfiehlt für die öffentliche Fassung keine Bewertung. Eine Lokalisation ist näher an einer Diagnose als alles bisher und betrifft die Zweckbestimmung direkt.
- **Entschieden am 01.11.2026:** abschaltbar und später. Formulierung nur als Muster: „Das Muster wird in der Literatur beschrieben bei …“, mit Quelle, ohne Wahrscheinlichkeit, in einem getrennten Abschnitt, abschaltbar. Erst nach Stufe 4. Öffentlich erst nach fachkundiger Klärung.
- **Belegstand:** Suchtreffer nennen Hypermetrie bei fastigialer Region, Hypometrie bei Vermis-Läsion und Downbeat bei zerebellären Störungen. Das stützt die Einschätzung des Nutzers, ist aber nicht im Original geprüft. Eine vollständige Tabelle fehlt, die Spezifität je Muster ist nicht belegt. Leigh und Zee sind hierfür die erste Quelle.

## Stufen nach Schwierigkeit

| Stufe | Inhalt | Fertig, wenn |
|---|---|---|
| 1 | Berichtsaufbau: Sätze, Zonen, Abbildungen, „unter Fixation“, Hinweise zu Sehschärfe und Aufmerksamkeit; Blickfolge ±15°; OKN als auslösbar | Bericht aus vorhandenen Läufen lesbar, Texte fachlich vom Nutzer freigegeben |
| 2 | Sakkaden: Tendenz hypo- und hypermetrisch, Trefferbild, Rechts-Links-Spiegel, pseudorandomisierte Ziele | Konstruierte Signale mit bekanntem Gain werden richtig eingeordnet |
| 3 | Literatur im Volltext: BSA 2015, Leigh und Zee, Originale zu Nystagmus und Blickfolge; Grenzen ersetzen oder bestätigen | Jede Grenze hat Quelle oder bleibt Arbeitsgrenze |
| 4 | Empfindlichkeit prüfen: konstruierte Nystagmen im echten Rauschen, kleinste sicher erkannte Stärke; eigene Referenzläufe mehrerer Personen | „Kein Hinweis“ ist erst ab dieser Stufe erlaubt, vorher „nicht nachgewiesen“ |
| 5 | Einordnung nach Muster, nach Entscheidung des Nutzers | siehe oben |

Die Stufen 1 und 2 passen zu Etappe 3 und 4 des Produktplans. Der Bericht läuft erst nach dem Oberflächen-Umbau.

## Quellen, alle nur als Suchtreffer

- [Interacoustics, Spontannystagmus](https://interacoustics.com/guides/test/balance-tests/spontaneous-nystagmus)
- [Hopf et al. 2018, Sakkaden im Altersverlauf](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6143243/)
- [Levy et al. 2018, Augenbewegungen bei Demenz](https://pubmed.ncbi.nlm.nih.gov/29079970)
- [Meta-Analyse 2021](https://www.pubmed.gov/33959887/), [Meta-Analyse 2023](https://www.pubmed.gov/37676429/)
- [Blickfolge bei ±10° und 0,4 Hz, PMC4038492](https://pmc.ncbi.nlm.nih.gov/articles/PMC4038492/)
- [Inventis, Pursuit-Modul](https://inventis.it/sites/default/files/product-insight/2024-06/PI%20-%20Pursuit%20module%20_Rev01.pdf)
- [Tilikete, WCN 2019](https://wfneurology.org/public/downloads/k0ZYj/WCN2019_TC20_CEREBELLAR%20OCULAR%20MOTOR%20AND%20VESTIBULAR%20DISORDERS%20Caroline%20Tilikete.pdf)
- [EyePhone, Bastani et al. 2024](https://doaj.org/article/3d881885d4e741fda85071709bbfb8d2)
- Zu lesen: British Society of Audiology, Recommended Procedure Vestibular Assessment – Eye Movement Recordings, 2015; Leigh und Zee, The Neurology of Eye Movements
