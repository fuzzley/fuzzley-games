#!/usr/bin/env node
/**
 * Measures what other encodes of the Solitaire Collection's screenshots
 * would weigh, and how close each stays to its lossless original, and makes
 * side-by-side samples a person can judge them by.
 *
 *   node docs/repo-size/scripts/screenshots/reencode.mjs [fresh-capture-dir]
 *
 * It reads the 41 lossless originals tracked at HEAD
 * (`frontend/games/solitaire/docs/screenshots/<id>/overview.png`) and:
 *
 * 1. remakes the site's three images of each as `yarn build:thumbs` does,
 *    through `@fz/dev/screenshots`' own `writeImage()`, into a temporary
 *    folder, timed, and says whether they match HEAD's byte for byte;
 * 2. given the folder a fresh capture wrote (`capture-twice.mjs solitaire`),
 *    does the same from those originals, to say what a retake would rewrite;
 * 3. encodes each image at other qualities, efforts and sizes, and compares
 *    each with the same image made without loss: PSNR over RGB, and SSIM
 *    over luma in 8 × 8 blocks;
 * 4. encodes the originals as lossless WebP, to compare with PNG.
 *
 * `samples.mjs` makes the side-by-side samples.
 *
 * Writes `docs/repo-size/data/screenshots/reencode.txt` and
 * `reencode-settings.tsv`.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const FRONTEND = join(REPO, "frontend");
const SOLITAIRE = join(FRONTEND, "games/solitaire");
const ORIGINALS = join(SOLITAIRE, "docs/screenshots");
const SERVED = join(SOLITAIRE, "public/docs/screenshots");
const DATA = join(REPO, "docs/repo-size/data/screenshots");
const SCRATCH = join(
  process.env.SCRATCH ?? join(tmpdir(), "repo-size-screenshots"),
  "reencode",
);
const FRESH = process.argv[2];

/** @type {typeof import("sharp")} */
const sharp = createRequire(join(FRONTEND, "package.json"))("sharp");
/** @type {typeof import("../../../../frontend/lib/dev/src/screenshots.ts")} */
const screenshots = await import(join(FRONTEND, "lib/dev/src/screenshots.ts"));
const { SITE_IMAGES, SITE_IMAGE_QUALITY, writeImage, writeSiteImages } =
  screenshots;

/** The rules page's image, as `tools/build-screenshot-thumbs.mjs` makes it. */
const OVERVIEW = { file: "overview.webp", width: 1600, height: 900 };
const OVERVIEW_QUALITY = 90;

/** @type {string[]} */
const report = [];
/**
 * Prints a line and keeps it for the report.
 *
 * @param {string} line
 */
function say(line) {
  report.push(line);
  console.log(line);
}

/**
 * Returns the seconds since a moment, to a tenth.
 *
 * @param {bigint} start
 * @returns {string}
 */
function since(start) {
  return (Number(process.hrtime.bigint() - start) / 1e9).toFixed(1);
}

/**
 * Returns a size in KiB or MiB, to two places.
 *
 * @param {number} bytes
 * @returns {string}
 */
function mib(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

/**
 * Finds the board below the header and the felt's colour along its bottom
 * edge, as `tools/build-screenshot-thumbs.mjs`'s `findBoard()` does; copied,
 * since that script runs its work when imported.
 *
 * @param {string | Buffer} source
 * @returns {Promise<{region: import("sharp").Region, felt: {r: number, g: number, b: number}}>}
 */
async function findBoard(source) {
  const { data, info } = await sharp(source)
    .raw()
    .toBuffer({ resolveWithObject: true });
  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  const feltAt = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    return g > r + 30 && g > b + 30;
  };
  const column = Math.floor(info.width * 0.45);
  let top = 0;
  while (top < info.height && !feltAt(column, top)) top++;
  if (top > info.height * 0.2)
    throw new Error("found no felt below the header");
  const i =
    ((info.height - 1) * info.width + Math.floor(info.width / 2)) *
    info.channels;
  return {
    region: { left: 0, top, width: info.width, height: info.height - top },
    felt: { r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0 },
  };
}

/**
 * Writes one game's three images as `yarn build:thumbs` does.
 *
 * @param {string} source The game's lossless original.
 * @param {string} folder Where the three go.
 * @returns {Promise<void>}
 */
async function buildThumbs(source, folder) {
  const { region, felt } = await findBoard(source);
  /** @type {import("sharp").ResizeOptions} */
  const resize = { fit: "contain", position: "top", background: felt };
  await writeSiteImages(source, folder, { thumbRegion: region, resize });
  await writeImage(source, join(folder, OVERVIEW.file), OVERVIEW, {
    resize,
    quality: OVERVIEW_QUALITY,
  });
}

/**
 * Returns a file's SHA-256.
 *
 * @param {string} path
 * @returns {string}
 */
function hashOf(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * Decodes an image to RGB.
 *
 * @param {Buffer | string} input
 * @returns {Promise<{data: Buffer, width: number, height: number}>}
 */
async function rgb(input) {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * Returns the largest channel change between two images of the same size,
 * and how many pixels changed at all.
 *
 * @param {{data: Buffer}} a
 * @param {{data: Buffer}} b
 * @returns {{largest: number, changed: number}}
 */
function difference(a, b) {
  let largest = 0;
  let changed = 0;
  for (let p = 0; p < a.data.length; p += 3) {
    let most = 0;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs((a.data[p + c] ?? 0) - (b.data[p + c] ?? 0));
      if (d > most) most = d;
    }
    if (most > 0) changed++;
    if (most > largest) largest = most;
  }
  return { largest, changed };
}

/**
 * Returns the PSNR over RGB, and the mean SSIM over luma in 8 × 8 blocks,
 * of an image against its lossless reference.
 *
 * @param {{data: Buffer, width: number, height: number}} ref
 * @param {{data: Buffer, width: number, height: number}} img
 * @returns {{psnr: number, ssim: number}}
 */
function quality(ref, img) {
  let se = 0;
  for (let i = 0; i < ref.data.length; i++) {
    const d = (ref.data[i] ?? 0) - (img.data[i] ?? 0);
    se += d * d;
  }
  const mse = se / ref.data.length;
  const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
  const { width, height } = ref;
  /**
   * @param {Buffer} data
   * @returns {Float32Array}
   */
  const luma = (data) => {
    const y = new Float32Array(width * height);
    for (let p = 0; p < y.length; p++) {
      y[p] =
        0.299 * (data[3 * p] ?? 0) +
        0.587 * (data[3 * p + 1] ?? 0) +
        0.114 * (data[3 * p + 2] ?? 0);
    }
    return y;
  };
  const x = luma(ref.data);
  const y = luma(img.data);
  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;
  let sum = 0;
  let blocks = 0;
  for (let by = 0; by + 8 <= height; by += 8) {
    for (let bx = 0; bx + 8 <= width; bx += 8) {
      let mx = 0;
      let my = 0;
      for (let j = 0; j < 8; j++) {
        for (let i = 0; i < 8; i++) {
          const p = (by + j) * width + bx + i;
          mx += x[p] ?? 0;
          my += y[p] ?? 0;
        }
      }
      mx /= 64;
      my /= 64;
      let vx = 0;
      let vy = 0;
      let cxy = 0;
      for (let j = 0; j < 8; j++) {
        for (let i = 0; i < 8; i++) {
          const p = (by + j) * width + bx + i;
          const dx = (x[p] ?? 0) - mx;
          const dy = (y[p] ?? 0) - my;
          vx += dx * dx;
          vy += dy * dy;
          cxy += dx * dy;
        }
      }
      vx /= 63;
      vy /= 63;
      cxy /= 63;
      sum +=
        ((2 * mx * my + c1) * (2 * cxy + c2)) /
        ((mx * mx + my * my + c1) * (vx + vy + c2));
      blocks++;
    }
  }
  return { psnr, ssim: sum / blocks };
}

/**
 * One image the site serves, at one size: what it is cut and fitted from.
 *
 * @typedef {{kind: string, width: number, height: number, thumb: boolean}} Target
 */

/**
 * Returns a pipeline that cuts and fits an original to a target, as
 * `yarn build:thumbs` does, before it is encoded.
 *
 * @param {string} source
 * @param {Target} target
 * @param {{region: import("sharp").Region, felt: {r: number, g: number, b: number}}} board
 * @returns {import("sharp").Sharp}
 */
function fitted(source, target, board) {
  const image = sharp(source);
  return (target.thumb ? image.extract(board.region) : image).resize(
    target.width,
    target.height,
    { fit: "contain", position: "top", background: board.felt },
  );
}

/** The settings tried for each target: quality, effort, and whether it is today's. */
const TARGETS = [
  { kind: "thumb", width: 576, height: 324, thumb: true, today: 80 },
  { kind: "preview", width: 2560, height: 1440, thumb: false, today: 80 },
  { kind: "preview", width: 1920, height: 1080, thumb: false, today: 0 },
  { kind: "preview", width: 1600, height: 900, thumb: false, today: 0 },
  { kind: "overview", width: 1600, height: 900, thumb: false, today: 90 },
];
const QUALITIES = [90, 80, 70, 60, 50];
const EFFORTS = [4, 6];

const games = readdirSync(ORIGINALS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
say(`games: ${games.length}`);
say(
  `sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}, libwebp ${sharp.versions.webp}`,
);
say(
  `site image quality in @fz/dev/screenshots: ${SITE_IMAGE_QUALITY}; site images: ${Object.values(
    SITE_IMAGES,
  )
    .map((i) => `${i.file} ${i.width}x${i.height}`)
    .join(", ")}`,
);
say("");

// 1. Today's images, remade from HEAD's originals.
rmSync(SCRATCH, { recursive: true, force: true });
const remade = join(SCRATCH, "remade");
const start = process.hrtime.bigint();
for (const game of games) {
  await buildThumbs(join(ORIGINALS, game, "overview.png"), join(remade, game));
}
say(
  `1. build:thumbs remade from HEAD's originals in ${since(start)} s (${games.length} games, one at a time)`,
);
/** @type {Map<string, number>} */
const matches = new Map();
for (const game of games) {
  for (const file of ["thumb.webp", "preview.webp", "overview.webp"]) {
    const same =
      hashOf(join(remade, game, file)) === hashOf(join(SERVED, game, file));
    const key = `${file} ${same ? "byte-identical to HEAD" : "differs from HEAD"}`;
    matches.set(key, (matches.get(key) ?? 0) + 1);
  }
}
for (const [key, n] of [...matches].sort()) say(`   ${key}: ${n}`);
say("");

// 2. From a fresh capture's originals, what a retake would write.
if (FRESH && existsSync(FRESH)) {
  say(`2. From the fresh capture in ${FRESH}:`);
  /** @type {Map<string, {same: number, differ: number, bytes: number, largest: number, fewest: number, most: number}>} */
  const kinds = new Map();
  /**
   * Adds one file's comparison with HEAD's to its kind's totals.
   *
   * @param {string} kind
   * @param {string} ours
   * @param {string} theirs
   * @returns {Promise<{same: boolean, largest: number, changed: number}>}
   */
  const tally = async (kind, ours, theirs) => {
    const same = hashOf(ours) === hashOf(theirs);
    const { largest, changed } = difference(await rgb(ours), await rgb(theirs));
    const k = kinds.get(kind) ?? {
      same: 0,
      differ: 0,
      bytes: 0,
      largest: 0,
      fewest: Infinity,
      most: 0,
    };
    if (same) k.same++;
    else {
      k.differ++;
      k.bytes += statSync(ours).size;
      k.fewest = Math.min(k.fewest, changed);
      k.most = Math.max(k.most, changed);
    }
    k.largest = Math.max(k.largest, largest);
    kinds.set(kind, k);
    return { same, largest, changed };
  };
  for (const game of readdirSync(FRESH).sort()) {
    const folder = join(SCRATCH, "fresh", game);
    const original = join(FRESH, game, "overview.png");
    await tally(
      "overview.png (original)",
      original,
      join(ORIGINALS, game, "overview.png"),
    );
    await buildThumbs(original, folder);
    for (const file of ["thumb.webp", "preview.webp", "overview.webp"]) {
      const { same, largest, changed } = await tally(
        file,
        join(folder, file),
        join(SERVED, game, file),
      );
      say(
        `   ${game}/${file}: ${same ? "byte-identical" : "bytes differ"} from HEAD; ` +
          `${changed} pixels differ, the largest channel change ${largest}`,
      );
    }
  }
  say(
    "   By file (file, byte-identical to HEAD, differ, pixels that differ in those that do, largest channel change, MiB of those that differ):",
  );
  let rewritten = 0;
  for (const [kind, k] of kinds) {
    rewritten += k.bytes;
    say(
      `   ${kind}\t${k.same}\t${k.differ}\t${k.differ > 0 ? `${k.fewest}-${k.most}` : "-"}\t${k.largest}\t${mib(k.bytes)}`,
    );
  }
  say(
    `   A retake from this capture would rewrite ${mib(rewritten)} MiB of files.`,
  );
  say("");
}

// 3. Other settings.
say("3. Other settings, all 41 games (see reencode-settings.tsv):");
const rows = [
  "image\twidth\theight\tquality\teffort\ttoday's\tKiB for 41\tKiB each\tmean PSNR dB\tmean SSIM\tlowest SSIM",
];
/** @type {Map<string, number>} */
const totals = new Map();
const boards = new Map();
for (const game of games) {
  boards.set(game, await findBoard(join(ORIGINALS, game, "overview.png")));
}
const sweepStart = process.hrtime.bigint();
/**
 * Each fit's results, so the rules page's 1600 × 900 image, made as the
 * preview at that size is, is measured once.
 *
 * @type {Map<string, Map<string, {bytes: number, psnr: number, ssim: number, lowest: number}>>}
 */
const measured = new Map();
const SETTINGS = QUALITIES.flatMap((q) =>
  EFFORTS.map((effort) => ({ q, effort })),
);
for (const target of TARGETS) {
  const fit = `${target.width}x${target.height} ${target.thumb ? "board" : "page"}`;
  /** @type {Map<string, {bytes: number, psnr: number, ssim: number, lowest: number}>} */
  const results = measured.get(fit) ?? new Map();
  if (!measured.has(fit)) {
    measured.set(fit, results);
    for (const game of games) {
      const source = join(ORIGINALS, game, "overview.png");
      const board = boards.get(game);
      const ref = await rgb(
        await fitted(source, target, board).png().toBuffer(),
      );
      // Encoded side by side, as sharp works off the main thread.
      const encoded = await Promise.all(
        SETTINGS.map(({ q, effort }) =>
          fitted(source, target, board)
            .webp({ quality: q, smartSubsample: true, effort })
            .toBuffer(),
        ),
      );
      const decoded = await Promise.all(encoded.map((webp) => rgb(webp)));
      SETTINGS.forEach(({ q, effort }, i) => {
        const webp = encoded[i];
        const image = decoded[i];
        if (!webp || !image) return;
        const { psnr, ssim } = quality(ref, image);
        const key = `${q}\t${effort}`;
        const r = results.get(key) ?? { bytes: 0, psnr: 0, ssim: 0, lowest: 1 };
        r.bytes += webp.length;
        r.psnr += psnr;
        r.ssim += ssim;
        r.lowest = Math.min(r.lowest, ssim);
        results.set(key, r);
      });
    }
  }
  for (const [key, r] of results) {
    const [q = "", effort = ""] = key.split("\t");
    const today = Number(q) === target.today && effort === "4" ? "yes" : "";
    totals.set(
      `${target.kind} ${target.width}x${target.height} q${q} e${effort}`,
      r.bytes,
    );
    rows.push(
      [
        target.kind,
        target.width,
        target.height,
        q,
        effort,
        today,
        (r.bytes / 1024).toFixed(0),
        (r.bytes / 1024 / games.length).toFixed(1),
        (r.psnr / games.length).toFixed(2),
        (r.ssim / games.length).toFixed(4),
        r.lowest.toFixed(4),
      ].join("\t"),
    );
  }
}
say(`   swept in ${since(sweepStart)} s`);
writeFileSync(join(DATA, "reencode-settings.tsv"), rows.join("\n") + "\n");
for (const row of rows) say(`   ${row}`);
say("");

/**
 * Returns the bytes one setting weighs for all 41 games.
 *
 * @param {string} key
 * @returns {number}
 */
function total(key) {
  const bytes = totals.get(key);
  if (bytes === undefined) throw new Error(`no setting ${key}`);
  return bytes;
}
const originals = games.reduce(
  (sum, game) => sum + statSync(join(ORIGINALS, game, "overview.png")).size,
  0,
);
const today =
  total("thumb 576x324 q80 e4") +
  total("preview 2560x1440 q80 e4") +
  total("overview 1600x900 q90 e4");
/** @type {[string, number][]} */
const plans = [
  [
    "today: originals PNG + thumb q80 + preview 2560 q80 + overview 1600 q90",
    originals + today,
  ],
  ["today's WebP alone, no originals tracked", today],
  [
    "no originals; the rules page shows preview.webp, no overview.webp",
    total("thumb 576x324 q80 e4") + total("preview 2560x1440 q80 e4"),
  ],
  [
    "no originals; thumb q70 e6, preview 2560 q70 e6, no overview",
    total("thumb 576x324 q70 e6") + total("preview 2560x1440 q70 e6"),
  ],
  [
    "no originals; thumb q80 e6, preview 1920 q80 e6 for both pages, no overview",
    total("thumb 576x324 q80 e6") + total("preview 1920x1080 q80 e6"),
  ],
  [
    "no originals; thumb q70 e6, preview 1600 q80 e6 for both pages, no overview",
    total("thumb 576x324 q70 e6") + total("preview 1600x900 q80 e6"),
  ],
];
say("   What one full retake of the 41 games adds to history, by plan:");
for (const [name, bytes] of plans) {
  say(
    `   ${mib(bytes)} MiB (${((100 * bytes) / (originals + today)).toFixed(0)}%)\t${name}`,
  );
}
say("");

// 4. The originals as lossless WebP.
const losslessStart = process.hrtime.bigint();
let lossless = 0;
for (const game of games) {
  lossless += (
    await sharp(join(ORIGINALS, game, "overview.png"))
      .webp({ lossless: true })
      .toBuffer()
  ).length;
}
say(
  `4. Originals: PNG ${mib(originals)} MiB; lossless WebP ${mib(lossless)} MiB ` +
    `(${((100 * lossless) / originals).toFixed(0)}%), encoded in ${since(losslessStart)} s`,
);
say("");

writeFileSync(join(DATA, "reencode.txt"), report.join("\n") + "\n");
