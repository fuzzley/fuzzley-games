import sharp from "sharp";
import { ICO_SIZES, fuzzballIco, fuzzballPng } from "./fuzzball_raster.ts";

const FUR = "#2f7d4f";
const FUR_RGBA = [0x2f, 0x7d, 0x4f, 255];

/** Returns the color of one pixel of a PNG, as red, green, blue and alpha. */
async function pixel(png: Buffer, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const start = (y * info.width + x) * 4;
  return [...data.subarray(start, start + 4)];
}

/** Returns the images an ICO file holds, with the size its entry gives each. */
function icoImages(ico: Buffer): { size: number; png: Buffer }[] {
  return Array.from({ length: ico.readUInt16LE(4) }, (_, index) => {
    const entry = 6 + 16 * index;
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    return {
      size: ico.readUInt8(entry),
      png: ico.subarray(offset, offset + length),
    };
  });
}

describe("fuzzballPng", () => {
  it("draws a square of the size asked for", async () => {
    const { width, height } = await sharp(
      await fuzzballPng(FUR, 180),
    ).metadata();

    expect([width, height]).toEqual([180, 180]);
  });

  it("draws the body in the fur's color", async () => {
    // Below the eyes, at the middle of the body.
    const png = await fuzzballPng(FUR, 64);

    expect(await pixel(png, 32, 44)).toEqual(FUR_RGBA);
  });

  it("leaves the corners transparent with no background", async () => {
    const png = await fuzzballPng(FUR, 64);

    expect((await pixel(png, 0, 0))[3]).toBe(0);
  });

  it("fills the corners with the background", async () => {
    const png = await fuzzballPng(FUR, 64, { background: "#ffffff" });

    expect(await pixel(png, 0, 0)).toEqual([255, 255, 255, 255]);
  });

  it("shrinks the fuzzball to the scale, in the middle of the square", async () => {
    // At full size, this pixel is the bottom of the body.
    const png = await fuzzballPng(FUR, 64, {
      background: "#ffffff",
      scale: 0.5,
    });

    expect(await pixel(png, 32, 50)).toEqual([255, 255, 255, 255]);
  });
});

describe("fuzzballIco", () => {
  it("holds the fuzzball at each of the ICO sizes", async () => {
    const images = icoImages(await fuzzballIco(FUR));

    expect(images.map(({ size }) => size)).toEqual(ICO_SIZES);
  });

  it("holds each as a PNG of the size its entry gives", async () => {
    const images = icoImages(await fuzzballIco(FUR));

    const widths = await Promise.all(
      images.map(async ({ png }) => (await sharp(png).metadata()).width),
    );

    expect(widths).toEqual(ICO_SIZES);
  });
});
