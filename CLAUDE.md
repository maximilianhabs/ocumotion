# Projektregeln mac-vision

Lokales Tracking und Gestensteuerung mit der internen Kamera des MacBook Pro M1.
Konzept: `docs/KONZEPT.md`, Augen: `docs/KONZEPT_AUGEN.md`. Stand und Etappen: `docs/ROADMAP.md`.
Messprotokoll: `docs/MESSUNGEN.md`. Alle Fundstellen, auch außerhalb des Repos: `docs/FUNDSTELLEN.md`.
Vorbild: `~/Code/Programme Claude Code/homeserver/services/vision-lab/`. Module dort kopieren, nicht verknüpfen.

- **Das Programm speichert nie Bilder oder Videos.** Frames nur im RAM. Entsteht beim Entwickeln ein Kontrollbild, wird es am Sitzungsende gelöscht, auch im Scratchpad.
- **Lokal bleiben:** Oberfläche nur auf `127.0.0.1:5600`, nie `0.0.0.0`. Keine Cloud-Dienste für Bilder oder Landmarken.
- **Landmarken sind personenbezogen:** nur nach ausdrücklichem Start, als benannte, einzeln löschbare Messung.
- **Kamera nur bei Bedarf offen.** Kein Dauerbetrieb.
- **Erst messen, dann behaupten.** Leistungszahlen stehen erst nach einer Messung in den Dokumenten, und zwar mit Hand im Bild.
- **Vorläufige Obergrenze:** Analyserate ÷ 4, nicht Nyquist. Keine Frequenzen darüber ausgeben. Sie ist keine nachgewiesene Messgrenze und schützt nicht vor Aliasing.
- **Jede Messung bekommt einen Gütewert.** Ohne Gütewert keine Kennzahl.
- **Gesten:** Scharfschalten, Haltezeit, Hysterese und Sperrzeit gelten immer. Aktionen nur aus der Freigabeliste; nichts, was löscht, sendet oder bestätigt.
- **Keine Emotionserkennung, keine Diagnose, keine Personenerkennung.**
- **Augen:** Messgröße ist die Irismitte relativ zum Kopf, nicht die Pupille. Primär Bildpunkte und normierte Irisverschiebung, Grad nur nach geprüfter Kalibrierung. Augenausschnitte nie speichern. Ohne Güte je Bild keine Augenkurve.
- **Python:** `python3` im PATH ist die FSL-Python, nicht verwenden. venv: `/opt/homebrew/bin/python3.13 -m venv .venv`.
- **Erkennung im eigenen Thread,** nie in der Kameraschleife. Bildzeit, Analysebeginn und -ende getrennt führen. Treffer je Modell zählen.
- UI-Sprache Deutsch, Zahlen mit deutschem Komma.
- Commits, Pushes und Dependency-Installationen nur auf Ansage.
