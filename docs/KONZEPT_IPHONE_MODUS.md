# Ocumotion — Konzept eigenständiger iPhone-Modus

Stand 31.10.2026. **Pipeline, nicht begonnen.** Gebaut ist nichts. Der Vorschlag kam von außen und wurde geprüft;
er ist eine Option für später und ändert die aktuelle Reihenfolge nicht.

## Idee

Eine native Swift-App mit ARKit nutzt die iPhone-Frontkamera als Sensor und den iPhone-Bildschirm als Reizgeber.
ARKit liefert Kopfpose und je Auge Position und Orientierung. Die App zeigt dieselben Untersuchungen als eigenen
Modus, kein verkleinertes Mac-Layout. Bericht und Datenmodell bleiben gemeinsam, Geometrie, Erfassung und
Kalibrierung werden iPhone-spezifisch. Safari taugt für Vortests der Bedienung, nicht für ARKit-Daten.

## Warum das interessant ist

Der stärkste Grund ist die **Vertikale**, unser ungelöstes Hauptproblem. Ein Verfahren mit eigener Geometrie könnte
sie lösen. Die Belege dafür sind gemischt, siehe unten, und es bleibt eine Hypothese.

| Verfahren | Nutzen | Grenze |
|---|---|---|
| MediaPipe auf Frontkamerabildern | Anschluss an bestehenden Code | bisherige Probleme können bleiben |
| ARKit-Augenorientierung | Augen und Kopf gemeinsam, 60 Hz | Blackbox, Glättung und Genauigkeit unbekannt |
| Eigene Irisanalyse | volle Kontrolle | Entwicklungsaufwand, in ARKit-Sitzung nur mit Kamerabild möglich |

## Prüfvermerk

**Bestätigt in der Apple-Dokumentation:**

- `leftEyeTransform` und `rightEyeTransform` liefern Augenmitte und Orientierung je Auge. `lookAtPoint` ist daraus
  abgeleitet, und seine Länge hängt vom Fokusabstand ab.
- Face Tracking braucht seit iOS 14 eine Neural Engine, nicht zwingend TrueDepth; `isSupported` gehört geprüft.
- „The eye does not rotate about the z-axis“: **Torsion liefert ARKit nicht.** Das ist eine feste Grenze.

**Bestätigt laut Suchergebnissen, Originale nicht gelesen:** EyePhone nutzt ARKit mit 60 Hz. Bei 10 Gesunden und
induziertem OKN korrelierte die langsame Phase mit der VOG (r = 0,98 horizontal, 0,94 vertikal; AUC 0,87 bei 2 °/s,
iPhone 13 Pro Max). Eine Arbeit von 2025 berichtet dagegen Schwächen bei vertikalen Bewegungen in einer früheren
ARKit-Prüfung und nennt die Blackbox als Hauptnachteil. Für Patienten mit krankhaftem Nystagmus wurde kein Beleg gefunden.

**Geometrie nachgerechnet:** Ein iPhone 17 Pro Max hat rechnerisch rund 15,9 × 7,3 cm aktive Fläche (6,9 Zoll,
Annahme 2868 × 1320 Bildpunkte, ohne Sicherheitsrand).

| Abstand | Quer h | Quer v | Vergenz je Auge |
|---|---|---|---|
| 20 cm | ±21,7° | ±10,4° | 9,0° |
| 25 cm | ±17,7° | ±8,3° | 7,2° |
| 30 cm | ±14,9° | ±7,0° | 6,0° |
| 35 cm | ±12,8° | ±6,0° | 5,1° |
| Mac bei 40 cm, zum Vergleich | ±19,7° | ±12,6° | 4,5° |

Die heutigen Kalibrierziele (±15° h, ±10° v) passen im Querformat nicht; `targetsFit` würde den Start verhindern.
Es braucht also eigene Zielsätze.

**Im Vorschlag fehlend oder zu ergänzen:**

- **Nahsicht:** 25–30 cm sind für presbyope Patienten ohne Lesebrille unscharf, und Brillen stören das Tracking.
  Für die Zielgruppe ist das vermutlich die größte klinische Hürde.
- **Nahfixation:** Sie verlangt 6–7° Vergenz je Auge und könnte Nystagmus beeinflussen. Fachlich zu prüfen; eine
  Mac-Messung bei 40 cm ist deshalb nicht gleichwertig.
- **Einzelaugen sind ungesichert:** Ob ARKit beide Augen wirklich unabhängig schätzt oder an ein gemeinsames Modell
  bindet, ist nicht dokumentiert. Ohne echte Unabhängigkeit wäre dissoziierte Augenbewegung nicht sichtbar. Das ist die
  erste Prüffrage.
- **Schräge Kamera:** Im Querformat sitzt sie rund 6,5 cm neben der Mitte, also knapp 15° schräg bei 25 cm. Blick nach
  links und rechts sind damit nicht gleichwertig. Beide Geräteorientierungen vergleichen.
- **Voraussetzung auf dem Mac:** **Xcode ist nicht installiert**, nur die Command Line Tools. Nötig wären Xcode (großer
  Download, 64 GB frei), ein Apple-Account und ein echtes Gerät, denn im Simulator gibt es kein Face Tracking dieser Art.
  Mit einem kostenlosen Account laufen Testinstallationen nur befristet. Installation nur auf Ansage.
- **Regulatorik:** Dieselbe Frage wie beim Bericht, siehe `KONZEPT_VISUELLER_OKULOMOTORIKREPORT.md`. Auch Apples Regeln zu
  Gesichtsdaten gelten, sobald die App verteilt wird. Ein reiner Eigentest ist davon nicht betroffen.

## Machbarkeitstest, wenn es so weit ist

Klein und ohne Untersuchungsprofile: eine Swift-Ansicht mit ARKit im Querformat auf einem Ständer. Sie zeichnet je
Auge Orientierung, Kopfpose und Zeit auf und exportiert JSON, keine Bilder.

| Frage | Prüfung |
|---|---|
| Messrate und Ausfälle | reale Rate, Lücken, Lidschläge |
| Unabhängigkeit der Augen | Blick auf nahes und fernes Ziel, ein Auge abdecken; bleibt die Spur des verdeckten Auges eigenständig? |
| Glättung | Sprünge: Anstieg von 10 auf 90 % wie in unserer Filterprüfung |
| Vertikale | Ziele und Sprünge gegen die Mac-Werte, derselbe Gütetest soweit geometrisch möglich |
| Geometrie | bekannter Abstand und bekannte Ziele gegen die ARKit-Position |

**Weiter nur, wenn:** die Vertikale klar besser und wiederholbar ist als am Mac, und die Augen unabhängig genug sind.
Sonst bleibt der iPhone-Modus eine Komfortvariante ohne Messgewinn. Ein ernsthafter Einsatz braucht VOG-Vergleich.

## Einordnung in die Pipeline

Vorher kommen, unverändert: Gütetest bei gemessenem Abstand, Kameramessung, iPhone als Kamera am Mac, eigene Irisanalyse.
Der Vergleich mit dem iPhone am Mac zeigt schon, was Bildrate bringt, kostet aber kein Xcode. Der native Test wird
interessant, sobald die Vertikale am Mac nicht zu lösen ist.

## Quellen

- [Apple: leftEyeTransform](https://developer.apple.com/documentation/arkit/arfaceanchor/lefteyetransform)
- [Apple: lookAtPoint](https://developer.apple.com/documentation/arkit/arfaceanchor/lookatpoint)
- [Apple: ARFaceTrackingConfiguration](https://developer.apple.com/documentation/arkit/arfacetrackingconfiguration)
- [EyePhone, JAHA 2024](https://pubmed.ncbi.nlm.nih.gov/38226513/)
- [EyePhone, Grundlagenarbeit](https://pmc.ncbi.nlm.nih.gov/articles/PMC7879263), nicht im Original gelesen
- [Duvieusart et al., EMBC 2025](https://discovery.ucl.ac.uk/id/eprint/10221365), nicht im Original gelesen
