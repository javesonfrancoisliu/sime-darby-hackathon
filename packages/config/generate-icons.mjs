// One-off build tool shared by both apps: turns a source icon into the PWA icon set.
// Not shipped with the app. Run from an app folder: node ../../packages/config/generate-icons.mjs <source> <outDir>
// Each app wires this as its `icons` script, e.g. pnpm --filter @sdh/web icons
//
// Steps:
//  1. Trim the surrounding near-white margin so only the rounded icon remains.
//  2. Emit tightly-cropped 192 and 512 "any" icons (design preserved).
//  3. Emit a 512 maskable icon: the trimmed icon scaled to ~78% on a brand-red
//     background, so Android's safe-zone mask never clips the artwork.
//  4. Emit a 180 Apple touch icon (opaque background for iOS home screen).

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const [sourceArg, outDirArg] = process.argv.slice(2);
if (!sourceArg || !outDirArg) {
  console.error("Usage: node generate-icons.mjs <source image> <output dir>");
  process.exit(1);
}
const source = resolve(sourceArg);
const outDir = resolve(outDirArg);

const BRAND_RED = "#D71920";

async function run() {
  // Trim removes the uniform near-white border. threshold tolerates the soft
  // edge/anti-aliasing around the rounded square.
  const trimmed = await sharp(source).trim({ threshold: 20 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  console.log(`Trimmed icon: ${meta.width}x${meta.height}`);

  // Square it up on a transparent canvas (in case trim leaves a few px off-square).
  const side = Math.max(meta.width, meta.height);
  const square = await sharp(trimmed)
    .resize(side, side, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await mkdir(outDir, { recursive: true });

  // 1. "any" icons — tight crop, transparent corners preserved.
  for (const size of [192, 512]) {
    await sharp(square)
      .resize(size, size)
      .png()
      .toFile(resolve(outDir, `pwa-${size}.png`));
    console.log(`wrote pwa-${size}.png`);
  }

  // 2. Maskable 512 — artwork at 78% on brand-red, 11% padding each side.
  const maskSize = 512;
  const inner = Math.round(maskSize * 0.78);
  const innerIcon = await sharp(square).resize(inner, inner).png().toBuffer();
  await sharp({
    create: {
      width: maskSize,
      height: maskSize,
      channels: 4,
      background: BRAND_RED,
    },
  })
    .composite([{ input: innerIcon, gravity: "center" }])
    .png()
    .toFile(resolve(outDir, "maskable-512.png"));
  console.log("wrote maskable-512.png");

  // 3. Apple touch icon 180 — opaque (iOS ignores transparency, shows black).
  const apple = 180;
  const appleInner = await sharp(square).resize(apple, apple).png().toBuffer();
  await sharp({
    create: { width: apple, height: apple, channels: 4, background: BRAND_RED },
  })
    .composite([{ input: appleInner, gravity: "center" }])
    .png()
    .toFile(resolve(outDir, "apple-touch-icon.png"));
  console.log("wrote apple-touch-icon.png");

  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
