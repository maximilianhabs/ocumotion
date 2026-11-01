# Ocumotion — Untersuchungsprotokolle

Stand 01.11.2026. Die App startet einzelne Module aus `MODULES`, die Etappen stammen aus diesen Protokollen. Fehlt der Maßstab, kommt eine kurze Sprung-Etappe davor. Blickfolge seit dem 01.11. ±12° mit 0,2 und 0,4 Hz. Definiert in
`app/messung/protokolle.js`. Zeiten sind Entwürfe, keine normierten Untersuchungsdauern.

| Baustein | Kurzlauf, rund 1,5 min | Ausführlich, rund 3,5 min | Optokinetik, rund 1,5 min |
|---|---|---|---|
| Kalibrierung | keine | 14 Punkte in zwei Etappen, 56 s | keine |
| Neue Ziele | keine | 6 Punkte, direkt nach der Kalibrierung | keine |
| Primärposition | 16 s | 16 s | 3 s |
| Blickhalten rechts, links, oben, unten | je 4 s | je 5 s mit Einschwingen | keine |
| Blickfolge | langsam, 8 s | langsam 12 s, schnell 8 s | keine |
| Sakkaden | 7 horizontal, 4 vertikal | 8 horizontal, 4 vertikal | 7 horizontal, nur als Maßstab |
| Etappen | 5 | 9, längste 32 s | 3 |
| Optokinetik | je Richtung 7 s, 8°/s | keine | je Richtung 12 s, 8°/s, links zuerst |
| Kontrolle mit Fixationspunkt | keine | keine | 8 s |

Der ausführliche Lauf wurde nach dem Lauf vom 31.10. gekürzt, Begründung in `MESSUNGEN.md`. Die Optokinetik beginnt links, weil alle früheren
Läufe rechts begannen.

Jede Etappe beginnt mit einer Karte in der Bildmitte und läuft erst nach Leertaste oder Klick, siehe `KONZEPT_PROBANDENFUEHRUNG.md`. Die
Zeiten im Kopf enthalten rund 5 s je Karte; die Person bestimmt das Tempo. Prüfen ohne Kamera: `?trockenlauf`, mit echter Taste
`?trockenlauf&tasten`.

## Was jeder Lauf aussagen kann

| Frage | Kurzlauf | Ausführlich |
|---|---|---|
| Spontannystagmus, Blickrichtung, Up-/Downbeat | ja, als Muster | ja |
| Square-Wave-Jerks | nur grob, 16 s | nur grob, 16 s |
| Blickfolge glatt oder sakkadiert | ja, Gain grob | ja, langsam und schnell |
| Optokinetik reizkonform | ja, ohne Kontrolle | nein, eigener Knopf mit Kontrolle |
| Sakkaden metrisch, hypo- oder hypermetrisch | **nein** | ja, horizontal; vertikal nur bei freigegebener Achse |
| Zielgenauigkeit in Grad | **nein** | ja |

## Maßstab ohne Kalibrierung

Der Kurzlauf gewinnt einen groben Maßstab aus den Endlagen der Sprünge, weil deren Ziele bekannte Winkel haben.
An vier echten Läufen traf das horizontal auf 2–8 % zur vollen Kalibrierung (Zielfehler 1,2–2,8°), vertikal schwankte
es um rund 30 %. Weil der Maßstab aus den Sakkaden stammt, darf er ihre Metrik nicht beurteilen; das wäre ein
Kreisschluss. Alle °/s und Gains im Kurzlauf sind deshalb nur grob.

Dieselbe Logik gilt nicht für echte Patienten mit Dysmetrie: Ein krankhafter Sprung würde den Maßstab mit verfälschen.

## iPhone-Test

Behelf für den Kameravergleich, keine Messung für den Bericht: das Optokinetik-Protokoll ohne Kopfsperre und ohne Vollbildzwang. Die Position
wird genommen, wie sie ist, Kopfabweichungen werden nur vermerkt. Der Export nennt `headCheck`, `camera` und `fullscreen`.

## Sicherheit

Kurzlauf und Optokinetik zeigen bewegte Streifen. Ein Warnfenster gibt es im Eigentest nicht mehr; Safari verweigerte danach das
Vollbild. Bei bekannter Anfallsneigung oder Musterempfindlichkeit nicht durchführen. Esc bricht jederzeit ab.
