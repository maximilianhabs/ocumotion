"""Liefert die App nur lokal aus. Ohne Zwischenspeicher, sonst mischt der Browser nach Updates alte und neue Module."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = 5600
APP = Path(__file__).parent / "app"


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), functools.partial(Handler, directory=str(APP)))
    print(f"Ocumotion läuft auf http://{HOST}:{PORT}. Beenden mit ctrl-C.", flush=True)
    server.serve_forever()
