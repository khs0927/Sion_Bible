from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor


SOURCE_NAME_TOKEN = "10_11_32"
OUTPUT_SIZE = 256

MOOD_BOXES = [
    ("peace", (80, 70, 360, 285)),
    ("gratitude", (420, 75, 685, 285)),
    ("anxiety", (760, 70, 985, 305)),
    ("hope", (1065, 85, 1315, 290)),
    ("repentance", (115, 375, 355, 635)),
    ("comfort", (430, 375, 680, 625)),
    ("love", (735, 390, 995, 625)),
    ("forgiveness", (1065, 385, 1325, 625)),
    ("fear", (85, 690, 355, 925)),
    ("wisdom", (420, 685, 680, 920)),
    ("strength", (735, 690, 980, 930)),
    ("blessing", (1065, 690, 1325, 925)),
]


def default_source() -> Path:
    downloads = Path.home() / "Downloads"
    candidates = [p for p in downloads.glob("ChatGPT Image*.png") if SOURCE_NAME_TOKEN in p.name]
    if not candidates:
        raise FileNotFoundError(f"Could not find a ChatGPT Image png containing {SOURCE_NAME_TOKEN!r} in {downloads}")
    return max(candidates, key=lambda p: p.stat().st_mtime)


def padded_box(box: tuple[int, int, int, int], width: int, height: int, padding: int = 8) -> np.ndarray:
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


def write_icon(image_rgb: np.ndarray, mask: np.ndarray, fallback_box: tuple[int, int, int, int], out_path: Path) -> None:
    height, width = mask.shape
    ys, xs = np.where(mask)
    if len(xs) == 0 or len(ys) == 0:
        x0, y0, x1, y1 = fallback_box
    else:
        pad = 16
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
    parser.add_argument("--output", type=Path, default=Path("src/assets/clay-icons/sam2/moods"))
    parser.add_argument("--checkpoint", type=Path, default=Path("scratch/sam2/checkpoints/sam2.1_hiera_tiny.pt"))
    parser.add_argument("--model-cfg", default="configs/sam2.1/sam2.1_hiera_t.yaml")
    args = parser.parse_args()

    image = np.array(Image.open(args.source).convert("RGB"))
    height, width = image.shape[:2]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    sam2_model = build_sam2(args.model_cfg, str(args.checkpoint), device=device)
    predictor = SAM2ImagePredictor(sam2_model)

    with torch.inference_mode():
        predictor.set_image(image)
        for name, box in MOOD_BOXES:
            masks, scores, _ = predictor.predict(
                box=padded_box(box, width, height),
                multimask_output=True,
            )
            mask = masks[int(np.argmax(scores))]
            out_path = args.output / f"{name}.png"
            write_icon(image, mask, box, out_path)
            print(f"{name}: {out_path}")


if __name__ == "__main__":
    main()
