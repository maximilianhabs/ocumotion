# Projektregeln mac-vision

Lokales Tracking und Gestensteuerung mit der internen Kamera des MacBook Pro M1.
Konzept: `docs/KONZEPT.md`. Stand und Etappen: `docs/ROADMAP.md`. Messprotokoll: `docs/MESSUNGEN.md`.
Vorbild: `~/Code/Programme Claude Code/homeserver/services/vision-lab/`. Module dort kopieren, nicht verknüpfen.

- **Nie ein Bild oder Video auf Platte.** Frames nur im RAM. Kontrollbilder am Sitzungsende löschen, auch im Scratchpad.
- **Lokal bleiben:** Oberfläche nur auf `127.0.0.1:5600`, nie `0.0.0.0`. Keine Cloud-Dienste für Bilder oder Landmarken.
- **Landmarken sind personenbezogen:** nur nach ausdrücklichem Start, als benannte, einzeln löschbare Messung.
- **Kamera nur bei Bedarf offen.** Kein Dauerbetrieb.
- **Erst messen, dann behaupten.** Leistungszahlen stehen erst nach einer Messung in den Dokumenten, und zwar mit Hand im Bild.
- **Messgrenze:** Analyserate ÷ 4, nicht Nyquist. Keine Frequenzen darüber ausgeben.
- **Jede Messung bekommt einen Gütewert.** Ohne Gütewert keine Kennzahl.
- **Gesten:** Scharfschalten, Haltezeit, Hysterese und Sperrzeit gelten immer. Aktionen nur aus der Freigabeliste; nichts, was löscht, sendet oder bestätigt.
- **Keine Emotionserkennung, keine Diagnose, keine Personenerkennung.**
- **Python:** `python3` im PATH ist die FSL-Python, nicht verwenden. venv: `/opt/homebrew/bin/python3.13 -m venv .venv`.
- **Erkennung im eigenen Thread,** nie in der Kameraschleife. Zeitstempel vom Bild übernehmen.
- UI-Sprache Deutsch, Zahlen mit deutschem Komma.
- Commits, Pushes und Dependency-Installationen nur auf Ansage.
