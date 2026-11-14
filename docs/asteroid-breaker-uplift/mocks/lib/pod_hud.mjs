// The pod as its own display: the plan draws the pod's state on the pod and
// writes no digits near it. This draws the pod very large with each mark
// called out, and the same pod small in four states at a laptop's unit and a
// large phone's, where each mark has to survive.

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
import { PODS } from "../../art/lib/ship.mjs";
import { bubbleTones } from "../../art/lib/strays.mjs";
import {
  DASH_ARC,
  WEAPON_ARC,
  exhaustDrawn,
  podDrawn,
  towDrawn,
} from "./scene.mjs";

/** @import { Point } from "../../art/lib/core.mjs" */
/** @import { Palette } from "../../art/lib/palettes.mjs" */
/** @import { PodThing } from "./scene.mjs" */

/** The size of the drawing, in CSS pixels. */
export const POD_HUD = { width: 1280, height: 560 };

/** The four states the small pods show, with the words under each. */
const STATES = /** @type {{ words: string[], pod: Partial<PodThing> }[]} */ ([
  { words: ["resting"], pod: { charge: 0, static: 0.12, recharge: 1 } },
  {
    words: ["thrusting,", "static at ×3"],
    pod: {
      charge: 2,
      static: 0.62,
      recharge: 1,
      thrust: 0.9,
      trail: true,
      face: "set",
    },
  },
  {
    words: ["dash ready,", "a Spread running"],
    pod: { charge: 1, static: 0.36, recharge: 1, ready: true, weapon: 0.62 },
  },
  {
    words: ["shielded"],
    pod: { charge: 0, static: 0.12, recharge: 0.45, shield: true },
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
 * Returns the drawing: the pod at 82 pixels a unit with its marks called
 * out, and at 15 and 9 pixels a unit in four states.
 *
 * @param {Palette} palette
 * @returns {string}
 */
export function podHudSvg(palette) {
  const parts = [];
  const big = 82;
  /** @type {Point} */
  const at = [300, 212];
  const turn = -TURN / 4;
  /** @type {PodThing} */
  const pod = {
    at: [0, 0],
    turn,
    pilot: 0,
    charge: 2,
    static: 0.62,
    recharge: 0.6,
    weapon: 0.45,
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
      "No digits are drawn near it. Static at ×3, the dash at 60%, a Spread with 45% of its time left.",
      {
        fill: palette.fieldMuted,
        "font-size": 13,
      },
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
  const label = 532;
  parts.push(
    callout(
      about(-0.72, 0.5),
      [label, 112],
      ["The pilot's fur", "lifts with static, a step for each multiplier"],
      palette,
    ),
    callout(
      about(-0.2, 0.66),
      [label, 224],
      [
        "The canopy's ring",
        "fills with static; whole at ×4,",
        "when the next dash is a zap",
      ],
      palette,
    ),
    callout(
      about(0.3, WEAPON_ARC),
      [label, 296],
      ["The outer arc", "counts a weapon's time down"],
      palette,
    ),
    callout(
      about(TURN / 4 - 0.42, DASH_ARC.radius),
      [label, 360],
      [
        "The short arc behind the canopy",
        "fills as the dash charges again,",
        "and pulses once when it is ready",
      ],
      palette,
    ),
    callout(
      [tied[0] - 5, tied[1] + 3],
      [168, 392],
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
        { x, y: 158 },
      ),
      text(x, 187, `×${charge + 1}`, {
        fill: palette.fieldMuted,
        "font-size": 11.5,
        "text-anchor": "middle",
      }),
    );
  });

  // The same pod small, and the phone's enlarged to show what is left of each mark.
  const grid = { x: 800, width: 444 };
  const column = grid.width / STATES.length;
  parts.push(
    polyline(
      [
        [grid.x - 34, 96],
        [grid.x - 34, POD_HUD.height - 40],
      ],
      palette.fieldLine,
      1,
    ),
    text(grid.x - 8, 46, "The same pod, small", {
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
          "font-size": 12,
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
      scale: 3,
      y: 446,
      words:
        "The phone's pod at three times its size: what is left of each mark",
    },
  ].forEach((row) => {
    const reach = 2 * row.unit * row.scale;
    parts.push(
      text(grid.x - 8, row.y - reach - 14, row.words, {
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
