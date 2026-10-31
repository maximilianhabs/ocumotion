# Konzept: Probandenführung und Etappen

Stand 31.10.2026. Gebaut, im Trockenlauf geprüft, noch nicht mit echtem Gesicht. Anlass: Der ausführliche Lauf war für die Testperson sehr anstrengend, die Hinweise unten am
Bildrand ziehen den Blick aus der Mitte, und zwischen den Phasen gibt es keine Erholung.

## Befund

| Beobachtung | Quelle |
|---|---|
| 248 s am Stück, ohne eine Erholung, die die Person selbst steuert | Lauf vom 31.10. |
| Kopf sinkt stetig, Nullpunkt wandert vertikal bis 5,7°, erste Kopfmarke bei 110 s | `MESSUNGEN.md` |
| Vertikale Streuung in Ruhe kippt ab 10 s | `MESSUNGEN.md` |
| Hinweis steht 14 px groß am unteren Rand (`#calText`), auch während der Messung | `augen.html` |
| Ansage läuft 2 s automatisch ab, lesen und Blick in die Mitte fallen in dieselbe Zeit | `announce()` |
| Ein Kopfabbruch verwirft den ganzen Lauf | `runExam()` |

Die Zeit zu kürzen hilft nur begrenzt. Der größere Hebel ist vermutlich die längste Strecke ohne Erholung, und die sinkt mit
Etappen von rund 250 s auf rund 30 s. Das ist eine Annahme, siehe Erfolgskriterien.

## Grundidee

Der Lauf besteht aus Etappen. Jede beginnt mit einer Karte in der Bildmitte: was kommt, wie lange, was zu tun ist. Während der Karte
wird nicht gemessen. Die Person blinzelt, erholt sich und drückt die Leertaste, wenn sie bereit ist. Erst dann läuft die Messung, und
in der Messung steht kein Text mehr auf dem Bildschirm.

## Ablauf einer Etappe

| Schritt | Bildschirm | Messung |
|---|---|---|
| 1. Karte | Mitte: Name, ein Satz Aufgabe, Dauer, „Schritt 3 von 9“ | aus |
| 2. Bereit | Leertaste, frühestens nach 1 s, damit die Karte gelesen wird und ein Tastendruck nicht versehentlich durchrutscht | aus |
| 3. Kopfprüfung | liegt der Kopf außerhalb der Grenze, Hinweis auf der Karte | aus |
| 4. Hinführung | Karte weg, Punkt in der Mitte, 1 s Ruhe | nur Nullpunkt |
| 5. Aufgabe | nur Punkt oder Streifen, kein Text | an |
| 6. Ende | nächste Karte | aus |

Keine Zeitgrenze auf der Karte. Ein Mausklick wirkt wie die Leertaste, damit auch eine zweite Person für jemanden weiterschalten kann,
der die Taste nicht bedienen kann. Esc bricht ab wie bisher.

Während der Karte läuft die Erkennung nur für die Kopfprüfung; Messwerte werden nicht gesammelt. Nach dem Tastendruck sackt der Kopf
oder Blick kurz nach, dafür ist Schritt 4 da.

## Karten des ausführlichen Laufs

Sie-Form, kurz, in der Bildmitte, groß. Die Dauer kommt aus dem Protokoll und wird gerundet, nicht von Hand geschrieben.

| # | Etappe | Text | Messdauer |
|---|---|---|---:|
| 1 | Kalibrierung Teil 1 | Folgen Sie dem Punkt nur mit den Augen, Kopf ruhig. | 32 s |
| 2 | Kalibrierung Teil 2 | Dasselbe noch einmal, mit anderen Punkten. | 24 s |
| 3 | Neue Punkte | Schauen Sie jeweils auf den neuen Punkt. | 18 s |
| 4 | Ruhe | Schauen Sie ruhig auf den Punkt. Blinzeln ist erlaubt. | 16 s |
| 5 | Blick zur Seite | Folgen Sie dem Punkt und halten Sie den Blick dort. | 13 s |
| 6 | Blick nach oben und unten | Folgen Sie dem Punkt und halten Sie den Blick dort. | 13 s |
| 7 | Blickfolge langsam | Verfolgen Sie den Punkt mit den Augen. | 12 s |
| 8 | Blickfolge schnell | Verfolgen Sie den Punkt, er ist jetzt schneller. | 8 s |
| 9 | Sprünge | Der Punkt springt. Schauen Sie sofort zum neuen Punkt. | 20 s |

Der Kurzlauf bekommt dieselbe Führung mit fünf Etappen: Ruhe 16 s, Blickrichtungen 19 s, Blickfolge 8 s, Sprünge 13 s, Streifen 15 s.
Der Knopf Optokinetik bekommt je eine Karte für Streifen und Kontrolle.

Fachbegriffe wie Sakkade oder Maßstab bleiben aus den Karten heraus.

**Reihenfolge geändert:** „Neue Punkte“ rückt direkt hinter die Kalibrierung. Eine schlechte Kalibrierung fällt so nach einer Minute auf,
nicht erst nach dem halben Lauf, und die Person kann sie gleich wiederholen. Der Verlauf über die Zeit bleibt über den Nullpunkt messbar.

## Zeitbilanz

| | Vor der Kürzung | Gekürzt, gebaut | Mit Etappen |
|---|---:|---:|---:|
| Messzeit, ohne Karten | 241 s | 165 s | rund 156 s |
| Dauer gesamt | 251 s | 171 s | rund 3:30 min bei 5 s je Karte, selbst bestimmt |
| Längste Strecke ohne Erholung | 248 s | rund 80 s, je nach Pause | 32 s |

Die Gesamtzeit steigt gegenüber der gerade gebauten Kürzung um eine knappe Minute, wenn die Person die Pausen nutzt. Das ist gewollt: Die
Zeit läuft dann in Erholung, nicht in Anstrengung.

## Gewinn für die Messung

**Nullpunkt je Etappe:** Schritt 4 misst vor jeder Aufgabe, wo die Mitte gerade liegt. Das ergibt aus demselben Lauf eine Kurve der
Wanderung, heute gibt es dafür nur Zufallswerte. Zunächst wird sie nur gezeigt. Ob sich damit Messwerte korrigieren lassen, entscheiden
erst die Daten, weil der Fehler rechts nach dem Lauf vom 31.10. kein reiner Versatz war.

**Etappe wiederholen statt alles verlieren:** Bei einem Kopfabbruch erscheint die Karte der Etappe erneut, die bisherigen Etappen bleiben.
Nur die wiederholte Etappe wird ersetzt, die Wiederholung steht im Bericht. Liegt der Kopf nach einer Etappe über der Abbruchgrenze, bleibt die
Karte stehen und bittet zurück in die Ausgangsposition. Die Referenz wird nicht neu gesetzt, weil die Kalibrierung an ihr hängt.

**Export:** je Etappe Start, Ende, Wartezeit auf der Karte, Nullpunkt, Kopfversatz und Zahl der Wiederholungen. Das sind keine Bilder.

## Weitere Entlastung

- **Vor dem Start:** Hinweis „Kopf anlehnen oder abstützen“. Der Kopf sank im Lauf stetig, eine Stütze sollte mehr bringen als jede Software.
- **Am Ende:** eine Frage, wie anstrengend es war, Skala 1 bis 5, im Export. So wird die Anstrengung messbar. Nur freiwillig, ohne weitere Angaben.
- **Später prüfen, nicht jetzt bauen:** Hintergrund abdunkeln. Heute ist der ganze Bildschirm hell (`#e7e5e4`). Ob das stört, ist nicht gemessen,
  und ein dunkler Grund ändert Pupille und Irisränder, kann also die Messung verschieben.

## Bau

1. **Karten und Etappen:** Karte in der Mitte, Leertaste, Hinführung, Text während der Messung weg, Kalibrierung in zwei Teile, „Neue Punkte“ vorziehen.
   Die bestehende Pause (`phasePause`) geht in diesem Mechanismus auf.
2. **Absicherung:** Nullpunkt je Etappe, Export, Anzeige im Bericht.
3. **Wiederholung:** Etappe wiederholen, Bericht vermerkt es.
4. **Rückmeldung:** Anstrengungsfrage, Hinweis auf die Kopfstütze.

Die Etappenlisten kommen als Daten in `protokolle.js`, die Regeln für Bereitschaft und Ablauf als reine Logik mit Tests. `plannedMs` rechnet
ohne Wartezeit, die Knöpfe nennen die Messzeit.

Umgesetzt mit zwei Ergänzungen: Die Kopfgrenze gilt jetzt auch am Ende von Ruhe, Blickfolge, Sprüngen und Streifen. Ist die Horizontale nach
der Kalibrierung nicht freigegeben, wiederholt eine Karte beide Teile einmal; scheitert das erneut, läuft der Lauf weiter wie zuvor, und
der Bericht rechnet mit der nicht freigegebenen Kalibrierung.

## Grenzen

- Ein Fehler in Kalibrierung Teil 2 kann auch durch die Pause entstehen, wenn sich der Kopf dazwischen bewegt. Das Tor in Schritt 3 mindert das, beseitigt es nicht.
- Pausen ändern nichts am Abbild echter Befunde bei Ruhe und Blickhalten, solange jede Aufgabe am Stück läuft. Ermüdungseffekte im langen Lauf
  werden aber schlechter sichtbar. Für diese Frage wäre später eine eigene Variante nötig.
- Die Karten sind noch nicht an fremden Personen geprüft.

## Erfolgskriterien

Am nächsten ausführlichen Lauf prüfbar, an einer Person, also nur als erster Hinweis:

- Anstrengung sinkt deutlich, Angabe der Testperson.
- Kein Kopfabbruch, Kopfwanderung über den Lauf kleiner als die 65 Bildpunkte vom 31.10.
- Nullpunkt vertikal über den Lauf unter 3° statt 5,7°.
- Neue Ziele horizontal unter 2° und damit im Bereich der früheren guten Läufe.
