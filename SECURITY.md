# Sicherheitsrichtlinie

## Was als Sicherheitslücke gilt

Ocumotion verarbeitet Kamerabilder eines Gesichts und daraus abgeleitete Augenwerte. Als Sicherheitslücke gilt insbesondere:

- ein Weg, wie Kamerabilder oder Augenwerte das Gerät verlassen
- ein Weg, wie die App entgegen der Zusage Bilder speichert
- eine Lücke in der Content-Security-Policy, die fremden Code ausführbar macht
- die lokale Kamerabrücke unter `experimente/` nimmt Verbindungen fremder Webseiten an

Eine ungenaue Messung ist kein Sicherheitsproblem, sondern ein Fehler für ein normales Issue.

## Wie melden

Über die private Sicherheitsmeldung von GitHub im Reiter Security. Bitte keine Bilder von Gesichtern und keine echten Messdateien anhängen.

## Geltungsbereich

Geprüft wird die aktuelle Fassung auf `main`. Die App läuft lokal und hat kein Benutzerkonto und keinen Serverdienst außer dem lokalen Auslieferer auf `127.0.0.1`.
