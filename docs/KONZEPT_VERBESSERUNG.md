# Konzept: Verbesserung nach dem Review vom 02.11.2026

Stand 02.11.2026, Commit `2edf320`. Noch nicht umgesetzt. Grundlage: externes Code-Review, am Code nachgeprüft, dazu die Nachrechnung der Kalibriernote an zwei eigenen Läufen.

## 1. Prüfung des Reviews

| Befund im Review | Prüfung am Code | Einstufung hier |
|---|---|---|
| Worker-Absturz nach `ready` hängt die Erkennung auf | **Stimmt.** `worker.onerror` ruft nach `ready` nur ein wirkungsloses `reject()`. Offene Anfragen in `waiting` bleiben offen, `detector.busy` bleibt `true` ([app.js:302](../app/app.js)), jedes weitere Bild zählt nur noch als übersprungen. Der Stillstandswächter (`STALL_MS`) sieht es nicht, weil `lastFrameAt` im Kamera-Callback gesetzt wird, nicht nach der Erkennung. Der Lauf misst still weiter ins Leere. | P1 |
| JSON-Import ohne Größenlimit, Schema und Version | **Stimmt.** Kein Limit, keine Formatversion im Export (nur `REPORT_VERSION` des Berichts), fehlendes `pursuit` oder `gaze` endet in „Datei nicht lesbar“ mit einer technischen Meldung. Die Folge ist aber nur ein hängender oder abstürzender eigener Tab, kein Datenabfluss: XSS ist seit `2edf320` geschlossen. | P2, kein P1 |
| Einordnung „innerhalb/außerhalb“ wirkt klinischer, als die Daten tragen | **Stimmt.** Die Grenzen stammen aus einer Person und einem Gerät. Die Kalibriernote zeigt dasselbe Problem im Kleinen (Abschnitt 2.3). | P1 |
| GPU-only, kein CPU-Fallback | **Stimmt.** `delegate: "GPU"` fest in [landmarker.js:17](../app/kamera/landmarker.js), Worker- und Hauptthreadweg nutzen denselben Aufruf. Der genutzte Delegate wird nicht im Lauf vermerkt. | P2 |
| Makefile setzt Homebrew-Python | **Stimmt, aber klein.** Die README startet ohnehin mit `python3 serve.py`. Auf dem Entwicklungsrechner ist `python3` die FSL-Python, daher kein blindes `python3` als Vorgabe. | P3 |
| Keine Browsertests in der CI | **Stimmt.** Der Trockenlauf deckt das meiste ab, läuft aber nur von Hand. | P2 |
| `MESSUNGEN.md` enthält individuelle Augenwerte, dem Konto zuordenbar | **Stimmt.** Die Datei ist öffentlich und in der Git-Geschichte. Messwerte sind gesundheitsnahe Daten einer erkennbaren Person. Entscheidung liegt beim Nutzer. | P1, Entscheidung |
| `ROADMAP.md` ist veraltet | **Stimmt.** Sie führt noch den Gestenfahrplan E0 bis E8, neben `PRODUKTPLAN.md`. | P3 |

**Ergänzt, im Review nicht genannt:**
- Exportierte Läufe tragen keine Formatversion. Ohne sie ist eine saubere Migration alter Dateien nicht möglich.
- Die Kalibriernote zählt rohe Einzelbilder in einer gemeinsamen Ellipse aus ±2° h und ±3° v. Dadurch zieht die bekannt schwache Vertikale eine gute Horizontale auf „Schlecht“ (Abschnitt 2.3).

## 2. Arbeitspakete

Reihenfolge nach Wirkung und Risiko. Jedes Paket ist für sich abschließbar und endet mit grünen Tests und, wo sichtbar, einem Trockenlauf.

### 2.1 Erkennung robust machen (P1)

- **Fehler nach `ready`:** `onerror`, `onmessageerror` und ein neues Signal `crashed` lehnen alle offenen Anfragen ab und setzen den Erkenner auf „ausgefallen“.
- **Wächter für die Erkennung:** Dauert eine Anfrage länger als eine feste Zeit (Arbeitswert 2 s, Messung siehe unten), gilt die Erkennung als hängend. Der Lauf bricht mit klarer Meldung ab, wie beim Bildstillstand. Kein stilles Weitermessen.
- **Rückfall:** Nach Ausfall einmal neu starten, zuerst Worker, dann Hauptthread. Ein Lauf, in dem gewechselt wurde, wird im Export vermerkt und nicht gemischt ausgewertet.
- **Delegate:** Erst GPU, bei Fehler CPU. Der tatsächlich genutzte Delegate steht im Lauf (`detector: "Worker/GPU"`). Die CPU-Rate wird gemessen und in `MESSUNGEN.md` eingetragen, bevor sie als unterstützt gilt; vorher zeigt die App bei CPU einen Hinweis.
- **Tests:** Erkenner mit einem Kunst-Worker, der nach `ready` abstürzt, hängt oder Fehler meldet. Erwartung: Anfrage wird abgelehnt, `busy` fällt zurück, Meldung erscheint.
- **Fertig, wenn** ein absichtlich abgeschossener Worker im Trockenlauf zu einer sichtbaren Meldung führt und kein Bild danach als Messwert zählt.

### 2.2 Messdateien: Format, Prüfung, Grenzen (P2)

- **Formatversion im Export:** `format: "ocumotion-lauf-1"`. Ältere Dateien ohne Feld gelten als Format 0 und laufen über eine kleine Migration, die fehlende Listen (`gaze`, `pursuit`, `okn`) ergänzt.
- **Prüfung vor der Auswertung** in einem eigenen Modul `messung/datei-pruefung.js`, ohne Fremdbibliothek:
  - Dateigröße höchstens 50 MB, vor dem Lesen (`file.size`).
  - Bekanntes Format, sonst klare Ablehnung mit Namen des Formats.
  - Struktur: erwartete Listen sind Listen, Ziele haben endliche Zahlen.
  - Werte: Zahlen endlich, Zeitstempel aufsteigend, Anzahl Bilder je Teil begrenzt (Arbeitswert 100.000).
  - Fehlermeldung für Menschen („Blickfolge fehlt“), nicht der Stacktrace.
- **Tests:** zu große Datei, falsches Format, fehlende Teile, `NaN`/`Infinity`, rückwärts laufende Zeit, alte Datei ohne Format. Der bestehende Markup-Test bleibt.
- **Fertig, wenn** jede der Testdateien entweder sauber angezeigt oder mit verständlicher Meldung abgelehnt wird, ohne den Tab zu blockieren.

### 2.3 Kalibriernote und Einordnungen fachlich ehrlich machen (P1)

Nachgerechnet an zwei Läufen einer Person, die Werte stehen lokal (Abschnitt 2.5): Die Wolken sind kompakt, um ihre eigene Mitte liegt der größte Teil der Bilder im Zielbereich. Die Note fällt trotzdem ab, weil sie den vertikalen Versatz der Wolken mit der guten Horizontalen verrechnet und rohe statt gefilterter Einzelbilder zählt. Horizontal allein wäre die Note in beiden Läufen deutlich besser gewesen.

- **Note je Achse.** Die Horizontale trägt die Hauptmessungen und bekommt die Hauptnote. Die Vertikale bekommt eine eigene Angabe und zieht die Horizontale nicht mehr herunter.
- **Zwei Kennwerte statt Einzelbild-Anteil:**
  - Genauigkeit: Versatz der Wolkenmitte zum Ziel, je Prüfpunkt.
  - Ruhe: Streuung der gefilterten Werte, wie in der Auswertung.
- **Modell aus allen Punkten, geprüft mit herausgenommenem Punkt.** Die Prüfpunkte gehen ins endgültige Modell ein; der Prüffehler entsteht reihum mit je einem herausgenommenen Punkt. Vorher an den beiden Läufen nachrechnen, ob der systematische Versatz sinkt. Bringt es nichts, entfällt dieser Punkt.
- **Einordnungen im Bericht:** „innerhalb/außerhalb“ wird zu „innerhalb/außerhalb der Arbeitsgrenze“, jede Grenze mit Herkunft und Zahl der Personen und Geräte, an denen sie gemessen ist. Messwert und Datenqualität stehen vor der Einordnung. Der Bericht zeigt oben, auf wie vielen Personen die Grenzen beruhen (derzeit 1).
- **Grenzen versionieren:** Alle Schwellen in eine Tabelle mit Version, Herkunft und Datum (`messung/grenzen.js`), die Version geht in jeden Export und Bericht. So bleibt nachvollziehbar, mit welchen Grenzen ein alter Bericht entstand.
- **Fertig, wenn** beide Läufe nachgerechnet in der lokalen Datei stehen, in `MESSUNGEN.md` nur der Befund ohne Augenwerte, die neue Note an ihnen erklärt ist und der Bericht keine Einordnung ohne Herkunft mehr zeigt.

Was dieses Paket **nicht** leistet: Gültigkeit für andere Menschen. Dafür braucht es Abschnitt 2.6.

### 2.4 Browser-Smoke-Test und Start (P2)

- **Smoke-Test:** Trockenlauf eines kurzen Moduls, Bericht aus der Messung bauen, CSP-Verstöße zählen, Erkennerausfall aus 2.1 auslösen. Zwei Wege, Entscheidung offen (Abschnitt 3):
  - **A, mit Playwright** als Entwicklungsabhängigkeit: verlässlich, in der CI mit Chromium. Braucht Freigabe.
  - **B, ohne Abhängigkeit:** Node startet Chrome im Headless-Modus und steuert es über das DevTools-Protokoll mit dem eingebauten `WebSocket`. Mehr eigener Code, keine neue Abhängigkeit.
- **Vollbild im Test:** Der Trockenlauf bekommt eine Option `?trockenlauf&fenster`, die das Vollbild überspringt und das im Lauf vermerkt. Bisher ist ein automatischer Lauf ohne Eingriff in die Seite nicht möglich.
- **Makefile:** `PYTHON ?= $(shell command -v python3.13 || command -v python3)`, Mindestversion 3.9 in der README. Auf dem Entwicklungsrechner bleibt Homebrew-Python vorn.
- **Gerätematrix** in `MESSUNGEN.md`: Browser, Version, Gerät, Delegate, Analyserate, geprüft am. Safari als nächster Eintrag.
- **Fertig, wenn** die CI den Smoke-Test bei jedem Push fährt und ein CSP-Verstoß oder hängender Erkenner ihn rot macht.

### 2.5 Veröffentlichte Messwerte und Dokumente (P1 Entscheidung, P3 Aufräumen)

- **`MESSUNGEN.md`: entschieden am 02.11.2026, künftig trennen.**
  - Öffentlich in `MESSUNGEN.md` stehen ab jetzt nur technische Kennwerte: Analyserate, Aussetzer, Gültigkeitsanteil, Güte, Gerät, Browser, Delegate.
  - Individuelle Augenwerte (Ruhe, Drift, Gain, Sakkaden, Versatz, Kalibrierfehler, Stellung der Augen) kommen in `data/MESSUNGEN_PERSOENLICH.md`. `data/` ist schon von Git ausgeschlossen, die Datei bleibt lokal.
  - Neue Einträge in `MESSUNGEN.md` verweisen bei Augenwerten nur auf den lokalen Eintrag („Augenwerte lokal, Eintrag 02.11.“), ohne Zahlen.
  - Die Geschichte wird nicht bereinigt. Bereits veröffentlichte Werte bleiben in alten Commits.
  - Entschieden am 02.11.2026: Die bestehenden Augenwerte wandern auch aus der aktuellen Fassung von `MESSUNGEN.md` in die lokale Datei. Jeder betroffene Eintrag behält Datum, Aufbau und technische Kennwerte und bekommt den Verweis auf den lokalen Eintrag. Das senkt die Sichtbarkeit, entfernt die Werte aber nicht aus alten Commits.
  - Vorgehen: zuerst die lokale Datei vollständig schreiben und gegen das Original abgleichen, erst dann `MESSUNGEN.md` kürzen. Andere Dokumente (`KONZEPT_*.md`, `PRODUKTPLAN.md`, README) auf zitierte Augenwerte durchsuchen und gleich behandeln.
  - Die Projektregeln in `CLAUDE.md` bekommen dazu eine Zeile, damit künftige Sitzungen die Trennung einhalten.
- **Exporte:** Hinweis beim Speichern, dass die Datei Augen- und Kopfdaten enthält. Kein Wechsel am Verhalten, der Export bleibt ausdrücklich.
- **Dokumente:** `ROADMAP.md` nach `experimente/` verschieben und als Gestenfahrplan kennzeichnen. `PRODUKTPLAN.md` Zeile 3 („Das Repo bleibt privat“) korrigieren. README bekommt einen kurzen Einstieg: Stand, geprüfte Browser, Start, Tests, offene Validierung.

### 2.6a Taktung der Ziele (P2, Rückmeldung aus dem Test vom 02.11.2026)

Rückmeldung: Die Ziele kommen zu schnell hintereinander, der Lauf ist anstrengend. Vergleich mit klinischer Praxis; die Norm ANSI/ASA S3.45-2009 ist kostenpflichtig, ihr Volltext wurde nicht gelesen.

| Teil | Heute | Klinische Praxis | Einordnung |
|---|---|---|---|
| Sprünge Maßstab, Kurzlauf, Optokinetik | 0,9–1,3 s je Ziel | VNG-Sakkadentest: Ziel bleibt 1–4 s, Pausen variabel | **zu schnell**, unter der üblichen Spanne |
| Sprünge Sakkaden-Modul | 1,2–1,8 s | 1–4 s | am unteren Rand |
| Blickhalten | 4 s, im Kurzlauf 3,2 s | meist 20 s je Position, 30 s für Ermüdung und Rebound; Norm: Spontantest mind. 20 s je Position | **zu kurz** für einen Blickrichtungsnystagmus |
| Ruhe | 16 s | mind. 20 s | knapp darunter |
| Kalibrierung, Kurzfassung | 2,1 s je Punkt | VNG-Systeme schalten weiter, sobald fixiert ist; keine feste Zeit | vertretbar |
| Karten vor den Etappen | mind. 1 s, dann Leertaste | – | selbst bestimmt, kein Problem |

Vorschlag, alle Werte als Arbeitswerte:
- **Sprünge:** zufällige Abstände 1,5–3 s überall, auch in der Maßstabsetappe. Das liegt in der klinischen Spanne und nimmt die Hetze. Die Maßstabsetappe wird dadurch von rund 8 s auf rund 16 s länger, das Sakkaden-Modul von rund 24 s auf rund 36 s.
- **Blickhalten:** horizontal 20 s je Seite. Vertikal bleibt kürzer, weil die Vertikale ohnehin nicht freigegeben ist. Das macht das Nystagmus-Modul deutlich länger; dafür wird die Aussage zum Blickrichtungsnystagmus erst brauchbar.
- **Ruhe:** 20 s.
- **Rückkehr zur Mitte** nach jedem Blickhalten 2 s statt 1,5 s, als kurze Erholung.
- **Kalibrierung:** unverändert lassen; prüfen, ob Weiterschalten nach stabiler Fixation (wie VNG) später die feste Zeit ersetzt.
- **Fertig, wenn** die neuen Zeiten im Code stehen, die angezeigten Dauern stimmen und ein echter Lauf sich nicht mehr gehetzt anfühlt. Das ist eine Rückmeldung, keine Messung; in `MESSUNGEN.md` steht nur, dass die Taktung geändert wurde.

**Nachtrag 03.11.2026, umgesetzt:** Die Sprünge mit 1,5–3 s passen im Test. Das Nystagmus-Modul mit 20 s je Seite war im Test viel zu lang und ist auf rund 40 s gekürzt: Ruhe 10 s, alle vier Blickrichtungen in einer Etappe, horizontal je 6 s, vertikal je 4 s, Rückkehr 1 s. Das liegt bewusst unter der klinischen Praxis. Folgen: Ein Blickrichtungsnystagmus, der erst nach einigen Sekunden einsetzt oder abklingt, kann übersehen werden; Square-Wave-Jerks je Minute beruhen auf 10 s und sind grob. Beides steht im Bericht als Grenze, nicht als Befund.

Quellen: [Interacoustics, Gaze Stability](https://www.interacoustics.com/academy/balance-testing-training/videonystagmography/vng-gaze-testing-with-fixation), [Dizziness Depot, Saccades](https://hearinghealthmatters.org/dizziness-depot/2013/saccades), [Interacoustics, Kalibrierung](https://interacoustics.com/balance-testing-equipment/visualeyes/support/calibration-procedures), [NASA, Blickhalten 20 s](https://ntrs.nasa.gov/citations/20080026117), [ANSI/ASA S3.45-2009, Auszug](https://lindseyresearch.com/wp-content/uploads/2021/01/NHTSA-2020-0102-0005-Attachment_2_ANSI.pdf).

### 2.6 Validierung (P1, ausserhalb des Codes)

Ohne sie bleibt jede Einordnung eine Arbeitsgrenze. Reihenfolge, jeweils mit vorab festgelegten Auswertegrenzen:

1. **Wiederholbarkeit:** dieselbe Person, fünf Sitzungen an verschiedenen Tagen.
2. **Zweite Person, zweites Gerät.**
3. **Vergleich mit VOG** bei mindestens einer Person, zeitgleich oder direkt nacheinander.
4. **Echter Nystagmus:** nur in Zusammenarbeit mit einer Fachstelle, mit deren Freigabe.

Messreihe B7 aus dem Produktplan passt hier hinein.

## 3. Offene Entscheidungen

| Frage | Optionen | Empfehlung |
|---|---|---|
| Browser-Smoke-Test | Playwright (Abhängigkeit) oder eigenes DevTools-Skript | Playwright, wegen Wartbarkeit; nur mit Freigabe |
| `MESSUNGEN.md` | lassen, künftig trennen, Geschichte bereinigen | **entschieden: künftig trennen** |
| Bestehende Augenwerte in `MESSUNGEN.md` | stehen lassen oder in die lokale Datei verschieben | **entschieden: verschieben** |
| Kalibriermodell aus allen Punkten | ja, nur nach Nachrechnung | erst nachrechnen |
| CPU-Delegate | anbieten oder nur melden | erst messen, bis dahin nur melden |

## 4. Vorschlag zur Reihenfolge

1. 2.1 Erkennung robust machen.
2. 2.3 Kalibriernote, Nachrechnung zuerst.
3. 2.2 Messdateien.
4. 2.5 Entscheidung zu `MESSUNGEN.md`, Dokumente aufräumen.
5. 2.4 Smoke-Test und Start.
6. 2.6 Validierung, laufend.
