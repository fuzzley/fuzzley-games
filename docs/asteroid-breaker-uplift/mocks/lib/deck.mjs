// The touch deck of a phone's mock: the stick's zone on the left, its knob
// pushed the way the pod heads, and Fire and Dash on the right, Dash inside
// the arc that shows it charging again. The game draws its deck on the
// canvas; this redraws it simply, in the palette's roles.

import {
  TURN,
  circle,
  mix,
  path,
  place,
  polar,
  polygon,
  polyline,
  rect,
  ring,
} from "../../art/lib/core.mjs";
import { arcD } from "./scene.mjs";

/** @import { Palette } from "../../art/lib/palettes.mjs" */

/**
 * @typedef {object} DeckState What the deck shows.
 * @property {number} heading The way the stick is pushed, in radians.
 * @property {number} [push] How far its knob is pushed, 0 to 1.
 * @property {boolean} [firing] Whether Fire is held.
 * @property {number} [recharge] How far the dash has charged again, 0 to 1.
 */

/**
 * Returns the deck from its top left corner: two zones side by side.
 *
 * @param {number} width
 * @param {number} height
 * @param {DeckState} state
 * @param {Palette} palette
 * @returns {string}
 */
export function deckSvg(width, height, state, palette) {
  const light = palette.mode === "light";
  const zone = mix(palette.page, palette.panel, light ? 1 : 0.7);
  const line = mix(palette.panel, palette.barText, light ? 0.14 : 0.12);
  const ink = palette.barText;
  const muted = palette.fieldMuted;
  const gap = 10;
  const half = (width - gap) / 2;
  const parts = [
    rect(0, 0, half, height, zone, { rx: 16, stroke: line, "stroke-width": 1 }),
    rect(half + gap, 0, half, height, zone, {
      rx: 16,
      stroke: line,
      "stroke-width": 1,
    }),
  ];

  // The stick: a turn ring, a thrust ring, and the knob pushed past both.
  const stick = {
    x: half / 2,
    y: height / 2,
    r: Math.min(half, height) * 0.36,
  };
  const push = (state.push ?? 0.8) * stick.r * 0.62;
  const [kx, ky] = polar(state.heading, push, [stick.x, stick.y]);
  parts.push(
    ring(stick.x, stick.y, stick.r, muted, 1.5, { opacity: 0.55 }),
    ring(stick.x, stick.y, stick.r * 0.42, muted, 1, {
      opacity: 0.4,
      "stroke-dasharray": "3 4",
    }),
    polyline(
      [
        [stick.x, stick.y],
        [kx, ky],
      ],
      muted,
      2,
      { opacity: 0.5 },
    ),
    circle(kx, ky, stick.r * 0.4, mix(zone, ink, light ? 0.72 : 0.82), {
      stroke: zone,
      "stroke-width": 2,
    }),
    circle(kx, ky, stick.r * 0.16, zone, { opacity: 0.35 }),
  );

  // Fire and Dash.
  const fire = { x: half + gap + half * 0.66, y: height * 0.6, r: 40 };
  const dash = { x: half + gap + half * 0.24, y: height * 0.36, r: 30 };
  const face = mix(zone, ink, light ? 0.07 : 0.1);
  const rim = mix(zone, ink, 0.3);
  parts.push(
    circle(
      fire.x,
      fire.y,
      fire.r,
      state.firing ? mix(zone, palette.accent, 0.3) : face,
      {
        stroke: state.firing ? palette.accent : rim,
        "stroke-width": state.firing ? 2.5 : 1.5,
      },
    ),
    // A shot: a bolt, with the two short lines of its flash.
    place(
      [
        polygon(
          [
            [0, -15],
            [4.5, -8],
            [4.5, 10],
            [-4.5, 10],
            [-4.5, -8],
          ],
          ink,
          { stroke: ink, "stroke-width": 1.5, "stroke-linejoin": "round" },
        ),
        polyline(
          [
            [-11, 3],
            [-11, 12],
          ],
          ink,
          2.4,
        ),
        polyline(
          [
            [11, 3],
            [11, 12],
          ],
          ink,
          2.4,
        ),
      ].join(""),
      { x: fire.x, y: fire.y },
    ),
  );
  const recharge = state.recharge ?? 1;
  parts.push(
    circle(dash.x, dash.y, dash.r, face, { stroke: rim, "stroke-width": 1.5 }),
    ring(dash.x, dash.y, dash.r + 5, rim, 3, { opacity: 0.5 }),
    place(
      path(
        arcD(
          dash.r + 5,
          -TURN / 4,
          -TURN / 4 + Math.min(0.999, recharge) * TURN,
        ),
        {
          fill: "none",
          stroke: palette.accent,
          "stroke-width": 3,
          "stroke-linecap": "round",
        },
      ),
      { x: dash.x, y: dash.y },
    ),
    // A dash: two chevrons.
    place(
      [-5, 4]
        .map((x) =>
          polyline(
            [
              [x - 3.5, -8],
              [x + 4.5, 0],
              [x - 3.5, 8],
            ],
            ink,
            2.6,
          ),
        )
        .join(""),
      { x: dash.x, y: dash.y },
    ),
  );
  return parts.join("");
}
