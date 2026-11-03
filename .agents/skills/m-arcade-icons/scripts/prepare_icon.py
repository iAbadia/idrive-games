#!/usr/bin/env python3
"""Mechanical export/check for transparent M Arcade icons. Requires Pillow."""
import argparse
from io import BytesIO
from pathlib import Path
import sys
from PIL import Image

SIZE = 140
ART = 116
PAD = 12
MAX_BYTES = 32 * 1024
TARGET_BYTES = 24 * 1024


def check_image(image, byte_count):
    if image.format != "PNG" or image.mode != "RGBA" or image.size != (SIZE, SIZE):
        raise ValueError("Expected a 140x140 RGBA PNG")
    alpha = image.getchannel("A")
    box = alpha.getbbox()
    if box is None:
        raise ValueError("Icon is empty")
    left, top, right, bottom = box
    if min(left, top) < PAD or max(right, bottom) > SIZE - PAD:
        raise ValueError("Artwork must keep at least 12px transparent margins")
    if max(right - left, bottom - top) < ART - 2:
        raise ValueError("Tile is undersized; use the 116px artwork target")
    if abs((left + right) - SIZE) > 2 or abs((top + bottom) - SIZE) > 2:
        raise ValueError("Tile must be centred")
    if abs((right - left) - (bottom - top)) > 3:
        raise ValueError("Expected a square tile")
    if byte_count > MAX_BYTES:
        raise ValueError("Final PNG exceeds the 32 KiB budget")
    return box


def prepare(source, destination, force=False):
    if destination.exists() and not force:
        raise ValueError("Output already exists; use --force for an authorized replacement")
    with Image.open(source) as image:
        if image.width > 4096 or image.height > 4096:
            raise ValueError("Master exceeds 4096px per side")
        if "A" not in image.getbands():
            raise ValueError("Master needs real alpha transparency; do not colour-key black")
        image = image.convert("RGBA")
        alpha = image.getchannel("A")
        box = alpha.getbbox()
        if box is None:
            raise ValueError("Master is empty")
        if alpha.getextrema()[0] != 0:
            raise ValueError("Master needs fully transparent exterior pixels")
        left, top, right, bottom = box
        width, height = right - left, bottom - top
        if abs(width - height) / max(width, height) > .08:
            raise ValueError("Artwork is not a square tile; correct the master before export")
        tile = image.crop(box)
        tile.thumbnail((ART, ART), Image.Resampling.LANCZOS)
        # Exact bounds prevent the resampling kernel from bleeding into clear padding.
        output = Image.new("RGBA", (SIZE, SIZE))
        output.paste(tile, ((SIZE - tile.width) // 2, (SIZE - tile.height) // 2))
        buffer = BytesIO()
        output.save(buffer, format="PNG", optimize=True)
    data = buffer.getvalue()
    with Image.open(BytesIO(data)) as exported:
        check_image(exported, len(data))
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    export = sub.add_parser("prepare")
    export.add_argument("source", type=Path)
    export.add_argument("destination", type=Path)
    export.add_argument("--force", action="store_true")
    verify = sub.add_parser("check")
    verify.add_argument("icon", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "prepare":
            prepare(args.source, args.destination, args.force)
            path = args.destination
        else:
            path = args.icon
        with Image.open(path) as image:
            box = check_image(image, path.stat().st_size)
        print(f"OK {path.name}: 140x140 RGBA, artwork {box}, {path.stat().st_size:,} bytes")
        if path.stat().st_size > TARGET_BYTES:
            print("Consider optimizing toward the 24 KiB target")
    except (OSError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
