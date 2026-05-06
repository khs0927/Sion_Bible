from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor


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


def padded_box(box: tuple[int, int, int, int], width: int, height: int, padding: int = 16) -> np.ndarray:
    x0, y0, x1, y1 = box
    return np.array(
        [
            max(0, x0 - padding),
            max(0, y0 - padding),
            min(width - 1, x1 + padding),
            min(height - 1, y1 + padding),
        ],
        dtype=np.float32,
    )


def smooth_alpha(mask: np.ndarray) -> np.ndarray:
    alpha = (mask.astype(np.uint8) * 255)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)), iterations=1)
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
    return alpha


def write_sam_cutout(image_rgb: np.ndarray, mask: np.ndarray, out_path: Path, remove_loose_white: bool = False) -> None:
    height, width = mask.shape
    ys, xs = np.where(mask)
    if len(xs) == 0 or len(ys) == 0:
        raise RuntimeError(f"Empty SAM2 mask for {out_path}")

    pad = 26
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(width, int(xs.max()) + pad + 1)
    y1 = min(height, int(ys.max()) + pad + 1)

    rgba = np.dstack([image_rgb, smooth_alpha(mask)])
    cropped = remove_edge_background(Image.fromarray(rgba[y0:y1, x0:x1], "RGBA"))
    if remove_loose_white:
        cropped = remove_pale_artifacts(cropped)
    cropped.save(out_path)


def remove_edge_background(image: Image.Image, tolerance: int = 22) -> Image.Image:
    rgba = np.array(image.convert("RGBA"))
    height, width = rgba.shape[:2]
    rgb = rgba[:, :, :3].astype(np.int16)
    alpha = rgba[:, :, 3]
    background = np.median(
        np.vstack([
            rgb[:2, :, :].reshape(-1, 3),
            rgb[-2:, :, :].reshape(-1, 3),
            rgb[:, :2, :].reshape(-1, 3),
            rgb[:, -2:, :].reshape(-1, 3),
        ]),
        axis=0,
    )
    diff = np.linalg.norm(rgb - background, axis=2)
    channel_spread = rgb.max(axis=2) - rgb.min(axis=2)
    near_white_edge = (rgb.min(axis=2) > 235) & (channel_spread < 24)
    near_background = ((diff < tolerance) & (rgb.min(axis=2) > 218) | near_white_edge) & (alpha > 0)

    flood = np.zeros((height, width), dtype=np.uint8)
    queue: list[tuple[int, int]] = []
    for x in range(width):
        for y in (0, height - 1):
            if near_background[y, x]:
                flood[y, x] = 1
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if near_background[y, x] and flood[y, x] == 0:
                flood[y, x] = 1
                queue.append((x, y))

    while queue:
        x, y = queue.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height and flood[ny, nx] == 0 and near_background[ny, nx]:
                flood[ny, nx] = 1
                queue.append((nx, ny))

    alpha[flood.astype(bool)] = 0
    rgba[:, :, 3] = alpha
    return Image.fromarray(rgba, "RGBA")


def remove_pale_artifacts(image: Image.Image) -> Image.Image:
    rgba = np.array(image.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.int16)
    alpha = rgba[:, :, 3]
    channel_spread = rgb.max(axis=2) - rgb.min(axis=2)
    pale = (rgb.min(axis=2) > 226) & (channel_spread < 34) & (alpha > 0)
    alpha[pale] = 0
    rgba[:, :, 3] = alpha
    return Image.fromarray(rgba, "RGBA")


def write_decorations() -> list[Path]:
    source = Image.open(find_download("10_24_07 (3)")).convert("RGB")
    image = np.array(source)
    height, width = image.shape[:2]
    target_dir = OUT / "decorations"
    ensure_dirs(target_dir)

    boxes: list[tuple[str, tuple[int, int, int, int]]] = [
        ("child-praying", (50, 45, 322, 342)),
        ("child-bible", (320, 25, 555, 338)),
        ("child-resting", (535, 45, 790, 340)),
        ("child-waving", (790, 25, 1010, 338)),
        ("church-hill", (990, 35, 1245, 340)),
        ("sheep-flowers", (1205, 85, 1430, 338)),
        ("open-bible-flowers", (55, 390, 430, 575)),
        ("cross-clouds", (445, 360, 725, 575)),
        ("potted-sprout", (750, 372, 950, 578)),
        ("shield-cross", (940, 365, 1150, 578)),
        ("leaf-sprig", (45, 575, 245, 760)),
        ("flower-bunch", (250, 565, 480, 755)),
        ("soft-cloud", (470, 565, 705, 755)),
        ("sparkles", (725, 560, 890, 755)),
        ("hills-small", (865, 585, 1150, 735)),
        ("path-meadow", (1140, 570, 1430, 760)),
        ("open-bible-large", (55, 790, 430, 970)),
        ("heart-leaves", (485, 790, 750, 960)),
        ("home-cross", (750, 780, 995, 970)),
        ("sunrise-hills", (1000, 780, 1375, 960)),
        ("dove-branch", (65, 940, 290, 1080)),
        ("butterfly", (290, 930, 465, 1085)),
        ("heart-orange", (490, 930, 605, 1055)),
        ("heart-green", (590, 930, 720, 1055)),
        ("bookmarks", (720, 920, 930, 1080)),
        ("flower-pot", (970, 910, 1210, 1080)),
        ("flower-bouquet", (1190, 905, 1430, 1080)),
    ]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    sam2_model = build_sam2("configs/sam2.1/sam2.1_hiera_t.yaml", str(ROOT / "scratch/sam2/checkpoints/sam2.1_hiera_tiny.pt"), device=device)
    predictor = SAM2ImagePredictor(sam2_model)

    written: list[Path] = []
    remove_loose_white_names = {"bookmarks", "heart-green", "heart-orange", "sparkles"}
    with torch.inference_mode():
        predictor.set_image(image)
        for name, box in boxes:
            masks, scores, _ = predictor.predict(
                box=padded_box(box, width, height, padding=10),
                multimask_output=True,
            )
            mask = masks[int(np.argmax(scores))]
            path = target_dir / f"{name}.png"
            write_sam_cutout(image, mask, path, remove_loose_white=name in remove_loose_white_names)
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
