# Produktplan: vom Prototyp zur öffentlichen Software

Stand 01.11.2026. Etappe 1 ist gebaut und mit einem echten Kurzlauf bestätigt, siehe `MESSUNGEN.md`; die CI ist grün. Etappe 2 ist gebaut und mit einem Vergleichslauf geprüft, in Safari noch nicht. Das Repo bleibt privat, bis der Nutzer die Sichtbarkeit selbst ändert.
Die Prüfpunkte für die Veröffentlichung stehen in `ROAD_TO_PUBLIC.md`, dieser Plan legt die Reihenfolge fest.

## Ziel

Eine aufgeräumte, lokal laufende Software für Okulomotorik-Messungen mit der eingebauten Kamera eines Laptops, zuerst auf macOS.
Eine Fachperson öffnet sie, wird durch Einrichtung und Messung geführt und erhält einen Messbericht. Bilder verlassen nie das Gerät.

## Was aus dem Prototyp gelernt wurde

| Befund | Folge für das Produkt |
|---|---|
| Laptop-Kamera liefert stabile 30 fps, Bildtakt fast ohne Aussetzer | Sie bleibt die Hauptkamera, 30 fps sind der Normalfall |
| iPhone über Safari: 30 fps und mehr Rauschen; über Brücke 50–52 Bilder/s | Kein Teil der Hauptsoftware, bleibt unter `experimente/` |
| Kein OKN nachgewiesen, auch mit höherer Bildrate | Optokinetik öffentlich nur als „experimentell“ |
| Vertikale unzuverlässig, Horizontale nutzbar | Vertikale Werte im Bericht gekennzeichnet, nicht gleichwertig |
| Lauf am Stück war zu anstrengend, Etappen sind gebaut | Etappen bleiben Grundform, Wirkung am echten Lauf noch nicht bestätigt |
| Kameraliste, Vollbild und Bildrate unterscheiden sich je Browser | Gerätecheck vor jeder Messung statt stiller Fehlstarts |
| `window.confirm` kann in Safari das Vollbild sperren; Bedienfehler zeigten sich nur als „startet nicht“ | Keine Systemdialoge, jeder Fehlstart nennt den Grund im Bild |

## Plattform

**Entscheidung: eine statische Web-App ohne Server-Logik, alle Dateien im Repo.** Sie läuft im Browser und kann installiert werden.

| Weg | Vorteil | Nachteil | Einsatz |
|---|---|---|---|
| Statische Web-App, lokal gestartet | ein Code für macOS, Windows und Linux, keine Installation, leicht prüfbar | ein kleiner lokaler Server ist nötig | **Basis** |
| Dieselbe App auf GitHub Pages, installierbar und offline | kein Terminal, ein Klick | Pages protokolliert IP-Adressen, Fragen zu Impressum und Datenschutz, höherer Anspruch an die Texte | zweiter Schritt, eigene Entscheidung |
| Desktop-Hülle mit Tauri oder Electron | echtes Programmsymbol | Signierung und Notarisierung für macOS, sonst Warnungen; Mehraufwand je System | erst bei klarem Bedarf |
| Native App | Zugriff auf alles | je System neu bauen, neu prüfen | nicht geplant |

Laufzeit und Modell kommen ins Repo: rund 18 MB (Laufzeit 14,5 MB, Modell 3,8 MB, Bundle 0,2 MB), dazu Schriften. Damit läuft die App offline,
und Version und Prüfsumme stehen fest. Das Modell ist Fassung 1 statt `latest`, beide waren am 01.11.2026 identisch. Die Herkunft steht in `app/vendor/mediapipe/HERKUNFT.md`;
die Lizenz des Modells ist vor der Veröffentlichung im Original zu prüfen.

Erstes Ziel sind aktuelle Chrome- und Safari-Fassungen auf macOS. Windows und Linux gelten als „ungeprüft“, bis sie den Gerätecheck und einen echten Lauf bestanden haben.

## Umfang

**Bleibt:** Einrichtung, Kurzlauf, ausführlicher Lauf, Messbericht, Speichern und Öffnen der Messdatei, Trockenlauf als Prüfwerkzeug.

**Wird als experimentell markiert:** Optokinetik, vertikale Auswertung.

**Geht aus der Hauptsoftware:**

| Teil | Ziel |
|---|---|
| Hand-, Gesten- und Körpertest (`index.html`) | eigenes Experiment oder entfernen |
| iPhone-Test, Brücke, Kamerawerkzeuge | `experimente/` |
| Live-Kurven, Rohwerte, Glättungswahl | Bereich „Messdetails“, standardmäßig zu |
| Python-Auswertung, Gesten- und Tremor-Etappen E1–E8 | archivieren oder streichen |
| Übergabe- und Entwurfsdokumente | `docs/archiv/` oder entfernen, Historie bleibt unangetastet |

## Bedienung

Heute liegen Knöpfe, Anleitung, Kurven und Einstellungen auf einer Seite. Künftig führen vier Schritte, je Bildschirm genau eine Aufgabe:

1. **Start:** was die Software ist und nicht ist, was gemessen wird, „Kamerabilder bleiben auf diesem Gerät“. Hinweis zu bewegten Streifen, wenn das Protokoll sie enthält.
2. **Einrichten:** Gerätecheck, Bildschirmgröße mit Kartenvergleich, Abstand messen, Gesicht ausrichten. Ein Schritt ist erst grün, wenn er geprüft ist; jedes Rot nennt, was zu tun ist.
3. **Messen:** Protokoll wählen, Etappenkarten wie heute, Abbruch jederzeit.
4. **Ergebnis:** Messbericht, Güte zuerst, Datei speichern. Eine gespeicherte Datei lässt sich später wieder öffnen.

**Gerätecheck:** Kamera, tatsächliche Bildrate, Aussetzer, Bildschirmgröße, Vollbild, Modell geladen, Irisgröße im Bild. Ergebnis je Prüfung, mit Grund. Grenzen aus den
Kennwerten von dieser Kamera sind als Arbeitsgrenzen benannt, solange kein zweites Gerät gemessen ist.

Sprache: Deutsch und Englisch aus einer Textdatei, von Beginn an.

## Gestaltung

Wünsche des Nutzers vom 01.11.2026 für Etappe 3. Eigene, elegante Gestaltung statt Standardoptik.

| Bereich | Entscheidung |
|---|---|
| Hauptfläche | Kamerabild mit rechtem und linkem Auge bleibt, das Prinzip hat sich bewährt |
| Steuerung | wandert nach oben und bekommt mehr Gewicht |
| Module | klickbare Kacheln, thematisch gegliedert. „Kurzlauf“ und „Ausführlicher Lauf“ verschwinden als Namen |
| Text | sehr wenig auf der Startfläche. Anleitung und Hinweise hinter Info-Knopf oder Aufklapper |
| Messwerte, Kalibrierdaten, Kurven | nicht in der Hauptansicht, nur unter „Messdetails“ |
| Forschungshinweis | bleibt unten |
| Glättung | Auswahl entfällt, immer aus |
| Auflösung und Bildrate | Auswahl entfällt, die App wählt den besten Modus und nennt ihn nur bei Problemen |
| Kameraauswahl | nur sichtbar, wenn mehr als eine Kamera da ist |
| Durchführungshinweise | Licht, Abstand, Brille, Augen-Make-up wie Kajal und Lidschatten, Bildschirmhelligkeit. Der Einfluss von Make-up ist nicht gemessen |
| Bericht | zuerst ein bis zwei Seiten Visualisierung, danach Tabellen mit Messwerten, Grenzen und Referenzen. Erweitert `KONZEPT_VISUELLER_OKULOMOTORIKREPORT.md`, Abschnitt 6, das bisher nur eine Übersichtsseite vorsieht |

Themen für die Kacheln, Vorschlag: **Vorbereitung** (Kalibrierung), **Augen in Ruhe** (Spontan- und Blickrichtungsnystagmus), **Folgebewegungen** (Blickfolge, Optokinetik), **Schnelle Bewegungen** (Sakkaden), später **Augenstellung** (Cover-Test). Dazu Zusammenstellungen mit einem Klick.

**Dunkle Oberfläche und dunkler Reizhintergrund:** Oberfläche dunkel ist eine reine Gestaltungsfrage. Der Reizhintergrund ist eine Messfrage: Gemessen wird die Irismitte, nicht die Pupille, eine weite Pupille hilft also nicht direkt. Der Bildschirm beleuchtet zudem das Gesicht; dunkler heißt weniger Licht für die Kamera,
aber auch weniger Spiegelung. Entschieden wird das erst nach einem Vergleich: gleiche Person, gleiches Modul, heller gegen dunkler Hintergrund, verglichen werden Rauschen, gültige Bilder und Irisbreite. Die empfohlene Bildschirmhelligkeit folgt aus demselben Vergleich.

## Werkzeugkasten

Idee des Nutzers vom 01.11.2026, noch nicht gebaut: Statt fester Läufe gibt es einzelne Module. Jedes hat eine eigene kurze Messung und eine eigene Auswertung; am Ende entsteht daraus auf Wunsch ein Gesamtbericht.
Kurzlauf und ausführlicher Lauf werden dann zu Zusammenstellungen dieser Module. Das ändert den Zuschnitt von Etappe 3.

| Modul | Inhalt | Stand |
|---|---|---|
| Einrichtung | Gerätecheck, Bildschirm, Abstand, Position | geplant |
| Kalibrierung | nur das Nötigste, siehe unten, abwählbar | vorhanden, zu kürzen |
| Spontan- und Blickrichtungsnystagmus | Punkte Mitte, rechts, links, oben, unten | vorhanden |
| Blickfolge | langsam, optional schnell | vorhanden |
| Sakkaden | Sprünge | vorhanden |
| Optokinetik | experimentell | vorhanden |
| Cover-Test | geplant, erst nach Vortest, siehe `ROADMAP.md` B5 | offen |
| Orthoptische Feinheiten | spätere Bausteine, siehe B5 | offen |

**Messen ohne Kalibrierung:** Der grobe Maßstab kommt heute aus Sprüngen. Ein Modul ohne Sprünge hat also keinen eigenen Maßstab, und ein Maßstab aus der Blickfolge selbst würde ihren Gain vorwegnehmen.
Vorschlag: ein kurzer Maßstabsschritt je Sitzung, den alle Module nutzen, solange der Kopf in der Grenze bleibt. Wie kurz er sein darf, ist aus den vorhandenen Läufen nachzurechnen. Jede Zahl nennt ihren Maßstab: kalibriert, grob oder Irisdurchmesser.

**Gesamtbericht:** setzt sich aus den Abschnitten der gelaufenen Module zusammen und sagt, was nicht untersucht wurde. Jedes Modul speichert sein Ergebnis so, dass es einzeln lesbar bleibt.

## Aufbau des Codes

Ohne Build-Schritt, reine ES-Module, damit jede Zeile lesbar bleibt. `augen.html` hat 1731 Zeilen und mischt Oberfläche, Kamera, Reize und Ablauf.

```text
app/
  index.html, styles.css, sprache/
  ablauf/       Schritte und Protokollsteuerung
  kamera/       Quelle, Bildschleife, Zeitbasis
  reize/        Punkt, Streifen, Karten
  auswertung/   heutige *-logik.js mit Tests
  bericht/
  vendor/       Laufzeit, Modell, Schriften, mit Prüfsummen
experimente/
tests/
```

Heute, nach Etappe 1, liegen die Rechenlogik und `protokolle.js` zusammen in `app/auswertung/`, und `app/index.html` ist noch ungeteilt. Die Rechenlogik wandert unverändert mit ihren Tests. Die Erkennung gehört in einen Worker: Das erfüllt die Projektregel „Erkennung im eigenen Thread“, die die Seite heute nicht einhält.
Das Dateiformat bekommt eine Versionsnummer; alte eigene Dateien bleiben lesbar oder werden ausdrücklich aufgegeben.

## Etappen

| Etappe | Inhalt | Fertig, wenn |
|---|---|---|
| 1 Kern sichern | Ordner neu, Laufzeit und Modell lokal, Experimente ausgelagert, Tests und CI | Trockenlauf und ein echter Lauf wie vorher, keine Abrufe nach außen, `make test` grün in CI |
| 2 Erkennung im Worker | Bildschleife und Zeitbasis getrennt, Fehler sichtbar | Vergleichslauf: Bildrate, Aussetzer und Rauschen nicht schlechter |
| 3 Geführte Oberfläche | Einrichtung, Werkzeugkasten mit Modulen, Gesamtbericht, Gerätecheck, Bildschirmgröße, Sprache | eine fremde Person schafft Einrichtung und ein Modul ohne Hilfe |
| 4 Messbericht und Zweck | Zweckbestimmung, Bericht umbenannt, Hinweis in jedem Export, Status je Kennwert | jede Zahl im Bericht hat Gütewert und Status, kein Satz klingt nach Diagnose |
| 5 Zweites Gerät, zweite Person | mindestens ein weiterer Laptop und eine weitere Person | Ergebnisse in `MESSUNGEN.md`, Grenzen angepasst oder als nicht übertragbar benannt |
| 6 Öffentliche Fassung | README mit Bildern aus dem Trockenlauf, Englisch, `LICENSE`, `NOTICE`, `CITATION.cff`, `SECURITY.md`, `CONTRIBUTING.md`, Version, Regelsatz für Branches | alle Stufen aus `ROAD_TO_PUBLIC.md` abgehakt |
| 7 Abschlussprüfung | Historie, Geheimnisse, frischer Klon, Lizenzprüfung | Nutzer schaltet das Repo um |
| 8 Optional | GitHub Pages, installierbare App | eigene Entscheidung |

Etappe 5 steht bewusst vor der Veröffentlichung: Bisher gibt es eine Testperson und ein Gerät, und jede Schwelle stammt von dort.

## Lehren aus den anderen Projekten

| Lehre | Herkunft | Hier |
|---|---|---|
| Vorbereiten, pushen, berichten; umschalten nur auf Ansage des Nutzers | Checkliste | Etappe 7 |
| Historie prüfen, nicht nur den Stand; bestehende Commits nicht umschreiben, außer bei echtem Leck | Checkliste, Anonymisator | Etappe 7 |
| Hinweis muss im exportierten Dokument stehen, nicht nur im Dialog | Anonymisator | Etappe 4, auch in der Messdatei |
| Keine Fremdabrufe, selbst gehostete Schriften, keine Telemetrie | Anonymisator | Etappe 1 |
| Bewusst abgelehnte Punkte als „nicht erneut aufwerfen“ vermerken | Anonymisator | beim Abschluss jeder Entscheidung |
| Prüfskripte für Sprache, Lizenzen und Schriften statt einmaliger Kontrolle | EDF-Analyzer | Etappen 1 und 3 |
| Sprachumschaltung früh, nicht nachträglich | EDF-Analyzer | Etappe 3 |
| Bilder fürs README nur aus fiktiven Daten | Anonymisator | Trockenlauf, nie echte Augen |
| Große Downloads mit Größe und Dauer nennen | Checkliste | hier 18 MB, keine Sonderregel nötig, Umfang im README nennen |

## Größtes Risiko: Zweckbestimmung

Eine einfache Software, mit der jede Person am Laptop die Augen testet und eine Ampel erhält, wirkt wie ein Medizinprodukt. Je freundlicher die Oberfläche, desto wichtiger wird das.

**Vorschlag:** Forschungs- und Lehrwerkzeug für Fachpersonen. Keine Aussage über Gesundheit, keine Ampel, kein „auffällig“ in der öffentlichen Fassung. Der Bericht zeigt Messwerte, Güte und benannte
Grenzen mit Herkunft. Das ist keine Rechtsberatung; vor der Veröffentlichung sollte eine fachkundige Person die Zweckbestimmung lesen.

## Entscheidungen beim Nutzer

| Frage | Empfehlung |
|---|---|
| Zielgruppe und Zweck | Forschung und Lehre, Fachpersonen |
| Ampel im Bericht | öffentlich keine, Grenzen nur als benannte Vergleichswerte |
| Name | neuer Name ohne „Mac“, vor Etappe 6 prüfen, ob er frei ist |
| Lizenz | Apache-2.0, wie EDF-Analyzer |
| Eigene Messwerte | Methode und Kennzahlen öffentlich lassen, Personenbezug benennen; die Rohdateien bleiben privat |
| Hosting | erst lokal, Pages als eigener Schritt |
| Hand- und Gestenteil | aus diesem Repo herausnehmen |
| `CLAUDE.md` und `.claude/` | prüfen, ob sie öffentlich bleiben sollen; sie enthalten nur Arbeitsregeln |

## Bewusst noch nicht

iPhone-Modus, Desktop-Hülle, Windows-Prüfung, Validierung gegen VOG. Eine VOG-Validierung ist die wichtigste offene wissenschaftliche Frage; sie ist aber keine Voraussetzung für ein ehrlich gekennzeichnetes Forschungswerkzeug.
