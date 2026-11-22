import sharp from "sharp";
import { findBoard } from "./capture-screenshots.mjs";

/** The colour of bare felt: a green well clear of both red and blue. */
const FELT = { r: 20, g: 110, b: 60 };

/** Felt of another shade, along the middle of the bottom edge alone. */
const BOTTOM_FELT = { r: 10, g: 90, b: 40 };

/** The header's tint over the felt, which leans towards blue. */
const HEADER = { r: 20, g: 60, b: 90 };

/** Returns a PNG of one colour. */
async function block(
  width: number,
  height: number,
  background: typeof FELT,
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toBuffer();
}

/**
 * Returns a 100 × 100 screenshot: a header so many rows deep over felt, but
 * for a patch of felt at the header's left, which a search down the wrong
 * column would take for the board, and a strip of another shade of felt at
 * the middle of the bottom edge.
 */
async function screenshot(headerRows: number): Promise<Buffer> {
  return sharp(await block(100, 100, FELT))
    .composite([
      { input: await block(100, headerRows, HEADER), top: 0, left: 0 },
      { input: await block(30, headerRows, FELT), top: 0, left: 0 },
      { input: await block(10, 1, BOTTOM_FELT), top: 99, left: 45 },
    ])
    .png()
    .toBuffer();
}

describe("findBoard", () => {
  it("finds the board from the first row of felt below the header near the middle, and the felt's colour at the middle of its bottom edge", async () => {
    expect(await findBoard(await screenshot(12))).toEqual({
      region: { left: 0, top: 12, width: 100, height: 88 },
      felt: BOTTOM_FELT,
    });
  });

  it("takes a header as deep as a fifth of the screenshot", async () => {
    expect(await findBoard(await screenshot(20))).toMatchObject({
      region: { top: 20 },
    });
  });

  it("says it found no felt where the header runs deeper than a fifth of the screenshot", async () => {
    expect(await findBoard(await screenshot(21))).toEqual({
      problem: "found no felt below the header",
    });
  });
});
