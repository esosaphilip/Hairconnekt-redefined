import argparse
from pathlib import Path

from PIL import Image, ImageChops


def _extract_symbol_rgba(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    diff = ImageChops.difference(img, bg).convert("L")
    alpha = diff.point(lambda p: 0 if p <= 6 else min(255, int(p * 4)))
    r, g, b, _ = img.split()
    symbol = Image.merge("RGBA", (r, g, b, alpha))
    bbox = symbol.getbbox()
    if bbox is None:
        raise ValueError("Could not detect non-white symbol pixels in the source image.")
    return symbol.crop(bbox)


def _render_centered(
    symbol: Image.Image,
    canvas_size: int,
    max_symbol_size: int,
    background_rgba: tuple[int, int, int, int],
) -> Image.Image:
    sw, sh = symbol.size
    scale = min(max_symbol_size / sw, max_symbol_size / sh)
    nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
    resized = symbol.resize((nw, nh), resample=Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), background_rgba)
    x = (canvas_size - nw) // 2
    y = (canvas_size - nh) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="assets/logo-source.png")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    source_path = (repo_root / args.source).resolve()
    if not source_path.exists():
        raise FileNotFoundError(f"Source not found: {source_path}")

    assets_dir = repo_root / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    src = Image.open(source_path)
    symbol = _extract_symbol_rgba(src)

    ios_icon = _render_centered(
        symbol=symbol,
        canvas_size=1024,
        max_symbol_size=820,
        background_rgba=(255, 255, 255, 255),
    ).convert("RGB")
    ios_icon.save(assets_dir / "icon.png", format="PNG", optimize=True)

    android_bg = Image.new("RGBA", (432, 432), (255, 255, 255, 255))
    android_bg.save(assets_dir / "android-icon-background.png", format="PNG", optimize=True)

    android_fg = _render_centered(
        symbol=symbol,
        canvas_size=432,
        max_symbol_size=288,
        background_rgba=(0, 0, 0, 0),
    )
    android_fg.save(assets_dir / "android-icon-foreground.png", format="PNG", optimize=True)

    alpha = symbol.split()[-1]
    mono_symbol = Image.merge(
        "RGBA",
        (
            Image.new("L", symbol.size, 0),
            Image.new("L", symbol.size, 0),
            Image.new("L", symbol.size, 0),
            alpha,
        ),
    )
    android_mono = _render_centered(
        symbol=mono_symbol,
        canvas_size=432,
        max_symbol_size=288,
        background_rgba=(0, 0, 0, 0),
    )
    android_mono.save(assets_dir / "android-icon-monochrome.png", format="PNG", optimize=True)


if __name__ == "__main__":
    main()
