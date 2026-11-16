// The pod as its own display: the plan draws the pod's state on the pod, in
// four marks and no more, and writes no digits near it. This draws the pod
// very large, wearing all four at once with each called out, and the same
// pod small in five states at a laptop's unit and a large phone's, where
// each mark has to survive.

import {
  TURN,
  circle,
  place,
  polar,
  polyline,
  ring,
  text,
} from "../../art/lib/core.mjs";
import { inkOf } from "../../art/lib/crew.mjs";
import { fuzzballSvg } from "../../art/lib/fuzzball.mjs";
import { PODS, RINGS } from "../../art/lib/ship.mjs";
import { bubbleTones } from "../../art/lib/strays.mjs";
import { exhaustDrawn, podDrawn, towDrawn } from "./scene.mjs";

/** @import { Point } from "../../art/lib/core.mjs" */
/** @import { Palette } from "../../art/lib/palettes.mjs" */
/** @import { PodThing } from "./scene.mjs" */

/** The size of the drawing, in CSS pixels. */
export const POD_HUD = { width: 1280, height: 560 };

/** The five states the small pods show, with the words over each. */
const STATES = /** @type {{ words: string[], pod: Partial<PodThing> }[]} */ ([
  { words: ["resting"], pod: { charge: 0, recharge: 1 } },
  {
    words: ["thrusting,", "static at ×3"],
    pod: { charge: 2, recharge: 1, thrust: 0.9, trail: true, face: "set" },
  },
  { words: ["the dash", "at 40%"], pod: { charge: 0, recharge: 0.4 } },
  { words: ["shielded"], pod: { charge: 0, recharge: 1, shield: true } },
  {
    words: ["just hit"],
    pod: { charge: 0, recharge: 1, guard: 1, face: "eep" },
  },
]);

/**
 * Returns a callout: a dot on the thing, a thin leader to a label, and the
 * label's words, its first line the thing's name.
 *
 * @param {Point} from The point on the thing.
 * @param {Point} to Where the label's first line starts.
 * @param {string[]} words
 * @param {Palette} palette
 * @param {"start" | "end"} [anchor] Which way the label runs from there.
 * @returns {string}
 */
function callout(from, to, words, palette, anchor = "start") {
  const side = anchor === "start" ? -1 : 1;
  const elbow = /** @type {Point} */ ([to[0] + side * 34, to[1] - 4]);
  const end = /** @type {Point} */ ([to[0] + side * 9, to[1] - 4]);
  return [
    polyline([from, elbow, end], palette.fieldMuted, 1, { opacity: 0.8 }),
    circle(from[0], from[1], 3, palette.field, {
      stroke: palette.fieldText,
      "stroke-width": 1.4,
    }),
    ...words.map((line, i) =>
      text(to[0], to[1] + i * 17, line, {
        fill: i === 0 ? palette.fieldText : palette.fieldMuted,
        "font-size": i === 0 ? 13.5 : 12.5,
        "font-weight": i === 0 ? 700 : 400,
        "text-anchor": anchor,
      }),
    ),
  ].join("");
}

/**
 * Returns the drawing: the pod at 88 pixels a unit wearing its four marks,
 * each called out, and at 15 and 9 pixels a unit in five states.
 *
 * @param {Palette} palette
 * @returns {string}
 */
export function podHudSvg(palette) {
  const parts = [];
  const big = 88;
  /** @type {Point} */
  const at = [322, 250];
  const turn = -TURN / 4;
  /** @type {PodThing} */
  const pod = {
    at: [0, 0],
    turn,
    pilot: 0,
    charge: 2,
    recharge: 0.4,
    shield: true,
    guard: 1,
  };
  const about = (/** @type {number} */ angle, /** @type {number} */ far) =>
    polar(angle, far * big, at);

  parts.push(
    text(36, 46, "The state of the pod is on the pod", {
      fill: palette.fieldText,
      "font-size": 21,
      "font-weight": 760,
    }),
    text(
      36,
      68,
      "Four marks and no more, and no digits. Here all at once: static at ×3, the dash at 40%, the Shield up, and just hit.",
      { fill: palette.fieldMuted, "font-size": 13 },
    ),
  );

  // The pod, with one of its crew in tow to show where the line ties.
  const hook = PODS.bumble.hook;
  const tied = polar(turn + TURN / 2, -hook[0] * big, at);
  parts.push(
    place(
      towDrawn(
        pod,
        { pilots: [2], heading: turn, sway: 0, phase: 0 },
        palette,
        big,
      ) + podDrawn(pod, palette, big),
      { x: at[0], y: at[1] },
    ),
    ring(tied[0], tied[1], 0.055 * big, bubbleTones(palette).rim, 2.2),
  );

  // The callouts, down the right in the order their marks lie, and the hook's on the left.
  const label = 566;
  parts.push(
    callout(
      about(-0.72, 0.5),
      [label, 112],
      [
        "Static: the pilot's fur",
        "A step for each multiplier, and at the",
        "last, arcs crawl over the hull",
      ],
      palette,
    ),
    callout(
      about(-0.12, PODS.bumble.canopy),
      [label, 254],
      [
        "The dash: the canopy's rim",
        "Dark after a dash, filling round as it",
        "charges again, whole when it is ready",
      ],
      palette,
    ),
    callout(
      about(0.24, RINGS.shield),
      [label, 326],
      ["The Shield: a glass shell", "It takes the next hit, and is spent"],
      palette,
    ),
    callout(
      about(0.56, RINGS.guard),
      [label, 384],
      [
        "Can't be touched: a dashed ring",
        "For a second and a half after a hit",
      ],
      palette,
    ),
    callout(
      [tied[0] - 5, tied[1] + 3],
      [200, 452],
      ["The hook", "The crew's tow line", "ties here"],
      palette,
      "end",
    ),
  );

  // Static's four steps, as the fur alone.
  [0, 1, 2, 3].forEach((charge) => {
    const x = label + 18 + charge * 50;
    parts.push(
      place(
        fuzzballSvg(
          { ink: inkOf(0, palette), size: 32, charge, seed: 3 },
          palette,
        ),
        { x, y: 180 },
      ),
      text(x, 209, `×${charge + 1}`, {
        fill: palette.fieldMuted,
        "font-size": 11.5,
        "text-anchor": "middle",
      }),
    );
  });

  // The same pod small, and the phone's enlarged to show what is left of each mark.
  const grid = { x: 880, width: 380 };
  const column = grid.width / STATES.length;
  parts.push(
    polyline(
      [
        [grid.x - 22, 96],
        [grid.x - 22, POD_HUD.height - 40],
      ],
      palette.fieldLine,
      1,
    ),
    text(grid.x - 4, 46, "The same pod, small", {
      fill: palette.fieldText,
      "font-size": 15,
      "font-weight": 700,
    }),
  );
  STATES.forEach((state, i) => {
    state.words.forEach((line, k) => {
      parts.push(
        text(grid.x + column * (i + 0.5), 100 + k * 15, line, {
          fill: palette.fieldText,
          "font-size": 11.5,
          "text-anchor": "middle",
        }),
      );
    });
  });
  [
    { unit: 15, scale: 1, y: 196, words: "15 px a unit: a laptop" },
    { unit: 9, scale: 1, y: 300, words: "9 px a unit: a large phone, upright" },
    {
      unit: 9,
      scale: 2.2,
      y: 440,
      words: "The phone's pod enlarged: what is left of each mark",
    },
  ].forEach((row) => {
    const reach = 2 * row.unit * row.scale;
    parts.push(
      text(grid.x - 4, row.y - reach - 14, row.words, {
        fill: palette.fieldMuted,
        "font-size": 12.5,
      }),
    );
    STATES.forEach((state, i) => {
      /** @type {PodThing} */
      const small = { at: [0, 0], turn, pilot: 0, ...state.pod };
      parts.push(
        place(
          exhaustDrawn(small, palette, row.unit) +
            podDrawn(small, palette, row.unit),
          { x: grid.x + column * (i + 0.5), y: row.y, scale: row.scale },
        ),
      );
    });
  });
  return parts.join("");
}
