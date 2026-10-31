# Mac Vision

Lokale Bewegungs-, Gesichts- und Gestenerkennung mit der eingebauten Kamera des
MacBook Pro M1. Schwesterprojekt des Vision Lab auf dem Beelink.

**Stand:** Testseite im Browser läuft, das Python-Programm ist noch nicht gebaut.

| Dokument | Inhalt |
|---|---|
| [docs/KONZEPT.md](docs/KONZEPT.md) | Ziel, Architektur, Gestensteuerung, Grenzen, Datenschutz |
| [docs/KONZEPT_AUGEN.md](docs/KONZEPT_AUGEN.md) | Blickrichtung, Irismitte, Nystagmus |
| [docs/KONZEPT_OKULOMOTORIK.md](docs/KONZEPT_OKULOMOTORIK.md) | Kalibrierung, beide Augen, Okulomotorik-Untersuchung |
| [docs/KONZEPT_VISUELLER_OKULOMOTORIKREPORT.md](docs/KONZEPT_VISUELLER_OKULOMOTORIKREPORT.md) | Zielbild Bericht und Kurzprofile |
| [docs/KONZEPT_UEBERTRAGBARKEIT.md](docs/KONZEPT_UEBERTRAGBARKEIT.md) | Andere Geräte und Kameras |
| [docs/KONZEPT_GUETETEST.md](docs/KONZEPT_GUETETEST.md) | Geführter Gütetest mit Start-Button |
| [docs/UEBERGABE_CODE_REVIEW.md](docs/UEBERGABE_CODE_REVIEW.md) | Einstieg für eine prüfende KI |
| [docs/IMPLEMENTIERUNGSNOTIZ_CODEX.md](docs/IMPLEMENTIERUNGSNOTIZ_CODEX.md) | Technischer Bauplan für den Messplatz |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Etappen E0–E8 und A0–A7 |
| [docs/MESSUNGEN.md](docs/MESSUNGEN.md) | Messprotokoll |
| [docs/FUNDSTELLEN.md](docs/FUNDSTELLEN.md) | Wo alle Projekteinträge liegen, auch außerhalb des Repos |

```bash
make kamera
```

Listet die verfügbaren Kameramodi auf, ohne die Kamera zu öffnen.

```bash
make test-web
```

Startet die Testseite auf `http://127.0.0.1:5600`. Sie lädt Programmcode und Modelle aus
dem Netz; Kamerabilder bleiben im Browser. Die Augenmessung liegt unter
`http://127.0.0.1:5600/augen.html`, ihre Rechenlogik prüft `make test`.
