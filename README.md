# Mac Vision

Lokale Bewegungs-, Gesichts- und Gestenerkennung mit der eingebauten Kamera des
MacBook Pro M1. Schwesterprojekt des Vision Lab auf dem Beelink.

**Stand:** Testseite im Browser läuft, das Python-Programm ist noch nicht gebaut.

| Dokument | Inhalt |
|---|---|
| [docs/KONZEPT.md](docs/KONZEPT.md) | Ziel, Architektur, Gestensteuerung, Grenzen, Datenschutz |
| [docs/KONZEPT_AUGEN.md](docs/KONZEPT_AUGEN.md) | Blickrichtung, Irismitte, Nystagmus |
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
dem Netz; Kamerabilder bleiben im Browser.
