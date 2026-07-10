#!/usr/bin/env python3
"""Instala la expansión didáctica en proyecto-sistemas-inteligentes."""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path


HEAD_MARKER = """  <!-- DIDACTIC_ENHANCEMENTS_HEAD_START -->
  <link rel="stylesheet" href="src/didactic/didactic-enhancements.css?v=20260710">
  <!-- DIDACTIC_ENHANCEMENTS_HEAD_END -->
"""

BODY_MARKER = """  <!-- DIDACTIC_ENHANCEMENTS_BODY_START -->
  <script type="module" src="src/didactic/didactic-enhancements.js?v=20260710"></script>
  <!-- DIDACTIC_ENHANCEMENTS_BODY_END -->
"""

EVENT_BLOCK = """// DIDACTIC_ENHANCEMENTS_EVENT_START
    window.dispatchEvent(
      new CustomEvent("rl:component-mounted", {
        detail: { slide, host, componentContext },
      }),
    );
    // DIDACTIC_ENHANCEMENTS_EVENT_END"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Instala actividades didácticas sin reemplazar los componentes existentes."
    )
    parser.add_argument(
        "--repo",
        type=Path,
        default=Path.cwd(),
        help="Ruta a la raíz del repositorio. Por defecto usa el directorio actual.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Reinstala los archivos didácticos aunque ya existan.",
    )
    return parser.parse_args()


def validate_repo(repo: Path) -> None:
    required = [
        repo / "index.html",
        repo / "src" / "app.js",
        repo / "src" / "components",
        repo / "src" / "components" / "rl-model.js",
        repo / "src" / "components" / "q-store.js",
    ]
    missing = [path for path in required if not path.exists()]

    if missing:
        formatted = "\n".join(f"- {path}" for path in missing)
        raise FileNotFoundError(
            "La ruta no parece ser la raíz del repositorio. Faltan:\n" + formatted
        )


def make_backup(repo: Path) -> Path:
    backup_root = repo / "archive" / "backups" / "didactic"
    backup_root.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    snapshot = backup_root / stamp
    snapshot.mkdir()

    shutil.copy2(repo / "index.html", snapshot / "index.html")
    (snapshot / "src").mkdir()
    shutil.copy2(repo / "src" / "app.js", snapshot / "src" / "app.js")

    return snapshot


def copy_assets(package_root: Path, repo: Path, force: bool) -> None:
    source = package_root / "src" / "didactic"
    destination = repo / "src" / "didactic"

    if source.resolve() == destination.resolve():
        return

    if destination.exists() and force:
        shutil.rmtree(destination)

    destination.mkdir(exist_ok=True)

    for source_file in source.iterdir():
        if source_file.is_file():
            shutil.copy2(source_file, destination / source_file.name)


def patch_index(index_path: Path) -> bool:
    content = index_path.read_text(encoding="utf-8")
    changed = False

    if "DIDACTIC_ENHANCEMENTS_HEAD_START" not in content:
        if "</head>" not in content:
            raise RuntimeError("index.html no contiene </head>.")
        content = content.replace("</head>", f"{HEAD_MARKER}</head>", 1)
        changed = True

    if "DIDACTIC_ENHANCEMENTS_BODY_START" not in content:
        if "</body>" not in content:
            raise RuntimeError("index.html no contiene </body>.")
        content = content.replace("</body>", f"{BODY_MARKER}</body>", 1)
        changed = True

    if changed:
        index_path.write_text(content, encoding="utf-8")

    return changed


def patch_project(project_path: Path) -> bool:
    content = project_path.read_text(encoding="utf-8")

    if "DIDACTIC_ENHANCEMENTS_EVENT_START" in content:
        return False

    pattern = re.compile(
        r"(?P<indent>[ \t]*)const\s+nextCleanup\s*=\s*await\s+"
        r"component\.mount\?\.\(host,\s*componentContext\);"
    )
    match = pattern.search(content)

    if not match:
        raise RuntimeError(
            "No se encontró la llamada a component.mount en src/app.js. "
            "Codex debe revisar manualmente el punto de integración."
        )

    original = match.group(0)
    indent = match.group("indent")
    indented_block = "\n".join(
        f"{indent}{line}" if line else line for line in EVENT_BLOCK.splitlines()
    )
    replacement = f"{original}\n{indented_block}"
    content = content[: match.start()] + replacement + content[match.end() :]
    project_path.write_text(content, encoding="utf-8")
    return True


def main() -> int:
    args = parse_args()
    repo = args.repo.expanduser().resolve()
    package_root = Path(__file__).resolve().parents[1]

    try:
        validate_repo(repo)
        backup = make_backup(repo)
        copy_assets(package_root, repo, args.force)
        index_changed = patch_index(repo / "index.html")
        project_changed = patch_project(repo / "src" / "app.js")
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("Instalación completada.")
    print(f"Repositorio: {repo}")
    print(f"Respaldo: {backup}")
    print(f"index.html modificado: {'sí' if index_changed else 'ya estaba integrado'}")
    print(f"src/app.js modificado: {'sí' if project_changed else 'ya estaba integrado'}")
    print("Ejecuta: python3 -m http.server 8000")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
