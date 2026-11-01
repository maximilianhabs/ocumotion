# Ocumotion

Lokale Okulomotorik-Messung mit der eingebauten Laptop-Kamera. Forschungsprototyp, keine Diagnose.

**Stand:** Die App läuft im Browser, ohne Abrufe aus dem Netz. Der Umbau zur öffentlichen Software folgt `docs/PRODUKTPLAN.md`.

```bash
make start
```

Danach `http://127.0.0.1:5600` öffnen. Kamerabilder bleiben im Browser. `make test` prüft die Rechenlogik und die Fremddateien.
Nebenprojekte wie iPhone-Brücke und Handtest stehen in [experimente/](experimente/README.md).

| Dokument | Inhalt |
|---|---|
| [docs/KONZEPT.md](docs/KONZEPT.md) | Ziel, Architektur, Gestensteuerung, Grenzen, Datenschutz |
| [docs/KONZEPT_AUGEN.md](docs/KONZEPT_AUGEN.md) | Blickrichtung, Irismitte, Nystagmus |
| [docs/KONZEPT_OKULOMOTORIK.md](docs/KONZEPT_OKULOMOTORIK.md) | Kalibrierung, beide Augen, Okulomotorik-Untersuchung |
| [docs/KONZEPT_VISUELLER_OKULOMOTORIKREPORT.md](docs/KONZEPT_VISUELLER_OKULOMOTORIKREPORT.md) | Zielbild Bericht und Kurzprofile |
| [docs/PRODUKTPLAN.md](docs/PRODUKTPLAN.md) | Weg vom Prototyp zur öffentlichen Software |
| [docs/KONZEPT_OCULYTICS.md](docs/KONZEPT_OCULYTICS.md) | Bericht Oculytics: Einordnung, Abbildungen, Stufen |
| [docs/ROAD_TO_PUBLIC.md](docs/ROAD_TO_PUBLIC.md) | Fahrplan für die Veröffentlichung |
| [docs/PROTOKOLLE.md](docs/PROTOKOLLE.md) | Kurzlauf und ausführlicher Lauf |
| [docs/KONZEPT_OKN_MODUS.md](docs/KONZEPT_OKN_MODUS.md) | Optokinetischer Test H40 |
| [docs/KONZEPT_IPHONE_MODUS.md](docs/KONZEPT_IPHONE_MODUS.md) | Eigenständiger iPhone-Modus, Pipeline |
| [docs/KONZEPT_UEBERTRAGBARKEIT.md](docs/KONZEPT_UEBERTRAGBARKEIT.md) | Andere Geräte und Kameras |
| [docs/KONZEPT_GUETETEST.md](docs/KONZEPT_GUETETEST.md) | Geführter Gütetest mit Start-Button |
| [docs/UEBERGABE_CODE_REVIEW.md](docs/UEBERGABE_CODE_REVIEW.md) | Einstieg für eine prüfende KI |
| [docs/IMPLEMENTIERUNGSNOTIZ_CODEX.md](docs/IMPLEMENTIERUNGSNOTIZ_CODEX.md) | Technischer Bauplan für den Messplatz |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Etappen E0–E8 und A0–A7 |
| [docs/MESSUNGEN.md](docs/MESSUNGEN.md) | Messprotokoll |
| [docs/FUNDSTELLEN.md](docs/FUNDSTELLEN.md) | Wo alle Projekteinträge liegen, auch außerhalb des Repos |

