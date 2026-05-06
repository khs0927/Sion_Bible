from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path.home() / "Downloads"
OUT = ROOT / "src" / "assets" / "design"


@dataclass(frozen=True)
class GridSpec:
    token: str
    output_dir: str
    prefix: str
    columns: int
    rows: int
    boxes: list[tuple[int, int, int, int]]


def find_download(token: str) -> Path:
    matches = [path for path in DOWNLOADS.glob("ChatGPT Image*.png") if token in path.name]
    if not matches:
        raise FileNotFoundError(f"Could not find image with token {token!r} in {DOWNLOADS}")
    return max(matches, key=lambda path: path.stat().st_mtime)


def ensure_dirs(*paths: Path) -> None:
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def trim_near_white(im: Image.Image, tolerance: int = 14, padding: int = 10) -> Image.Image:
    rgb = im.convert("RGB")
    bg = Image.new("RGB", im.size, rgb.getpixel((0, 0)))
    diff = ImageChops.difference(rgb, bg).convert("L")
    mask = diff.point(lambda value: 255 if value > tolerance else 0)
    bbox = mask.getbbox()
    if not bbox:
        return im
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(im.width, bbox[2] + padding)
    bottom = min(im.height, bbox[3] + padding)
    return im.crop((left, top, right, bottom))


def remove_light_background(im: Image.Image, tolerance: int = 26) -> Image.Image:
    rgba = im.convert("RGBA")
    rgb = rgba.convert("RGB")
    bg = rgb.getpixel((0, 0))

    alpha = Image.new("L", im.size, 0)
    source = rgb.load()
    alpha_pixels = alpha.load()
    q: deque[tuple[int, int]] = deque()

    def is_background(x: int, y: int) -> bool:
        r, g, b = source[x, y]
        return (
            abs(r - bg[0]) <= tolerance
            and abs(g - bg[1]) <= tolerance
            and abs(b - bg[2]) <= tolerance
            and min(r, g, b) >= 214
        )

    for x in range(im.width):
        for y in (0, im.height - 1):
            if alpha_pixels[x, y] == 0 and is_background(x, y):
                alpha_pixels[x, y] = 255
                q.append((x, y))
    for y in range(im.height):
        for x in (0, im.width - 1):
            if alpha_pixels[x, y] == 0 and is_background(x, y):
                alpha_pixels[x, y] = 255
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < im.width and 0 <= ny < im.height and alpha_pixels[nx, ny] == 0 and is_background(nx, ny):
                alpha_pixels[nx, ny] = 255
                q.append((nx, ny))

    transparent_background = ImageChops.invert(alpha).filter(ImageFilter.GaussianBlur(0.55))
    rgba.putalpha(transparent_background)
    return rgba


def crop_grid(spec: GridSpec) -> list[Path]:
    source = Image.open(find_download(spec.token)).convert("RGBA")
    target_dir = OUT / spec.output_dir
    ensure_dirs(target_dir)
    written: list[Path] = []
    for index, box in enumerate(spec.boxes, start=1):
        crop = source.crop(box)
        path = target_dir / f"{spec.prefix}-{index:02}.png"
        crop.save(path)
        written.append(path)
    return written


def write_page_background(token: str, output_name: str) -> Path:
    source = Image.open(find_download(token)).convert("RGBA")
    target_dir = OUT / "page-backgrounds"
    ensure_dirs(target_dir)
    path = target_dir / output_name
    source.save(path)
    return path


def write_decorations() -> list[Path]:
    source = Image.open(find_download("10_24_07 (3)")).convert("RGBA")
    target_dir = OUT / "decorations"
    ensure_dirs(target_dir)

    boxes: list[tuple[str, tuple[int, int, int, int], int]] = [
        ("child-praying", (62, 53, 302, 331), 18),
        ("child-bible", (339, 36, 543, 331), 18),
        ("child-resting", (574, 74, 799, 333), 18),
        ("child-waving", (806, 36, 990, 327), 18),
        ("church-hill", (1004, 50, 1228, 323), 18),
        ("sheep-flowers", (1217, 104, 1415, 326), 18),
        ("open-bible-flowers", (84, 411, 398, 557), 18),
        ("cross-clouds", (472, 389, 705, 556), 22),
        ("potted-sprout", (777, 397, 924, 558), 18),
        ("shield-cross", (960, 400, 1128, 555), 18),
        ("leaf-sprig", (67, 593, 223, 739), 22),
        ("flower-bunch", (281, 583, 453, 736), 18),
        ("soft-cloud", (501, 591, 678, 730), 24),
        ("sparkles", (764, 591, 862, 735), 22),
        ("hills-small", (888, 608, 1131, 716), 18),
        ("path-meadow", (1170, 596, 1411, 739), 18),
        ("open-bible-large", (78, 809, 406, 949), 18),
        ("heart-leaves", (520, 813, 720, 935), 18),
        ("home-cross", (783, 804, 966, 951), 18),
        ("sunrise-hills", (1040, 805, 1344, 936), 20),
        ("dove-branch", (92, 963, 270, 1060), 22),
        ("butterfly", (321, 954, 447, 1066), 20),
        ("heart-orange", (516, 957, 586, 1032), 22),
        ("heart-green", (615, 961, 690, 1031), 22),
        ("bookmarks", (751, 940, 902, 1064), 18),
        ("flower-pot", (1010, 943, 1190, 1060), 18),
        ("flower-bouquet", (1216, 932, 1414, 1059), 18),
    ]

    written: list[Path] = []
    for name, box, tolerance in boxes:
        crop = trim_near_white(source.crop(box), tolerance=8, padding=8)
        cutout = remove_light_background(crop, tolerance=tolerance)
        path = target_dir / f"{name}.png"
        cutout.save(path)
        written.append(path)
    return written


def write_index(verse_count: int) -> Path:
    lines = [
        "import appBookBackground from './page-backgrounds/app-book-background.png';",
        "import moodCardBackground from './story-backgrounds/story-bg-05.png';",
        "import continueCardBackground from './story-backgrounds/story-bg-02.png';",
        "",
    ]
    for i in range(1, verse_count + 1):
        lines.append(f"import verseBg{i:02} from './verse-backgrounds/verse-bg-{i:02}.png';")
    lines.append("")

    used_decoration_names = [
        "open-bible-flowers",
        "bookmarks",
        "potted-sprout",
        "cross-clouds",
        "open-bible-large",
    ]
    decoration_identifiers: list[tuple[str, str]] = []
    for name in used_decoration_names:
        ident = "".join(part.capitalize() if index else part for index, part in enumerate(name.split("-")))
        decoration_identifiers.append((ident, name))
        lines.append(f"import {ident} from './decorations/{name}.png';")
    lines.extend(
        [
            "",
            f"export const verseBackgrounds = [{', '.join(f'verseBg{i:02}' for i in range(1, verse_count + 1))}];",
            "export { appBookBackground, continueCardBackground, moodCardBackground };",
            "",
            "export const designDecorations = {",
        ]
    )
    for ident, name in decoration_identifiers:
        key = "".join(part.capitalize() if index else part for index, part in enumerate(name.split("-")))
        lines.append(f"  {key}: {ident},")
    lines.append("};")
    lines.append("")

    index_path = OUT / "index.ts"
    index_path.write_text("\n".join(lines), encoding="utf-8")
    return index_path


def main() -> None:
    ensure_dirs(OUT)

    verse_boxes = [
        (27, 33, 464, 273),
        (497, 33, 944, 273),
        (978, 33, 1418, 273),
        (27, 296, 464, 533),
        (497, 296, 944, 533),
        (978, 296, 1418, 533),
        (27, 556, 464, 787),
        (497, 556, 944, 787),
        (978, 556, 1418, 787),
        (27, 810, 464, 1052),
        (497, 810, 944, 1052),
        (978, 810, 1418, 1052),
    ]

    portrait_boxes = [
        (27, 22, 356, 527),
        (382, 22, 711, 527),
        (737, 22, 1066, 527),
        (1092, 22, 1421, 527),
        (27, 556, 356, 1061),
        (382, 556, 711, 1061),
        (737, 556, 1066, 1061),
        (1092, 556, 1421, 1061),
    ]

    story_boxes = [
        (36, 30, 360, 526),
        (386, 30, 710, 526),
        (733, 30, 1057, 526),
        (1084, 30, 1408, 526),
        (36, 558, 360, 1055),
        (386, 558, 710, 1055),
        (733, 558, 1057, 1055),
        (1084, 558, 1408, 1055),
    ]

    crop_grid(GridSpec("10_24_07 (1)", "verse-backgrounds", "verse-bg", 3, 4, verse_boxes))
    crop_grid(GridSpec("10_24_07 (2)", "portrait-backgrounds", "portrait-bg", 4, 2, portrait_boxes))
    crop_grid(GridSpec("10_09_34", "story-backgrounds", "story-bg", 4, 2, story_boxes))

    write_page_background("10_07_52 (2)", "app-book-background.png")
    write_page_background("10_07_52 (3)", "app-floral-background.png")
    write_page_background("10_07_52 (4)", "app-garden-background.png")
    write_page_background("10_07_52 (5)", "app-search-background.png")

    decorations = write_decorations()
    write_index(verse_count=12)

    print(f"Wrote design assets to {OUT}")
    print(f"Verse backgrounds: 12")
    print(f"Portrait backgrounds: 8")
    print(f"Story backgrounds: 8")
    print(f"Decorations: {len(decorations)}")


if __name__ == "__main__":
    main()
