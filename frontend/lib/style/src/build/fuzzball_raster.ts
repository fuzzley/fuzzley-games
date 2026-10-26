// The fuzzball as PNG and ICO files, for what shows no SVG: an older
// browser's tab, and a phone's home screen. It runs in Node only, at build
// time, through sharp, which it loads only when asked for an image.

import { fuzzballSvg } from "../fuzzball.ts";

/** The sizes an ICO file holds the fuzzball at, in pixels. */
export const ICO_SIZES = [16, 32, 48] as const;

/** Describes how the fuzzball sits in a PNG. */
export interface PngOptions {
  /** What fills the square behind it; none leaves it transparent. */
  readonly background?: string;
  /** How much of the square's width the fuzzball takes, 1 by default. */
  readonly scale?: number;
}

/** Returns the fuzzball as a PNG, `size` pixels square, its fur in a color. */
export async function fuzzballPng(
  fill: string,
  size: number,
  { background, scale = 1 }: PngOptions = {},
): Promise<Buffer> {
  const { default: sharp } = await import("sharp");
  const markSize = Math.round(size * scale);
  const svg = fuzzballSvg(fill, { withGlints: markSize > 16 });
  // The SVG is 32 units across, drawn at 72 dpi: this density draws it at
  // markSize pixels, rather than enlarging a 32-pixel drawing.
  const mark = await sharp(Buffer.from(svg), { density: (72 * markSize) / 32 })
    .resize(markSize, markSize)
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

/** Returns an ICO file of the fuzzball at each of the ICO sizes. */
export async function fuzzballIco(fill: string): Promise<Buffer> {
  const images = await Promise.all(
    ICO_SIZES.map(async (size) => ({
      size,
      png: await fuzzballPng(fill, size),
    })),
  );
  // An ICO file is a header, a 16-byte entry per image, then the images,
  // which may be PNGs.
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}
