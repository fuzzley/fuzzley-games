// The sleepyhead, as the design draws it: a pale fuzzball in its gray-blue,
// its short coat drooping, in a nightcap a shade darker that flops over
// to the right, a band along its brim and a pompom at its tip, and its eyes
// shut. A sleepyhead never wakes, so its eyes are drawn into its frame, the
// house fuzzball's eyes as they blink, and take no face the scene sets.
// It sits a little below its square's middle, which leaves its cap room.

import { createRandom } from "@fz/core/random";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  type Point,
  centered,
  circle,
  polygon,
  quadraticPoints,
  shifted,
  stroke,
} from "@fz/phaser/shapes";
import { FUZZBALL } from "@fz/style/fuzzball";
import type { BoardPalette } from "../../colors/palette";
import { BODY, SQUARE, inPixels } from "../design_square";
import { EYES_LOOK, HOUSE_EYES, eyesDrawing } from "../eyes";
import { FRAMES } from "../frame_names";
import { STRAND_WIDTH, strand, strokes } from "../kinds/kind_art";

/** How far below its square's middle a sleepyhead's body sits, in its radii. */
const SEAT_DOWN = 0.2;

/** Says how a sleepyhead's coat grows, short and drooping, in its body's radii. */
interface DroopingCoat {
  readonly count: number;
  /** How far out its strands grow from. */
  readonly root: number;
  /** How far its tips reach before they droop. */
  readonly reach: number;
  /** How much further a tip may reach, drawn for each. */
  readonly vary: number;
  /** How much further its tips reach round its lower half, and round its upper half, where they reach less. */
  readonly droop: { readonly lower: number; readonly upper: number };
  /** How far round each tip is carried, in radians, down either side. */
  readonly bend: number;
  /** How far a strand's angle may stray from even, in radians, half of it either way. */
  readonly stray: number;
  /** The seed its strands are drawn from, so it is drawn the same every time. */
  readonly seed: number;
}

/** The sleepyhead's coat. */
const COAT: DroopingCoat = {
  count: 22,
  root: 0.78,
  reach: 1.14,
  vary: 0.06,
  droop: { lower: 0.08, upper: -0.02 },
  bend: 0.22,
  stray: 0.1,
  seed: 91,
};

/**
 * The nightcap, in its body's radii from its middle: where its brim starts
 * on the left and ends on the right, the tip it flops over to, and the
 * control points its two edges curve by, up to the tip and back down.
 */
const NIGHTCAP = {
  brimLeft: { x: -0.86, y: -0.5 },
  up: { x: -0.1, y: -1.9 },
  tip: { x: 1.16, y: -1.36 },
  down: { x: 0.6, y: -0.9 },
  brimRight: { x: 0.86, y: -0.5 },
} as const;

/** The band along the nightcap's brim, in its body's radii: where it starts and ends, the control point it arcs up by, and how wide it is. */
const BAND = {
  from: { x: -0.9, y: -0.48 },
  control: { x: 0, y: -0.86 },
  to: { x: 0.9, y: -0.48 },
  width: 0.24,
} as const;

/** The pompom at the nightcap's tip, in its body's radii: its middle and its radius. */
const POMPOM = { at: { x: 1.2, y: -1.34 }, radius: 0.22 } as const;

/** How far a sleepyhead's shut eyes look down, as a share of a whole look, as the design's sketch draws them. */
const EYES_LOOK_DOWN = 0.9;

/** How much lower still they sit, in its radii. */
const EYES_LOWER = 0.12;

/** How far below its body's middle a sleepyhead's shut eyes sit, in its radii, under its cap. */
const EYES_DOWN =
  EYES_LOOK_DOWN * (EYES_LOOK.down / FUZZBALL.body.r) + EYES_LOWER;

/** Returns a point given in a body's radii from its middle in the design's units. */
function fromRadii({ x, y }: Point): Point {
  return { x: x * BODY, y: y * BODY };
}

/** Returns the strands of a sleepyhead's coat, its tips longer round its lower half and each carried round toward the bottom. */
function coatStrands(): readonly (readonly Point[])[] {
  const random = createRandom(COAT.seed);
  return Array.from({ length: COAT.count }, (_, i) => {
    const angle =
      (i / COAT.count) * 2 * Math.PI + (random() - 0.5) * COAT.stray;
    const droop = Math.sin(angle) > 0 ? COAT.droop.lower : COAT.droop.upper;
    const reach = COAT.reach + droop + random() * COAT.vary;
    const bend = Math.cos(angle) > 0 ? COAT.bend : -COAT.bend;
    return strand(angle, BODY * COAT.root, BODY * reach, bend);
  });
}

/** Returns the nightcap's outline: up its left edge to its tip, back down to its brim, and along the brim. */
function nightcapOutline(): readonly Point[] {
  const { brimLeft, up, tip, down, brimRight } = NIGHTCAP;
  const from = fromRadii(brimLeft);
  return [
    from,
    ...quadraticPoints(from, fromRadii(up), fromRadii(tip)),
    ...quadraticPoints(fromRadii(tip), fromRadii(down), fromRadii(brimRight)),
  ];
}

/** Returns a sleepyhead in a palette on the design's square about its body's middle, but its eyes: its coat, its body, its nightcap, then the cap's band and pompom. */
function sleepyheadOf(palette: BoardPalette): readonly DrawCommand[] {
  const { body, nightcap } = palette.sleepyhead;
  const trim = palette.nightcapTrim;
  const band = fromRadii(BAND.from);
  return [
    ...strokes(coatStrands(), body, STRAND_WIDTH),
    circle(ORIGIN, BODY, { color: body }),
    polygon(nightcapOutline(), { color: nightcap }),
    ...stroke(
      [
        band,
        ...quadraticPoints(band, fromRadii(BAND.control), fromRadii(BAND.to)),
      ],
      { color: trim, width: BAND.width * BODY },
    ),
    circle(fromRadii(POMPOM.at), POMPOM.radius * BODY, { color: trim }),
  ];
}

/** Returns a sleepyhead's frame in a palette at a scale, drawn about its square's middle, its eyes shut. */
export function sleepyheadFrame(
  palette: BoardPalette,
  scale: ArtScale,
): ArtFrame {
  const toPixels = scale.unit / SQUARE;
  const seat = { x: 0, y: SEAT_DOWN * BODY * toPixels };
  const eyes = { x: 0, y: seat.y + EYES_DOWN * BODY * toPixels };
  return centered(FRAMES.sleepyhead, [
    ...inPixels(sleepyheadOf(palette), scale).map((command) =>
      shifted(command, seat),
    ),
    ...eyesDrawing("blink", HOUSE_EYES, scale, 1).map((command) =>
      shifted(command, eyes),
    ),
  ]);
}
