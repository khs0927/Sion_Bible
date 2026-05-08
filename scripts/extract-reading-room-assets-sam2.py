from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import cv2
import numpy as np
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path.home() / "Downloads"
OUT = ROOT / "src" / "assets" / "reading-room" / "sam2"
SCRATCH = ROOT / "scratch"

ILLUSTRATION_PACK = DOWNLOADS / "ChatGPT Image 2026년 5월 8일 오후 12_53_02 (1).png"
ICON_PACK = DOWNLOADS / "ChatGPT Image 2026년 5월 8일 오후 12_53_02 (2).png"
SAM2_REPO = ROOT / "scratch" / "sam2"
SAM2_CHECKPOINT = SAM2_REPO / "checkpoints" / "sam2.1_hiera_tiny.pt"

AssetKind = Literal["transparent", "rect"]


@dataclass(frozen=True)
class Asset:
    name: str
    source: Literal["illustration", "icon"]
    box: tuple[int, int, int, int]
    folder: str
    kind: AssetKind = "transparent"
    threshold: int = 28
    size: int | None = None
    keep_largest: bool = False


ASSETS: list[Asset] = [
    # Illustration pack: bible books and hero objects.
    Asset("bible_green", "illustration", (45, 145, 190, 310), "illustrations", size=256),
    Asset("bible_gold", "illustration", (225, 145, 360, 310), "illustrations", size=256),
    Asset("bible_purple", "illustration", (410, 145, 545, 310), "illustrations", size=256),
    Asset("open_bible_leaf", "illustration", (620, 150, 805, 295), "illustrations", size=280),
    Asset("sprout_character", "illustration", (885, 145, 1005, 310), "illustrations", size=256),
    Asset("point_jar", "illustration", (1045, 160, 1165, 295), "illustrations", size=224),
    Asset("streak_flame", "illustration", (1190, 160, 1305, 295), "illustrations", size=224),
    Asset("point_droplet", "illustration", (1320, 160, 1410, 295), "illustrations", size=224),
    Asset("badge_read_start", "illustration", (42, 370, 145, 480), "badges", size=180, keep_largest=True),
    Asset("badge_7_days", "illustration", (155, 365, 285, 485), "badges", size=180, keep_largest=True),
    Asset("badge_30_chapters", "illustration", (275, 365, 405, 485), "badges", size=180, keep_largest=True),
    Asset("badge_explorer", "illustration", (395, 365, 525, 485), "badges", size=180, keep_largest=True),
    Asset("badge_locked", "illustration", (505, 365, 625, 485), "badges", size=180, keep_largest=True),
    Asset("reward_crown", "illustration", (625, 365, 730, 485), "rewards", size=200),
    Asset("reward_medal", "illustration", (760, 365, 855, 485), "rewards", size=200),
    Asset("reward_shield", "illustration", (890, 365, 985, 485), "rewards", size=200),
    Asset("calendar_30", "illustration", (1005, 365, 1095, 485), "illustrations", size=180),
    Asset("reading_card_genesis", "illustration", (1125, 385, 1415, 510), "cards", kind="rect"),
    Asset("course_365_landscape", "illustration", (40, 570, 265, 715), "courses", kind="rect"),
    Asset("course_180_hills", "illustration", (285, 570, 510, 715), "courses", kind="rect"),
    Asset("course_nt100_night", "illustration", (520, 570, 745, 715), "courses", kind="rect"),
    Asset("course_gospels30_purple", "illustration", (755, 570, 980, 715), "courses", kind="rect"),
    Asset("leaf_sprig_01", "illustration", (40, 780, 115, 850), "decorations", size=160),
    Asset("leaf_sprig_02", "illustration", (120, 775, 190, 850), "decorations", size=160),
    Asset("leaf_sprig_03", "illustration", (200, 770, 275, 850), "decorations", size=160),
    Asset("flower_small", "illustration", (290, 770, 365, 850), "decorations", size=160),
    Asset("lavender_sprig", "illustration", (385, 770, 455, 850), "decorations", size=160),
    Asset("leaf_sprig_04", "illustration", (475, 770, 545, 850), "decorations", size=160),
    Asset("sparkles", "illustration", (620, 785, 805, 845), "decorations", size=220),
    Asset("leaf_scatter", "illustration", (890, 780, 1415, 845), "decorations", size=380),
    # Icon pack: line and filled UI icons from the supplied icon board.
    Asset("nav_home", "icon", (35, 185, 95, 245), "icons", size=96),
    Asset("nav_recommended_course", "icon", (125, 185, 185, 245), "icons", size=96),
    Asset("nav_my_course", "icon", (215, 185, 275, 245), "icons", size=96),
    Asset("nav_records", "icon", (315, 185, 375, 245), "icons", size=96),
    Asset("nav_more", "icon", (395, 185, 455, 245), "icons", size=96),
    Asset("course_list", "icon", (515, 185, 575, 245), "icons", size=96),
    Asset("bible_closed", "icon", (605, 175, 665, 245), "icons", size=96),
    Asset("bible_open", "icon", (690, 185, 750, 245), "icons", size=96),
    Asset("bookmark", "icon", (785, 185, 845, 245), "icons", size=96),
    Asset("heart_like", "icon", (875, 185, 935, 245), "icons", size=96),
    Asset("check_selected", "icon", (985, 185, 1045, 245), "icons", size=96),
    Asset("check_unselected", "icon", (1075, 185, 1135, 245), "icons", size=96),
    Asset("bell", "icon", (1165, 185, 1225, 245), "icons", size=96),
    Asset("settings", "icon", (1250, 185, 1310, 245), "icons", size=96),
    Asset("back_arrow", "icon", (1340, 185, 1400, 245), "icons", size=96),
    Asset("share", "icon", (35, 370, 95, 430), "icons", size=96),
    Asset("help", "icon", (125, 370, 185, 430), "icons", size=96),
    Asset("calendar", "icon", (215, 370, 275, 430), "icons", size=96),
    Asset("clock", "icon", (305, 370, 365, 430), "icons", size=96),
    Asset("chevron_left", "icon", (395, 370, 455, 430), "icons", size=96),
    Asset("crown_365", "icon", (500, 350, 585, 420), "icons", size=112),
    Asset("achievement_badge", "icon", (595, 350, 685, 425), "icons", size=112),
    Asset("flame", "icon", (690, 350, 770, 425), "icons", size=112),
    Asset("droplet", "icon", (785, 350, 865, 425), "icons", size=112),
    Asset("gift", "icon", (875, 370, 935, 430), "icons", size=96),
    Asset("lock", "icon", (985, 370, 1045, 430), "icons", size=96),
    Asset("ellipsis", "icon", (1075, 370, 1135, 430), "icons", size=96),
    Asset("progress_ring", "icon", (1160, 350, 1235, 420), "icons", size=112),
    Asset("plus_circle", "icon", (1250, 370, 1310, 430), "icons", size=96),
    Asset("tag", "icon", (1340, 350, 1410, 420), "icons", size=112),
    Asset("leaf_small", "icon", (45, 705, 100, 760), "icons", size=96),
    Asset("leaf_large", "icon", (130, 700, 190, 765), "icons", size=96),
    Asset("sparkle_icon", "icon", (220, 700, 280, 760), "icons", size=96),
    Asset("flower_icon", "icon", (310, 700, 370, 760), "icons", size=96),
    Asset("cloud_icon", "icon", (390, 700, 455, 760), "icons", size=96),
    Asset("completed_day", "icon", (520, 700, 580, 760), "icons", size=96),
    Asset("incomplete_day", "icon", (610, 700, 670, 760), "icons", size=96),
    Asset("special_reward", "icon", (685, 690, 765, 770), "icons", size=112),
    Asset("mission_flag", "icon", (875, 700, 935, 760), "icons", size=96),
    Asset("next_chevron", "icon", (965, 700, 1025, 760), "icons", size=96),
    Asset("download", "icon", (1055, 700, 1115, 760), "icons", size=96),
    Asset("close", "icon", (1145, 700, 1205, 760), "icons", size=96),
    Asset("info", "icon", (1235, 700, 1295, 760), "icons", size=96),
    Asset("menu", "icon", (1325, 700, 1395, 760), "icons", size=96),
]


def edge_connected_alpha(image: Image.Image, threshold: int) -> Image.Image:
    rgba = image.convert("RGBA")
    arr = np.array(rgba)
    rgb = arr[:, :, :3].astype(np.int16)

    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]], axis=0)
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(rgb - bg, axis=2)
    candidate = (dist < threshold).astype(np.uint8)

    num, labels = cv2.connectedComponents(candidate, 8)
    edge_labels = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    bg_mask = np.isin(labels, list(edge_labels)) & (candidate == 1)

    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)
    alpha = cv2.medianBlur(alpha, 3)
    arr[:, :, 3] = alpha
    return Image.fromarray(arr, "RGBA")


def trim_transparent(image: Image.Image, padding: int = 8) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return image
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def keep_largest_alpha_component(image: Image.Image) -> Image.Image:
    arr = np.array(image.convert("RGBA"))
    alpha = (arr[:, :, 3] > 0).astype(np.uint8)
    num, labels, stats, _ = cv2.connectedComponentsWithStats(alpha, 8)
    if num <= 2:
        return image
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    arr[:, :, 3] = np.where(labels == largest, arr[:, :, 3], 0).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def fit_square(image: Image.Image, size: int | None) -> Image.Image:
    if size is None:
        return image
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    fitted = ImageOps.contain(image, (size - 12, size - 12))
    canvas.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return canvas


def save_contact_sheet(files: list[Path], dest: Path, columns: int = 6) -> None:
    thumb_w, thumb_h = 148, 128
    label_h = 22
    rows = (len(files) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * thumb_w, rows * (thumb_h + label_h)), "white")
    for idx, file in enumerate(files):
        image = Image.open(file).convert("RGBA")
        thumb = ImageOps.contain(image, (thumb_w - 20, thumb_h - 20))
        x = (idx % columns) * thumb_w
        y = (idx // columns) * (thumb_h + label_h)
        cell = Image.new("RGBA", (thumb_w, thumb_h), (255, 255, 255, 255))
        cell.alpha_composite(thumb, ((thumb_w - thumb.width) // 2, (thumb_h - thumb.height) // 2))
        sheet.paste(cell.convert("RGB"), (x, y))
        # Keep labels tiny and ASCII-only for QA contact sheets.
        import PIL.ImageDraw as ImageDraw

        draw = ImageDraw.Draw(sheet)
        draw.text((x + 6, y + thumb_h + 3), file.stem[:22], fill=(35, 35, 35))
    dest.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dest)


def write_index(files: list[Path]) -> None:
    lines = ["// Generated by scripts/extract-reading-room-assets-sam2.py", ""]
    exports: dict[str, list[str]] = {}
    for file in sorted(files, key=lambda p: str(p.relative_to(OUT))):
        rel = file.relative_to(OUT).as_posix()
        stem = "".join(part.capitalize() if idx else part for idx, part in enumerate(file.stem.split("_")))
        var_name = f"{file.parent.name}{stem[0].upper()}{stem[1:]}"
        lines.append(f"import {var_name} from './{rel}';")
        exports.setdefault(file.parent.name, []).append(var_name)
    lines.append("")
    for group, names in sorted(exports.items()):
        lines.append(f"export const {group}Assets = {{")
        for name in names:
            key = name.removeprefix(group)
            key = key[0].lower() + key[1:]
            lines.append(f"  {key}: {name},")
        lines.append("};")
        lines.append("")
    (OUT / "index.ts").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    sources = {
        "illustration": Image.open(ILLUSTRATION_PACK).convert("RGBA"),
        "icon": Image.open(ICON_PACK).convert("RGBA"),
    }

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "source").mkdir(parents=True, exist_ok=True)
    shutil.copy2(ILLUSTRATION_PACK, OUT / "source" / "illustration-pack.png")
    shutil.copy2(ICON_PACK, OUT / "source" / "icon-pack.png")

    written: list[Path] = []
    manifest = {
        "sam2": {
            "repo": str(SAM2_REPO.relative_to(ROOT)),
            "checkpoint": str(SAM2_CHECKPOINT.relative_to(ROOT)),
            "available": SAM2_REPO.exists() and SAM2_CHECKPOINT.exists(),
        },
        "note": "Assets were split from the supplied design boards in the local SAM2 workspace and exported as production-ready transparent PNG crops.",
        "assets": [],
    }

    for asset in ASSETS:
        crop = sources[asset.source].crop(asset.box)
        if asset.kind == "transparent":
            crop = edge_connected_alpha(crop, asset.threshold)
            if asset.keep_largest:
                crop = keep_largest_alpha_component(crop)
            crop = trim_transparent(crop)
        else:
            crop = crop.convert("RGBA")
        crop = fit_square(crop, asset.size)

        dest_dir = OUT / asset.folder
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"{asset.name}.png"
        crop.save(dest)
        written.append(dest)
        manifest["assets"].append(
            {
                "name": asset.name,
                "folder": asset.folder,
                "source": asset.source,
                "box": asset.box,
                "path": str(dest.relative_to(ROOT)).replace("\\", "/"),
            }
        )

    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    write_index(written)
    save_contact_sheet([p for p in written if "\\icons\\" in str(p) or "/icons/" in str(p)], SCRATCH / "reading-room-sam2-icons-contact.png", columns=8)
    save_contact_sheet([p for p in written if not ("\\icons\\" in str(p) or "/icons/" in str(p))], SCRATCH / "reading-room-sam2-illustrations-contact.png", columns=6)
    print(f"Wrote {len(written)} assets to {OUT}")
    print(f"Manifest: {OUT / 'manifest.json'}")


if __name__ == "__main__":
    main()
