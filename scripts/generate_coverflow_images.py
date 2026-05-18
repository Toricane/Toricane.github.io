#!/usr/bin/env python3
"""Generate display-sized WebP assets for coverflow (small/ + hero variants)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from content_paths import face_paths_from_content
TAB_PANELS = ROOT / "assets" / "tab-panels"
SMALL_DIR = TAB_PANELS / "small"
PREVIEW_DIR = TAB_PANELS / "preview"
COVERSIZE = 640
HERO_VARIANTS = (480, 640, 960)


def save_webp(img: Image.Image, dest: Path, quality: int = 78) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
    img.save(dest, "WEBP", quality=quality, method=6)


def resize_to_width(img: Image.Image, width: int) -> Image.Image:
    w, h = img.size
    if w <= width:
        return img
    ratio = width / w
    return img.resize((width, max(1, int(h * ratio))), Image.Resampling.LANCZOS)


def ensure_small_variant(rel_path: str) -> None:
    src = ROOT / rel_path.replace("/", os.sep)
    if not src.is_file():
        preview = PREVIEW_DIR / src.name
        if preview.is_file():
            src = preview
        else:
            print(f"  skip (missing): {rel_path}")
            return

    if "tab-panels/" in rel_path and "/preview/" not in rel_path and "/small/" not in rel_path:
        name = Path(rel_path).name
        preview_dest = PREVIEW_DIR / name
        small_dest = SMALL_DIR / name
        if preview_dest.is_file() and small_dest.is_file():
            return
        with Image.open(src) as img:
            resized = resize_to_width(img, COVERSIZE)
            if not preview_dest.is_file():
                save_webp(resized, preview_dest)
                print(f"  preview: {preview_dest.relative_to(ROOT)}")
            if not small_dest.is_file():
                save_webp(resized, small_dest)
                print(f"  small: {small_dest.relative_to(ROOT)}")
        return

    if rel_path.endswith("northernlights.webp"):
        with Image.open(src) as img:
            for w in HERO_VARIANTS:
                dest = ROOT / "assets" / f"northernlights-{w}.webp"
                if dest.is_file():
                    continue
                save_webp(resize_to_width(img, w), dest)
                print(f"  hero: {dest.relative_to(ROOT)}")


def main() -> None:
    print("Generating coverflow image variants...")
    paths = face_paths_from_content()
    for rel in sorted(paths):
        ensure_small_variant(rel)
    print("Done.")


if __name__ == "__main__":
    main()
