# Mac Vision — Fahrplan

Stand 31.10.2026. Begründungen stehen in `KONZEPT.md`. Jede Etappe endet mit einer
Messung oder einer sichtbaren Funktion, nicht mit Code allein.

| Etappe | Inhalt | Fertig, wenn | Stand |
|---|---|---|---|
| E0 | Projekt, Konzept, Kameramodi | `make kamera` läuft, Konzept steht | **erledigt** |
| E1 | Livebild, Handmodell, Overlay, Machbarkeit | Analyserate mit Hand im Bild ist gemessen | als Nächstes |
| E2 | Hand, Gesicht und Körper zusammen | Tabelle: Rate und Auslastung je Kombination | offen |
| E3 | Statische Gesten in der App | Erster Test: Fehlauslöser in 10 min Arbeit; Abnahme siehe `KONZEPT.md` Abschnitt 7 | offen |
| E4 | Wischgesten und eigene Gesten | eigene Geste mit wenigen Beispielen angelernt | offen |
| E5 | Steuerung des Mac | Freigabeliste, Not-Aus, sichtbarer Zustand laufen | offen |
| E6 | Messen, Güte, Speichern | Taktgeber-Kalibrierung intern und iPhone liegt vor | offen |
| E7 | Analysen: Tapping, Tremor, Gesicht | Vortests bestanden, Grenzen dokumentiert | offen |
| E8 | Optional: Apple Vision, Sprachmodell | Vergleich gegen MediaPipe liegt vor | offen |
| A0–A7 | Augen, Blickrichtung, Nystagmus | siehe `KONZEPT_AUGEN.md` Abschnitt 6 | Augenseite steht, **aktueller Schwerpunkt** |
| P1 | Eigenständiger iPhone-Modus, nativ mit ARKit | siehe `KONZEPT_IPHONE_MODUS.md` | Pipeline, nicht begonnen |
| O1–O7 | Kalibrierung und Okulomotorik-Untersuchung | siehe `KONZEPT_OKULOMOTORIK.md` Abschnitt 5 | Kalibrierung gebaut, Untersuchungen geplant |

A0 bis A4 laufen im Browser und brauchen keine Installation, also auch kein E1 in Python.

**Nächster Schritt:** je ein echter Lauf der Protokolle mit Etappen, siehe `PROTOKOLLE.md` und `KONZEPT_PROBANDENFUEHRUNG.md`. Danach Stufe B1 aus dem Backlog unten.
Der visuelle Bericht liegt unter `app/bericht.html`, Zielbild in `KONZEPT_VISUELLER_OKULOMOTORIKREPORT.md`.
Danach die einmalige Kameramessung, siehe `KONZEPT_OKULOMOTORIK.md` Abschnitt 2b, und der Vergleich mit dem
iPhone als Kamera, siehe `KONZEPT_UEBERTRAGBARKEIT.md`.

## Reihenfolge

1. Testseite als Messwerkzeug: getrennte Statistik je Modell, Bildzeit und Sitzungszustände. **Erledigt.**
2. Augenmodus mit Rohkurven und Gültigkeitsanzeige (A1). **Erste Fassung steht:** `app/index.html`, auf Wunsch vor dem Worker gebaut, nur mit MediaPipe-Irispunkten.
   Individuelle Kalibrierung und gewichteter Mittelwert sind vorgezogen; mit echtem Gesicht ungeprüft.
3. Vortest, dann Bildquelle und Analyse in Web Worker umstellen (siehe `IMPLEMENTIERUNGSNOTIZ_CODEX.md`); eigene Irisrandanalyse ergänzen.
4. Künstliches Auge und Kopf-Störtest.
5. Verfahren bei mehreren Abständen und Lichtbedingungen vergleichen.
6. Früher Vergleich mit VOG.

Gestensteuerung und Mac-Steuerung warten, bis diese Machbarkeitsfrage beantwortet ist.

**Vor belastbaren Messungen noch offen:** Modelle und Laufzeit lokal mit Prüfsumme bereitstellen,
Betrieb ohne Netzwerk testen.

## Backlog Untersuchung und Befund

Aus einer externen Recherche vom 31.10.2026. Die Aussagen zum eigenen Code sind am Code geprüft. Die Literaturangaben unter
„Quellen“ sind übernommen und noch nicht im Original gelesen; vor jeder Verwendung im Bericht gegenlesen.

**Leitlinie:** Die Grundstruktur bleibt. Der Kurztest ist ein begrenztes Screening, keine verkürzte VOG. Kern sind Fixation, Blickhalten,
Sakkaden und Blickfolge; Optokinetik ist Ergänzung, Antisakkaden gehören nicht in die Routine.

### B1 — Aussagen korrigieren, vor weiterer Deutung

| Punkt | Stelle | Änderung |
|---|---|---|
| Messfreigabe hängt an der Leistung | `axisUsable()`: Endlagen-Gain ±0,3 | Echte Dysmetrie darf nicht als schlechte Messung gelten. Für Gesunde als technische Plausibilität behalten, aus der Patientenfreigabe nehmen |
| Endlage ersetzt erste Landung | `judgeSaccades()`: `firstGain ?? endGain` | Ersatz streichen; fehlt die erste Landung, ist die Metrik nicht beurteilbar |
| Erste Landung ungenau | festes Fenster ab 25 % der Zielamplitude | Korrekturen können hineinfallen. Primärsakkade als eigenes Ereignis bestimmen |
| OKN als „unauffällig“ | `oknStatus()` | Stattdessen „reizkonforme Antwort nachweisbar“ |
| Kontrolle als Artefakt-Beweis | `controlVerdict()`: „spricht gegen ein Reflexartefakt“ | Nur noch Beobachtung, kein validierter Ausschluss |
| Detektion klingt wie Nachweis | Text „Nachweisgrenze“ bei 1,5° und 3° | Heißt Mindestgröße der Erkennung; die echte Nachweisgrenze ist nicht gemessen |
| SWJ hochgerechnet | Rate je Minute aus 16 s mit Ampel | Nur „n Kandidaten in t Sekunden“, keine Ampel aus so kurzer Zeit |
| Ampel und Arbeitsgrenzen vermischt | `LIMITS` | Technische Arbeitsgrenzen von klinischer Einordnung trennen; Detektionsschwelle, Einordnung und Krankheitsgrenze getrennt führen. Hängt mit Zweckbestimmung in `ROAD_TO_PUBLIC.md` Stufe 1 zusammen |
| Untersuchter Winkel | Bericht | Tatsächlichen Winkel nennen. ±30° sind am Bildschirm nicht erreichbar, bei 40 cm rund ±20° |

### B2 — Protokoll

| Punkt | Änderung |
|---|---|
| Sakkaden zu vorhersagbar | Richtung und Ziel pseudorandomisieren, nicht nur die Wartezeit |
| Position und Amplitude | Von +10° nach −10° sind es 20°. Zunächst echte 10°-Sprünge, weitere Größen als eigene Bedingung; Rückkehr zur Mitte getrennt auswerten |
| Blickfolge in Geschwindigkeit angeben | `v_max = 2π·f·A`. Heute 0,25 Hz und 0,5 Hz bei ±10°, also 15,7 und 31,4 °/s. Vorschlag: 0,2 und 0,4 Hz mit je mindestens drei Zyklen, 0,1 Hz als leichte Variante. Frequenz, Amplitude und `v_max` in den Bericht |
| Blickfolge-Gain | Heute Amplitudenverhältnis des Sinus-Fits (`gain` in `analysePursuit`) mitsamt Sakkaden. Besser Geschwindigkeit der glatten Anteile ohne schnelle Ereignisse im ganzen Fenster, dazu Phase, Seitensymmetrie, Sakkadierung, Abdeckung |
| Sakkaden-Kennwerte | Primär-Gain, Landefehler, Korrektursakkaden, Endlagefehler, Latenz, Seitenvergleich |
| Drei Profile | Kurz als Screening, Standard für die Kernfunktionen mit definierten Reizen, Lang mit Wiederholungen und Zusatzmodulen. Der Bericht nennt den tatsächlichen Umfang |
| Längeres Blickhalten | Nur im Langprofil und in Etappen. Die veröffentlichten 15 s je Bedingung stehen gegen die Anstrengung; 4 s bleiben ein kurzer Eindruck, ohne echten Nystagmus nicht geprüft |
| Optokinetik | Aus dem Pflicht-Kurzlauf nehmen. Verfolgen („look“) und reflexnahes Betrachten als getrennte Aufgaben führen und im Export kennzeichnen. 8 °/s ist Funktionstest, kein klassischer Ganzfeld-OKN; Feldgröße, Periode und Anweisung in den Bericht |

### B3 — Validierung

- Reihenfolge: Endpositionen und grobe Muster, dann Primärsakkaden und Korrekturen, dann Latenz über die Reiz-Bild-Zeit.
- Spitzengeschwindigkeit bleibt gesperrt, solange die Messkette dafür nicht geprüft ist. Keine Genauigkeit durch Hochinterpolieren behaupten.
- Referenzwerte nur passend zu Aufgabe, Gerät und Alter; fremde Intervalle nicht auf diesen Aufbau übertragen.
- Reproduzierbarkeit und VOG-Vergleich ersetzt keine Literatur.

### B4 — Ideen für eigene Projekte, nicht Teil dieses Plans

- **Pupillenreaktion mit dem iPhone:** Rückkamera und Lampe messen je Auge Größe und Reaktion, Tonsignal für Abstand und erkanntes Auge. Offen: Kontrast bei dunkler Iris im sichtbaren Licht, Augensicherheit der Lampe, Vergleichbarkeit einzeln gemessener Augen, Zweckbestimmung. Braucht eine native App.

### Quellen, noch nicht im Original gelesen

British Society of Audiology, Recommended Procedure Vestibular Assessment – Eye Movement Recordings (2015) · Kullmann et al., PLOS ONE 2021
und Laryngoscope Investigative Otolaryngology 2021 · Demian et al., Clinical Saccadometry 2023 · Bastani et al., EyePhone 2024.

## E1 im Detail

1. venv mit `/opt/homebrew/bin/python3.13` anlegen, nur nach Freigabe der Abhängigkeiten.
2. Benötigt werden voraussichtlich `mediapipe`, `fastapi`, `uvicorn`.
3. Modell mit SHA256-Prüfung nach `models/` laden.
4. Kamera öffnen und die tatsächliche Bildrate bei Tageslicht und bei wenig Licht messen.
5. Erkennung im eigenen Thread, Livebild mit Overlay auf `127.0.0.1:5600`.
6. Messen: Analysen/s **mit** Hand im Bild, ms je Durchlauf, CPU, RAM und Akku-Verbrauch.
7. Zum Vergleich dieselbe Messung in MediaPipe Web als einfache Testseite.

Punkt 7 ist vorgezogen: Die Testseite `experimente/handtest/index.html` steht (`make handtest`,
`http://127.0.0.1:5602`) und zeigt je Modell Treffer/s, vorläufige Obergrenze, Dauer und längste Lücke.

Ergebnisse kommen nach `docs/MESSUNGEN.md`. Hält keiner der Wege annähernd die Kamerarate,
wird die Architekturentscheidung aus `KONZEPT.md` Abschnitt 4 neu getroffen.
