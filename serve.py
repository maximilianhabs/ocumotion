"""Liefert die App nur lokal aus. Ohne Zwischenspeicher, sonst mischt der Browser nach Updates alte und neue Module."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = 5600
APP = Path(__file__).parent / "app"
# Nur diese Namen: Sonst könnte eine fremde Seite per DNS-Rebinding die App unter ihrem eigenen Namen laden.
ALLOWED_HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "frame-ancestors 'none'")
        super().end_headers()

    def do_GET(self):
        if self.headers.get("Host") in ALLOWED_HOSTS:
            super().do_GET()
        else:
            self.send_error(403, "Unbekannter Host")

    def do_HEAD(self):
        if self.headers.get("Host") in ALLOWED_HOSTS:
            super().do_HEAD()
        else:
            self.send_error(403, "Unbekannter Host")


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), functools.partial(Handler, directory=str(APP)))
    print(f"Ocumotion läuft auf http://{HOST}:{PORT}. Beenden mit ctrl-C.", flush=True)
    server.serve_forever()
