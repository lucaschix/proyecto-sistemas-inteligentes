#!/usr/bin/env python3
"""Retira los puntos de integración de la expansión didáctica."""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument(
        "--remove-assets",
        action="store_true",
        help="Elimina también la carpeta src/didactic/.",
    )
    return parser.parse_args()


def remove_block(content: str, start: str, end: str) -> str:
    pattern = re.compile(
        rf"[ \t]*{re.escape(start)}.*?{re.escape(end)}[ \t]*\n?",
        re.DOTALL,
    )
    return pattern.sub("", content)


def main():
    args = parse_args()
    repo = args.repo.expanduser().resolve()

    index_path = repo / "index.html"
    project_path = repo / "src" / "app.js"

    index = index_path.read_text(encoding="utf-8")
    index = remove_block(
        index,
        "<!-- DIDACTIC_ENHANCEMENTS_HEAD_START -->",
        "<!-- DIDACTIC_ENHANCEMENTS_HEAD_END -->",
    )
    index = remove_block(
        index,
        "<!-- DIDACTIC_ENHANCEMENTS_BODY_START -->",
        "<!-- DIDACTIC_ENHANCEMENTS_BODY_END -->",
    )
    index_path.write_text(index, encoding="utf-8")

    project = project_path.read_text(encoding="utf-8")
    project = remove_block(
        project,
        "// DIDACTIC_ENHANCEMENTS_EVENT_START",
        "// DIDACTIC_ENHANCEMENTS_EVENT_END",
    )
    project_path.write_text(project, encoding="utf-8")

    if args.remove_assets:
        shutil.rmtree(repo / "src" / "didactic", ignore_errors=True)

    print("Integración retirada.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
