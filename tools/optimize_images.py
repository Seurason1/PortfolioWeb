"""Back up original images and create full-resolution WebP assets."""
from pathlib import Path
import shutil
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / "original-image-backup"


def main():
    original_bytes = optimized_bytes = count = 0
    for folder in ("portfolio", "About", "Main_title"):
        for source in sorted((ROOT / folder).rglob("*")):
            if source.suffix.lower() not in (".png", ".jpg", ".jpeg"):
                continue
            backup = BACKUP / source.relative_to(ROOT)
            backup.parent.mkdir(parents=True, exist_ok=True)
            if not backup.exists():
                shutil.copy2(source, backup)
            target = source.with_suffix(".webp")
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
