#!/usr/bin/env python3
"""Sirve el repositorio localmente usando un puerto disponible."""

from __future__ import annotations

import argparse
import socket
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inicia un servidor web local para el proyecto.")
    parser.add_argument("--host", default="127.0.0.1", help="Host en el que escuchar (por defecto 127.0.0.1).")
    parser.add_argument("--port", type=int, default=8000, help="Puerto inicial a probar.")
    parser.add_argument(
        "--directory",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Directorio que se servirá (por defecto la raíz del repositorio).",
    )
    parser.add_argument(
        "--max-attempts",
        type=int,
        default=20,
        help="Número máximo de puertos a probar antes de fallar.",
    )
    return parser.parse_args()


def is_port_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False
        return True


def find_available_port(host: str, start_port: int, max_attempts: int) -> int:
    for port in range(start_port, start_port + max_attempts):
        if is_port_available(host, port):
            return port
    raise RuntimeError(
        f"No se encontró un puerto libre entre {start_port} y {start_port + max_attempts - 1}."
    )


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:  # noqa: A003
        return


def main() -> int:
    args = parse_args()
    host = args.host
    directory = args.directory.expanduser().resolve()

    if not directory.exists():
        print(f"ERROR: el directorio {directory} no existe.", file=sys.stderr)
        return 1

    try:
        port = find_available_port(host, args.port, args.max_attempts)
    except RuntimeError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    if port != args.port:
        print(f"Puerto {args.port} ocupado; usando el puerto {port}.", file=sys.stderr)

    handler = partial(QuietHandler, directory=str(directory))
    httpd = ThreadingHTTPServer((host, port), handler)
    print(f"Sirviendo {directory} en http://127.0.0.1:{port}/")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        httpd.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
