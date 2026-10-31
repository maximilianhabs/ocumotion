.PHONY: kamera kamera-details kamera-takt kamera-bruecke kamera-bruecke-test test test-web

# Augen- und Kalibrierlogik gegen konstruierte Daten pruefen
test:
	node --test testseite/*.test.mjs

# Kameramodi auflisten, ohne die Kamera zu oeffnen
kamera:
	swift tools/kamera_modi.swift

# Belichtung, Fokus und Bildwinkel abfragen, ohne die Kamera zu oeffnen
kamera-details:
	swift tools/kamera_details.swift

# iPhone 6 Sekunden oeffnen und echte Bilder zaehlen, ohne Browser und ohne Bilder zu speichern
kamera-takt:
	swift tools/kamera_takt.swift

# iPhone mit 60 fps an die Testseite reichen, nur ueber 127.0.0.1, ohne Bilder zu speichern
kamera-bruecke:
	swiftc -O tools/kamera_bruecke.swift -o "$(TMPDIR)mac-vision-bruecke"
	"$(TMPDIR)mac-vision-bruecke"

# Wie kamera-bruecke, aber mit Kunstbild ohne Kamera
kamera-bruecke-test:
	swiftc -O tools/kamera_bruecke.swift -o "$(TMPDIR)mac-vision-bruecke"
	"$(TMPDIR)mac-vision-bruecke" --testbild

# Testseite im Browser, nur lokal erreichbar: http://127.0.0.1:5600
test-web:
	/opt/homebrew/bin/python3.13 -m http.server 5600 --bind 127.0.0.1 --directory testseite
