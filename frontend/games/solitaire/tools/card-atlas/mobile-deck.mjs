/**
 * Draws the mobile deck: flat faces whose rank and suit fill the strips a
 * fanned card leaves showing, and plain backs.
 *
 * Coordinates are design units on the 220 x 307 frame, origin top left.
 */
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DESIGN_FRAME_H,
  DESIGN_FRAME_W,
  FRAME_H,
  FRAME_W,
  rasterize,
} from "./raster.mjs";

/** @typedef {{x: number, y: number, w: number, h: number}} Box A box in design units. */

/** The face the ranks are drawn in, loaded from the tool rather than the system. */
const FONT = {
  fontFiles: [
    join(
      dirname(fileURLToPath(import.meta.url)),
      "fonts/BarlowCondensed-Bold.ttf",
    ),
  ],
  loadSystemFonts: false,
  defaultFontFamily: "Barlow Condensed",
};

const FONT_FAMILY = "Barlow Condensed";
const FONT_WEIGHT = 700;

/**
 * How much of a face-up card a fanned column leaves showing, from the top.
 *
 * Mirrors `TABLEAU_FACE_UP_OFFSET` in `src/games/common/pile_layouts.ts`.
 */
export const COLUMN_STRIP_H = 45;

/**
 * How much of a card a fanned waste leaves showing, from the left.
 *
 * Mirrors `WASTE_FAN_OFFSET_X` in `src/games/common/pile_layouts.ts`.
 */
export const WASTE_STRIP_W = 55;

/**
 * How far the index keeps from the edge of a strip, so the card laid over it
 * neither covers nor crowds it.
 */
const STRIP_CLEARANCE = 3;

/** How far any ink keeps from the frame's edge, clear of the stamped edge. */
const FRAME_CLEARANCE = 3;

/** The colours the faces are drawn in. */
const COLORS = {
  paper: "#ffffff",
  red: "#c8102e",
  black: "#141414",
  /** The panel behind a court card's letter, by suit colour. */
  courtPanel: { red: "#fbe4e8", black: "#e6e8ee" },
};

/** The least contrast a suit colour may have against what it is drawn on. */
const MIN_CONTRAST = 4.5;

/** The suits, with the colour each is drawn in. */
const SUITS = [
  { name: "clubs", color: "black" },
  { name: "diamonds", color: "red" },
  { name: "hearts", color: "red" },
  { name: "spades", color: "black" },
];

/** The ranks, by frame name, with the index each shows. */
const RANKS = [
  { name: "ace", label: "A" },
  { name: "2", label: "2" },
  { name: "3", label: "3" },
  { name: "4", label: "4" },
  { name: "5", label: "5" },
  { name: "6", label: "6" },
  { name: "7", label: "7" },
  { name: "8", label: "8" },
  { name: "9", label: "9" },
  { name: "10", label: "10" },
  { name: "jack", label: "J", court: true },
  { name: "queen", label: "Q", court: true },
  { name: "king", label: "K", court: true },
];

/**
 * Each suit's pip, drawn about a 100 x 100 box: solid shapes with no outline,
 * which stay recognizable a few pixels across.
 */
const PIP_PATHS = {
  hearts:
    "M50 100 C34 86 0 62 0 30 C0 12 13 0 28 0 C39 0 46 6 50 15" +
    " C54 6 61 0 72 0 C87 0 100 12 100 30 C100 62 66 86 50 100 Z",
  // Wider than a playing card's usual diamond, which reads smaller than the
  // other suits at the size of an index.
  diamonds: "M50 0 L94 50 L50 100 L6 50 Z",
  spades:
    "M50 0 C62 18 100 40 100 64 C100 80 88 90 74 90 C64 90 57 85 54 79" +
    " C55 89 59 95 68 100 L32 100 C41 95 45 89 46 79" +
    " C43 85 36 90 26 90 C12 90 0 80 0 64 C0 40 38 18 50 0 Z",
  clubs:
    "M50 0 C64 0 74 10 74 24 C74 30 72 35 69 39 C72 37 76 36 80 36" +
    " C92 36 100 46 100 58 C100 70 92 80 80 80 C68 80 59 74 55 67" +
    " C56 82 60 92 68 100 L32 100 C40 92 44 82 45 67" +
    " C41 74 32 80 20 80 C8 80 0 70 0 58 C0 46 8 36 20 36" +
    " C24 36 28 37 31 39 C28 35 26 30 26 24 C26 10 36 0 50 0 Z",
};

/**
 * Where the index goes: a rank and a pip in the column at the left, which a
 * fanned waste leaves showing, and a second pip at the top right, so the strip
 * a fanned column leaves showing has the rank at one end and the suit at the
 * other.
 */
const INDEX = {
  /** Where the rank's ink may go, descenders included. */
  rank: {
    x: FRAME_CLEARANCE + 1,
    y: FRAME_CLEARANCE,
    w: WASTE_STRIP_W - STRIP_CLEARANCE - FRAME_CLEARANCE - 1,
    h: COLUMN_STRIP_H - STRIP_CLEARANCE - FRAME_CLEARANCE,
  },
  /** The pip under the rank. */
  columnPip: { x: 10, y: 46, w: 34, h: 34 },
  /** The pip at the top right. */
  stripPip: {
    x: DESIGN_FRAME_W - FRAME_CLEARANCE - 1 - 35,
    y: FRAME_CLEARANCE + 1,
    w: 35,
    h: 35,
  },
};

/** The cap height an index's rank is drawn at, unless its ink would leave its box. */
const RANK_CAP_H = 36;

/**
 * The face right of the waste's strip and below the column's, which carries
 * the court cards' panel, so the strips show nothing but the index.
 */
const BODY = {
  x: WASTE_STRIP_W + STRIP_CLEARANCE,
  y: COLUMN_STRIP_H + STRIP_CLEARANCE,
  w: DESIGN_FRAME_W - WASTE_STRIP_W - STRIP_CLEARANCE - FRAME_CLEARANCE,
  h: DESIGN_FRAME_H - COLUMN_STRIP_H - STRIP_CLEARANCE - FRAME_CLEARANCE,
};

/**
 * The part of the body below the index's column, which a number card's pip is
 * centred in.
 */
const PIP_FIELD = {
  ...BODY,
  y: INDEX.columnPip.y + INDEX.columnPip.h + STRIP_CLEARANCE,
  h:
    BODY.y + BODY.h - (INDEX.columnPip.y + INDEX.columnPip.h + STRIP_CLEARANCE),
};

/** How much of the body's width a number card's pip spans, and an ace's. */
const BODY_PIP_SCALE = { number: 0.8, ace: 0.92 };

/** A court card's letter, the pip under it, and the gap between them. */
const COURT = { letterCapH: 100, pipSize: 60, gap: 18 };

/** The colours of the two backs, by frame name. */
const BACKS = {
  "card-back-blue": { field: "#1d4f9f", lattice: "#2a62b8" },
  "card-back-red": { field: "#a3172b", lattice: "#b92a3f" },
};

/** Pixels per design unit when measuring a mark's ink. */
const MEASURE_PPU = 4;

/**
 * Returns the ink bounds of an SVG fragment, in its own units, by rendering it
 * alone.
 *
 * @param {string} fragment SVG elements, within (-100, -200) to (300, 200).
 * @returns {Box} The bounds.
 */
function measureInk(fragment) {
  const size = 400 * MEASURE_PPU;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"` +
    ` viewBox="-100 -200 400 400">${fragment}</svg>`;
  const { pixels, width, height } = new Resvg(svg, { font: FONT }).render();

  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) throw new Error(`Nothing drawn by ${fragment}`);
  return {
    x: left / MEASURE_PPU - 100,
    y: top / MEASURE_PPU - 200,
    w: (right + 1 - left) / MEASURE_PPU,
    h: (bottom + 1 - top) / MEASURE_PPU,
  };
}

/** Returns a rank set at 100 units with its baseline on the origin. */
function rankText(label) {
  return (
    `<text x="0" y="0" font-family="${FONT_FAMILY}"` +
    ` font-weight="${FONT_WEIGHT}" font-size="100">${label}</text>`
  );
}

/** The cap height of the font at 100 units, measured off a flat-topped letter. */
const CAP_H = -measureInk(rankText("H")).y;

/** Each rank's ink at 100 units, measured once. */
const RANK_INK = new Map(
  RANKS.map((rank) => [rank.label, measureInk(rankText(rank.label))]),
);

/** Each pip's ink as drawn, measured once. */
const PIP_INK = new Map(
  Object.entries(PIP_PATHS).map(([suit, d]) => [
    suit,
    measureInk(`<path d="${d}"/>`),
  ]),
);

/**
 * Returns a rank fitted into a box: at a cap height, or smaller where its tail
 * would leave the box, top-aligned, centred across, and narrowed where it is
 * too wide.
 *
 * @param {string} label The rank's index.
 * @param {Box} box Where its ink must stay.
 * @param {string} color The fill.
 * @param {number} capH The cap height to draw it at.
 * @returns {{svg: string, ink: Box}} The element, and where its ink lands.
 */
function fittedRank(label, box, color, capH) {
  const ink = RANK_INK.get(label);
  // The ink's top is the cap line, give or take an overshoot, so scaling the
  // cap to capH scales the whole glyph to match.
  const scaleY = Math.min(capH / CAP_H, box.h / ink.h);
  const scaleX = Math.min(scaleY, box.w / ink.w);
  const landed = centredIn(
    { ...box, h: ink.h * scaleY },
    ink.w * scaleX,
    ink.h * scaleY,
  );
  return {
    svg:
      `<g transform="translate(${landed.x - ink.x * scaleX}` +
      ` ${landed.y - ink.y * scaleY}) scale(${scaleX} ${scaleY})"` +
      ` fill="${color}">${rankText(label)}</g>`,
    ink: landed,
  };
}

/**
 * Returns a suit's pip fitted into a box, as large as it fits and centred.
 *
 * @param {string} suit The suit's name.
 * @param {Box} box Where the pip goes.
 * @param {string} color The fill.
 * @returns {{svg: string, ink: Box}} The element, and where its ink lands.
 */
function fittedPip(suit, box, color) {
  const ink = PIP_INK.get(suit);
  const scale = Math.min(box.w / ink.w, box.h / ink.h);
  const landed = centredIn(box, ink.w * scale, ink.h * scale);
  return {
    svg:
      `<path transform="translate(${landed.x - ink.x * scale}` +
      ` ${landed.y - ink.y * scale}) scale(${scale})"` +
      ` fill="${color}" d="${PIP_PATHS[suit]}"/>`,
    ink: landed,
  };
}

/** Returns a box of a given size centred in another. */
function centredIn(box, w, h) {
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

/**
 * Returns the art outside the strips: one large pip on a number card, a larger
 * one on an ace, and the rank's letter over a pip on a tinted panel on a court
 * card.
 *
 * @returns {{svg: string, ink: Box}} The elements, and the box they cover.
 */
function bodyArt(suit, rank) {
  const color = COLORS[suit.color];
  if (!rank.court) {
    const span =
      BODY.w *
      (rank.name === "ace" ? BODY_PIP_SCALE.ace : BODY_PIP_SCALE.number);
    return fittedPip(suit.name, centredIn(PIP_FIELD, span, span), color);
  }

  // The letter and the pip under it, as one group centred in the panel.
  const group = centredIn(
    BODY,
    BODY.w,
    COURT.letterCapH + COURT.gap + COURT.pipSize,
  );
  // Room below the cap line for the Q's tail, so it is not shrunk to fit.
  const letterBox = { ...group, h: COURT.letterCapH * 1.2 };
  const pipBox = centredIn(
    {
      ...group,
      y: group.y + COURT.letterCapH + COURT.gap,
      h: COURT.pipSize,
    },
    COURT.pipSize,
    COURT.pipSize,
  );
  return {
    svg:
      `<rect x="${BODY.x}" y="${BODY.y}" width="${BODY.w}" height="${BODY.h}"` +
      ` rx="10" fill="${COLORS.courtPanel[suit.color]}"/>` +
      fittedRank(rank.label, letterBox, color, COURT.letterCapH).svg +
      fittedPip(suit.name, pipBox, color).svg,
    ink: BODY,
  };
}

/** Returns the marks that make up one card's index. */
function indexOf(suit, rank) {
  const color = COLORS[suit.color];
  return {
    rank: fittedRank(rank.label, INDEX.rank, color, RANK_CAP_H),
    columnPip: fittedPip(suit.name, INDEX.columnPip, color),
    stripPip: fittedPip(suit.name, INDEX.stripPip, color),
  };
}

/** Returns a box's right and bottom edges. */
function farEdges(box) {
  return { right: box.x + box.w, bottom: box.y + box.h };
}

/**
 * Fails the build if any card's index would be covered by the card fanned over
 * it, if anything else on a face would show in a strip, or if any ink would
 * touch the frame's edge.
 */
function assertIndicesAreClear() {
  const columnLimit = COLUMN_STRIP_H - STRIP_CLEARANCE;
  const wasteLimit = WASTE_STRIP_W - STRIP_CLEARANCE;
  const problems = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const card = `${rank.name} of ${suit.name}`;
      const index = indexOf(suit, rank);
      const body = bodyArt(suit, rank).ink;

      if (farEdges(index.rank.ink).bottom > columnLimit) {
        problems.push(`${card}: rank runs past the column's strip`);
      }
      if (farEdges(index.stripPip.ink).bottom > columnLimit) {
        problems.push(`${card}: top right pip runs past the column's strip`);
      }
      if (farEdges(index.rank.ink).right > wasteLimit) {
        problems.push(`${card}: rank runs past the waste's strip`);
      }
      if (farEdges(index.columnPip.ink).right > wasteLimit) {
        problems.push(
          `${card}: pip under the rank runs past the waste's strip`,
        );
      }
      if (index.stripPip.ink.x < farEdges(index.rank.ink).right) {
        problems.push(`${card}: top right pip overlaps the rank`);
      }
      if (body.x < WASTE_STRIP_W || body.y < COLUMN_STRIP_H) {
        problems.push(`${card}: body art shows in a strip`);
      }

      for (const [mark, ink] of [
        ["rank", index.rank.ink],
        ["pip under the rank", index.columnPip.ink],
        ["top right pip", index.stripPip.ink],
        ["body art", body],
      ]) {
        const { right, bottom } = farEdges(ink);
        if (
          ink.x < FRAME_CLEARANCE ||
          ink.y < FRAME_CLEARANCE ||
          right > DESIGN_FRAME_W - FRAME_CLEARANCE ||
          bottom > DESIGN_FRAME_H - FRAME_CLEARANCE
        ) {
          problems.push(`${card}: ${mark} touches the frame's edge`);
        }
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `The mobile deck's layout is off:\n  ${problems.join("\n  ")}`,
    );
  }
}

/** Returns a colour's relative luminance, as WCAG defines it. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Returns the WCAG contrast ratio between two colours. */
function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Fails the build if a suit colour is too faint against the paper, or against
 * the panel a court card draws it on.
 */
function assertSuitColorsAreLegible() {
  const problems = [];
  for (const color of ["red", "black"]) {
    for (const [ground, hex] of [
      ["paper", COLORS.paper],
      ["court panel", COLORS.courtPanel[color]],
    ]) {
      const ratio = contrast(COLORS[color], hex);
      if (ratio < MIN_CONTRAST) {
        problems.push(`${color} on ${ground}: ${ratio.toFixed(2)}:1`);
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Suit colours under ${MIN_CONTRAST}:1 contrast:\n  ${problems.join("\n  ")}`,
    );
  }
}

/** Wraps a frame's elements in an SVG document of the design frame size. */
function frameSvg(content) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg"` +
    ` width="${DESIGN_FRAME_W}" height="${DESIGN_FRAME_H}"` +
    ` viewBox="0 0 ${DESIGN_FRAME_W} ${DESIGN_FRAME_H}">${content}</svg>`
  );
}

/** Returns the SVG of one card face. */
function faceSvg(suit, rank) {
  const index = indexOf(suit, rank);
  return frameSvg(
    `<rect width="${DESIGN_FRAME_W}" height="${DESIGN_FRAME_H}" rx="1.5"` +
      ` fill="${COLORS.paper}"/>` +
      index.rank.svg +
      index.columnPip.svg +
      index.stripPip.svg +
      bodyArt(suit, rank).svg,
  );
}

/**
 * Returns the SVG of a back: a flat field with a light inset border, which is
 * all a face-down card in a column shows, and a quiet lattice inside it.
 */
function backSvg(colors) {
  const inset = 7;
  return frameSvg(
    `<defs><pattern id="lattice" width="16" height="16"` +
      ` patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
      `<rect width="16" height="16" fill="${colors.field}"/>` +
      `<rect width="8" height="8" fill="${colors.lattice}"/>` +
      `</pattern></defs>` +
      `<rect width="${DESIGN_FRAME_W}" height="${DESIGN_FRAME_H}" rx="1.5"` +
      ` fill="${colors.field}"/>` +
      `<rect x="${inset}" y="${inset}" width="${DESIGN_FRAME_W - 2 * inset}"` +
      ` height="${DESIGN_FRAME_H - 2 * inset}" rx="6" fill="url(#lattice)"` +
      ` stroke="${COLORS.paper}" stroke-width="4"/>`,
  );
}

/** Renders a frame's SVG at the raster density. */
async function renderFrame(name, svg) {
  const { data, info } = await rasterize(
    svg,
    { x: 0, y: 0, w: DESIGN_FRAME_W, h: DESIGN_FRAME_H },
    FRAME_W,
    FRAME_H,
    FONT,
  );
  const png = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  return { name, png };
}

/**
 * Draws the mobile deck's faces and backs, after checking that its layout and
 * colours keep every index legible.
 *
 * @returns {Promise<{name: string, png: Buffer}[]>} The frames, at RASTER_SCALE.
 */
export async function drawMobileDeck() {
  assertIndicesAreClear();
  assertSuitColorsAreLegible();

  const frames = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      frames.push(
        await renderFrame(
          `card-${suit.name}-${rank.name}`,
          faceSvg(suit, rank),
        ),
      );
    }
  }
  for (const [name, colors] of Object.entries(BACKS)) {
    frames.push(await renderFrame(name, backSvg(colors)));
  }
  return frames;
}
