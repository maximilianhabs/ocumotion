# Mac Vision — Fundstellen

Für jede KI oder Person, die dieses Projekt übernimmt. Stand 31.10.2026.

**Einstieg:** Zuerst `CLAUDE.md` lesen, dann `docs/ROADMAP.md`. Das Repo ist die maßgebliche
Quelle; Memory und alte Sitzungen sind nur Ergänzung.

## Im Projekt

Ordner: `/Users/maximilianhabs/Code/mac-vision`
GitHub: <https://github.com/maximilianhabs/mac-vision> (privat, Branch `main`)

| Datei | Inhalt |
|---|---|
| `CLAUDE.md` | verbindliche Projektregeln |
| `README.md` | Überblick und Startbefehle |
| `docs/KONZEPT.md` | Ziel, Architektur, Gestensteuerung, Grenzen, Datenschutz |
| `docs/KONZEPT_AUGEN.md` | Blickrichtung, Irismitte, Nystagmus, Stufen A0–A7 |
| `docs/KONZEPT_GUETETEST.md` | Geführter Gütetest: Ablauf, Daten, Grenzen |
| `docs/KONZEPT_OKULOMOTORIK.md` | Kalibrierung, Zusammenführung beider Augen, geplante Untersuchungen |
| `docs/UEBERGABE_CODE_REVIEW.md` | Einstieg für eine KI, die Code und Konzepte prüfen soll |
| `docs/IMPLEMENTIERUNGSNOTIZ_CODEX.md` | technischer Bauplan für den Messplatz, mit Prüfvermerk und Abweichungen |
| `docs/ROADMAP.md` | Etappen und aktueller Stand |
| `docs/MESSUNGEN.md` | alle Messergebnisse |
| `testseite/index.html` | Testseite für Hand, Gesten, Gesicht und Körper |
| `testseite/augen.html` | Augenmessung: Blickrichtung, Kurven, Kalibrierablauf |
| `testseite/guetetest-logik.js` | Ablauf und Auswertung des Gütetests |
| `testseite/trockenlauf.js` | Simuliertes Gesicht für `augen.html?trockenlauf` |
| `testseite/positionierung-logik.js` | Zielrahmen, Hinweise, persönliche Referenz, relativer Abstand |
| `testseite/kalibrierung-logik.js` | Blickziele, Modellanpassung, Bewertung je Auge, gewichteter Mittelwert |
| `testseite/augen-logik.js` | Rechenlogik der Augenmessung, Tests mit `make test` |
| `tools/kamera_modi.swift` | Kameramodi auflesen, `make kamera` |
| `tools/kamera_details.swift` | Belichtung, Fokus und Bildwinkel abfragen, `make kamera-details` |
| `.claude/launch.json` | Startkonfiguration `mac-vision-test`, Port 5600 |

Start der Testseite: `make test-web`, dann <http://127.0.0.1:5600>. Für die Kamera einen
normalen Browser nutzen; das eingebaute Browserfenster der Claude-App verweigert sie.

## Außerhalb des Repos

| Ort | Inhalt |
|---|---|
| `~/.claude/projects/-Users-maximilianhabs-Code-mac-vision/memory/` | Projekt-Memory: Stand, Entscheidungen, offene Freigaben |
| `~/.claude/projects/-Users-maximilianhabs-Code-mac-vision/460ea22a-50fb-4ee3-ad88-137fafceda5f.jsonl` | Verlauf der Gründungssitzung |
| `~/.claude/projects/-Users-maximilianhabs-Code-Programme-Claude-Code/memory/MEMORY.md` | nur noch ein Verweis auf dieses Projekt |
| `~/.claude/projects/-Users-maximilianhabs-Code-Programme-Claude-Code/memory/reference_localhost_ports.md` | Portliste aller Projekte, Mac Vision = 5600 |

## Verwandte Projekte

Diese Projekte liefern Vorarbeit, gehören aber nicht zu Mac Vision.

| Ort | Bezug |
|---|---|
| `~/Code/Programme Claude Code/homeserver/services/vision-lab/` | Vorbild: Module, Fahrplan, `KONZEPT-okulomotorik.md`, `KONZEPT-gesicht.md` |
| `~/Code/Programme Claude Code/vog-pupillometrie/` | Erfahrung mit Augenvideos; enthält klinische Bezüge, nur lokal |
| `~/.claude/projects/-Users-maximilianhabs-Code-Programme-Claude-Code/memory/project_vision_lab.md` | Stand und Messergebnisse des Vision Lab |

## Offen

- Python-Abhängigkeiten: Der Nutzer hat am 31.10.2026 „Noch nicht“ gesagt. Nicht ohne neue Freigabe installieren.
- Die Stufen A0 bis A4 brauchen keine Installation.
- Die Literatur in `KONZEPT_AUGEN.md` Abschnitt 9 ist bis auf einen Abstract nicht im Original gelesen.
- Keine medizinische Nutzung und keine Patientenmessung vor bestandenem A7.

## Nicht ins Repo

Bilder, Videos, Augenausschnitte, Modelle, Messdaten aus `data/` und exportierte Dateien
`macvision-guetetest-*.json` aus dem Downloads-Ordner. Commits, Pushes und
Installationen nur auf ausdrückliche Ansage des Nutzers.
