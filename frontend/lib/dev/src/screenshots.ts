// The images the site shows of a game built here, which the game's
// screenshot script writes into its build's docs/screenshots/<id>/, where the
// site's catalog looks for them (screenshotUrl() in the site's model).

import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { Region, ResizeOptions } from "sharp";

/** An image to write: its file's name and its size in pixels. */
export interface Image {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

/**
 * The images the site shows, each at least twice the CSS size it is shown
 * at, so that it stays sharp on a high density display: the thumbnail in a
 * row of the game browser at up to about 288 CSS px wide, the preview beside
 * it and in link previews at up to 1200.
 */
export const SITE_IMAGES = {
  thumb: { file: "thumb.webp", width: 576, height: 324 },
  preview: { file: "preview.webp", width: 2560, height: 1440 },
} as const satisfies Record<string, Image>;

/** The WebP quality the site's images are written at. */
export const SITE_IMAGE_QUALITY = 80;

/** Says how an image is made from a capture. */
export interface ImageOptions {
  /** The part of the capture to keep; all of it unless given. */
  readonly region?: Region;
  /** How the capture is fitted to the image's size: sharp's `cover` unless given. */
  readonly resize?: ResizeOptions;
  /** The WebP quality, from 1 to 100: {@link SITE_IMAGE_QUALITY} unless given. */
  readonly quality?: number;
}

/** Says how the site's two images are made from a capture. */
export interface SiteImageOptions {
  /** The part of the capture the thumbnail keeps, such as the board alone. */
  readonly thumbRegion?: Region;
  /** How the capture is fitted to each image's size. */
  readonly resize?: ResizeOptions;
}

/** Writes a capture to a WebP image of the given size, and returns its size in bytes. */
export async function writeImage(
  capture: string | Buffer,
  target: string,
  image: Image,
  { region, resize, quality = SITE_IMAGE_QUALITY }: ImageOptions = {},
): Promise<number> {
  const source = sharp(capture);
  await (region ? source.extract(region) : source)
    .resize(image.width, image.height, resize)
    // Smart subsampling keeps a small, saturated detail, such as a red suit
    // or a number's ink, from bleeding into what surrounds it.
    .webp({ quality, smartSubsample: true })
    .toFile(target);
  return (await stat(target)).size;
}

/**
 * Writes the site's thumbnail and preview of a game into a folder, and
 * returns each file's name and size in bytes.
 */
export async function writeSiteImages(
  capture: string | Buffer,
  folder: string,
  { thumbRegion, resize }: SiteImageOptions = {},
): Promise<Map<string, number>> {
  await mkdir(folder, { recursive: true });
  const sizes = new Map<string, number>();
  for (const [kind, image] of Object.entries(SITE_IMAGES)) {
    const region = kind === "thumb" ? thumbRegion : undefined;
    const target = join(folder, image.file);
    sizes.set(
      image.file,
      await writeImage(capture, target, image, { region, resize }),
    );
  }
  return sizes;
}
