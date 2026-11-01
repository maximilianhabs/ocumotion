# Road to Public — Mac Vision

Stand 31.10.2026. Plan, kein Umschaltauftrag: Das Repo bleibt privat, bis der Nutzer die Sichtbarkeit selbst ändert.
Aufbau nach den Guides von Anonymisator, NeuroVoice AI und EEG Navigator. Keine Rechtsberatung.

## Ziel

Code, Konzepte und Messdaten sollen aus dem Internet lesbar sein, und eine externe Neurologin oder ein Informatiker
soll in fünf Minuten erkennen: saubere, ehrliche Forschungsarbeit. Dafür gibt es zwei Ebenen.

| Ebene | Was | Wie |
|---|---|---|
| Lesen | Code und alle Markdown-Dokumente | öffentliches GitHub-Repo; GitHub stellt Markdown lesbar dar |
| Ausprobieren | laufende Seite im Browser | GitHub Pages aus `app/`, HTTPS, kein Server nötig |

Pages ist für die zweite Ebene passend: Die Kamera braucht einen sicheren Kontext, und die Verarbeitung bleibt im
Browser. Pages protokolliert laut GitHub Besucher-IP-Adressen. Eine Demo im Netz ist ein eigener Schritt und erhöht
den Anspruch an Zweckbestimmung und Texte, siehe Stufe 1.

## Geprüft am 31.10.2026

Im aktuellen Stand und in der Commit-Historie gibt es keine Geheimnisse, Bilder, Videos, Messdateien oder Klinikbezüge.
Alle Commits haben einen Autor. Exporte sind per `.gitignore` ausgeschlossen. Das muss direkt vor dem Umschalten
noch einmal geprüft werden.

**Keine öffentliche Schwester hat weniger als:** `LICENSE`, `CITATION.cff`, `SECURITY.md`, `.github`. Hier fehlen alle vier.

## Stufe 1 — Risiken beseitigen, zwingend vor Public

| Fund | Aufgabe |
|---|---|
| **Zweckbestimmung fehlt.** „Befundbericht“, „auffällig“, „unauffällig“ und die Ampel klingen nach Diagnostik. MDCG 2019-11 stellt auf die Zweckbestimmung ab, einschließlich Bezeichnungen und Werbung. Ein Satz „nur Forschung“ allein genügt vermutlich nicht | Zweckbestimmung im README festlegen. Bericht in „Messbericht“ umbenennen, Einordnungen als Abweichung von Arbeitsgrenzen formulieren oder für die öffentliche Fassung abschalten. Vor Public fachlich klären |
| Upbeat/Downbeat-Sätze | Bleiben Messbeschreibung, nie Hinweis auf eine Ursache |
| Eigene Messwerte in `MESSUNGEN.md` | Einzige Testperson ist der Autor. Entscheiden: veröffentlichen, oder nur als Muster und Methode |
| Lokale Pfade und Sitzungsdetails in `FUNDSTELLEN.md`, `UEBERGABE_CODE_REVIEW.md` | Für Public herauslösen oder kürzen; der Benutzername ist kein Geheimnis, gehört aber nicht in die Außendarstellung |
| Name | „Mac“ ist eine Apple-Marke, und das Projekt soll plattformübergreifend werden. Vor Public über einen eigenen Namen entscheiden |
| Streifenwarnung | Im Eigentest entfernt. Für fremde Personen wieder nötig, dann als Text auf der Karte, nicht als `window.confirm` |
| Patienten | Bleibt: keine Patientendaten, auch nicht in Issues oder Beispielen. In `CONTRIBUTING.md` als erste Regel |

## Stufe 2 — Erster Eindruck

- README neu: Was ist es, für wen, was kann es noch nicht. Zwei Sätze, dann Start.
- Englische Kurzfassung und englisches GitHub-About-Feld.
- Eine Aussage zu Grenzen direkt oben: Forschungsprototyp, 30 fps, nicht an Patienten validiert.
- Bilder nur aus dem Trockenlauf oder als Kurven, nie echte Augen.

## Stufe 3 — Wissenschaftliche Ehrlichkeit

- Status je Funktion: gemessen, an konstruierten Signalen geprüft, nicht validiert. `MESSUNGEN.md` liefert das schon.
- Grenzen sichtbar: eine Testperson, kein VOG-Vergleich, Erkennung noch nie an krankhaftem Nystagmus geprüft.
- Arbeitsgrenzen als solche kennzeichnen; nur die SWJ-Grenze ist belegt.
- Offene Literaturprüfung abschließen; ungeprüfte Quellen entfernen oder kennzeichnen.

## Stufe 4 — Gepflegt und reproduzierbar

- `.github/workflows`: `make test` bei jedem Push. **Angelegt**, läuft nach dem nächsten Push.
- Versionsnummer und Änderungsprotokoll.
- Laufzeit fest, Modell nicht mehr über `latest`. **Erledigt:** Version und Prüfsumme stehen in `app/vendor/mediapipe/`, `make test` prüft sie.
- Branch- und Tag-Schutz wie bei EDF-Analyzer und NeuroVoice AI.
- Keine externen Abrufe in der App. **Erledigt:** Die Seiten verbieten sie per Content-Security-Policy, nur `experimente/handtest` lädt noch aus dem Netz.

## Stufe 5 — Lizenz

Entscheidung des Nutzers. Bei den Schwestern war sie eine bewusste Wahl. MediaPipe steht unter Apache-2.0; die Modellkarten
nennen laut Kopien ebenfalls Apache-2.0, das Original ist noch zu prüfen. Apache-2.0 wäre verträglich. `NOTICE` für
Fremdanteile ergänzen.

## Stufe 6 — KI-Nutzung offenlegen

Ein Satz im README: Code und Dokumente entstanden mit KI-Unterstützung, Verantwortung und Bewertung liegen beim Autor.

## Stufe 7 — Fremde Inhalte

Keine fremden Bilder oder Grafiken im Repo. Die Entwürfe aus anderen KI-Systemen sind unter Prüfvermerk abgelegt;
Literatur nur als kurze Angabe, keine langen Zitate. Vor Public einmal durchsehen.

## Stufe 8 — Gutachterfrage

Was würde ein Reviewer fragen? Vergleich mit VOG fehlt, nur eine Testperson, kein Patient, Modell ist Blackbox, Hersteller
von MediaPipe kann ändern, Schwellen sind nicht validiert. Die Antwort darf im README stehen, bevor jemand fragt.

## Fehlende Dateien

| Datei | Inhalt |
|---|---|
| `LICENSE`, `NOTICE` | nach Entscheidung |
| `CITATION.cff` | Autor, Titel, Version, damit GitHub das Zitieren anbietet |
| `SECURITY.md` | Meldeweg, Hinweis auf lokale Verarbeitung |
| `CONTRIBUTING.md` | erste Regel: keine echten Patientendaten, Bilder oder Augenausschnitte |
| `.github/workflows/test.yml` | Tests |

## Reihenfolge

Die Bau-Etappen stehen in `PRODUKTPLAN.md`.

1. Software fertigstellen nach `PRODUKTPLAN.md`, Etappen 1 bis 5.
2. Stufe 1 entscheiden: Name, Zweckbestimmung, eigene Messwerte.
3. Stufen 2 bis 7 umsetzen, Repo bleibt privat.
4. Abschlussprüfung: `git log --all --diff-filter=A --name-only`, Suche nach Geheimnissen, Trockenlauf aus frischem Klon.
5. Der Nutzer schaltet das Repo auf Public.
6. Eigener Schritt: GitHub Pages als Demo, mit Hinweis auf die IP-Protokollierung, und Klärung, ob dafür Impressum und
   Datenschutzhinweise nötig sind.

## Entscheidungen beim Nutzer

Name, Lizenz, Veröffentlichung eigener Messwerte, Bericht in der öffentlichen Fassung mit oder ohne Ampel, Demo im Netz ja/nein.

## Quellen

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [MDCG 2019-11](https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en), nur als Zusammenfassung gelesen
- Interne Grundlage: `ROAD_TO_PUBLIC.md` von Anonymisator, NeuroVoice AI und EEG Navigator
