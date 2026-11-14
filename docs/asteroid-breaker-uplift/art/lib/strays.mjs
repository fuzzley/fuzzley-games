// The strays: fuzzballs adrift in soap bubbles, waiting to be brought home,
// and the tow line a rescued one rides behind the pod on. A bubble is round
// and thin, as a friend is: a fine rim, a faint wash of its fuzzball's ink,
// and one glint toward the light. `towLine()` lays a line of bubbles out
// behind a pod as plain geometry; the rest draws.

import {
  TURN,
  circle,
  ellipse,
  lerp,
  mix,
  place,
  polar,
  polyline,
} from "./core.mjs";
import { GRID, fuzzballSvg } from "./fuzzball.mjs";
import { LIGHT } from "./rocks.mjs";

/** @import { Point } from "./core.mjs" */
/** @import { Face, FuzzballPose } from "./fuzzball.mjs" */
/** @import { Palette } from "./palettes.mjs" */

/** A stray's bubble's radius, in field units, as `tuning.ts` has it. */
export const STRAY_RADIUS = 1.15;

/** The radius of a bubble in tow, and of the one a pilot bails out in, in field units. */
export const TOW_RADIUS = 0.86;

/** How wide a fuzzball's grid is drawn in a bubble, as a share of the bubble's radius, as the game has it. */
export const STRAY_FILL = 1.55;

/** The angle the field's light comes from on the screen, the upper left, as the rocks are lit. */
export const TOWARD_LIGHT = Math.atan2(LIGHT[1], LIGHT[0]);

/**
 * Returns an opacity as an attribute holds it, to two places, where the
 * kit's `num()` would round it to a tenth.
 *
 * @param {number} value
 * @returns {string}
 */
export function alpha(value) {
  return value.toFixed(2);
}

/**
 * Returns the points of an arc about a middle, from one angle to another.
 *
 * @param {Point} middle
 * @param {number} radius
 * @param {number} from
 * @param {number} to
 * @param {number} [count]
 * @returns {Point[]}
 */
export function arcPoints(middle, radius, from, to, count = 14) {
  return Array.from({ length: count + 1 }, (_, i) =>
    polar(lerp(from, to, i / count), radius, middle),
  );
}

/**
 * Returns the colors a bubble is drawn in: its rim, which keeps 3:1 against
 * the field, its wash, and its glint, white on a dark field and a line of
 * the rim's own color on a light one, where white would not show.
 *
 * @param {Palette} palette
 * @param {string} [ink] Its fuzzball's ink, which its wash takes.
 * @returns {{ rim: string, wash: string, washOpacity: number, glint: string, glintOpacity: number }}
 */
export function bubbleTones(palette, ink) {
  const light = palette.mode === "light";
  const rim = mix(palette.fieldText, palette.field, light ? 0.42 : 0.3);
  return {
    rim,
    wash: ink ?? palette.fieldText,
    washOpacity: light ? 0.1 : 0.14,
    glint: light ? rim : "#ffffff",
    glintOpacity: light ? 0.75 : 0.9,
  };
}

/**
 * Returns a soap bubble about its middle: a wash, a thin rim, and one glint
 * toward the light, which is left out under 10 pixels a unit.
 *
 * @param {{ radius?: number, unit: number, ink?: string, squash?: number }} bubble Its radius in field units; `squash` widens it and flattens it by a share, as it wobbles.
 * @param {Palette} palette
 * @returns {string}
 */
export function bubbleSvg(
  { radius = STRAY_RADIUS, unit, ink, squash = 0 },
  palette,
) {
  const tones = bubbleTones(palette, ink);
  const r = radius * unit;
  const rx = r * (1 + squash);
  const ry = r * (1 - squash);
  const line = Math.max(1.1, 0.065 * unit);
  const parts = [
    ellipse(
      0,
      0,
      rx + line / 2 + Math.max(1, 0.1 * unit),
      ry + line / 2 + Math.max(1, 0.1 * unit),
      palette.field,
    ),
    ellipse(0, 0, rx, ry, palette.field),
    ellipse(0, 0, rx, ry, tones.wash, { opacity: alpha(tones.washOpacity) }),
    ellipse(0, 0, rx, ry, "none", { stroke: tones.rim, "stroke-width": line }),
  ];
  if (unit >= 10) {
    const glint = { opacity: alpha(tones.glintOpacity) };
    parts.push(
      polyline(
        arcPoints([0, 0], r * 0.8, TOWARD_LIGHT - 0.34, TOWARD_LIGHT + 0.2),
        tones.glint,
        Math.max(1.2, 0.085 * unit),
        glint,
      ),
      circle(
        ...polar(TOWARD_LIGHT + 0.5, r * 0.8),
        Math.max(0.7, 0.05 * unit),
        tones.glint,
        glint,
      ),
      // The far side's reflection, fainter.
      polyline(
        arcPoints(
          [0, 0],
          r * 0.84,
          TOWARD_LIGHT + TURN / 2 - 0.2,
          TOWARD_LIGHT + TURN / 2 + 0.2,
        ),
        tones.glint,
        Math.max(1, 0.05 * unit),
        {
          opacity: alpha(tones.glintOpacity * 0.45),
        },
      ),
    );
  }
  return parts.join("");
}

/**
 * @typedef {object} StrayLook How a stray in its bubble is drawn.
 * @property {string} ink Its fuzzball's ink.
 * @property {number} unit The pixels a field unit takes.
 * @property {number} [radius] Its bubble's radius, in field units.
 * @property {number} [bob] Where it is in its bob, -1 (up) to 1 (down); the bubble rides it and the fuzzball lags a little inside.
 * @property {Face} [face] Its face; a stray adrift pleads.
 * @property {Point} [look] The way it looks; a stray adrift looks up unless told.
 * @property {number} [charge]
 * @property {number} [puff]
 * @property {Point} [lean]
 */

/**
 * Returns a stray: a fuzzball in a soap bubble, about the bubble's middle
 * at rest.
 *
 * @param {StrayLook} look
 * @param {Palette} palette
 * @returns {string}
 */
export function straySvg(
  {
    ink,
    unit,
    radius = STRAY_RADIUS,
    bob = 0,
    face = "plead",
    look,
    charge = 0,
    puff = 0,
    lean,
  },
  palette,
) {
  const size = STRAY_FILL * radius * unit;
  /** @type {FuzzballPose} */
  const pose = {
    face,
    charge,
    puff,
    within: (radius * unit * 0.93) / (size / GRID),
  };
  if (look) pose.look = look;
  if (lean) pose.lean = lean;
  return place(
    [
      bubbleSvg({ radius, unit, ink, squash: -bob * 0.025 }, palette),
      place(fuzzballSvg({ ...pose, ink, size }, palette), {
        y: -bob * 0.05 * unit,
      }),
    ].join(""),
    { y: bob * 0.14 * unit },
  );
}

/**
 * @typedef {object} Tow A line of bubbles behind a pod, in field units from the pod's middle.
 * @property {Point[]} at Each bubble's middle, the nearest the pod first.
 * @property {Point[][]} threads The thread to each bubble, from the pod's hook or the bubble ahead, as points.
 * @property {Point[][]} ends The loose ends of a thread that snapped.
 */

/**
 * Returns the points of a slack thread between two points, bowed to a side.
 *
 * @param {Point} from
 * @param {Point} to
 * @param {number} sag How far it bows, as a share of its length; its sign picks the side.
 * @param {number} [count]
 * @returns {Point[]}
 */
function slackThread(from, to, sag, count = 12) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    const bow = Math.sin(t * Math.PI) * sag;
    return /** @type {Point} */ ([
      from[0] + dx * t - dy * bow,
      from[1] + dy * t + dx * bow,
    ]);
  });
}

/**
 * Returns a curl: the loose end of a snapped thread, winding in from a point.
 *
 * @param {Point} from
 * @param {number} angle The way it leaves the point.
 * @param {number} length
 * @param {1 | -1} wind
 * @returns {Point[]}
 */
function curl(from, angle, length, wind) {
  /** @type {Point[]} */
  const points = [from];
  let at = from;
  let heading = angle;
  for (let i = 0; i < 12; i++) {
    heading += wind * (0.04 + i * 0.022);
    at = polar(heading, length / 12, at);
    points.push(at);
  }
  return points;
}

/**
 * Returns a tow line: bubbles strung out behind a pod on a slack thread,
 * each lagging the one ahead and swaying a little farther off the pod's
 * wake, so the line reads as elastic.
 *
 * @param {object} [how]
 * @param {number} [how.heading] The way the pod flies, in radians; the line trails the other way.
 * @param {number} [how.count] How many bubbles ride it.
 * @param {number} [how.radius] Each bubble's radius.
 * @param {Point} [how.hook] Where the thread ties to the pod, in the pod's own units, its nose along x.
 * @param {number} [how.lead] The thread from the pod's hook to the first bubble's rim.
 * @param {number} [how.gap] The thread between two bubbles' rims.
 * @param {number} [how.sway] How far the last bubble swings off the wake.
 * @param {number} [how.phase] Where the line is in its wobble, in radians.
 * @param {number} [how.loose] How many of the last bubbles have been knocked loose, their thread snapped.
 * @returns {Tow}
 */
export function towLine({
  heading = 0,
  count = 3,
  radius = TOW_RADIUS,
  hook = [-1, 0],
  lead = 1.5,
  gap = 0.95,
  sway = 0.8,
  phase = 0,
  loose = 0,
} = {}) {
  const along = polar(heading + TURN / 2, 1);
  const across = polar(heading + TURN / 4, 1);
  /** @type {Point} */
  const tie = [
    hook[0] * Math.cos(heading) - hook[1] * Math.sin(heading),
    hook[0] * Math.sin(heading) + hook[1] * Math.cos(heading),
  ];
  /** @type {Tow} */
  const tow = { at: [], threads: [], ends: [] };
  let from = tie;
  for (let i = 0; i < count; i++) {
    const far = lead + radius + i * (gap + 2 * radius);
    const swing = Math.sin(phase + i * 1.25) * sway * ((i + 1) / count);
    const knocked = i >= count - loose;
    // A bubble knocked loose is flung off the line.
    const flung = knocked ? 1.3 * radius : 0;
    /** @type {Point} */
    const middle = [
      tie[0] +
        along[0] * (far + flung * 0.4) +
        across[0] * (swing + flung * (swing >= 0 ? 1 : -1)),
      tie[1] +
        along[1] * (far + flung * 0.4) +
        across[1] * (swing + flung * (swing >= 0 ? 1 : -1)),
    ];
    const toward = Math.atan2(from[1] - middle[1], from[0] - middle[0]);
    const knot = polar(toward, radius, middle);
    if (knocked) {
      const leaving = Math.atan2(knot[1] - from[1], knot[0] - from[0]);
      tow.ends.push(
        curl(from, leaving + 0.3, gap * 1.5, 1),
        curl(knot, toward - 0.4, gap * 1.2, -1),
      );
    } else {
      tow.threads.push(slackThread(from, knot, i % 2 === 0 ? 0.22 : -0.26));
    }
    tow.at.push(middle);
    from = polar(toward + TURN / 2, radius, middle);
  }
  return tow;
}

/**
 * Returns a tow line drawn about its pod's middle: its threads, then each
 * fuzzball in its bubble, happy to be found and looking toward the pod,
 * or wide-eyed if knocked loose. The pod itself is drawn apart, over it.
 *
 * @param {object} how
 * @param {Tow} how.tow
 * @param {string[]} how.inks Each fuzzball's ink, the nearest the pod first.
 * @param {number} how.unit
 * @param {number} [how.radius]
 * @param {number} [how.loose] How many of the last have been knocked loose.
 * @param {Palette} palette
 * @returns {string}
 */
export function towSvg(
  { tow, inks, unit, radius = TOW_RADIUS, loose = 0 },
  palette,
) {
  const tones = bubbleTones(palette);
  const line = Math.max(1, 0.05 * unit);
  const px = (/** @type {Point[]} */ points) =>
    points.map(([x, y]) => /** @type {Point} */ ([x * unit, y * unit]));
  const parts = [...tow.threads, ...tow.ends].map((thread) =>
    polyline(px(thread), tones.rim, line),
  );
  tow.at.forEach((middle, i) => {
    const knocked = i >= tow.at.length - loose;
    const far = Math.hypot(middle[0], middle[1]) || 1;
    /** @type {Point} */
    const home = [-middle[0] / far, -middle[1] / far];
    parts.push(
      place(
        straySvg(
          {
            ink: inks[i % inks.length] ?? palette.accent,
            unit,
            radius,
            face: knocked ? "eep" : "happy",
            look: home,
            puff: knocked ? 1 : 0,
            bob: knocked ? 0 : Math.sin(i * 2.1) * 0.6,
          },
          palette,
        ),
        { x: middle[0] * unit, y: middle[1] * unit },
      ),
    );
    if (knocked && unit >= 10) {
      // The knock, as a few short marks on the side it came from.
      const side = Math.atan2(home[1], home[0]) + 0.5;
      for (const off of [-0.32, 0, 0.32]) {
        parts.push(
          polyline(
            [
              polar(side + off, (radius + 0.18) * unit, [
                middle[0] * unit,
                middle[1] * unit,
              ]),
              polar(side + off, (radius + 0.42) * unit, [
                middle[0] * unit,
                middle[1] * unit,
              ]),
            ],
            tones.rim,
            Math.max(1.2, 0.07 * unit),
          ),
        );
      }
    }
  });
  return parts.join("");
}
