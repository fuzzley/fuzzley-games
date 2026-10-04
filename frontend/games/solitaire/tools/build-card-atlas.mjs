/**
 * Builds the card texture atlases, one per deck.
 *
 *   yarn build:atlas                 every deck
 *   yarn build:atlas --deck <id>     one deck
 *
 * Draws each deck's cards at the raster density in `card-atlas/raster.mjs`,
 * cutting them from a card sheet or generating them, adds the shared pile
 * placeholders, and writes the deck at every density as atlas pages plus a
 * Phaser multi-atlas manifest.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { writeDeckAtlases } from "./card-atlas/atlas-writer.mjs";
import {
  DESIGN_FRAME_H,
  DESIGN_FRAME_W,
  FRAME_H,
  FRAME_W,
  cutFrames,
  rasterize,
} from "./card-atlas/raster.mjs";
import { cutSheetDeck } from "./card-atlas/sheet-deck.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARD_DIR = join(ROOT, "src/engine/render/assets/sprites/card");
const OUT_DIR = join(ROOT, "src/engine/render/assets/sprites/atlas");

/** Returns a deck's cards cut from the named sheet in CARD_DIR. */
function fromSheet(file) {
  return {
    source: file,
    async cards() {
      return cutSheetDeck(await readFile(join(CARD_DIR, file), "utf8"));
    },
  };
}

/**
 * The decks on offer, each written to its own directory under OUT_DIR.
 *
 * Ids must match `CardDeckId` in `src/engine/render/card_deck.ts`.
 */
const DECKS = [
  { id: "classic", ...fromSheet("playing_card_assets_large.svg") },
  { id: "indexed", ...fromSheet("playing_card_assets_corner_pips.svg") },
  {
    id: "all-corner-pips",
    ...fromSheet("playing_card_assets_all_corner_pips.svg"),
  },
];

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
  ],
};

/**
 * Cuts the pile placeholders, which every deck shares: they mark an empty pile
 * rather than being cards, so no deck draws them differently.
 *
 * @returns {Promise<{name: string, png: Buffer}[]>} The frames, at RASTER_SCALE.
 */
async function cutPlaceholders() {
  const svg = await readFile(join(CARD_DIR, PLACEHOLDERS.file), "utf8");
  const sheet = await rasterize(
    svg,
    {
      x: 0,
      y: 0,
      w: PLACEHOLDERS.names.length * DESIGN_FRAME_W,
      h: DESIGN_FRAME_H,
    },
    PLACEHOLDERS.names.length * FRAME_W,
    FRAME_H,
  );
  return cutFrames(
    sheet,
    (_row, col) => PLACEHOLDERS.names[col] ?? null,
    1,
    PLACEHOLDERS.names.length,
    (_row, col) => ({ left: col * FRAME_W, top: 0 }),
  );
}

/** Returns the decks the command line asks for, or every deck. */
function chosenDecks() {
  const { values } = parseArgs({
    options: { deck: { type: "string" } },
  });
  if (values.deck === undefined) return DECKS;

  const deck = DECKS.find((candidate) => candidate.id === values.deck);
  if (!deck) {
    throw new Error(
      `No deck "${values.deck}"; the decks are ` +
        DECKS.map((candidate) => candidate.id).join(", "),
    );
  }
  return [deck];
}

async function main() {
  const decks = chosenDecks();
  const placeholderFrames = await cutPlaceholders();

  for (const deck of decks) {
    console.log(`${deck.id}  (${deck.source}):`);
    await writeDeckAtlases(
      await deck.cards(),
      placeholderFrames,
      join(OUT_DIR, deck.id),
    );
  }

  console.log(`Built ${decks.length} deck(s).`);
}

await main();
