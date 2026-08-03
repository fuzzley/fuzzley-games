/**
 * Builds the card texture atlas from the vector sources.
 *
 *   yarn build:atlas
 *
 * Rasterizes the card sheet and the pile placeholders at ART_SCALE times the
 * design frame size, packs the frames into as few atlas pages as fit within
 * MAX_PAGE_PX, and writes the pages plus a Phaser multi-atlas manifest.
 *
 * The sheet is rendered in one pass by rewriting the SVG root to a viewBox over
 * the card block with preserveAspectRatio="none". That maps every grid cell onto
 * a whole number of pixels, so each frame is cut out at exactly its final size
 * and never goes through a resampling step.
 *
 * Cut frames carry no edge of their own, so each is stamped with one before it
 * is packed. See {@link CARD_EDGE}.
 */
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARD_DIR = join(ROOT, "src/engine/render/assets/sprites/card");
const OUT_DIR = join(ROOT, "src/engine/render/assets/sprites/atlas");

/**
 * Texels per design unit. Must match CARD_ART_SCALE in
 * src/engine/render/layout/card_metrics.ts.
 */
const ART_SCALE = 2;

/** The card frame size in design units, as the board layout measures it. */
const DESIGN_FRAME_W = 220;
const DESIGN_FRAME_H = 307;

const FRAME_W = DESIGN_FRAME_W * ART_SCALE;
const FRAME_H = DESIGN_FRAME_H * ART_SCALE;

/**
 * Transparent pixels kept between frames. Without a gutter, bilinear sampling
 * at a fractional scale reaches past a frame's edge and pulls in the
 * neighbouring card, fringing the card borders.
 */
const GUTTER = 8;

/** Transparent border around the outside of a page, for the same reason. */
const MARGIN = 4;

/**
 * Largest page dimension to emit. WebGL guarantees far more than this on
 * desktop, but 4096 is the floor still found on older mobile GPUs.
 */
const MAX_PAGE_PX = 4096;

/**
 * The card sheet. The 52 faces occupy four rows of thirteen; the two backs sit
 * alone on a fifth.
 *
 * Cards are separated by a gutter, so each one is an island of ink with nothing
 * of its neighbours anywhere near it. That is what lets the cutter find the
 * cards themselves — the runs of lines that carry ink — rather than inferring
 * them from the lines in between. The sheet as originally drawn had its cards
 * abutting and sharing a single hairline rule along each boundary, which had to
 * be located by ink coverage and then told apart from the court cards' inner
 * frames, and left every cut a hair away from dragging a neighbour's edge into
 * the frame.
 *
 * Every deck's sheet shares this shape; which file a deck is drawn from is in
 * {@link DECKS}.
 */
const SHEET = {
  width: 3249,
  height: 1709,
  cols: 13,
  /** Rows of card faces. */
  faceRows: 4,
  /** Total rows, including the row holding the two backs. */
  rows: 5,
};

/** A card's own size on the sheet, in user units, and how far it may vary. */
const SHEET_CARD = { width: 224, height: 313, tolerance: 3 };

/**
 * The decks on offer, each drawn from its own sheet and written to its own
 * directory under OUT_DIR.
 *
 * A sheet apiece rather than one sheet cut two ways, so either deck can be
 * edited, re-rendered or replaced without touching the other. They are the same
 * drawing on the same gutter grid; `corner_pips` adds a layer of suit badges.
 *
 * Ids match CardDeckId in src/engine/render/card_deck.ts, which is what the
 * player's choice is stored as and what the loader looks a deck up by.
 */
const DECKS = [
  { id: "classic", file: "playing_card_assets_large.svg" },
  { id: "indexed", file: "playing_card_assets_corner_pips.svg" },
  { id: "all-corner-pips", file: "playing_card_assets_all_corner_pips.svg" },
];

/** Pixels per SVG user unit when rendering the sheet. */
const SHEET_PPU = ART_SCALE;

/** Suits in card sheet row order. */
const SHEET_SUITS = ["clubs", "hearts", "spades", "diamonds"];

/** Ranks in card sheet column order. */
const SHEET_RANKS = [
  "ace",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "jack",
  "queen",
  "king",
];

/** The two card backs, on the sheet's fifth row. */
const SHEET_BACKS = ["card-back-blue", "card-back-red"];

/** The placeholder sheet: three cells of the design frame size, in a row. */
const PLACEHOLDERS = {
  file: "card_placeholders.svg",
  names: [
    "card-placeholder",
    "card-placeholder-full-border-circle",
    "card-placeholder-full-border-reset",
  ],
};

/**
 * Rasterizes an SVG region to exactly `width` x `height` pixels.
 *
 * Rewrites the root element's sizing attributes so the given user-unit box maps
 * onto the whole output, stretching each axis independently. The card grid's
 * cells are not square in user units, so a uniform fit would leave them on
 * fractional pixel boundaries.
 *
 * @param {string} svg The SVG document source.
 * @param {{x: number, y: number, w: number, h: number}} box The user-unit region to render.
 * @param {number} width Output width in pixels.
 * @param {number} height Output height in pixels.
 * @returns {Promise<{data: Buffer, info: sharp.OutputInfo}>} Raw RGBA pixels.
 */
async function rasterize(svg, box, width, height) {
  const sized = svg.replace(/<svg\b[^>]*?>/, (root) => {
    const attributes = root
      .slice(0, -1)
      .replace(/\s(width|height|viewBox|preserveAspectRatio)="[^"]*"/g, "");
    return (
      `${attributes} width="${width}" height="${height}"` +
      ` viewBox="${box.x} ${box.y} ${box.w} ${box.h}"` +
      ` preserveAspectRatio="none">`
    );
  });

  const png = new Resvg(sized, { fitTo: { mode: "original" } })
    .render()
    .asPng();
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.width !== width || info.height !== height) {
    throw new Error(
      `Expected a ${width}x${height} raster, got ${info.width}x${info.height}`,
    );
  }
  return { data, info };
}

/**
 * Marks every pixel the sheet has drawn something on, card or gutter.
 *
 * Anything but full transparency counts, so a card's white body marks just as a
 * pip does and the only clear lines on the sheet are the gutters. Antialiasing
 * along a card's outline lands well above this threshold.
 *
 * @param {{data: Buffer, info: sharp.OutputInfo}} sheet The rendered sheet.
 * @returns {Uint8Array} One byte per pixel, row major.
 */
function paintedMask(sheet) {
  const { data, info } = sheet;
  const mask = new Uint8Array(info.width * info.height);
  for (let pixel = 0; pixel < mask.length; pixel++) {
    mask[pixel] = data[pixel * 4 + 3] > 16 ? 1 : 0;
  }
  return mask;
}

/**
 * Splits a line profile into the runs that carry paint.
 *
 * @param {number[]} painted How many painted pixels each line holds.
 * @returns {{start: number, end: number}[]} Inclusive runs, ascending.
 */
function paintedRuns(painted) {
  const runs = [];
  let start = -1;
  for (let i = 0; i < painted.length; i++) {
    if (painted[i] > 0 && start < 0) start = i;
    if (painted[i] === 0 && start >= 0) {
      runs.push({ start, end: i - 1 });
      start = -1;
    }
  }
  if (start >= 0) runs.push({ start, end: painted.length - 1 });
  return runs;
}

/**
 * Checks a set of runs is the row or column of cards it should be.
 *
 * A stray mark out in a gutter would bridge two cards into one run, and a card
 * that failed to draw would leave a run missing, so both the count and each
 * run's size are worth stating. Getting this wrong offsets every crop on the
 * axis, which is far easier to catch here than in a built atlas.
 *
 * @param {{start: number, end: number}[]} runs The runs found.
 * @param {number} count How many cards the axis holds.
 * @param {number} size A card's size along the axis, in pixels.
 * @param {string} axis Axis name, for error messages.
 */
function assertCardRuns(runs, count, size, axis) {
  if (runs.length !== count) {
    throw new Error(
      `Expected ${count} ${axis} runs of cards on the sheet, found ` +
        `${runs.length}: ${runs.map((r) => `${r.start}-${r.end}`).join(", ")}`,
    );
  }
  const slack = SHEET_CARD.tolerance * SHEET_PPU;
  for (const [index, run] of runs.entries()) {
    const span = run.end - run.start + 1;
    if (Math.abs(span - size) > slack) {
      throw new Error(
        `The ${axis} run at ${index} spans ${span}px, but a card is ${size}px ` +
          `give or take ${slack}; something is drawn out in a gutter`,
      );
    }
  }
}

/**
 * Locates the cards on the sheet.
 *
 * Every card is surrounded by a gutter, so the lines that carry no paint at all
 * are exactly the gaps between them and a run of painted lines is exactly one
 * row or column of cards. Columns are found over the whole sheet rather than
 * the face rows alone: the row of backs holds only two cards, and the columns
 * past it are established by the faces above.
 *
 * @param {{data: Buffer, info: sharp.OutputInfo}} sheet The rendered sheet.
 * @returns {{columns: {start: number, end: number}[], rows: {start: number, end: number}[]}} Card spans in pixels.
 */
function findCards(sheet) {
  const { width, height } = sheet.info;
  const mask = paintedMask(sheet);

  const columnPaint = new Array(width).fill(0);
  const rowPaint = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      columnPaint[x]++;
      rowPaint[y]++;
    }
  }

  const columns = paintedRuns(columnPaint);
  const rows = paintedRuns(rowPaint);
  assertCardRuns(columns, SHEET.cols, SHEET_CARD.width * SHEET_PPU, "vertical");
  assertCardRuns(rows, SHEET.rows, SHEET_CARD.height * SHEET_PPU, "horizontal");
  return { columns, rows };
}

/**
 * Cuts a grid of frames out of a rendered sheet.
 *
 * The crop is always exactly FRAME_W x FRAME_H, so a frame is a straight
 * integer copy of the render and never goes through a resampling step. Only the
 * origin is rounded, leaving each card at most half a pixel off centre within
 * its own frame.
 *
 * @param {{data: Buffer, info: sharp.OutputInfo}} sheet The rendered sheet.
 * @param {(row: number, col: number) => string | null} nameAt Frame name for a cell, or null to skip it.
 * @param {number} rows Grid rows.
 * @param {number} cols Grid columns.
 * @param {(row: number, col: number) => {left: number, top: number}} originAt Crop origin for a cell.
 * @returns {Promise<{name: string, png: Buffer}[]>} The cut frames.
 */
async function cutFrames(sheet, nameAt, rows, cols, originAt) {
  const frames = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const name = nameAt(row, col);
      if (!name) continue;

      const { left, top } = originAt(row, col);
      const png = await sharp(sheet.data, {
        raw: {
          width: sheet.info.width,
          height: sheet.info.height,
          channels: 4,
        },
      })
        .extract({ left, top, width: FRAME_W, height: FRAME_H })
        .png()
        .toBuffer();

      frames.push({ name, png });
    }
  }
  return frames;
}

/** How far into a frame to look for a bled rule, in pixels. */
const EDGE_RING_PX = 10;

/**
 * How much of each corner to ignore when inspecting an edge, in pixels. A
 * card's own outline is only ever inside the frame where it curves around a
 * corner; along the straight runs it falls outside.
 */
const EDGE_CORNER_PX = 48;

/** Fraction of an edge that must be inked before it counts as a bled rule. */
const EDGE_BLEED_COVERAGE = 0.5;

/** The sides of a frame, in the order they are reported. */
const EDGE_NAMES = ["left", "right", "top", "bottom"];

/**
 * Decodes a frame and returns a scorer for how much of one of its edges is
 * inked at a given depth, as a fraction of that edge's length.
 *
 * The corners are left out of every measurement: what the callers are looking
 * for is a line that runs the length of a side, and a card's own outline is
 * inside the frame only where it curves around a corner.
 *
 * @param {Buffer} png The frame to measure.
 * @returns {Promise<(edge: string, depth: number) => number>} The scorer.
 */
async function edgeScorer(png) {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  /** Whether the pixel is opaque ink, rather than paper or an antialiased edge. */
  const isInk = (x, y) => {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] <= 250) return 0;
    return (data[i] + data[i + 1] + data[i + 2]) / 3 < 190 ? 1 : 0;
  };

  const from = EDGE_CORNER_PX;
  const toX = info.width - EDGE_CORNER_PX;
  const toY = info.height - EDGE_CORNER_PX;

  const edges = {
    left: { span: toY - from, at: (i, depth) => isInk(depth, from + i) },
    right: {
      span: toY - from,
      at: (i, depth) => isInk(info.width - 1 - depth, from + i),
    },
    top: { span: toX - from, at: (i, depth) => isInk(from + i, depth) },
    bottom: {
      span: toX - from,
      at: (i, depth) => isInk(from + i, info.height - 1 - depth),
    },
  };

  return (edge, depth) => {
    const { span, at } = edges[edge];
    let inked = 0;
    for (let i = 0; i < span; i++) inked += at(i, depth);
    return inked / span;
  };
}

/**
 * Fails the build if any frame has a neighbouring card's rule inside it.
 *
 * What distinguishes a bled rule from artwork that merely sits near the edge is
 * its length: a rule runs the whole side of the card, while a pip or an index
 * glyph covers a little of it. So each line within the ring is scored by how
 * much of the edge it inks, and only a line that runs most of the way fails.
 * Measured against the built frames rather than trusted to the grid arithmetic,
 * because getting this wrong shows up in game as a stray line down one side of
 * a card and nowhere else.
 *
 * Runs on the raw cut, before {@link stampCardEdge} draws an edge of the card's
 * own along every side, which this would otherwise read as four bled rules.
 *
 * @param {{name: string, png: Buffer}[]} frames The cut frames.
 */
async function assertEdgesAreClear(frames) {
  const dirty = [];
  for (const frame of frames) {
    const score = await edgeScorer(frame.png);

    let worst = 0;
    let worstEdge = "";
    for (let depth = 0; depth < EDGE_RING_PX; depth++) {
      for (const edge of EDGE_NAMES) {
        const coverage = score(edge, depth);
        if (coverage > worst) {
          worst = coverage;
          worstEdge = edge;
        }
      }
    }

    if (worst > EDGE_BLEED_COVERAGE) {
      dirty.push(
        `${frame.name} (${worstEdge} edge ${Math.round(worst * 100)}% inked)`,
      );
    }
  }

  if (dirty.length > 0) {
    throw new Error(
      `Frames have a line running along an edge, so the crop is off its ` +
        `card:\n  ${dirty.join("\n  ")}`,
    );
  }
}

/**
 * The hairline edge stamped onto every card frame.
 *
 * A card is a little larger than the frame cut from it, so its own outline
 * falls outside the frame everywhere except where it curves around a corner.
 * The cut therefore leaves a card with nothing to bound it, and two overlapping
 * face-up cards read as a single white shape. That is worst in the waste, where
 * three cards fan across each other, but it costs just as much down a tableau
 * column of face-up cards.
 *
 * The card's real outline cannot be kept: taking it in means widening the
 * frame, and the frame size is what the board layout measures a card by. So the
 * edge is drawn on here instead.
 *
 * The drop shadow cannot stand in for it. Its light sits off the top-left, so
 * it throws down and to the right, while every fan in the game overlaps in the
 * direction the shadow travels away from: the waste fans right, putting the
 * seam on the upper card's left edge, and a tableau fans down, putting it on
 * the upper card's top edge. The shadow always lands on felt, never in a seam.
 *
 * Measured in texels, so the edge scales with the card: at ART_SCALE 2 these
 * four are two design units, which come out between about 0.9px and 4px over
 * the range of layout scales the board runs at.
 */
const CARD_EDGE = {
  width: 4,
  color: "#000000",
  opacity: 0.55,
  /**
   * Corner radius of the stroke's centreline. A frame's own corner is a short
   * 45 degree chamfer rather than an arc, and it runs anywhere from three to
   * six texels depending on the card, so no single radius hugs them all. A
   * radius this tight keeps the stroke against the frame edge all the way in,
   * and the composite clips back whatever overhangs a given card's chamfer.
   */
  radius: 2,
};

/**
 * Renders the card edge once, for compositing onto every frame.
 *
 * @returns {Buffer} The edge as a frame-sized PNG.
 */
function renderCardEdge() {
  const inset = CARD_EDGE.width / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${FRAME_W}" height="${FRAME_H}">` +
    `<rect x="${inset}" y="${inset}"` +
    ` width="${FRAME_W - CARD_EDGE.width}"` +
    ` height="${FRAME_H - CARD_EDGE.width}"` +
    ` rx="${CARD_EDGE.radius}" fill="none"` +
    ` stroke="${CARD_EDGE.color}" stroke-opacity="${CARD_EDGE.opacity}"` +
    ` stroke-width="${CARD_EDGE.width}"/>` +
    `</svg>`;
  return new Resvg(svg, { fitTo: { mode: "original" } }).render().asPng();
}

/**
 * Stamps the card edge onto each frame.
 *
 * Composited `atop` so the stroke is clipped to the card's own silhouette and
 * cannot land in the transparent corners. A stroke left sitting out there would
 * be pulled back over the card by bilinear sampling at a fractional scale,
 * which is the same fringing GUTTER exists to keep out.
 *
 * @param {{name: string, png: Buffer}[]} frames The cut frames.
 * @returns {Promise<{name: string, png: Buffer}[]>} The stamped frames.
 */
async function stampCardEdge(frames) {
  const edge = renderCardEdge();
  return Promise.all(
    frames.map(async (frame) => ({
      name: frame.name,
      png: await sharp(frame.png)
        .composite([{ input: edge, blend: "atop" }])
        .png()
        .toBuffer(),
    })),
  );
}

/**
 * Depth the stamped edge is measured at. One texel in, so the measurement does
 * not turn on how the outermost row of the stroke happened to antialias.
 */
const EDGE_STAMP_DEPTH = 1;

/** Fraction of an edge the stamp has to ink to count as present. */
const EDGE_STAMP_COVERAGE = 0.9;

/**
 * Fails the build if a frame came out of {@link stampCardEdge} without an edge.
 *
 * The mirror of {@link assertEdgesAreClear}: that one runs on the raw cut and
 * rejects a frame whose edge is inked by its neighbour, this one runs on the
 * stamped frame and rejects one whose edge is not inked at all. Between them
 * the only thing allowed to reach a frame's edge is the card's own.
 *
 * @param {{name: string, png: Buffer}[]} frames The stamped frames.
 */
async function assertEdgesAreStamped(frames) {
  const missing = [];
  for (const frame of frames) {
    const score = await edgeScorer(frame.png);

    let worst = 1;
    let worstEdge = "";
    for (const edge of EDGE_NAMES) {
      const coverage = score(edge, EDGE_STAMP_DEPTH);
      if (coverage < worst) {
        worst = coverage;
        worstEdge = edge;
      }
    }

    if (worst < EDGE_STAMP_COVERAGE) {
      missing.push(
        `${frame.name} (${worstEdge} edge only ${Math.round(worst * 100)}% inked)`,
      );
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Frames did not come out of the edge stamp with an edge on every ` +
        `side:\n  ${missing.join("\n  ")}`,
    );
  }
}

/**
 * Splits frames into pages and lays each page out as a grid.
 *
 * @param {{name: string, png: Buffer}[]} frames The frames to pack.
 * @returns {{frames: {name: string, png: Buffer, x: number, y: number}[], width: number, height: number}[]} The pages.
 */
function packPages(frames) {
  const columns = Math.floor(
    (MAX_PAGE_PX - 2 * MARGIN + GUTTER) / (FRAME_W + GUTTER),
  );
  const rows = Math.floor(
    (MAX_PAGE_PX - 2 * MARGIN + GUTTER) / (FRAME_H + GUTTER),
  );
  if (columns < 1 || rows < 1) {
    throw new Error(
      `A ${FRAME_W}x${FRAME_H} frame does not fit a ${MAX_PAGE_PX}px page`,
    );
  }

  const perPage = columns * rows;
  const pages = [];
  for (let start = 0; start < frames.length; start += perPage) {
    const pageFrames = frames.slice(start, start + perPage);
    const placed = pageFrames.map((frame, index) => ({
      ...frame,
      x: MARGIN + (index % columns) * (FRAME_W + GUTTER),
      y: MARGIN + Math.floor(index / columns) * (FRAME_H + GUTTER),
    }));

    // Size the page to its contents rather than the maximum, so a page holding
    // a handful of leftover frames does not cost a full 4096 square of VRAM.
    const usedColumns = Math.min(columns, placed.length);
    const usedRows = Math.ceil(placed.length / columns);
    pages.push({
      frames: placed,
      width: 2 * MARGIN + usedColumns * FRAME_W + (usedColumns - 1) * GUTTER,
      height: 2 * MARGIN + usedRows * FRAME_H + (usedRows - 1) * GUTTER,
    });
  }
  return pages;
}

/** Removes a deck's artefacts from a previous build so stale pages cannot linger. */
async function cleanOutput(outDir) {
  const existing = await readdir(outDir).catch(() => []);
  for (const file of existing) {
    if (/^card_assets(-\d+)?\.png$/.test(file)) {
      await unlink(join(outDir, file));
    }
  }
}

/**
 * Builds one deck's atlas from its own sheet.
 *
 * @param {typeof DECKS[number]} deck The deck to build.
 * @param {{name: string, png: Buffer}[]} placeholderFrames The shared placeholders.
 */
async function buildDeck(deck, placeholderFrames) {
  console.log(`${deck.id}  (${deck.file}):`);

  const source = await readFile(join(CARD_DIR, deck.file), "utf8");
  const sheet = await rasterize(
    source,
    { x: 0, y: 0, w: SHEET.width, h: SHEET.height },
    SHEET.width * SHEET_PPU,
    SHEET.height * SHEET_PPU,
  );

  const cards = findCards(sheet);
  console.log(
    `  grid: ${cards.columns.length} columns of cards, ` +
      `${cards.rows.length} rows`,
  );

  const cardFrames = await cutFrames(
    sheet,
    (row, col) => {
      if (row < SHEET_SUITS.length) {
        return `card-${SHEET_SUITS[row]}-${SHEET_RANKS[col]}`;
      }
      return SHEET_BACKS[col] ?? null;
    },
    SHEET.rows,
    SHEET.cols,
    (row, col) => {
      // Centre the frame on the card itself. The frame is a little smaller than
      // the card, so this trims an even sliver off all four sides and keeps the
      // whole gutter — and everything beyond it — outside the crop.
      const column = cards.columns[col];
      const line = cards.rows[row];
      return {
        left: Math.round((column.start + column.end + 1) / 2 - FRAME_W / 2),
        top: Math.round((line.start + line.end + 1) / 2 - FRAME_H / 2),
      };
    },
  );

  await assertEdgesAreClear(cardFrames);

  // Placeholders are outline art already, and are drawn under the cards rather
  // than overlapping them, so only the cards are stamped.
  const stampedCards = await stampCardEdge(cardFrames);
  await assertEdgesAreStamped(stampedCards);

  const frames = [...stampedCards, ...placeholderFrames];
  const pages = packPages(frames);

  const outDir = join(OUT_DIR, deck.id);
  await mkdir(outDir, { recursive: true });
  await cleanOutput(outDir);

  const textures = [];
  for (const [index, page] of pages.entries()) {
    const image = `card_assets-${index}.png`;
    await sharp({
      create: {
        width: page.width,
        height: page.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(
        page.frames.map((frame) => ({
          input: frame.png,
          left: frame.x,
          top: frame.y,
        })),
      )
      .png({ compressionLevel: 9 })
      .toFile(join(outDir, image));

    textures.push({
      image,
      format: "RGBA8888",
      size: { w: page.width, h: page.height },
      scale: 1,
      frames: page.frames.map((frame) => ({
        filename: frame.name,
        frame: { x: frame.x, y: frame.y, w: FRAME_W, h: FRAME_H },
        anchor: { x: 0.5, y: 0.5 },
      })),
    });

    console.log(
      `  ${image}  ${page.width}x${page.height}  ${page.frames.length} frames`,
    );
  }

  await writeFile(
    join(outDir, "card_assets_atlas.json"),
    `${JSON.stringify({ textures }, null, 2)}\n`,
  );

  console.log(
    `  ${frames.length} frames at ${FRAME_W}x${FRAME_H} (${ART_SCALE}x) across ${pages.length} page(s)`,
  );
}

async function main() {
  // Cut once and shared by every deck: the placeholders mark an empty pile
  // rather than being cards, so no deck draws them differently.
  const placeholderSvg = await readFile(
    join(CARD_DIR, PLACEHOLDERS.file),
    "utf8",
  );
  const placeholderSheet = await rasterize(
    placeholderSvg,
    {
      x: 0,
      y: 0,
      w: PLACEHOLDERS.names.length * DESIGN_FRAME_W,
      h: DESIGN_FRAME_H,
    },
    PLACEHOLDERS.names.length * FRAME_W,
    FRAME_H,
  );
  const placeholderFrames = await cutFrames(
    placeholderSheet,
    (_row, col) => PLACEHOLDERS.names[col] ?? null,
    1,
    PLACEHOLDERS.names.length,
    (_row, col) => ({ left: col * FRAME_W, top: 0 }),
  );

  for (const deck of DECKS) {
    await buildDeck(deck, placeholderFrames);
  }

  console.log(`Built ${DECKS.length} decks.`);
}

await main();
