from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor


SOURCE_NAME_TOKEN = "10_07_36"
OUTPUT_SIZE = 256
SOURCE_ICON_ROWS = [
    ["book_heart", "book_refresh", "settings", "book_search", "home", "book_cross", "checklist"],
    ["bell_alert", "heart_orange", "bell", "search", "filter", "arrow_left", "share", "bookmark_star"],
    ["document", "image", "day_cloud", "moon_star", "heart_soft", "leaf", "flower", "prayer_hands"],
    ["open_book", "pencil", "plus", "minus", "star", "info", "ellipsis", "close"],
    ["check_circle", "circle", "chevron_right", "chevron_up", "chevron_down", "calendar", "clock", "location"],
]

APP_ICON_MAP = {
    "home": "home",
    "read": "open_book",
    "verse": "book_cross",
    "journal": "document",
    "saved": "bookmark_star",
    "prayer": "prayer_hands",
    "audio": "bell",
    "share": "share",
    "random": "star",
    "settings": "settings",
    "new_entry": "pencil",
    "meditation": "book_search",
    "prayer_note": "prayer_hands",
    "application": "checklist",
    "calendar": "calendar",
    "testimony": "heart_soft",
    "backup": "share",
    "delete": "close",
    "comfort": "moon_star",
    "hope": "day_cloud",
    "gratitude": "flower",
    "love": "heart_orange",
    "wisdom": "leaf",
    "peace": "circle",
    "blessing": "prayer_hands",
    "strength": "check_circle",
    "search": "search",
    "books": "open_book",
    "old": "book_heart",
    "new": "book_cross",
    "prev": "arrow_left",
    "next": "chevron_right",
    "bookmark": "bookmark_star",
    "bookmarked": "bookmark_star",
    "font": "pencil",
    "light": "day_cloud",
    "dark": "moon_star",
    "refresh": "book_refresh",
}


def default_source() -> Path:
    downloads = Path.home() / "Downloads"
    candidates = [p for p in downloads.glob("ChatGPT Image*.png") if SOURCE_NAME_TOKEN in p.name]
    if not candidates:
        raise FileNotFoundError(f"Could not find a ChatGPT Image png containing {SOURCE_NAME_TOKEN!r} in {downloads}")
    return max(candidates, key=lambda p: p.stat().st_mtime)


def detect_icon_boxes(image_rgb: np.ndarray) -> list[tuple[int, int, int, int]]:
    hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    corners = np.vstack(
        [
            image_rgb[:80, :80].reshape(-1, 3),
            image_rgb[:80, -80:].reshape(-1, 3),
            image_rgb[-80:, :80].reshape(-1, 3),
            image_rgb[-80:, -80:].reshape(-1, 3),
        ]
    )
    background = np.median(corners, axis=0)
    diff = np.linalg.norm(image_rgb.astype(np.int16) - background.astype(np.int16), axis=2)
    mask = ((saturation > 22) | (diff > 16) | (value < 238)).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)), iterations=1)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)), iterations=2)

    _, _, stats, centroids = cv2.connectedComponentsWithStats(mask, 8)
    components = []
    for index in range(1, len(stats)):
        x, y, w, h, area = stats[index]
        if area < 1000:
            continue
        cx, cy = centroids[index]
        components.append({"box": (int(x), int(y), int(x + w), int(y + h)), "cx": float(cx), "cy": float(cy)})

    rows: list[list[dict[str, object]]] = []
    for component in sorted(components, key=lambda item: item["cy"]):
        for row in rows:
            row_center = sum(float(item["cy"]) for item in row) / len(row)
            if abs(float(component["cy"]) - row_center) < 78:
                row.append(component)
                break
        else:
            rows.append([component])

    rows.sort(key=lambda row: sum(float(item["cy"]) for item in row) / len(row))
    boxes = []
    for row in rows:
        for item in sorted(row, key=lambda component: component["cx"]):
            boxes.append(item["box"])

    expected = sum(len(row) for row in SOURCE_ICON_ROWS)
    if len(boxes) != expected:
        raise RuntimeError(f"Detected {len(boxes)} icons, expected {expected}.")
    return boxes


def source_names() -> list[str]:
    return [name for row in SOURCE_ICON_ROWS for name in row]


def padded_box(box: tuple[int, int, int, int], width: int, height: int, padding: int = 14) -> np.ndarray:
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


def write_icon(image_rgb: np.ndarray, mask: np.ndarray, out_path: Path) -> None:
    height, width = mask.shape
    ys, xs = np.where(mask)
    if len(xs) == 0 or len(ys) == 0:
        raise RuntimeError(f"Empty SAM2 mask for {out_path}")

    pad = 18
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(width, int(xs.max()) + pad + 1)
    y1 = min(height, int(ys.max()) + pad + 1)

    rgba = np.dstack([image_rgb, smooth_alpha(mask)])
    cropped = Image.fromarray(rgba[y0:y1, x0:x1], "RGBA")
    target = OUTPUT_SIZE - 14
    scale = min(target / cropped.width, target / cropped.height)
    cropped = cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (255, 255, 255, 0))
    offset = ((OUTPUT_SIZE - cropped.width) // 2, (OUTPUT_SIZE - cropped.height) // 2)
    canvas.alpha_composite(cropped, offset)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=default_source())
    parser.add_argument("--output", type=Path, default=Path("src/assets/clay-icons/sam2"))
    parser.add_argument("--checkpoint", type=Path, default=Path("scratch/sam2/checkpoints/sam2.1_hiera_tiny.pt"))
    parser.add_argument("--model-cfg", default="configs/sam2.1/sam2.1_hiera_t.yaml")
    args = parser.parse_args()

    image = np.array(Image.open(args.source).convert("RGB"))
    height, width = image.shape[:2]
    boxes = detect_icon_boxes(image)
    names = source_names()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    sam2_model = build_sam2(args.model_cfg, str(args.checkpoint), device=device)
    predictor = SAM2ImagePredictor(sam2_model)

    with torch.inference_mode():
        predictor.set_image(image)
        for name, box in zip(names, boxes):
            masks, scores, _ = predictor.predict(
                box=padded_box(box, width, height),
                multimask_output=True,
            )
            mask = masks[int(np.argmax(scores))]
            out_path = args.output / "source" / f"{name}.png"
            write_icon(image, mask, out_path)
            print(f"{name}: {out_path}")

    for app_name, source_name in APP_ICON_MAP.items():
        shutil.copyfile(args.output / "source" / f"{source_name}.png", args.output / f"{app_name}.png")
        print(f"{app_name}: {source_name}")


if __name__ == "__main__":
    main()
