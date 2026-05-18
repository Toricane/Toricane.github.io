"""Collect image asset paths referenced in src/content Markdown frontmatter."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"

_PATH_RE = re.compile(
    r'^\s*(?:path|image):\s*(?:"([^"]+)"|\'([^\']+)\'|(\S+))\s*$',
    re.MULTILINE,
)


def iter_content_notes():
    if not CONTENT_DIR.is_dir():
        return
    for path in CONTENT_DIR.rglob("*.md"):
        if "_templates" in path.parts:
            continue
        yield path


def image_paths_from_content() -> set[str]:
    paths: set[str] = set()
    for note in iter_content_notes():
        text = note.read_text(encoding="utf-8")
        for match in _PATH_RE.finditer(text):
            value = match.group(1) or match.group(2) or match.group(3)
            if value and not value.startswith("data:"):
                paths.add(value.strip())
    return paths


def _frontmatter(text: str) -> str:
    if not text.startswith("---"):
        return ""
    parts = text.split("---", 2)
    return parts[1] if len(parts) > 1 else ""


def face_paths_from_content() -> set[str]:
    """Image paths in frontmatter list items marked with | face (pipe format) or face: true."""
    paths: set[str] = set()
    for note in iter_content_notes():
        fm = _frontmatter(note.read_text(encoding="utf-8"))
        if not fm:
            continue
        in_images = False
        for line in fm.splitlines():
            if re.match(r"^images:\s*$", line):
                in_images = True
                continue
            if in_images and line.startswith("  - "):
                item = line[4:].strip().strip('"').strip("'")
                if item.startswith("[[") and item.endswith("]]"):
                    item = item[2:-2]
                if item.endswith("!"):
                    item = item[:-1].strip()
                    rel = item.split("|")[0].split("*")[0].strip()
                    if rel and "/" not in rel:
                        rel = f"assets/tab-panels/{rel}"
                    if rel:
                        paths.add(rel)
                    continue
                parts = [p.strip() for p in item.replace("|", "*").split("*")]
                if parts and parts[0]:
                    rel = parts[0]
                    if "/" not in rel:
                        rel = f"assets/tab-panels/{rel}"
                    if any(p.lower() == "face" for p in parts[1:]):
                        paths.add(rel)
                continue
            if in_images and line and not line.startswith(" "):
                in_images = False
        for block in re.split(r"\n  -\n", fm):
            if not re.search(r"face:\s*true\b", block):
                continue
            match = re.search(
                r'(?:path|image):\s*(?:"([^"]+)"|\'([^\']+)\'|(\S+))',
                block,
            )
            if match:
                paths.add((match.group(1) or match.group(2) or match.group(3)).strip())
    return paths
