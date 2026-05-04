import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { iconPacks } from './icon-pack-config.mjs';

const OUTPUT_SIZE = 256;

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertCropInsideImage(pack, metadata, crop) {
  const lastCol = pack.columns - 1;
  const lastRow = pack.rows - 1;
  const right = crop.startX + lastCol * (crop.tileW + crop.gapX) + crop.tileW;
  const bottom = crop.rowTops?.[lastRow] != null
    ? crop.rowTops[lastRow] + (crop.rowHeights?.[lastRow] ?? crop.tileH)
    : crop.startY + lastRow * (crop.tileH + crop.gapY) + crop.tileH;

  if (right > metadata.width || bottom > metadata.height) {
    throw new Error(
      `${pack.name} crop exceeds source bounds: crop ends at ${right}x${bottom}, image is ${metadata.width}x${metadata.height}`,
    );
  }
}

async function slicePack(pack) {
  if (!(await fileExists(pack.src))) {
    console.warn(`Skip: source image not found - ${pack.src}`);
    return;
  }

  await ensureDir(pack.outDir);

  const image = sharp(pack.src);
  const metadata = await image.metadata();

  console.log(`\nSlicing ${pack.name}`);
  console.log(`Source: ${pack.src}`);
  console.log(`Size: ${metadata.width}x${metadata.height}`);

  const { startX, startY, tileW, tileH, gapX, gapY } = pack.crop;
  assertCropInsideImage(pack, metadata, pack.crop);

  for (let index = 0; index < pack.names.length; index += 1) {
    const row = Math.floor(index / pack.columns);
    const col = index % pack.columns;
    const iconName = pack.names[index];
    const left = Math.round(startX + col * (tileW + gapX));
    const top = Math.round(pack.crop.rowTops?.[row] ?? startY + row * (tileH + gapY));
    const height = Math.round(pack.crop.rowHeights?.[row] ?? tileH);
    const outPath = path.join(pack.outDir, `${iconName}.png`);

    await sharp(pack.src)
      .extract({ left, top, width: tileW, height })
      .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toFile(outPath);

    console.log(`- ${iconName}: ${outPath}`);
  }
}

async function main() {
  for (const pack of iconPacks) {
    await slicePack(pack);
  }

  console.log('\nDone. Clay icons generated.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
