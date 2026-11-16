// Draws the mocks of the uplift in play again, the same bytes every run:
//
//   node docs/archive/asteroid-breaker-uplift/mocks/make-mocks.mjs                   every mock
//   node docs/archive/asteroid-breaker-uplift/mocks/make-mocks.mjs zap-laptop cards  only those named
//
// Each mock is one SVG here, at its window's size in CSS pixels, staged
// from a moment (lib/moments.mjs) with the art kit's pieces (../art/lib),
// under a bar redrawn in the palette's roles. preview/ holds each at twice
// its size: a PNG to check by eye, and the WebP that is kept.

import { join } from "node:path";
import { attrs, place, rect, svgFile, text } from "../art/lib/core.mjs";
import { PALETTES } from "../art/lib/palettes.mjs";
import { writeRaster, writeText } from "../art/lib/raster.mjs";
import { laptopBar, phoneBar } from "./lib/bar.mjs";
import { clearedCard, endCard, sectorCard } from "./lib/card.mjs";
import { deckSvg } from "./lib/deck.mjs";
import {
  LAPTOP,
  PHONE,
  cleared,
  crowd,
  ended,
  loose,
  ore,
  zap,
} from "./lib/moments.mjs";
import { POD_HUD, podHudSvg } from "./lib/pod_hud.mjs";
import { defsOf, joinDefs, stage } from "./lib/scene.mjs";

/** @import { Palette } from "../art/lib/palettes.mjs" */
/** @import { BarFigures } from "./lib/bar.mjs" */
/** @import { Card } from "./lib/card.mjs" */
/** @import { Moment } from "./lib/scene.mjs" */

/**
 * @typedef {object} Mock A mock, ready to be written.
 * @property {number} width In CSS pixels.
 * @property {number} height
 * @property {string} inner
 * @property {string} defs
 * @property {string} background
 */

const here = import.meta.dirname;

/** A laptop's window and an upright phone's screen, in CSS pixels. */
const WINDOW = { width: 1280, height: 720 };
const SCREEN = { width: 390, height: 844 };

/** What the bar says at the first moment: wave 9, Crowd. */
const CROWD_FIGURES = /** @type {BarFigures} */ ({
  wave: 9,
  score: "5,860",
  crew: { pilot: 0, face: "set", charge: 1, look: [0, -1], tow: [1, 2] },
  times: 2,
});

/**
 * Returns a laptop's window: the bar, and a moment's field under it on the
 * palette's page.
 *
 * @param {Moment} moment
 * @param {BarFigures} figures
 * @returns {Mock}
 */
function laptopWindow(moment, figures) {
  const { palette } = moment;
  const field = stage(moment, LAPTOP);
  return {
    ...WINDOW,
    inner: [field.svg, laptopBar(figures, palette, WINDOW.width)].join("\n"),
    defs: field.defs,
    background: palette.page,
  };
}

/**
 * Returns an upright phone's screen from its top left corner, and its
 * defs: the compact bar, a moment's field, and the deck under it.
 *
 * @param {Moment} moment
 * @param {BarFigures} figures
 * @returns {{ svg: string, defs: string }}
 */
function phoneScreen(moment, figures) {
  const { palette, pod } = moment;
  const field = stage(moment, PHONE);
  const deckTop = PHONE.y + moment.height * moment.unit + 12;
  const deck = deckSvg(
    SCREEN.width - 2 * PHONE.x,
    SCREEN.height - deckTop - 10,
    {
      heading: pod?.turn ?? 0,
      push: 0.85,
      firing: (moment.shots?.length ?? 0) > 0,
      recharge: pod?.recharge ?? 1,
    },
    palette,
  );
  return {
    svg: [
      rect(0, 0, SCREEN.width, SCREEN.height, palette.page),
      field.svg,
      phoneBar(figures, palette, SCREEN.width),
      place(deck, { x: PHONE.x, y: deckTop }),
    ].join("\n"),
    defs: field.defs,
  };
}

/**
 * Returns the first moment on two phones side by side, in a dark palette
 * and a light one, on a grey that both stand apart from.
 *
 * @returns {Mock}
 */
function phones() {
  const gap = 10;
  const screens = [PALETTES.casino, PALETTES.classic].map((palette, i) => {
    const x = gap + i * (SCREEN.width + gap);
    const screen = phoneScreen(
      crowd({ ...PHONE, palette, thin: true }),
      CROWD_FIGURES,
    );
    return {
      svg: [
        `<svg${attrs({ x, y: gap, ...SCREEN, viewBox: `0 0 ${SCREEN.width} ${SCREEN.height}`, overflow: "hidden" })}>`,
        screen.svg,
        "</svg>",
        rect(x - 0.5, gap - 0.5, SCREEN.width + 1, SCREEN.height + 1, "none", {
          stroke: "#8b929c",
          "stroke-width": 1,
        }),
      ].join("\n"),
      defs: screen.defs,
    };
  });
  return {
    width: 2 * SCREEN.width + 3 * gap,
    height: SCREEN.height + 2 * gap,
    inner: screens.map(({ svg }) => svg).join("\n"),
    defs: joinDefs(screens.map(({ defs }) => defs)),
    background: "#c3c8d0",
  };
}

/**
 * Returns the three cards the plan changes or adds, each over a dimmed,
 * still field, with a line above it saying which it is.
 *
 * @returns {Mock}
 */
function cards() {
  const palette = PALETTES.casino;
  const panel = { x: 24, width: 1232, height: 540 };
  const field = {
    palette,
    unit: LAPTOP.unit,
    width: panel.width / LAPTOP.unit,
    height: panel.height / LAPTOP.unit,
  };
  /** @type {{ title: string, says: string, moment: Moment, card: Card, down: number }[]} */
  const panels = [
    {
      title: "The one card between waves",
      says: "The cleared wave's tally and the next wave's name share it. One press goes on, or the first move does.",
      moment: cleared(field),
      card: clearedCard(palette),
      down: 0.5,
    },
    {
      title: "A sector's first wave",
      says: "The sector's name over its place, and one line about what is new there. The wave waits for the first move, as now.",
      moment: ore(field),
      card: sectorCard(palette),
      down: 0.36,
    },
    {
      title: "The run's end",
      says: "Nobody is lost: a hit with no one in tow sends the pilot home in a bubble, and the card waits for it.",
      moment: ended(field),
      card: endCard(palette),
      down: 0.5,
    },
  ];
  const pitch = 574;
  const top = 44;
  const staged = panels.map(({ title, says, moment, card, down }, i) => {
    const y = top + i * pitch;
    const over = place(card.svg, {
      x: (panel.width - card.width) / 2,
      y: (panel.height - card.height) * down,
    });
    const under = stage(moment, { x: panel.x, y, over });
    return {
      svg: [
        text(panel.x, y - 13, title, {
          fill: palette.barText,
          "font-size": 15,
          "font-weight": 700,
        }),
        text(panel.x + panel.width, y - 13, says, {
          fill: palette.fieldMuted,
          "font-size": 13,
          "text-anchor": "end",
        }),
        under.svg,
      ].join("\n"),
      defs: under.defs,
    };
  });
  return {
    width: 1280,
    height: top + 2 * pitch + panel.height + 18,
    inner: staged.map(({ svg }) => svg).join("\n"),
    defs: joinDefs(staged.map(({ defs }) => defs)),
    background: palette.page,
  };
}

/**
 * Returns the pod as its own display, in Casino night's field color.
 *
 * @returns {Mock}
 */
function podHud() {
  const palette = PALETTES.casino;
  const inner = podHudSvg(palette);
  return {
    ...POD_HUD,
    inner,
    defs: defsOf(inner, [palette]),
    background: palette.field,
  };
}

/**
 * Returns the first moment in a laptop's window, in a palette.
 *
 * @param {Palette} palette
 * @returns {Mock}
 */
function playLaptop(palette) {
  return laptopWindow(crowd({ ...LAPTOP, palette }), CROWD_FIGURES);
}

/** Every mock, by the name of its file. */
const MOCKS = /** @type {Record<string, () => Mock>} */ ({
  "play-laptop-dark": () => playLaptop(PALETTES.casino),
  "play-laptop-light": () => playLaptop(PALETTES.classic),
  "zap-laptop": () =>
    laptopWindow(zap({ ...LAPTOP, palette: PALETTES.midnight }), {
      wave: 17,
      score: "48,250",
      crew: { pilot: 0, face: "squeeze", charge: 3, tow: [3, 6, 2] },
      times: 4,
    }),
  "loose-laptop": () =>
    laptopWindow(loose({ ...LAPTOP, palette: PALETTES.pastel }), {
      wave: 24,
      score: "112,480",
      crew: { pilot: 1, face: "eep", charge: 0, tow: [4, 7], loose: 1 },
      times: 1,
    }),
  "phone-upright": phones,
  cards,
  "pod-hud": podHud,
});

const asked = process.argv.slice(2);
const unknown = asked.filter((name) => !(name in MOCKS));
if (unknown.length > 0) {
  console.error(
    `No mock is named ${unknown.join(", ")}. The mocks: ${Object.keys(MOCKS).join(", ")}.`,
  );
  process.exit(2);
}

for (const [name, make] of Object.entries(MOCKS)) {
  if (asked.length > 0 && !asked.includes(name)) continue;
  const mock = make();
  const svg = svgFile(mock.width, mock.height, mock.inner, {
    defs: mock.defs,
    background: mock.background,
  });
  await writeText(join(here, `${name}.svg`), svg);
  await writeRaster(svg, join(here, "preview", `${name}.png`), { scale: 2 });
  await writeRaster(svg, join(here, "preview", `${name}.webp`), { scale: 2 });
  console.log(`${name}.svg  ${(svg.length / 1024).toFixed(0)} KB`);
}
