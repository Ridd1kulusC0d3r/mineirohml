import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest


class _Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # silence
        pass

    def do_GET(self):  # noqa: N802
        path = self.path
        if path.startswith("/u/real"):
            body = ("<html><head><title>real - Demo</title><link rel='canonical' href='http://127.0.0.1/u/real'></head>"
                    "<body><h1>real</h1><a href='https://example.org/me'>site</a><a href='https://github.com/real'>gh</a></body></html>")
            self._send(200, body)
        elif path.startswith("/soft/real"):
            self._send(200, "<html><head><title>Profile real</title></head><body>real <p>profile</p></body></html>")
        elif path.startswith("/soft/"):  # soft 404: 200 + same shell for any handle
            self._send(200, "<html><head><title>Profile</title></head><body>Sorry, page not found <p>profile</p></body></html>")
        elif path.startswith("/u/"):
            self._send(404, "<html><title>Not found</title></html>")
        elif path.startswith("/limit/"):
            self._send(429, "slow down")
        elif path.startswith("/redir/"):
            self.send_response(302)
            self.send_header("Location", "http://169.254.169.254/latest/meta-data/")
            self.end_headers()
        else:
            self._send(404, "nope")

    def _send(self, status, body):
        data = body.encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


@pytest.fixture(scope="session")
def local_site():
    server = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()
