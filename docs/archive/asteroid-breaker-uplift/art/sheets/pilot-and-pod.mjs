// The sheet of the pilot and its pod: the fuzzball's faces and fur, the
// three candidate pods at every turn and in every state, the strays and the
// tow line, the bar's crew, and today's ship beside the new one. Run it as
// `node docs/archive/asteroid-breaker-uplift/art/sheets/pilot-and-pod.mjs`; it
// writes `../pilot-and-pod.svg` and `../preview/pilot-and-pod.png`.

import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TURN,
  circle,
  place,
  polar,
  polygon,
  polyline,
  rect,
  turned,
} from "../lib/core.mjs";
import { crewRowSvg, crewRowWidth, faceCamSvg } from "../lib/crew.mjs";
import { FACES, FACE_USES, fuzzballSvg } from "../lib/fuzzball.mjs";
import { PALETTES, PILOT_INKS } from "../lib/palettes.mjs";
import { writeRaster, writeText } from "../lib/raster.mjs";
import { SHEET, caption, panel, sheetFile } from "../lib/sheet.mjs";
import {
  PODS,
  POD_VARIANTS,
  bailOutSvg,
  pilotSize,
  podDefs,
  podSvg,
} from "../lib/ship.mjs";
import {
  STRAY_RADIUS,
  TOW_RADIUS,
  straySvg,
  towLine,
  towSvg,
} from "../lib/strays.mjs";

/** @import { Point } from "../lib/core.mjs" */
/** @import { Face, FuzzballPose } from "../lib/fuzzball.mjs" */
/** @import { Palette } from "../lib/palettes.mjs" */
/** @import { Section } from "../lib/sheet.mjs" */
/** @import { PodLook, PodVariant } from "../lib/ship.mjs" */

/** The folder the sheet and its preview are written in. */
const ART = join(import.meta.dirname, "..");

/** The pixels a field unit takes on a laptop, and on a small phone. */
const LAPTOP = 22;
const PHONE = 6;

/** The gap between two panels side by side. */
const GAP = 16;

/** The pod the states, the tow line and the bar are shown with first: the one recommended. */
const PICK = /** @type {PodVariant} */ ("bumble");

const { casino, midnight, classic, pastel } = PALETTES;

/**
 * Returns one of a palette's eight pilot inks.
 *
 * @param {Palette} palette
 * @param {number} pilot
 * @returns {string}
 */
function ink(palette, pilot) {
  return PILOT_INKS[palette.mode][pilot % 8] ?? palette.accent;
}

/**
 * Returns a caption on a panel, in the palette's own text colors.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} words
 * @param {Palette} palette
 * @param {{ strong?: boolean, anchor?: "start" | "middle" | "end", size?: number }} [how]
 * @returns {string}
 */
function label(
  x,
  y,
  words,
  palette,
  { strong = false, anchor = "middle", size = 11 } = {},
) {
  return caption(x, y, words, {
    fill: strong ? palette.fieldText : palette.fieldMuted,
    anchor,
    size,
    ...(strong ? { weight: 600 } : {}),
  });
}

/**
 * Returns an arrow about a point, for the way a push acts.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 * @param {number} length
 * @param {string} color
 * @returns {string}
 */
function arrow(x, y, angle, length, color) {
  const tip = polar(angle, length / 2, [x, y]);
  const tail = polar(angle + TURN / 2, length / 2, [x, y]);
  return (
    polyline([tail, tip], color, 1.6) +
    polyline(
      [
        polar(angle + TURN * 0.4, 6, tip),
        tip,
        polar(angle - TURN * 0.4, 6, tip),
      ],
      color,
      1.6,
    )
  );
}

/**
 * Returns the two halves a section's width splits into, side by side.
 *
 * @param {number} x
 * @param {number} width
 * @returns {{ x: number, width: number }[]}
 */
function halves(x, width) {
  const half = (width - GAP) / 2;
  return [
    { x, width: half },
    { x: x + half + GAP, width: half },
  ];
}

// --- 1. The faces ---------------------------------------------------------

const FACES_HEIGHT = 212;
const LOOKS_HEIGHT = 128;

/**
 * Returns every face on a panel: large, named, and under each the same face
 * at 12 pixels and at 8.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {Palette} palette
 * @param {number} shift Which ink the first face wears.
 * @returns {string}
 */
function facesPanel(x, y, width, palette, shift) {
  const cell = width / FACES.length;
  const parts = [panel(x, y, width, FACES_HEIGHT, palette)];
  FACES.forEach((face, i) => {
    const cx = x + cell * (i + 0.5);
    const color = ink(palette, i + shift);
    parts.push(
      place(
        fuzzballSvg({ ink: color, size: 96, face, shadow: true }, palette),
        { x: cx, y: y + 84 },
      ),
    );
    parts.push(label(cx, y + 150, face, palette, { strong: true, size: 13 }));
    parts.push(label(cx, y + 166, FACE_USES[face], palette));
    parts.push(
      place(fuzzballSvg({ ink: color, size: 12, face }, palette), {
        x: cx - 12,
        y: y + 190,
      }),
    );
    parts.push(
      place(fuzzballSvg({ ink: color, size: 8, face }, palette), {
        x: cx + 10,
        y: y + 190,
      }),
    );
  });
  parts.push(label(x + 12, y + 194, "12, 8 px", palette, { anchor: "start" }));
  return parts.join("");
}

/**
 * Returns the faces' section: every face on a dark panel and a light one,
 * then the eyes looking each way, and the small form drawn large.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @returns {string}
 */
function drawFaces(x, y, width) {
  const parts = [
    facesPanel(x, y, width, midnight, 0),
    facesPanel(x, y + FACES_HEIGHT + GAP, width, classic, 3),
  ];
  const top = y + 2 * (FACES_HEIGHT + GAP);
  const [left, right] =
    /** @type {[{ x: number, width: number }, { x: number, width: number }]} */ (
      halves(x, width)
    );

  // Looking: both eyes shift toward a direction, about the middle of the face.
  parts.push(panel(left.x, top, left.width, LOOKS_HEIGHT, casino));
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TURN - TURN / 4;
    const cx = left.x + 62 + i * 90;
    parts.push(
      place(
        fuzzballSvg(
          { ink: ink(casino, 2), size: 64, look: polar(angle, 1) },
          casino,
        ),
        { x: cx, y: top + 66 },
      ),
    );
    parts.push(arrow(cx, top + 112, angle, 16, casino.fieldMuted));
  }

  // The small form, large: what a fuzzball of 12 pixels and of 8 is made of.
  parts.push(panel(right.x, top, right.width, LOOKS_HEIGHT, pastel));
  /** @type {[Face, number, number][]} */
  const forms = [
    ["rest", 0, 12],
    ["rest", 1, 8],
    ["set", 0, 12],
    ["happy", 0, 12],
    ["squeeze", 0, 12],
    ["eep", 1, 8],
  ];
  forms.forEach(([face, tiny, size], i) => {
    const cx = right.x + 74 + i * 118;
    const color = ink(pastel, i + 4);
    parts.push(
      place(
        fuzzballSvg({ ink: color, size: 72, face, small: true, tiny }, pastel),
        { x: cx - 10, y: top + 62 },
      ),
    );
    parts.push(
      place(fuzzballSvg({ ink: color, size, face }, pastel), {
        x: cx + 40,
        y: top + 62,
      }),
    );
    parts.push(label(cx, top + 116, `${face}, as at ${size} px`, pastel));
  });
  return parts.join("");
}

// --- 2. Fur by static tier ------------------------------------------------

const TIERS_HEIGHT = 232;
const TIERS = [
  "x1: flat, the mark",
  "x2: lifted",
  "x3: standing",
  "x4: on end, sparking",
];

/**
 * Returns the four tiers of static charge on a panel, large, and under
 * each as it is in a pod on a laptop, and at 12 pixels and 8.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {Palette} palette
 * @param {number} pilot
 * @returns {string}
 */
function tiersPanel(x, y, width, palette, pilot) {
  const cell = width / TIERS.length;
  const color = ink(palette, pilot);
  const parts = [panel(x, y, width, TIERS_HEIGHT, palette)];
  TIERS.forEach((words, charge) => {
    const cx = x + cell * (charge + 0.5);
    parts.push(
      place(fuzzballSvg({ ink: color, size: 104, charge, seed: 4 }, palette), {
        x: cx,
        y: y + 92,
      }),
    );
    parts.push(label(cx, y + 172, words, palette, { strong: true, size: 12 }));
    parts.push(
      place(fuzzballSvg({ ink: color, size: 26, charge, seed: 4 }, palette), {
        x: cx - 30,
        y: y + 204,
      }),
    );
    parts.push(
      place(fuzzballSvg({ ink: color, size: 12, charge }, palette), {
        x: cx + 8,
        y: y + 204,
      }),
    );
    parts.push(
      place(fuzzballSvg({ ink: color, size: 8, charge }, palette), {
        x: cx + 32,
        y: y + 204,
      }),
    );
  });
  return parts.join("");
}

// --- 3. Fur under force ---------------------------------------------------

const FORCE_HEIGHT = 200;

/** @type {{ words: string, pose: FuzzballPose, push?: number }[]} */
const FORCES = [
  {
    words: "thrust to the right",
    pose: { lean: [1, 0], face: "set", look: [1, 0] },
    push: 0,
  },
  {
    words: "thrust up and left",
    pose: { lean: [-0.72, -0.72], face: "set", look: [-0.72, -0.72] },
    push: TURN * 0.625,
  },
  {
    words: "a dash to the right",
    pose: { lean: [2, 0], face: "squeeze" },
    push: 0,
  },
  { words: "puffed, in a fright", pose: { puff: 1, face: "eep" } },
  {
    words: "x3 and thrusting",
    pose: { charge: 2, lean: [1, 0], face: "set", look: [1, 0] },
    push: 0,
  },
];

/**
 * Returns the fur under each force on a panel, large, with the way the
 * push acts, and under each the same at 12 pixels.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {Palette} palette
 * @param {number} shift
 * @returns {string}
 */
function forcePanel(x, y, width, palette, shift) {
  const cell = width / FORCES.length;
  const parts = [panel(x, y, width, FORCE_HEIGHT, palette)];
  FORCES.forEach(({ words, pose, push }, i) => {
    const cx = x + cell * (i + 0.5);
    const color = ink(palette, i + shift);
    parts.push(
      place(fuzzballSvg({ ...pose, ink: color, size: 92 }, palette), {
        x: cx,
        y: y + 86,
      }),
    );
    if (push !== undefined)
      parts.push(arrow(cx, y + 150, push, 26, palette.fieldMuted));
    parts.push(label(cx, y + 172, words, palette, { strong: true }));
    parts.push(
      place(fuzzballSvg({ ...pose, ink: color, size: 12 }, palette), {
        x: cx,
        y: y + 187,
      }),
    );
  });
  return parts.join("");
}

// --- 4. The three pods ----------------------------------------------------

const TURNS_HEIGHT = 138;
const POD_BLOCK = 30 + 2 * (TURNS_HEIGHT + 8) + 14;

/**
 * Returns a pod at eight turns on a panel, on a laptop's scale and under
 * each on a phone's.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {Palette} palette
 * @param {PodVariant} variant
 * @param {number} pilot
 * @returns {string}
 */
function turnsPanel(x, y, width, palette, variant, pilot) {
  const cell = (width - 24) / 8;
  const parts = [panel(x, y, width, TURNS_HEIGHT, palette)];
  for (let i = 0; i < 8; i++) {
    const turn = (i / 8) * TURN - TURN / 4;
    const cx = x + 12 + cell * (i + 0.5);
    parts.push(
      place(podSvg({ variant, turn, unit: LAPTOP, pilot }, palette), {
        x: cx,
        y: y + 68,
      }),
    );
    parts.push(
      place(podSvg({ variant, turn, unit: PHONE, pilot }, palette), {
        x: cx,
        y: y + 120,
      }),
    );
  }
  return parts.join("");
}

/**
 * Returns the pods' section: each candidate named, then at eight turns in
 * each of the four palettes.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @returns {string}
 */
function drawPods(x, y, width) {
  /** @type {string[]} */
  const parts = [];
  const [left, right] =
    /** @type {[{ x: number, width: number }, { x: number, width: number }]} */ (
      halves(x, width)
    );
  POD_VARIANTS.forEach((variant, row) => {
    const pod = PODS[variant];
    const top = y + row * POD_BLOCK;
    const shown = ((pilotSize(pod) * 0.88) / pod.size.length) * 100;
    parts.push(
      caption(x, top + 18, pod.name, {
        fill: SHEET.ink,
        size: 15,
        weight: 700,
      }),
    );
    parts.push(
      caption(
        x + 92,
        top + 18,
        `${pod.says} ${pod.size.length.toFixed(1)} by ${pod.size.width.toFixed(1)} units; its canopy is ${(pod.canopy * 2).toFixed(2)} across, and its pilot ${shown.toFixed(0)}% of its length.`,
        { size: 13 },
      ),
    );
    [casino, midnight, classic, pastel].forEach((palette, i) => {
      const half = i % 2 === 0 ? left : right;
      parts.push(
        turnsPanel(
          half.x,
          top + 30 + Math.floor(i / 2) * (TURNS_HEIGHT + 8),
          half.width,
          palette,
          variant,
          row * 3 + i * 2,
        ),
      );
    });
  });
  return parts.join("");
}

// --- 5. The pod's states --------------------------------------------------

/** @type {{ words: string, look: PodLook, off?: Point }[]} */
const STATES = [
  {
    words: "thrust, frame 1",
    look: { thrust: 1, flicker: 0, turn: -TURN / 8 },
    off: [16, -14],
  },
  {
    words: "frame 2",
    look: { thrust: 1, flicker: 1, turn: -TURN / 8 },
    off: [16, -14],
  },
  {
    words: "frame 3, its trail",
    look: { thrust: 1, flicker: 2, trail: true, turn: -TURN / 8 },
    off: [22, -20],
  },
  {
    words: "a dash",
    look: { dash: true, turn: -TURN / 8, recharge: 0 },
    off: [22, -20],
  },
  { words: "guard", look: { guard: 1, turn: -TURN / 4 } },
  { words: "guard, blinked", look: { guard: 0.3, turn: -TURN / 4 } },
  { words: "the Shield", look: { shield: true, turn: -TURN / 4 } },
  { words: "dash at 30%", look: { recharge: 0.3, turn: 0 } },
  { words: "dash at 70%", look: { recharge: 0.7, turn: 0 } },
  { words: "x2", look: { charge: 1, turn: 0 } },
  { words: "x3", look: { charge: 2, turn: 0 } },
  { words: "x4, arcs on the hull", look: { charge: 3, turn: 0 } },
];

const STATE_ROW = 116;
const STATES_HEIGHT = 40 + 3 * STATE_ROW + 6;

/**
 * Returns every state of each pod on a panel, on a laptop's scale, with
 * the same on a phone's in each cell's corner.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {Palette} palette
 * @returns {string}
 */
function statesPanel(x, y, width, palette) {
  const gutter = 84;
  const cell = (width - gutter - 8) / STATES.length;
  const parts = [panel(x, y, width, STATES_HEIGHT, palette)];
  STATES.forEach(({ words }, i) => {
    parts.push(label(x + gutter + cell * (i + 0.5), y + 38, words, palette));
  });
  POD_VARIANTS.forEach((variant, row) => {
    const cy = y + 40 + STATE_ROW * (row + 0.5) + 4;
    parts.push(
      label(x + 14, cy + 4, PODS[variant].name, palette, {
        strong: true,
        anchor: "start",
        size: 12,
      }),
    );
    STATES.forEach(({ look, off = [0, 0] }, i) => {
      const cx = x + gutter + cell * (i + 0.5);
      const pilot = row * 3 + i;
      parts.push(
        place(
          podSvg(
            { ...look, variant, pilot, unit: LAPTOP, seed: i + 2 },
            palette,
          ),
          { x: cx + off[0], y: cy + off[1] },
        ),
      );
      parts.push(
        place(
          podSvg(
            { ...look, variant, pilot, unit: PHONE, seed: i + 2 },
            palette,
          ),
          { x: cx + 42, y: cy + 40 },
        ),
      );
    });
  });
  return parts.join("");
}

// --- 6. Strays and the tow line -------------------------------------------

const STRAYS_HEIGHT = 346;

/**
 * Returns a pod towing three strays, about the pod's middle.
 *
 * @param {Palette} palette
 * @param {number} unit
 * @param {number} loose How many of the last have been knocked loose.
 * @returns {string}
 */
function towed(palette, unit, loose) {
  const pod = PODS[PICK];
  const heading = -0.1;
  const tow = towLine({ heading, hook: pod.hook, phase: 0.7, loose });
  return [
    towSvg(
      {
        tow,
        inks: [ink(palette, 3), ink(palette, 6), ink(palette, 1)],
        unit,
        loose,
      },
      palette,
    ),
    podSvg(
      {
        variant: PICK,
        turn: heading,
        unit,
        pilot: 5,
        thrust: 0.6,
        face: loose ? "eep" : "set",
      },
      palette,
    ),
  ].join("");
}

/**
 * Returns the strays, the tow line, a bubble knocked loose and the
 * bail-out on a panel.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {Palette} palette
 * @returns {string}
 */
function straysPanel(x, y, width, palette) {
  const parts = [panel(x, y, width, STRAYS_HEIGHT, palette)];
  // A stray adrift: at rest, and at the top and the bottom of its bob.
  /** @type {[string, number][]} */
  const bobs = [
    ["at rest", 0],
    ["bob, up", -1],
    ["bob, down", 1],
  ];
  bobs.forEach(([words, bob], i) => {
    const cx = x + 60 + i * 84;
    parts.push(
      place(
        straySvg({ ink: ink(palette, i * 3 + 1), unit: LAPTOP, bob }, palette),
        { x: cx, y: y + 74 },
      ),
    );
    parts.push(label(cx, y + 126, words, palette));
    parts.push(
      place(
        straySvg({ ink: ink(palette, i * 3 + 1), unit: PHONE, bob }, palette),
        { x: x + 300 + i * 24, y: y + 74 },
      ),
    );
  });
  parts.push(label(x + 324, y + 126, "on a phone", palette));

  // The bail-out: the hull breaks up and the pilot pops clear in a bubble.
  parts.push(
    place(
      bailOutSvg(
        {
          variant: PICK,
          turn: -0.5,
          unit: LAPTOP,
          pilot: 0,
          spread: 0.3,
          away: [0.3, -1.3],
        },
        palette,
      ),
      { x: x + 468, y: y + 86 },
    ),
  );
  parts.push(
    place(
      bailOutSvg(
        {
          variant: PICK,
          turn: -0.5,
          unit: LAPTOP,
          pilot: 0,
          spread: 1,
          away: [0.9, -1.5],
        },
        palette,
      ),
      { x: x + 610, y: y + 92 },
    ),
  );
  parts.push(
    place(
      bailOutSvg(
        {
          variant: PICK,
          turn: -0.5,
          unit: PHONE,
          pilot: 0,
          spread: 1,
          away: [0.9, -1.5],
        },
        palette,
      ),
      { x: x + 706, y: y + 86 },
    ),
  );
  parts.push(
    label(
      x + 560,
      y + 146,
      "the bail-out: the hull breaks up, the pilot pops clear",
      palette,
    ),
  );

  // In tow, and one knocked loose.
  parts.push(place(towed(palette, LAPTOP, 0), { x: x + 330, y: y + 204 }));
  parts.push(
    label(x + 232, y + 290, "in tow: three strays on a slack thread", palette),
  );
  parts.push(place(towed(palette, LAPTOP, 1), { x: x + 706, y: y + 204 }));
  parts.push(
    label(x + 606, y + 290, "one knocked loose, its thread snapped", palette),
  );
  parts.push(place(towed(palette, PHONE, 0), { x: x + 262, y: y + 318 }));
  parts.push(place(towed(palette, PHONE, 1), { x: x + 636, y: y + 318 }));
  parts.push(
    label(x + 16, y + 326, "on a phone", palette, { anchor: "start" }),
  );
  return parts.join("");
}

// --- 7. The bar's crew ----------------------------------------------------

const BAR_HEIGHT = 124;

/** @type {{ words: string, face: Face, charge?: number, lean?: Point, look?: Point, puff?: number }[]} */
const CAMS = [
  { words: "at rest", face: "rest" },
  { words: "thrusting", face: "set", lean: [1, 0], look: [1, 0] },
  { words: "x2", face: "set", charge: 1 },
  { words: "x3", face: "set", charge: 2 },
  { words: "x4", face: "happy", charge: 3 },
  { words: "a near miss", face: "eep", puff: 1 },
  { words: "a dash", face: "squeeze", lean: [2, 0] },
  { words: "a stray home", face: "happy" },
  { words: "waiting", face: "sleepy" },
];

/**
 * Returns a piece of the bar on a panel: the face cam beside the ships
 * left, then the face cam in each of its states.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {Palette} palette
 * @param {number} pilot
 * @returns {string}
 */
function barPanel(x, y, width, palette, pilot) {
  const parts = [panel(x, y, width, BAR_HEIGHT, palette)];
  const top = y + 30;
  const middle = top + 36;
  parts.push(
    rect(x + 10, top, width - 20, 72, palette.bar, {
      rx: 8,
      stroke: palette.barLine,
      "stroke-width": 1,
    }),
  );
  // The figure as the bar has it now, with the face cam beside it.
  parts.push(
    place(
      faceCamSvg(
        { pilot, face: "set", charge: 1, lean: [0.6, 0], look: [1, 0] },
        palette,
      ),
      { x: x + 46, y: middle },
    ),
  );
  const crew = [pilot, pilot + 2, pilot + 5, pilot + 7];
  const figure = crewRowWidth(crew.length) + 24;
  parts.push(
    rect(x + 78, top + 10, figure, 52, palette.panel, {
      rx: 8,
      stroke: palette.barLine,
      "stroke-width": 1,
    }),
  );
  parts.push(
    caption(x + 78 + figure / 2, top + 25, "SHIPS", {
      fill: palette.fieldMuted,
      anchor: "middle",
      size: 9,
      weight: 700,
    }),
  );
  parts.push(
    place(crewRowSvg({ pilots: crew, face: "set", charge: 1 }, palette), {
      x: x + 90,
      y: top + 44,
    }),
  );
  // Each state the face cam takes.
  const from = x + 78 + figure + 40;
  const step = (x + width - 44 - from) / (CAMS.length - 1);
  CAMS.forEach(({ words, ...cam }, i) => {
    const cx = from + i * step;
    parts.push(
      place(faceCamSvg({ ...cam, pilot, seed: 5 }, palette), {
        x: cx,
        y: middle - 6,
      }),
    );
    parts.push(
      caption(cx, middle + 29, words, {
        fill: palette.fieldMuted,
        anchor: "middle",
        size: 10,
      }),
    );
  });
  return parts.join("");
}

// --- 8. Now and after -----------------------------------------------------

const NOW_HEIGHT = 312;

/** How many field units one of today's ship's own is, so it spans 2.4, as `ship_art.ts` has it. */
const SHIP_UNIT = 2.4 / (1.25 + 1.12);

/**
 * Returns the points of a cubic curve, after its first.
 *
 * @param {Point} a
 * @param {Point} b
 * @param {Point} c
 * @param {Point} d
 * @returns {Point[]}
 */
function cubic(a, b, c, d) {
  return Array.from({ length: 12 }, (_, i) => {
    const t = (i + 1) / 12;
    const u = 1 - t;
    return /** @type {Point} */ ([
      u ** 3 * a[0] +
        3 * u * u * t * b[0] +
        3 * u * t * t * c[0] +
        t ** 3 * d[0],
      u ** 3 * a[1] +
        3 * u * u * t * b[1] +
        3 * u * t * t * c[1] +
        t ** 3 * d[1],
    ]);
  });
}

/**
 * Returns the points of a quadratic curve, after its first.
 *
 * @param {Point} a
 * @param {Point} b
 * @param {Point} c
 * @returns {Point[]}
 */
function quadratic(a, b, c) {
  return Array.from({ length: 8 }, (_, i) => {
    const t = (i + 1) / 8;
    const u = 1 - t;
    return /** @type {Point} */ ([
      u * u * a[0] + 2 * u * t * b[0] + t * t * c[0],
      u * u * a[1] + 2 * u * t * b[1] + t * t * c[1],
    ]);
  });
}

/**
 * Returns today's ship as the game draws it, redrawn from `ship_art.ts`: a
 * flat rocket in the accent, two fins, a window in the field's color with
 * the pilot in it, and a flame of one color.
 *
 * @param {{ turn?: number, unit: number, pilot: number, thrust?: number }} look
 * @param {Palette} palette
 * @returns {string}
 */
function todaysShipSvg({ turn = 0, unit, pilot, thrust = 0 }, palette) {
  const at = (/** @type {Point} */ p) => {
    const [px, py] = turned([p[0] * SHIP_UNIT, p[1] * SHIP_UNIT], turn);
    return /** @type {Point} */ ([px * unit, py * unit]);
  };
  /** @type {Point} */
  const nose = [1.25, 0];
  /** @type {Point} */
  const right = [-0.55, 0.66];
  /** @type {Point} */
  const left = [-0.55, -0.66];
  const hull = [
    nose,
    ...cubic(nose, [1.05, 0.55], [0.15, 0.78], right),
    ...cubic(right, [-1.08, 0.58], [-1.08, -0.58], left),
    ...cubic(left, [0.15, -0.78], [1.05, -0.55], nose),
  ];
  const fin = (/** @type {number} */ side) => {
    /** @type {Point} */
    const root = [-0.25, 0.55 * side];
    /** @type {Point} */
    const tip = [-1.12, side];
    return [
      root,
      ...quadratic(root, [-0.7, 1.05 * side], tip),
      ...quadratic(tip, [-1.05, 0.6 * side], [-0.8, 0.3 * side]),
    ];
  };
  const parts = [];
  if (thrust > 0) {
    const base = -0.85;
    const length = 0.55 + 1.05 * thrust;
    const bend = base - 0.1 - 0.55 * (length - 0.1);
    /** @type {Point} */
    const top = [base, -0.3];
    /** @type {Point} */
    const tip = [base - length, 0];
    parts.push(
      polygon(
        [
          top,
          ...quadratic(top, [bend, -0.2], tip),
          ...quadratic(tip, [bend, 0.2], [base, 0.3]),
        ].map(at),
        palette.warning,
      ),
    );
  }
  const edge = Math.max(2, 0.2 * unit);
  const shapes = [fin(-1), fin(1), hull].map((points) => points.map(at));
  for (const points of shapes)
    parts.push(
      polygon(points, palette.field, {
        stroke: palette.field,
        "stroke-width": edge,
        "stroke-linejoin": "round",
      }),
    );
  for (const points of shapes) parts.push(polygon(points, palette.accent));
  const [wx, wy] = at([0.38, 0]);
  parts.push(circle(wx, wy, 0.4 * SHIP_UNIT * unit, palette.field));
  parts.push(
    place(
      fuzzballSvg(
        {
          ink: ink(palette, pilot),
          size: 0.8 * SHIP_UNIT * unit,
          look: polar(turn, 1),
        },
        palette,
      ),
      { x: wx, y: wy },
    ),
  );
  return parts.join("");
}

/**
 * Returns today's ship beside the three pods on a panel, at one scale:
 * large, then on a laptop and on a phone.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {Palette} palette
 * @returns {string}
 */
function nowPanel(x, y, width, palette) {
  const parts = [panel(x, y, width, NOW_HEIGHT, palette)];
  const cell = (width - 20) / 4;
  const large = 50;
  const turn = -TURN / 4;
  const pilot = 0;
  /** @type {[string, (unit: number, thrust: number, turn: number) => string][]} */
  const ships = [
    [
      "today",
      (unit, thrust, at) =>
        todaysShipSvg({ turn: at, unit, pilot, thrust }, palette),
    ],
    ...POD_VARIANTS.map(
      (variant) =>
        /** @type {[string, (unit: number, thrust: number, turn: number) => string]} */ ([
          PODS[variant].name,
          (unit, thrust, at) =>
            podSvg(
              { variant, turn: at, unit, pilot, thrust, face: "rest" },
              palette,
            ),
        ]),
    ),
  ];
  ships.forEach(([words, draw], i) => {
    const cx = x + 10 + cell * (i + 0.5);
    parts.push(place(draw(large, 0.6, turn), { x: cx, y: y + 100 }));
    parts.push(label(cx, y + 236, words, palette, { strong: true, size: 13 }));
    parts.push(place(draw(LAPTOP, 0, turn), { x: cx - 34, y: y + 276 }));
    parts.push(place(draw(LAPTOP, 0, 0.5), { x: cx + 26, y: y + 276 }));
    parts.push(place(draw(PHONE, 0, turn), { x: cx + 70, y: y + 266 }));
    parts.push(place(draw(PHONE, 0, 0.5), { x: cx + 70, y: y + 288 }));
  });
  return parts.join("");
}

// --- The sheet ------------------------------------------------------------

/**
 * Returns a section's drawing as two panels side by side, a dark palette's
 * and a light one's.
 *
 * @param {(x: number, y: number, width: number, palette: Palette, shift: number) => string} draw
 * @param {[Palette, Palette]} palettes
 * @returns {(x: number, y: number, width: number) => string}
 */
function sideBySide(draw, palettes) {
  return (x, y, width) =>
    halves(x, width)
      .map((half, i) =>
        draw(
          half.x,
          y,
          half.width,
          /** @type {Palette} */ (palettes[i]),
          i * 4 + 1,
        ),
      )
      .join("");
}

/** @type {Section[]} */
const SECTIONS = [
  {
    heading: "1. The faces",
    note: "Eyes only: the fuzzball has no mouth. Nine faces, each told by the shape of its eyes, and a look that shifts both eyes toward where the pod points or what threatens it. At 12 pixels and under, the small form: half the strands, each fatter, larger eyes set wider, no glints.",
    height: 2 * (FACES_HEIGHT + GAP) + LOOKS_HEIGHT,
    draw: drawFaces,
  },
  {
    heading: "2. Fur by static charge",
    note: "The chain's multiplier lifts the fur, tier by tier; the body never grows. Under each: as in a pod on a laptop, then at 12 and 8 pixels.",
    height: TIERS_HEIGHT,
    draw: sideBySide(tiersPanel, [casino, pastel]),
  },
  {
    heading: "3. Fur under force",
    note: "Fur bends away from a push: a thrust lays it back, a dash sweeps it flat and streams it out behind, a fright puffs it. The arrow is the push.",
    height: FORCE_HEIGHT,
    draw: sideBySide(forcePanel, [midnight, classic]),
  },
  {
    heading: "4. Three pods to choose from",
    note: "The canopy sits at the middle the pod turns about. The hull turns; the pilot stays upright and looks where the pod points; the canopy's glint and the hull's lit side keep to the upper left. Each at eight turns, at 22 pixels a unit and at 6.",
    height: 3 * POD_BLOCK - 14,
    draw: drawPods,
  },
  {
    heading: "5. The pod's states",
    note: "Each at 22 pixels a unit, with the same at 6 in its corner. The canopy's rim is the dash's gauge: dark after a dash, filling clockwise, whole when ready. A charge fills the canopy with fur, and at x4 arcs crawl over the hull.",
    height: 2 * STATES_HEIGHT + GAP,
    draw: (x, y, width) =>
      statesPanel(x, y, width, casino) +
      statesPanel(x, y + STATES_HEIGHT + GAP, width, classic),
  },
  {
    heading: "6. Strays, the tow line and the bail-out",
    note: "A stray pleads from a soap bubble: a thin rim, a wash of its own ink, one glint. Rescued, it rides behind the pod on a slack thread, happy, until the wave ends or a rock knocks it loose.",
    height: STRAYS_HEIGHT,
    draw: sideBySide(straysPanel, [midnight, pastel]),
  },
  {
    heading: "7. The bar's crew and the face cam",
    note: "The ships left, as heads, the pilot at the controls in its canopy; and a face cam of 44 pixels, where the face and the charge read when the field's own pilot is a dot.",
    height: 2 * BAR_HEIGHT + GAP,
    draw: (x, y, width) =>
      [casino, classic, midnight, pastel]
        .map((palette, i) => {
          const half = /** @type {{ x: number, width: number }} */ (
            halves(x, width)[i % 2]
          );
          return barPanel(
            half.x,
            y + Math.floor(i / 2) * (BAR_HEIGHT + GAP),
            half.width,
            palette,
            i * 2,
          );
        })
        .join(""),
  },
  {
    heading: "8. Now and after",
    note: "Today's ship as the game draws it, a flat rocket with its pilot in a small window, beside the three pods at the same scale: 50 pixels a unit, then 22 and 6.",
    height: NOW_HEIGHT,
    draw: sideBySide(nowPanel, [casino, classic]),
  },
];

/**
 * Writes the sheet as an SVG and its preview as a PNG.
 *
 * @returns {Promise<void>}
 */
export async function build() {
  const svg = sheetFile({
    title: "The pilot and its pod",
    lead: "The fuzzball as an actor, and a ship built around it: a glass canopy at the pod's middle, the pilot upright inside, the hull cut and lit like the rocks. Concept art, drawn by lib/fuzzball.mjs, lib/ship.mjs, lib/strays.mjs and lib/crew.mjs.",
    sections: SECTIONS,
    defs: Object.values(PALETTES).map(podDefs).join(""),
  });
  await writeText(join(ART, "pilot-and-pod.svg"), svg);
  await writeRaster(svg, join(ART, "preview", "pilot-and-pod.png"));
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url))
  await build();
