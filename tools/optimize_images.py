"""Back up original images and create full-resolution WebP assets."""
from pathlib import Path
import argparse
import hashlib
import shutil
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / "original-image-backup"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", help="Optional image path relative to the project root")
    args = parser.parse_args()
    sources = [ROOT / args.source] if args.source else sorted(
        path for folder in ("portfolio", "About", "Main_title")
        for path in (ROOT / folder).rglob("*")
    )
    original_bytes = optimized_bytes = count = 0
    for source in sources:
        if source.suffix.lower() not in (".png", ".jpg", ".jpeg"):
            continue
        relative = source.relative_to(ROOT)
        if relative.parts[0] == "portfolio" and source.parent.name == "originals":
            backup_relative = Path(*relative.parts[:2]) / source.name
            target = source.parent.parent / "webp" / source.with_suffix(".webp").name
        else:
            backup_relative = relative
            target = source.with_suffix(".webp")
        backup = BACKUP / backup_relative
        backup.parent.mkdir(parents=True, exist_ok=True)
        if backup.exists() and backup.read_bytes() != source.read_bytes():
            digest = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
            backup = backup.with_name(f"{backup.stem}-{digest}{backup.suffix}")
        if not backup.exists():
            shutil.copy2(source, backup)
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original)
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
            image.save(target, "WEBP", quality=92, method=6)
            with Image.open(target) as result:
                assert result.size == image.size, source
                result.load()
        assert source.read_bytes() == backup.read_bytes(), source
        original_bytes += source.stat().st_size
        optimized_bytes += target.stat().st_size
        count += 1
    print(f"Verified {count} images; original {original_bytes / 1048576:.1f} MB; "
          f"WebP {optimized_bytes / 1048576:.1f} MB; "
          f"reduction {100 * (1 - optimized_bytes / original_bytes):.1f}%")


if __name__ == "__main__":
    main()
