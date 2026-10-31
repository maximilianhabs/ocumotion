.PHONY: kamera kamera-details test test-web

# Augen- und Kalibrierlogik gegen konstruierte Daten pruefen
test:
	node --test testseite/*.test.mjs

# Kameramodi auflisten, ohne die Kamera zu oeffnen
kamera:
	swift tools/kamera_modi.swift

# Belichtung, Fokus und Bildwinkel abfragen, ohne die Kamera zu oeffnen
kamera-details:
	swift tools/kamera_details.swift

# Testseite im Browser, nur lokal erreichbar: http://127.0.0.1:5600
test-web:
	/opt/homebrew/bin/python3.13 -m http.server 5600 --bind 127.0.0.1 --directory testseite
