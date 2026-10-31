# Mac Vision — Konzept Gütetest

Stand 31.10.2026. Gebaut in `testseite/augen.html` und `testseite/guetetest-logik.js`, mit echtem
Gesicht noch nicht gelaufen. Alle Bewertungsgrenzen sind experimentell.

## Ziel

Ein Start-Button, rund 2,5 Minuten, und danach eine belastbare Antwort: Wie gut misst das Werkzeug
bei dieser Kamera, diesem Licht und dieser Einstellung? Der Test bewertet das Werkzeug, nicht die
Person. Er setzt eine unauffällige Okulomotorik der Testperson voraus.

## Vorbereitung

1. Helles Licht von vorn, Brille ab, Kopf aufstützen.
2. Abstand Augen–Bildschirm auf 40 cm messen, Kamera starten, Hinweis im Bild folgen.
3. „Gütetest starten“. Ohne gemerkte Position merkt der Test sie selbst, wenn das Gesicht ruhig ist.

## Ablauf

| Teil | Dauer | Aufgabe | Beantwortet |
|---|---|---|---|
| 1 Kalibrierung | 59 s | 8 Anpassungs- und 6 Prüfziele | Abbildung auf Grad, Güte je Auge |
| 2 Ruhe | 20 s | Punkt ansehen, normal blinzeln | Streuung, Drift, gültige Bilder |
| 3 Genauigkeit | 18 s | 6 neue Ziele | Fehler an Orten, die nie angepasst wurden |
| 4 Blickfolge | 24 s | Sinus ±10° mit 0,25 und 0,5 Hz | Gain, Verzögerung, Aufholsakkaden |
| 5 Sakkaden | 22 s | 12 Sprünge in zufälligem Takt | Gain, Latenz, Erkennungsrate |

Dazu kommen kurze Ansagen, zusammen rund 2,5 Minuten.

**Bewusst nicht enthalten:** Kopf-Störtest und Bewegung des Kopfes, denn sie würden die Kalibrierung
im selben Lauf zerstören. Der Störtest bleibt ein eigener Schritt.

## Warum diese Prüfungen

- **Neue Ziele** sind die wichtigste Prüfung: Sie liegen weder in der Anpassung noch in den Prüfzielen
  der Kalibrierung.
- **Blickfolge** ist der beste Glättungstest: Modellglättung senkt den Gain und erhöht die Verzögerung.
- **Sakkaden** zeigen, ob schnelle Sprünge erhalten bleiben oder verschliffen werden.
- **Rauschen aus der Seitendifferenz:** Beide Augen bewegen sich beim Gesunden gleich. Die Streuung ihrer
  Differenz ÷ √2 schätzt also den Messfehler, unabhängig von echter Fixationsunruhe. Sie gilt nur, wenn
  die Fehler beider Augen unabhängig sind; gemeinsame Fehler wie Kopfbewegung sieht sie nicht.

## Echte Daten ohne Video

Gemessen wird am echten Kamerabild, live im RAM. Es entsteht keine Videodatei. Der Grund ist die
Projektregel, und die Iris ist ein starkes biometrisches Merkmal. Der Preis: Modelle und Parameter
lassen sich nicht nachträglich am selben Material vergleichen; dafür braucht es jeweils einen neuen Lauf.

Nichts wird automatisch gespeichert. Am Ende gibt es zwei freiwillige Knöpfe, und die Seite warnt
vor dem Verlassen oder einem neuen Lauf, wenn noch nicht gespeichert wurde:

- **Testlauf speichern:** JSON im Downloads-Ordner mit Rohwerten je Bild, Reizzeiten, Kalibrierung,
  Einstellungen. Keine Bilder. Die Datei ist personenbezogen und gehört gelöscht, sobald sie
  ausgewertet ist. Sie gehört nicht ins Repo.
- **Bericht kopieren:** Text mit allen Kennwerten.

## Regeln

- Besteht die Kalibrierung nicht, läuft der Test mit dem vorhandenen Modell weiter und kennzeichnet das
  Ergebnis. Sonst gingen genau die Daten verloren, mit denen sich die Schwellen einstellen lassen.
  Grad werden dann nicht in die Anzeige übernommen.
- Esc, verdecktes Fenster, Bildstillstand, Kamerastopp und starke Kopfbewegung brechen den Lauf ab.
  Ein abgebrochener Lauf liefert keinen Bericht. Mittlere Bewegung wird nur je Ziel gezählt und im
  Bericht ausgewiesen.
- Bei `Modellglättung an` sind Blickfolge und Sakkaden nur begrenzt aussagekräftig. Sinnvoll ist ein
  zweiter Lauf mit `aus`; der Vergleich beider Läufe zeigt den Effekt der Glättung.

## Bekannte systematische Fehler

- **Latenz und Verzögerung** enthalten die Bildverarbeitung von Kamera und Browser. Liefert der Browser
  keine `captureTime`, gilt die Zeit des Bild-Callbacks. Die Absolutwerte sind deshalb zu groß; Vergleiche
  zwischen Läufen bleiben brauchbar.
- **Reize** erscheinen frühestens mit dem nächsten Bildaufbau. Der Sakkadenzeitpunkt wird dort erfasst,
  die Blickfolge nutzt die berechnete Sollkurve.
- **Maßstab:** Stimmen Abstand oder Bildschirmbreite nicht, sind alle Grad um denselben Faktor falsch,
  ohne dass der Test das zeigt. Gain 1 belegt nur die Übereinstimmung mit der eigenen Kalibrierung.
- **Hauptthread:** Erkennung und Reiz teilen sich einen Thread, Ruckler sind möglich.

## Trockenlauf

`augen.html?trockenlauf` ersetzt Kamera und Modell durch ein simuliertes Gesicht, das dem Punkt exakt
folgt. So lässt sich der Ablauf mit bekannter Antwort prüfen. Ergebnisse daraus sagen nichts über echte Augen.

## Wie es danach weitergeht

1. Erster Lauf mit Bericht, möglichst mit Zahlenreihe.
2. Zweiter Lauf mit `Modellglättung aus`, dritter bei wechselndem Licht oder Abstand.
3. Schwellen an diesen Daten festlegen, dann Worker und eigene Irisrandanalyse gegen denselben Test messen.
