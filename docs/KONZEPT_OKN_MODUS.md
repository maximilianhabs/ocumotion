# Konzept optokinetischer Modus, mit Prüfvermerk

Der Prüfvermerk stammt aus der Claude-Sitzung vom 31.10.2026. Der Entwurf darunter ist unverändert. Bei Widerspruch
gilt der Vermerk, darüber `CLAUDE.md`.

## Prüfvermerk

**Gebaut:** horizontaler Test H40 mit Kontrollblock, rund 48 s, in `testseite/augen.html` und `okn-logik.js`.
Vertikal, 12°/s und HV73 sind zurückgestellt.

**Zweck zuerst:** Erste Prüfung der Erkennung an einem echten Nystagmus mit unabhängig bekannter Richtung.

**Abweichungen vom Entwurf:**

| Thema | Entwurf | Entscheidung | Grund |
|---|---|---|---|
| Streifenperiode | 4° | mindestens 5°, bei großem Feld mehr, höchstens rund 7,5 Paare | Expertenkonsens: höchstens 8 Paare bei driftenden Streifen über rund 50 cd/m². Mit 4° wären es rund 10. Keine Sicherheitsgarantie |
| Kontrast | Schwarz-Weiß | gedämpft, hellgrau auf dunkelgrau | senkt Leuchtdichte und Hornhautreflexe |
| Kontrolle | keine | 8 s Streifen bei zentralem Fixationspunkt | Hornhautreflexe könnten reizsynchron einen OKN vortäuschen. Die Prüfung beider Augen hilft dagegen nicht |
| Darstellung | Shader | Canvas 2D im Winkelraum | genügt für senkrechte Streifen |
| Ablauf | 40 s | 48 s durch die Kontrolle | |
| Bildpunkte je Phase | mindestens 4 unabhängige | Steigung auf Rohwerten, nicht gefiltert | Medianwerte sind nicht unabhängig |

**Geprüft:** Blockdauern und Pixelrechnung stimmen. Quelle [2] stimmt. Quelle [3] ist ungeprüft.

---

# Mac Vision – Optokinetischer Modus: Reiz, Antwort und Messprüfung
Stand 31.10.2026 · Entwurf für eine implementierende KI · Noch nicht validiert

Zielort im Repository: docs/KONZEPT_OKN_MODUS.md.
Zuerst aktuelle CLAUDE.md und Messnotizen lesen. Nichts installieren/committen/pushen.
Keine Bilder, Videos oder Augenausschnitte speichern. Reiz wird lokal gerendert.

## 1. Ziel und Aussagegrenze

Mit einem bewegten Streifenmuster bei Gesunden eine okulomotorische Antwort erzeugen und
prüfen, ob Kamera/Pipeline langsame Phasen und schnelle Rückstellungen sichtbar erhalten.

Drei getrennte Prüfungen:
- Technischer Reiz: stimmt Richtung, Winkelgeschwindigkeit, Feldgröße und zeitliche Darstellung?
- Biologische Antwort: entsteht eine wiederholte Folgebewegung mit entgegengesetzter Rückstellung?
- Messverfahren: welche Teile sind zeitlich/räumlich zuverlässig nachweisbar?

Bekannte Reizgeschwindigkeit ist NICHT bekannte Augengeschwindigkeit.
Kein erwarteter Gain von exakt 1, keine feste erwartete Schlagfrequenz oder Amplitude.
Ein positiver Funktionstest belegt nicht automatisch die Genauigkeit der Messung.
Quantitative Validierung braucht eine unabhängige Referenz (z. B. VOG).

Der Laptop/iPhone-Bildschirm ist ein begrenztes Gesichtsfeld, kein Ganzfeld-OKN-Aufbau.
Vollbild bedeutet nur bildschirmfüllend. Ergebnis deshalb „Antwort auf optokinetischen
Bildschirmreiz“, nicht gleichwertig mit einem normierten klinischen Ganzfeldtest.
Bei ausbleibender Antwort zuerst Feldgröße, Anweisung, Aufmerksamkeit, Sehvermögen und
Messqualität prüfen, nicht automatisch eine Störung behaupten.

## 2. Physiologie und Richtungsdefinition

Vertikaler OKN ist bei Gesunden auslösbar und nicht grundsätzlich ein seltenes pathologisches
Phänomen. Oben/unten können unterschiedlich reagieren; nicht automatisch als krankhaft werten [2,3].
Spontaner Upbeat/Downbeat ohne Reiz ist eine andere Untersuchungsfrage.

| Musterbewegung aus Sicht der Person | Langsame Phase | Schnelle Phase / Schlagrichtung |
|---|---|---|
| rechts | rechts | links |
| links | links | rechts |
| oben | oben | unten: reizinduzierter Downbeat |
| unten | unten | oben: reizinduzierter Upbeat |

Im Datenmodell immer stimulusDirection, slowPhaseDirection, quickPhaseDirection trennen.
Darstellung der Selfie-Kamera spiegeln darf keine Datenvorzeichen verändern.
Horizontale Bewegung: VERTIKALE Streifen seitwärts bewegen.
Vertikale Bewegung: HORIZONTALE Streifen auf-/abwärts bewegen.
„Horizontaler Streifen“ ist nicht „horizontal bewegter Reiz“.

Nystagmus braucht langsame Phase; schnelle Bewegungsspitzen allein reichen nicht.
Ruckartige Trackingartefakte müssen von echten Rückstellungen getrennt bleiben.

## 3. Reizgestaltung und Parameter

Startkonfiguration als Arbeitsvorschlag, keine Norm:
- Schwarz-Weiß-Streifen, gleiche Breite heller/dunkler Balken.
- Einzelstreifen ungefähr 2° breit; Schwarz-Weiß-Periode 4°, räumliche Frequenz 0,25 Zyklen/Grad.
- Horizontal zuerst, 8°/s. Danach bei guter Verträglichkeit und auswertbarer Antwort 12°/s.
- Forschungsvergleich bei 2, 4, 8, 12°/s möglich; niedrige Stufen können nur wenige
  Schläge erzeugen und benötigen unter Umständen längere Beobachtung.
- 20°/s erst später als eigener Versuch, kein automatischer Start mit 40°/s.
- 12 s je Bewegungsblock, erste/letzte Sekunde nicht für stabile Kennwerte verwenden.
- Konstant gehaltene Bildschirmhelligkeit, Umgebungslicht und Kontrast pro Vergleich.
- Gleichmäßige Bewegung, keine Kontrastumkehr und kein zusätzliches Blinken.
- Zwischen Richtungen neutrales Grau statt abruptem Richtungswechsel im laufenden Muster.
- Kein permanentes Fixationskreuz während der Bewegungsphase: kann die Antwort verändern.

Begründung: EyePhone untersuchte vier Reizrichtungen mit 2/4/8/12°/s, je 10 s und
5-s-Pausen am Laptop; das ist ein geeigneter Machbarkeitsbezug [1].
Andere Arbeiten verwenden höhere Geschwindigkeiten und größere Felder; deren Normen nicht übertragen [2,4].
Die gewählte Streifenbreite ist unser Pilotparameter und nicht aus EyePhone als Standard abgeleitet.

Musterpassierfrequenz = Geschwindigkeit / Schwarz-Weiß-Periode:
bei 8°/s und 4° Periode 2 Zyklen/s, bei 12°/s 3 Zyklen/s.
Das ist weder Nystagmusfrequenz noch ein garantierter Sicherheitsparameter.

Anweisung fest wählen und im Report speichern:
„Verfolgen Sie die vorbeiziehenden Streifen mit den Augen und nehmen Sie danach den nächsten.
Halten Sie den Kopf ruhig.“
Das ist eine verfolgende, look-OKN-nahe Aufgabe. Ein späterer stare-OKN-Modus mit anderem
Auftrag muss separat getestet werden; Anweisungsarten nicht innerhalb eines Vergleichs mischen [3].

## 4. Protokolle

Voraussetzung: Kamera betriebsbereit, gültige aufgabengeeignete Kalibrierung, Geometrie bekannt.
Einrichtung/Kalibrierung und optionale Erholung zusätzlich ausweisen.
Der OKN-Modus ist ein separates Zusatzmodul; nicht still in einen 60-s-Kurztest einschieben.

### H40 – erster horizontaler Funktionstest: 40 s
| Abschnitt | Dauer | Inhalt |
|---|---:|---|
| Ausgangslage | 5 s | Zentraler Fixationspunkt, Basisspur |
| Bewegung A | 12 s | Muster rechts, 8°/s |
| Pause | 6 s | Gleichmäßiges Grau, neutral nach vorn schauen |
| Bewegung B | 12 s | Muster links, 8°/s |
| Erholung | 5 s | Gleichmäßiges Grau |
Gesamt 40 s. Startseite zwischen Personen/Läufen abwechseln und dokumentieren.

### HV73 – vier Richtungen: 73 s
5 s Basis, anschließend viermal 12 s Bewegung + 5 s Grau = 73 s.
Zuerst horizontales Paar, anschließend vertikales Paar; Reihenfolge innerhalb eines
Richtungspaars alternieren. Vertikal nur bei geeigneter Kalibrierung/Freigabe.
Geschwindigkeit zunächst überall 8°/s.
Bei vertikal ungeeigneter Messung: Rohbeobachtung separat kennzeichnen, keine SPV/Normklassifikation.

### Dosisvergleich – separate Blöcke
H40 bei 8°/s und H40 bei 12°/s, Erholung dazwischen nach Befinden.
Reihenfolge bei Wiederholungen ausbalancieren; niedrige Geschwindigkeit bei erstem Kontakt.
Später 2/4/8/12°/s je Richtung nach Literaturvorbild, längerer Forschungsmodus.
Keine automatische Erhöhung, nur weil keine Schläge erkannt wurden.

Grau nach dem Reiz prüft KEINEN standardisierten optokinetischen Afternystagmus:
Fixation bleibt möglich, die Pause ist keine Dunkelphase.

## 5. Geometrie und Darstellung

Physische Bildschirm-/Viewportgröße, gemessener Augenabstand und Lage relativ zum Bildschirm nötig.
CSS-Pixel und devicePixelRatio liefern allein keine Millimeter.
Bei iPhone eigene nutzbare Fläche mit Safe Areas, Rotation und seitlicher Frontkamera berücksichtigen.

Zentrale lineare Näherung:
v_px/s ≈ (CSS-Pixel pro cm) × Abstand_cm × Winkelgeschwindigkeit_rad/s.
Für 1440 CSS-px, 28,6 cm Breite und 40 cm Abstand:
4°/s ≈ 141 px/s, 8°/s ≈ 281 px/s, 12°/s ≈ 422 px/s.
Nur gültig nahe der Mitte unter den genannten Annahmen.

Bessere Variante: Shader rendert Muster im Winkelraum.
theta(x) = atan((x_cm - Augenmitte_x_cm) / Abstand_cm);
L(x,t) = squareWave((theta(x) - omega*t) / Periode_rad).
Für vertikal y verwenden, korrekte Vorzeichen beachten.
Dann ist die Bewegung entlang der gewählten Winkelkoordinate gleichförmig;
lineare Pixelverschiebung wäre am Rand angular langsamer.
Bezug bei binokularer Darstellung ist eine definierte mittlere Augenposition.
Für stark schräge Geometrie muss der Raumvektor genauer abgebildet werden.

Phase aus absoluter monotoner Zeit bestimmen, niemals pro Frame einen festen Pixelbetrag addieren.
Canvas/WebGL lokal; requestAnimationFrame oder nativer Displaytakt. Reizpfad von Detektion trennen.
Pro Darstellung Zeitpunkt und Reizphase speichern. Zwischen Bildaufbauten ist keine kontinuierlich
sichtbare Bewegung garantiert. Displayraten/Lücken und Schrittlängen protokollieren.
Keine „tatsächliche Lichtemissionszeit“ aus requestAnimationFrame behaupten.

Feldgröße aus Geometrie in Grad ausweisen; am Mac bei 28,6 cm Breite/40 cm Abstand
ungefähr 39° horizontal vor Rändern. iPhone kleiner und richtungsabhängig:
keine automatische Gleichwertigkeit oder gleiche Grenzwerte.

## 6. Was wir erwarten und was nicht

Erwartung bei auslösbarer Antwort:
- längere Augenbewegungssegmente in Reizrichtung;
- kurze, schnellere Rückstellungen in Gegenrichtung;
- wiederholte sägezahnähnliche Positionsspur;
- bei Richtungsumkehr Wechsel beider Phasenrichtungen.

Gain = Betrag langsame Phasengeschwindigkeit / Betrag Reizgeschwindigkeit.
Gain kann unter 1 liegen, abhängig von Feld, Anweisung, Richtung, Geschwindigkeit und Person.
Kein universelles Normalband erfinden. Auch keine Pflicht zu exakt symmetrischer vertikaler Antwort.

Schlagfrequenz hängt zusätzlich von Amplitude/Dauer der Phasen ab.
Nur als vereinfachte Plausibilität: 6°/s langsame Phase und 3° Auslenkung bedeuten etwa
0,5 s langsame Phase, also grob unter 2 Schlägen/s nach Einbezug der schnellen Phase.
Die konkreten 6°/s und 3° sind ein fiktives Rechenbeispiel, keine Sollwerte.

Ein linearer Soll-Positionsverlauf des Auges ist falsch: Das Muster wiederholt sich und das Auge
stellt zurück. Reiz als Geschwindigkeit/Phase darstellen; gemessene Augenposition bleibt Sägezahn.
Synthetische Idealspur nur als Schema beschriften, nie als gemessenen „gesunden Sollnystagmus“.

## 7. Kameraauswertung: zuerst sichtbar, dann quantitativ

1. Rohspuren beider Augen h/v, Kopfpose, Irisbreite, Lidöffnung, gültig/ungültig und Gründe erhalten.
2. Kamerabildzeit, Analysebeginn/-ende und Reizphase in nachvollziehbare Zeitbeziehung bringen.
3. Blinzeln/Kneifen und Übergangsbilder markieren; keine langen Lücken interpolieren.
4. Schnelle Gegenbewegungen als Kandidaten erkennen; Schwellen an gemessenes Rauschen und dt binden.
   Die bisherige starre 50°/s-Schwelle nicht ungeprüft übernehmen.
5. Zwischen Rückstellungen langsame Phasen segmentieren; Zeitpunkte dürfen nicht nur nach dem
   erwarteten Reizvorzeichen ausgewählt werden (Zirkelschluss vermeiden).
6. Für geeignete Phasen robuste Gerade Position gegen Bildzeit anpassen. Phasendauer, Punktzahl,
   Residuum und Vorzeichen speichern. Zunächst mindestens 4 unabhängige Bildpunkte als technische
   Arbeitsbedingung; keine validierte Messgenauigkeit daraus ableiten.
7. SPV-Median und Streuung zwischen Phasen, Zahl gültiger Phasen, Abdeckung und Artefaktanteil.
8. Provisorischer Erfolg: mindestens drei prüfbare Zyklen in einem Block und plausible Richtung;
   für SPV-Vergleich zusätzlich mindestens fünf geeignete langsame Phasen anstreben.
   Bei Nichterfüllung nicht „kein OKN“, sondern „Antwort nicht ausreichend quantifizierbar“.
9. Ergebnisse je Auge berechnen und mit gemeinsamer Spur kontrollieren; Fusion darf unterschiedliche
   Vorzeichen oder zeitliche Unterschiede nicht verdecken.
10. Ohne passende Kalibrierung keine Grad/s oder Gain; normierte Spur als qualitative Entwicklungsansicht.

Bei 30 Hz liegt eine schnelle Phase unter Umständen nur zwischen zwei Bildern.
Richtung und Sprung können erkennbar sein; Spitzengeschwindigkeit und präzise schnelle-Phasen-Dauer
sind damit nicht belegt. Mehr echte Bildpunkte mit 60 Hz können helfen, bleiben separat zu validieren.

Median 5 kann kurze Phasen verändern. Für OKN einen eigenen Signalpfad prüfen:
Rohspur, lokale robuste Steigungsanpassung, ausdrücklich dokumentierter optionaler Filter.
Keine zusätzliche Glättung nur für eine schönere Sägezahnkurve.

## 8. Vergleich Reiz gegen Messung und visueller Bericht

Vier Ergebniszustände:
- Reizkonforme sägezahnartige Antwort nachweisbar, Phasen visuell/algorithmisch bestätigt.
- Bewegung sichtbar, quantitative Phasenmessung unsicher.
- Keine eindeutige Antwort in diesem Aufbau beobachtet.
- Technisch nicht auswertbar.

Kein Zustand bedeutet allein normal/pathologisch.

Bericht pro Richtung:
- Reizpfeil und separat entgegengesetzter erwarteter Schlagpfeil;
- Geschwindigkeit, Streifenbreite, Feldgröße, Anweisung und Blockdauer;
- 3–5 s echte Zeitspur beider Augen, langsame Phasen farbig, Rückstellungen markiert;
- gleiche Skala für Gegenrichtungen, sichtbare Lücken;
- Einzelphasen-SPV als Punkte, Median/Streuung und gültige Phasenzahl;
- Gain-Punkte pro Richtung/Geschwindigkeit ohne unbelegtes Normalband;
- Qualitätsleiste für Zeitabdeckung, Blink-/Kopfartefakte und Darstellungsruckler;
- Erwartet/gemessen/Interpretation als getrennte Felder.

Richtungsasymmetrie optional:
A = 100 × (|SPV_A| - |SPV_B|) / (|SPV_A| + |SPV_B|).
Nur bei vergleichbaren, ausreichend messbaren Antworten beider Richtungen.
Bei Nenner nahe null kein Wert. Keine pauschale pathologische Schwelle.
Auf/ab separat betrachten, nicht gegen horizontale Symmetrie normieren.

Beispieltext:
„Bei rechtsbewegtem Bildschirmmuster von 8°/s wiederholte langsame Rechtsbewegung mit schnellen
Links-Rückstellungen. Quantitative SPV wegen ... eingeschränkt. Ergebnis beschreibt eine
reizinduzierte Antwort; keine Aussage über spontanen Nystagmus oder vestibuläre Ursache.“

## 9. Prüfung und Implementierungsreihenfolge

- Reizgenerator (okn-stimulus.js) zuerst mit gespeicherten numerischen Reizphasen testen.
- Protokollrunner (okn-protokoll.js), Qualität, Auswertung (okn-logik.js) und Reportadapter trennen.
- Vorzeichen per synthetischem Signal in allen vier Richtungen prüfen.
- Simulationen: Gain 0,4/0,7/1,0 als bekannte Testdaten, variable Schlagamplitude, Lidschläge,
  reine Sinusbewegung ohne schnelle Phase, reines Rauschen, Kopfbewegung und fehlende Bilder.
- Keine Tests, die allein aus vorhandenem Reiz einen positiven Befund erzeugen.
- Reale Pilotmessung zunächst horizontal 8°/s, beide Richtungen, gleiche Geometrie.
- Wiederholung zur Reproduzierbarkeit; dann 12°/s, erst danach vertikal.
- VOG-Vergleich, möglichst zeitgleich und ohne optische Behinderung durch das Referenzgerät.
  Falls nacheinander: Reihenfolge und Erholung dokumentieren, keine identische Antwort voraussetzen.
- Die Software darf in Echtzeit nur „Kandidat“ melden; Nachauswertung mit Rohspuren nachvollziehbar.
- Modell, Filter, Geometrie, Reizrenderer, Displaystatistik und Auswerteversion im Export.
- Bei Modell-/Kamera-/Geometriewechsel neue Kalibrierung und neuer Abschnitt.

## 10. Verträglichkeit

Sitzend und mit stabilem Gerät testen. Dauerhafte Stop-Möglichkeit/Bedienerabbruch.
Bei Übelkeit, Schwindel, Kopfschmerz oder visueller Überforderung sofort neutraler Bildschirm.
Bekannte photosensitive Anfälle/ausgeprägte Musterempfindlichkeit vor hochkontrastigem
Streifentest ärztlich berücksichtigen; kein unbeaufsichtigter Selbsttest dafür.
Kontrastmuster können selbst ohne zusätzlichen Blinkeffekt auslösend sein [5].
Aus einer niedrigen Musterpassierfrequenz folgt keine garantierte Sicherheit.
Keine automatische Steigerung von Geschwindigkeit, Kontrast oder Dauer.

## Quellen und Evidenzstatus

[1] Bastani et al. Quantifying Induced Nystagmus Using a Smartphone Eye Tracking Application
(EyePhone). JAHA 2024, DOI 10.1161/JAHA.123.030927.
https://pmc.ncbi.nlm.nih.gov/articles/PMC10926800/
Methodenpassage über Recherche zugänglich: vier Richtungen, 2/4/8/12°/s und Laptopreiz.
Kein Nachweis für exakt unser Rendering, unsere Kamera oder unsere Grenzwerte.

[2] Garbutt et al. Vertical optokinetic nystagmus and saccades in normal human subjects.
IOVS 2003. DOI 10.1167/iovs.03-0066. https://pubmed.ncbi.nlm.nih.gov/12939299/
Abstract geprüft: große Reizfläche, vertikaler OKN bei Gesunden, Geschwindigkeitsabhängigkeit.
Abstract enthält widersprüchliche Angabe zur optimalen räumlichen Frequenz; keine konkrete
Streifenfrequenz daraus übernehmen, Original vor entsprechender Nutzung prüfen.

[3] Knapp et al. Horizontal and vertical look and stare optokinetic nystagmus symmetry in
healthy adult volunteers. IOVS 2008. DOI 10.1167/iovs.07-0773.
https://pubmed.ncbi.nlm.nih.gov/18235002/
Abstract geprüft: Bedeutung der Anweisung und individuelle vertikale Asymmetrien.

[4] An Effective Algorithm to Analyze the Optokinetic Nystagmus Waveforms from a Low-Cost
Eye Tracker. Healthcare 2022;10:1281. https://www.mdpi.com/2227-9032/10/7/1281
Methoden laut Recherche: 10–40°/s, längere Blöcke. Kein Normstandard für unseren Aufbau.

[5] Epilepsy Society: Photosensitive epilepsy.
https://epilepsysociety.org.uk/understanding-epilepsy/photosensitive-epilepsy
Relevanz hochkontrastiger Muster für Verträglichkeit/Photosensitivität.

Alle eigenen Parameter, Freigaben und Zeitbudgets oben sind Pilotvorschläge.

