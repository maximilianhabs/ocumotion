.PHONY: start test handtest kamera kamera-details kamera-takt kamera-bruecke kamera-bruecke-test

PYTHON ?= /opt/homebrew/bin/python3.13
WERKZEUGE = experimente/werkzeuge

# App im Browser, nur lokal erreichbar: http://127.0.0.1:5600
start:
	$(PYTHON) -m http.server 5600 --bind 127.0.0.1 --directory app

# Rechenlogik gegen konstruierte Daten, dazu die Pruefung auf Fremdabrufe
test:
	node --test tests/*.test.mjs

# Experimente, siehe experimente/README.md
handtest:
	$(PYTHON) -m http.server 5602 --bind 127.0.0.1 --directory experimente/handtest

kamera:
	swift $(WERKZEUGE)/kamera_modi.swift

kamera-details:
	swift $(WERKZEUGE)/kamera_details.swift

kamera-takt:
	swift $(WERKZEUGE)/kamera_takt.swift

kamera-bruecke:
	swiftc -O $(WERKZEUGE)/kamera_bruecke.swift -o "$(TMPDIR)mac-vision-bruecke"
	"$(TMPDIR)mac-vision-bruecke"

# Wie kamera-bruecke, aber mit Kunstbild ohne Kamera
kamera-bruecke-test:
	swiftc -O $(WERKZEUGE)/kamera_bruecke.swift -o "$(TMPDIR)mac-vision-bruecke"
	"$(TMPDIR)mac-vision-bruecke" --testbild
