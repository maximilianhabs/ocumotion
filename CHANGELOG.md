# Änderungen

## Unveröffentlicht

Sicherheit: Eine präparierte Messdatei konnte im Bericht Code ausführen, der unter dem Ursprung der App lief. Alle Dateiwerte werden jetzt entschärft, Anstrengung und Wiederholungen nur noch als gültige Zahlen übernommen. Beide Seiten verbieten eingebetteten Code und eingebettete Stile per Content-Security-Policy, der Bericht zusätzlich Bilder, Medien, Worker und Netzabrufe. Der lokale Auslieferer lehnt fremde Hostnamen ab, lässt sich nicht einbetten und sendet keinen Referrer.

Aufbau: Der Bericht ist in Ansicht, Seitenskript und Stildatei getrennt, die Ansicht ist ohne Browser testbar. Ein neuer Test setzt in jedes Feld eines Beispiellaufs, auch nur mit Optokinetik, Markup als Text, Liste und Objekt ein und prüft, dass keines davon im Bericht ankommt.

## 0.1.0

Erste Fassung als Ocumotion: Module für Spontan- und Blickrichtungsnystagmus, Blickfolge, Sakkaden und experimentelle Optokinetik, kurze Kalibrierung mit Punktwolke, Bericht Oculytics, alles lokal im Browser.
