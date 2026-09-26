#!/usr/bin/env python3
"""Goblin's Cave preview server.

Serves the site at / and refuses to serve or list hidden files
(.git, .arena, dotfiles) so the internals can never leak into a preview.
"""
import http.server
import os
import socketserver

PORT = int(os.environ.get('PORT', '8080'))
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        p = super().translate_path(path)
        rel = os.path.relpath(p, ROOT)
        for part in rel.split(os.sep):
            if part.startswith('.') and part not in ('.', ''):
                # hidden file/dir (e.g. .git) -> serve nothing
                return os.path.join(ROOT, '__nope__')
        return p

    def list_directory(self, path):
        # never show directory listings; directories without index 404
        self.send_error(404, 'No such directory listing')
        return None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass  # keep logs quiet


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    with Server(('0.0.0.0', PORT), Handler) as httpd:
        print(f"Serving Goblin's Cave on 0.0.0.0:{PORT}")
        httpd.serve_forever()
