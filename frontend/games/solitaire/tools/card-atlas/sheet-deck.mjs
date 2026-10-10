/**
 * Draws a deck's cards from a card sheet: one SVG holding the 52 faces and the
 * two backs, separated by gutters.
 */
import {
  DESIGN_FRAME_H,
  DESIGN_FRAME_W,
  EDGE_CORNER_UNITS,
  EDGE_NAMES,
  cutFrames,
  drawEach,
  drawFrame,
  edgeScorer,
  frameSize,
  rasterize,
} from "./raster.mjs";

/** @import { Box, Frame, Raster } from "./raster.mjs" */

/**
 * A run of painted lines, from its first to its last inclusive, in pixels.
 *
 * @typedef {{start: number, end: number}} Run
 */

/**
 * A frame, by its name and the region of the sheet it is drawn from, in user
 * units.
 *
 * @typedef {{name: string, box: Box}} FrameBox
 */

/**
 * The frames a card sheet holds, drawn at whichever density is asked for.
 *
 * @typedef {{faces: (artScale: number) => Promise<Frame[]>, backs: (artScale: number) => Promise<Frame[]>}} SheetDeck
 */

/**
 * The shape every deck's card sheet shares: the 52 faces in four rows of
 * thirteen, and the two backs alone on a fifth.
 *
 * Gutters separate the cards, which is how the cutter finds them.
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
 * Pixels per SVG user unit when rendering the whole sheet to find its cards
 * and check where they are cut.
 */
const SHEET_PPU = 2;

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
const SHEET_BACKS = ["card-back-classic-blue", "card-back-classic-red"];

/**
 * Marks every pixel the sheet has drawn something on.
 *
 * Anything but full transparency counts, so the only clear lines on the sheet
 * are the gutters.
 *
 * @param {Raster} sheet The rendered sheet.
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
 * @returns {Run[]} The runs, ascending.
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
 * Checks a set of runs is the row or column of cards it should be, in count and
 * in size.
 *
 * @param {Run[]} runs The runs found.
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
 * Locates the cards on the sheet, each run of painted lines being one row or
 * column of cards.
 *
 * Columns are found over the whole sheet, since the row of backs holds only two
 * cards.
 *
 * @param {Raster} sheet The rendered sheet.
 * @returns {{columns: Run[], rows: Run[]}} Card spans in pixels.
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

/** How far into a frame to look for a bled rule, in pixels at SHEET_PPU. */
const EDGE_RING_PX = 10;

/** Fraction of an edge that must be inked before it counts as a bled rule. */
const EDGE_BLEED_COVERAGE = 0.5;

/**
 * Fails the build if any frame has a neighbouring card's rule inside it: a line
 * inking most of an edge's length, unlike artwork that merely sits near it.
 *
 * Run it before the card edge is stamped, which it would read as bled.
 *
 * @param {Frame[]} frames The cut frames.
 */
async function assertEdgesAreClear(frames) {
  const dirty = [];
  for (const frame of frames) {
    const score = await edgeScorer(frame.png, EDGE_CORNER_UNITS * SHEET_PPU);

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
 * Finds the cards on a card sheet and returns a deck that draws them, a frame
 * centred on each card.
 *
 * The cards are found, and their crops checked, once on a render of the whole
 * sheet; every density then draws the same regions of the SVG.
 *
 * @param {string} source The sheet's SVG source.
 * @returns {Promise<SheetDeck>}
 */
export async function cutSheetDeck(source) {
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

  // Centre the frame on the card, trimming an even sliver off each side and
  // keeping the gutter out of the crop.
  const survey = frameSize(SHEET_PPU);
  const cuts = [];
  for (let row = 0; row < SHEET.rows; row++) {
    for (let col = 0; col < SHEET.cols; col++) {
      const name =
        row < SHEET_SUITS.length
          ? `card-${SHEET_SUITS[row]}-${SHEET_RANKS[col]}`
          : SHEET_BACKS[col];
      if (!name) continue;
      const column = cards.columns[col];
      const line = cards.rows[row];
      cuts.push({
        name,
        left: Math.round(
          (column.start + column.end + 1) / 2 - survey.width / 2,
        ),
        top: Math.round((line.start + line.end + 1) / 2 - survey.height / 2),
      });
    }
  }
  const surveyed = await cutFrames(sheet, cuts, survey);
  await assertEdgesAreClear(surveyed);

  /** @type {FrameBox[]} */
  const boxes = cuts.map(({ name, left, top }) => ({
    name,
    box: {
      x: left / SHEET_PPU,
      y: top / SHEET_PPU,
      w: DESIGN_FRAME_W,
      h: DESIGN_FRAME_H,
    },
  }));

  /**
   * Returns a drawer for some of the frames.
   *
   * @param {(name: string) => boolean} wanted
   * @returns {(artScale: number) => Promise<Frame[]>}
   */
  const drawer = (wanted) => (artScale) =>
    artScale === SHEET_PPU
      ? // Drawn already, on the same pixel grid.
        Promise.resolve(surveyed.filter((frame) => wanted(frame.name)))
      : drawEach(
          boxes.filter((frame) => wanted(frame.name)),
          ({ name, box }) => drawFrame(name, source, box, artScale),
        );

  const isBack = (/** @type {string} */ name) => SHEET_BACKS.includes(name);
  return {
    faces: drawer((name) => !isBack(name)),
    backs: drawer(isBack),
  };
}
