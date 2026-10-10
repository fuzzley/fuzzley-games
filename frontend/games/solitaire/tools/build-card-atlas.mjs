/**
 * Builds the card texture atlases, one per deck.
 *
 *   yarn build:atlas                 every deck
 *   yarn build:atlas --deck <id>     one deck
 *   yarn build:atlas --preview       and a contact sheet of every deck
 *
 * Draws each deck's faces at every density in `card-atlas/raster.mjs`, from a
 * card sheet or generated, adds the shared card backs and pile placeholders,
 * and writes each density as atlas pages plus a Phaser multi-atlas manifest.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { writeDeckAtlas } from "./card-atlas/atlas-writer.mjs";
import {
  drawMobileFaces,
  drawPlainBacks,
  mobileFrameVectors,
} from "./card-atlas/mobile-deck.mjs";
import { writePreview } from "./card-atlas/preview.mjs";
import {
  ART_SCALES,
  DESIGN_FRAME_H,
  DESIGN_FRAME_W,
  drawEach,
  drawFrame,
} from "./card-atlas/raster.mjs";
import { cutSheetDeck } from "./card-atlas/sheet-deck.mjs";

/** @import { Frame } from "./card-atlas/raster.mjs" */
/** @import { SheetDeck } from "./card-atlas/sheet-deck.mjs" */

/**
 * A deck on offer: its id, what its faces are drawn from, how to draw them, and
 * for a deck the board can draw at any size, the SVG of every frame it can.
 *
 * @typedef {{id: string, source: string, faces: (artScale: number) => Promise<Frame[]>, vectors?: () => Record<string, string>}} Deck
 */

/**
 * Draws frames at a density.
 *
 * @typedef {(artScale: number) => Promise<Frame[]>} FrameDrawer
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARD_DIR = join(ROOT, "src/engine/render/assets/sprites/card");
const OUT_DIR = join(ROOT, "src/engine/render/assets/sprites/atlas");
const PREVIEW_FILE = join(ROOT, "tools/card-atlas/.preview/decks.png");

/**
 * Each sheet's cut, kept so one sheet a build reads twice is surveyed once.
 *
 * @type {Map<string, Promise<SheetDeck>>}
 */
const cutSheets = new Map();

/**
 * Returns the faces and backs drawn from the named sheet in CARD_DIR.
 *
 * @param {string} file
 * @returns {Promise<SheetDeck>}
 */
function cutSheet(file) {
  let cut = cutSheets.get(file);
  if (!cut) {
    cut = readFile(join(CARD_DIR, file), "utf8").then(cutSheetDeck);
    cutSheets.set(file, cut);
  }
  return cut;
}

/**
 * Returns a deck whose faces are drawn from the named sheet in CARD_DIR.
 *
 * @param {string} file
 * @returns {Omit<Deck, "id">}
 */
function fromSheet(file) {
  return {
    source: file,
    async faces(artScale) {
      return (await cutSheet(file)).faces(artScale);
    },
  };
}

/**
 * Returns a drawer that draws each density once, handing back the same frames
 * whenever that density is asked for again.
 *
 * @param {FrameDrawer} draw
 * @returns {FrameDrawer}
 */
function oncePerDensity(draw) {
  /** @type {Map<number, Promise<Frame[]>>} */
  const drawn = new Map();
  return (artScale) => {
    let frames = drawn.get(artScale);
    if (!frames) {
      frames = draw(artScale);
      drawn.set(artScale, frames);
    }
    return frames;
  };
}

/**
 * The decks on offer, each written to its own directory under OUT_DIR.
 *
 * Ids must match `CardDeckId` in `src/engine/render/deck/card_deck.ts`.
 *
 * @type {Deck[]}
 */
const DECKS = [
  { id: "classic", ...fromSheet("playing_card_assets_large.svg") },
  { id: "indexed", ...fromSheet("playing_card_assets_corner_pips.svg") },
  {
    id: "all-corner-pips",
    ...fromSheet("playing_card_assets_all_corner_pips.svg"),
  },
  {
    id: "mobile",
    source: "card-atlas/mobile-deck.mjs",
    faces: drawMobileFaces,
    vectors: mobileFrameVectors,
  },
];

/**
 * The file in a deck's directory holding the SVG of the frames the board can
 * draw at any size, which `card_deck_vectors.ts` in
 * `src/engine/render/phaser/deck/` loads.
 */
const VECTORS_FILE = "vectors.json";

/**
 * The sheet the card artwork's backs are cut from; every sheet draws the same
 * two.
 */
const BACK_SHEET = "playing_card_assets_large.svg";

/**
 * Draws the backs every deck is given, so a player can choose a back apart
 * from the deck: the plain ones, then the card artwork's.
 */
const drawBacks = oncePerDensity(async (artScale) => [
  ...(await drawPlainBacks(artScale)),
  ...(await (await cutSheet(BACK_SHEET)).backs(artScale)),
]);

/** The placeholder sheet: one cell of the design frame size per name, in a row. */
const PLACEHOLDERS = {
  file: "card_placeholders.svg",
  names: [
    "card-placeholder",
    "card-placeholder-full-border-circle",
    "card-placeholder-full-border-reset",
    "card-placeholder-full-border",
    "card-placeholder-full-border-reset-2-of-2",
    "card-placeholder-full-border-reset-1-of-2",
    "card-placeholder-full-border-reset-3-of-3",
    "card-placeholder-full-border-reset-2-of-3",
    "card-placeholder-full-border-reset-1-of-3",
    "card-placeholder-top-circle",
    "card-placeholder-full-border-top-circle",
  ],
};

/**
 * Draws the pile placeholders, which every deck shares: they mark an empty
 * pile rather than being cards, so no deck draws them differently.
 */
const drawPlaceholders = oncePerDensity(async (artScale) => {
  const svg = await readFile(join(CARD_DIR, PLACEHOLDERS.file), "utf8");
  return drawEach([...PLACEHOLDERS.names.entries()], ([cell, name]) =>
    drawFrame(
      name,
      svg,
      { x: cell * DESIGN_FRAME_W, y: 0, w: DESIGN_FRAME_W, h: DESIGN_FRAME_H },
      artScale,
    ),
  );
});

/**
 * Returns the decks the command line asks for, and whether to preview them.
 *
 * @returns {{decks: Deck[], preview: boolean}}
 */
function parseCommandLine() {
  const { values } = parseArgs({
    options: { deck: { type: "string" }, preview: { type: "boolean" } },
  });
  const preview = values.preview ?? false;
  if (values.deck === undefined) return { decks: DECKS, preview };

  const deck = DECKS.find((candidate) => candidate.id === values.deck);
  if (!deck) {
    throw new Error(
      `No deck "${values.deck}"; the decks are ` +
        DECKS.map((candidate) => candidate.id).join(", "),
    );
  }
  return { decks: [deck], preview };
}

async function main() {
  const { decks, preview } = parseCommandLine();

  for (const deck of decks) {
    console.log(`${deck.id}  (${deck.source}):`);
    for (const artScale of ART_SCALES) {
      await writeDeckAtlas(
        [...(await deck.faces(artScale)), ...(await drawBacks(artScale))],
        await drawPlaceholders(artScale),
        artScale,
        join(OUT_DIR, deck.id),
      );
    }
    if (deck.vectors) {
      const vectors = deck.vectors();
      const json = `${JSON.stringify(vectors, null, 2)}\n`;
      await writeFile(join(OUT_DIR, deck.id, VECTORS_FILE), json);
      console.log(
        `  ${VECTORS_FILE}  ${Object.keys(vectors).length} frames, ` +
          `${Math.round(json.length / 1024)} KB`,
      );
    }
  }
  console.log(`Built ${decks.length} deck(s).`);

  if (preview) {
    await writePreview(
      OUT_DIR,
      DECKS.map((deck) => deck.id),
      PREVIEW_FILE,
    );
  }
}

await main();
