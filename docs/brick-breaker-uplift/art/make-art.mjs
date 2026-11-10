// Draws the concept art for the Brick Breaker uplift plan (../plan.md): the
// brick catalog, the paddle, capsules and balls, the field in play on three
// screens, the new mechanics and the places. It illustrates the plan and is
// not the game's code: the game would redraw this art itself.
//
// Run it with `node docs/brick-breaker-uplift/art/make-art.mjs`. It needs
// nothing but Node, writes every file beside itself, and writes the same
// bytes each time. `kit.mjs` holds the bricks and balls, `scene.mjs` the
// field and what stands around it, and `sheets.mjs` what a sheet is laid out
// with.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { kit } from "./kit.mjs";
import { bricksSheet } from "./sheet-bricks.mjs";
import { fieldSheet } from "./sheet-field.mjs";
import { kitSheet } from "./sheet-kit.mjs";
import { mechanicsSheet } from "./sheet-mechanics.mjs";
import { placesSheet } from "./sheet-places.mjs";

const here = import.meta.dirname;

/**
 * Writes a file beside this script.
 *
 * @param {string} path
 * @param {string} content
 * @returns {void}
 */
function write(path, content) {
  const file = join(here, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`${path} (${Buffer.byteLength(content)} bytes)`);
}

/** @type {[string, string, () => { width: number, height: number, body: string }][]} */
const SHEETS = [
  [
    "bricks.svg",
    "Brick Breaker uplift, the brick catalog: the seven kinds the game has as it draws them now and as the plan draws them, their states, the kinds the plan adds, the eight tints and the small sizes, in the Midnight blue and Classic felt palettes",
    bricksSheet,
  ],
  [
    "paddle-and-capsules.svg",
    "Brick Breaker uplift: the paddle and its modes, the capsules, the balls and the dust bunny, as the game draws them now and as the plan draws them, in the Midnight blue and Classic felt palettes",
    kitSheet,
  ],
  [
    "field.svg",
    "Brick Breaker uplift, the field in play: a wide window as it is now and as the plan lays it out, with a panel either side; a phone held upright; and a phone on its side",
    fieldSheet,
  ],
  [
    "mechanics.svg",
    "Brick Breaker uplift, the new mechanics: the plated brick, the cage, the key and its gates, the portals, the bumper, the slider, the dust bunnies, the Seeker, the streak's fur and the three stars",
    mechanicsSheet,
  ],
  [
    "places.svg",
    "Brick Breaker uplift, the places: the backdrop each set of levels takes, in the Midnight blue and Classic felt palettes",
    placesSheet,
  ],
];

for (const [path, title, draw] of SHEETS) {
  const sheet = draw();
  write(path, kit.svgFile(sheet.width, sheet.height, title, sheet.body));
}
