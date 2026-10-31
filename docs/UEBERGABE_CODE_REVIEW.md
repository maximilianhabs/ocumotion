# Übergabe zur Code-Überprüfung

Stand 31.10.2026. Für eine andere KI, die Code und Konzepte prüfen soll.

## Projekt

Mac Vision: lokales Tracking mit der 30-fps-Kamera eines MacBook Pro M1. Schwerpunkt ist jetzt ein
Eye-Tracking im Browser, das zu einer geführten Okulomotorik-Untersuchung ausgebaut werden soll.

- Ordner: `/Users/maximilianhabs/Code/mac-vision`
- GitHub: <https://github.com/maximilianhabs/mac-vision> (privat, `main`). Zeigt `git status` lokale
  Änderungen, ist der Arbeitsordner maßgeblich.
- Regeln: `CLAUDE.md`. Testen: `make test`. Start: `make test-web`, dann <http://127.0.0.1:5600/augen.html>.

## Die neuen Ideen

0. **Positionierungshilfe:** fester Zielrahmen, ein Hinweis zur Zeit, persönliche Referenz bei von Hand
   gemessenem Abstand. Kein Abstand aus einer Durchschnittsgröße. Siehe Hauptdokument, Abschnitt 2a.
1. **Individuelle Kalibrierung:** Vollbild-Ablauf mit Blickzielen bekannten Winkels bei gemessenem
   Abstand, empfohlen 40 cm. Mitte, rechts, links, oben, unten, dann separate Prüfziele.
2. **Zusammenführung beider Augen:** Bewertung je Auge, Mittelwert gewichtet nach gemessener Güte. Ein
   schlechtes Auge fällt aus. Der gewünschte „KI-Mittelwert“ ist bewusst vorerst statistisch, weil
   ohne VOG-Referenz kein Lernziel existiert. Lernendes Modell ist Stufe 4.
3. **Okulomotorik-Untersuchung als Ziel:** Sakkaden (Gain, Hypo-/Hypermetrie, Latenz), Blickfolge
   langsam und schnell (glatt oder sakkadiert), Primärposition (Spontannystagmus), mit Bewertung.

## Wo was steht

| Datei | Inhalt |
|---|---|
| `docs/KONZEPT_OKULOMOTORIK.md` | **Hauptdokument:** Kalibrierung, Zusammenführung, Untersuchungen, Reihenfolge |
| `docs/KONZEPT_VISUELLER_OKULOMOTORIKREPORT.md` | Zielbild Bericht und Kurzprofile, mit Prüfvermerk |
| `docs/KONZEPT_IPHONE_MODUS.md` | Eigenständiger iPhone-Modus, Pipeline |
| `docs/KONZEPT_UEBERTRAGBARKEIT.md` | Andere Geräte und Kameras: Stand, Bindungen, Reihenfolge |
| `docs/KONZEPT_AUGEN.md` | Messgrundlagen, Auflösung, Hürden, Stufen A0–A7 |
| `docs/IMPLEMENTIERUNGSNOTIZ_CODEX.md` | Bauplan Worker und Bildquelle, mit Prüfvermerk |
| `docs/ROADMAP.md`, `docs/MESSUNGEN.md` | Stand, Reihenfolge, Messprotokoll |
| `docs/FUNDSTELLEN.md` | alle Fundstellen, auch außerhalb des Repos |
| `testseite/augen.html` | Augenseite: Erkennung, Kurven, Kalibrierablauf |
| `testseite/augen-logik.js` | Augenposition x und y aus den Gesichtspunkten |
| `testseite/kalibrierung-logik.js` | Ziele, Modellanpassung, Bewertung, gewichteter Mittelwert |
| `docs/KONZEPT_GUETETEST.md` | Geführter Gütetest mit Start-Button |
| `testseite/guetetest-logik.js` | Ablauf und Auswertung des Gütetests |
| `testseite/trockenlauf.js` | Simuliertes Gesicht, `augen.html?trockenlauf` |
| `testseite/positionierung-logik.js` | Lage des Gesichts, Hinweise, persönliche Referenz, Abstand relativ |
| `testseite/bericht.html`, `bericht-logik.js` | Visueller Bericht aus einer Gütetest-Datei |
| `testseite/*.test.mjs` | 67 Logiktests mit konstruierten Daten |
| `tools/guetetest_auswertung.py` | Vertiefte Auswertung einer Exportdatei |
| `testseite/index.html` | allgemeine Testseite für Hand, Gesicht, Körper |

## Bitte besonders prüfen

1. **Geometrie:** Vorzeichen von x und y, Winkel-zu-Pixel-Rechnung, Zuordnung der Landmarken-Indizes.
2. **Kalibrierung:** Ist das lineare Modell mit acht Anpassungszielen (fünf verschiedene Orte) sinnvoll?
   Sind Prüfziele sauber getrennt? Trägt die Maßstabsaussage in Abschnitt 2 des Hauptdokuments?
3. **Gewichtung und Schwellen:** Trägt `1 / (Unruhe² + Prüffehler²)` je Achse mit nur sechs Prüfzielen?
   Sind die experimentellen Schwellen für einen ersten Test sinnvoll gesetzt?
4. **Zustände:** `abortCalibration`, `calRun`, `collecting` und das Verfallen der Kalibrierung in `augen.html`.
5. **Zeitbasis und Hauptthread:** Bildzeit, Blockierung durch die Erkennung, Verhalten bei verdecktem Fenster.
6. **Untersuchungsplan:** Sind die Kennwerte fachlich richtig, und ist 30 Hz für Gain und Latenz ehrlich bewertet?

## Bekannte Lücken

- Kalibrierung und Gradanzeige sind **mit echtem Gesicht noch nicht gelaufen**, nur mit Logiktests und Testvideo.
  Echtes Vollbild und der Zweig „bestanden“ in der Oberfläche sind deshalb ungeprüft.
- Das zweite Review ist eingearbeitet. Offen daraus: Wiederholungsläufe und Reizzeitpunkt.
- Der Nutzer hat die erste Augenseite ohne Kalibrierung getestet: funktioniert laut Rückmeldung „super“, Zahlen fehlen.
- `augen.html` nutzt MediaPipe-Irispunkte mit Modellglättung als Standard. Die eigene Irisrandanalyse fehlt.
- Worker, Offline-Betrieb und festgelegte Modellversion fehlen. Die Untersuchungen aus Abschnitt 4 sind nicht gebaut.
- Literatur ist bis auf einen Abstract nicht im Original gelesen. Normdaten fehlen.

## Regeln für die Prüfung

Nichts installieren, committen oder pushen. Keine Bilder oder Augenausschnitte speichern. Grad erst
nach bestandener Kalibrierung, keine Diagnose, keine Rohspuren entfernen.
