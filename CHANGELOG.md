# Änderungen

## Unveröffentlicht

Taktung: Sprünge kommen in allen Modulen zufällig alle 1,5 bis 3 s statt alle 0,9 bis 1,8 s, wie im VNG-Sakkadentest üblich; das Sakkaden-Modul dauert rund 40 s. Das Modul Spontan- und Blickrichtungsnystagmus dauert rund 40 s statt rund 50 s: Ruhe 10 s, danach alle vier Blickrichtungen in einer Etappe ohne Karte dazwischen, horizontal je 6 s, vertikal je 4 s. Ein Versuch mit 20 s je Seite nach klinischer Praxis war im Test zu lang. Alle Werte sind Arbeitswerte, Herleitung in `docs/KONZEPT_VERBESSERUNG.md`.

Sicherheit: Eine präparierte Messdatei konnte im Bericht Code ausführen, der unter dem Ursprung der App lief. Alle Dateiwerte werden jetzt entschärft, Anstrengung und Wiederholungen nur noch als gültige Zahlen übernommen. Beide Seiten verbieten eingebetteten Code und eingebettete Stile per Content-Security-Policy, der Bericht zusätzlich Bilder, Medien, Worker und Netzabrufe. Der lokale Auslieferer lehnt fremde Hostnamen ab, lässt sich nicht einbetten und sendet keinen Referrer.

Aufbau: Der Bericht ist in Ansicht, Seitenskript und Stildatei getrennt, die Ansicht ist ohne Browser testbar. Ein neuer Test setzt in jedes Feld eines Beispiellaufs, auch nur mit Optokinetik, Markup als Text, Liste und Objekt ein und prüft, dass keines davon im Bericht ankommt.

## 0.1.0

Erste Fassung als Ocumotion: Module für Spontan- und Blickrichtungsnystagmus, Blickfolge, Sakkaden und experimentelle Optokinetik, kurze Kalibrierung mit Punktwolke, Bericht Oculytics, alles lokal im Browser.
