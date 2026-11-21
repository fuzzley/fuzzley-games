#!/usr/bin/env node
/**
 * Makes side-by-side samples of the Solitaire Collection's screenshots at
 * several WebP qualities, so a person can judge what a lower quality costs.
 *
 *   node docs/repo-size/scripts/screenshots/samples.mjs [game id]
 *
 * Each sample is a row of crops at one to one, cut from the same image made
 * from the game's lossless original as `yarn build:thumbs` makes it: first
 * without loss, then at each quality, labelled. The sheet itself is written
 * as lossless WebP, so what shows is the quality's own loss.
 *
 * Writes `docs/repo-size/data/screenshots/samples/<id>-*.webp` and
 * `samples.txt` beside them.
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const SAMPLES = join(REPO, "docs/repo-size/data/screenshots/samples");
/** @type {typeof import("sharp")} */
const sharp = createRequire(join(REPO, "frontend/package.json"))("sharp");

const GAME = process.argv[2] ?? "freecell";
const SOURCE = join(
  REPO,
  "frontend/games/solitaire/docs/screenshots",
  GAME,
  "overview.png",
);
const TILE = { width: 320, height: 180 };
const LABEL_HEIGHT = 26;
/** @type {(number | "lossless")[]} */
const QUALITIES = ["lossless", 80, 70, 60, 50];
const TODAY = 80;

/**
 * Finds the board below the header and the felt's colour along its bottom
 * edge, as `tools/build-screenshot-thumbs.mjs` does.
 *
 * @returns {Promise<{region: import("sharp").Region, background: {r: number, g: number, b: number}}>}
 */
async function findBoard() {
  const { data, info } = await sharp(SOURCE)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const at = (/** @type {number} */ x, /** @type {number} */ y) => {
    const i = (y * info.width + x) * info.channels;
    return { r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0 };
  };
  const column = Math.floor(info.width * 0.45);
  let top = 0;
  for (; top < info.height; top++) {
    const { r, g, b } = at(column, top);
    if (g > r + 30 && g > b + 30) break;
  }
  return {
    region: { left: 0, top, width: info.width, height: info.height - top },
    background: at(Math.floor(info.width / 2), info.height - 1),
  };
}

const board = await findBoard();
/** The images and the parts of them each sample shows. */
const SHEETS = [
  {
    name: "preview-2560",
    size: { width: 2560, height: 1440 },
    thumb: false,
    crops: [
      { what: "a face card and ranks", left: 40, top: 900 },
      { what: "the game bar's labels", left: 820, top: 0 },
    ],
  },
  {
    name: "thumb-576",
    size: { width: 576, height: 324 },
    thumb: true,
    crops: [{ what: "the board's ranks and pips", left: 128, top: 124 }],
  },
];

mkdirSync(SAMPLES, { recursive: true });
const lines = [
  `Samples of ${GAME}, each a row of ${TILE.width} x ${TILE.height} crops at 1:1, left to right: ${QUALITIES.join(", ")}`,
];
for (const sheet of SHEETS) {
  /** @type {import("sharp").OverlayOptions[]} */
  const layers = [];
  for (const [row, crop] of sheet.crops.entries()) {
    for (const [column, q] of QUALITIES.entries()) {
      const image = (
        sheet.thumb ? sharp(SOURCE).extract(board.region) : sharp(SOURCE)
      ).resize(sheet.size.width, sheet.size.height, {
        fit: "contain",
        position: "top",
        background: board.background,
      });
      const encoded =
        q === "lossless"
          ? await image.png().toBuffer()
          : await image.webp({ quality: q, smartSubsample: true }).toBuffer();
      const tile = await sharp(encoded)
        .extract({ left: crop.left, top: crop.top, ...TILE })
        .png()
        .toBuffer();
      const label =
        q === "lossless"
          ? "lossless"
          : `WebP q${q}${q === TODAY ? " (today)" : ""}`;
      const top = row * (TILE.height + LABEL_HEIGHT);
      layers.push(
        {
          input: Buffer.from(
            `<svg width="${TILE.width}" height="${LABEL_HEIGHT}"><rect width="100%" height="100%" fill="#ffffff"/>` +
              `<text x="8" y="18" font-family="DejaVu Sans" font-size="15" fill="#000000">${label}</text></svg>`,
          ),
          left: column * TILE.width,
          top,
        },
        { input: tile, left: column * TILE.width, top: top + LABEL_HEIGHT },
      );
    }
  }
  const out = join(SAMPLES, `${GAME}-${sheet.name}-qualities.webp`);
  await sharp({
    create: {
      width: TILE.width * QUALITIES.length,
      height: sheet.crops.length * (TILE.height + LABEL_HEIGHT),
      channels: 3,
      background: "#ffffff",
    },
  })
    .composite(layers)
    .webp({ lossless: true })
    .toFile(out);
  lines.push(
    `${out.slice(REPO.length + 1)}: ${(statSync(out).size / 1024).toFixed(0)} KiB; ` +
      `from the ${sheet.size.width} x ${sheet.size.height} ${sheet.thumb ? "thumbnail" : "preview"}, rows: ${sheet.crops.map((c) => `${c.what} (at ${c.left}, ${c.top})`).join("; ")}`,
  );
}
writeFileSync(join(SAMPLES, "samples.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
