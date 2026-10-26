import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type { Sharp } from "sharp";
import { SITE_IMAGES, writeImage, writeSiteImages } from "./screenshots.ts";

// One thread per image, so encoding the 2560 × 1440 preview doesn't starve
// the specs running beside these.
sharp.concurrency(1);

/** Where the capture's board lies: all but the 100 rows of red above it. */
const BOARD = { left: 0, top: 100, width: 1280, height: 620 };

/** Returns a capture: a 1280 × 720 PNG, red above a green board. */
async function capture(): Promise<Buffer> {
  const red = { r: 200, g: 0, b: 0 };
  const green = { r: 0, g: 120, b: 0 };
  const board = await sharp({
    create: {
      width: BOARD.width,
      height: BOARD.height,
      channels: 3,
      background: green,
    },
  })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 1280, height: 720, channels: 3, background: red },
  })
    .composite([{ input: board, top: BOARD.top, left: BOARD.left }])
    .png()
    .toBuffer();
}

/**
 * Opens an image written to disk. Sharp would keep a file it opened by path
 * locked on Windows, and the folder could not be removed.
 */
async function open(file: string): Promise<Sharp> {
  return sharp(await readFile(file));
}

/** Returns the colour of an image's pixel at its middle, top row. */
async function topMiddle(file: string): Promise<number[]> {
  const { data, info } = await (
    await open(file)
  )
    .raw()
    .toBuffer({ resolveWithObject: true });
  const i = Math.floor(info.width / 2) * info.channels;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

let folder: string;

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), "fz-screenshots-"));
});

afterAll(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe("writeSiteImages", () => {
  // Written once, into a folder that doesn't exist yet, since the preview
  // takes a while to encode.
  let images: string;
  let sizes: Map<string, number>;

  beforeAll(async () => {
    images = join(folder, "docs", "screenshots", "klondike");
    sizes = await writeSiteImages(await capture(), images, {
      thumbRegion: BOARD,
    });
  });

  it("writes the thumbnail at the size the site shows it", async () => {
    const thumb = await (await open(join(images, "thumb.webp"))).metadata();

    expect([thumb.format, thumb.width, thumb.height]).toEqual([
      "webp",
      SITE_IMAGES.thumb.width,
      SITE_IMAGES.thumb.height,
    ]);
  });

  it("writes the preview at the size the site shows it", async () => {
    const preview = await (await open(join(images, "preview.webp"))).metadata();

    expect([preview.format, preview.width, preview.height]).toEqual([
      "webp",
      SITE_IMAGES.preview.width,
      SITE_IMAGES.preview.height,
    ]);
  });

  it("returns each file's size", () => {
    expect([...sizes.keys()]).toEqual(["thumb.webp", "preview.webp"]);
    expect([...sizes.values()].every((size) => size > 0)).toBe(true);
  });

  it("crops the thumbnail to the region it is given", async () => {
    const [red] = await topMiddle(join(images, "thumb.webp"));

    expect(red).toBeLessThan(50);
  });

  it("leaves the preview whole", async () => {
    const [red] = await topMiddle(join(images, "preview.webp"));

    expect(red).toBeGreaterThan(150);
  });
});

describe("writeImage", () => {
  it("fits the capture as it is told", async () => {
    const target = join(folder, "overview.webp");

    await writeImage(
      await capture(),
      target,
      { file: "overview.webp", width: 400, height: 400 },
      { resize: { fit: "contain", position: "top", background: "#00ff00" } },
    );

    const { width, height } = await (await open(target)).metadata();
    expect([width, height]).toEqual([400, 400]);
  });
});
