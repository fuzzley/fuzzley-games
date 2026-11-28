// A brick hit, as the hit lands. A layer knocked off: the pile ducks onto
// its floor and spreads a little, wobbling, its top cushion tumbles off to
// one side, plumping up out from under the pile's weight, its tufts after
// it, and the cushions left spring up to fill the square again, with a
// note a step higher the fewer are left. Its last layer: the cushion
// swells, then bursts into tufts of its felt and a thin ring as its button
// flies up and falls, and the bricks' goal counts it. With Less motion the
// cushion fades where it lies, the pile takes its new shape with no duck
// and no spring, and the last cushion bursts with no swell.

import { hashShareOf } from "@fz/core/random";
import { squareOf } from "../../../rules/board/cells";
import type { BrickLayers } from "../../../rules/catalog/elements";
import {
  LAST_BUTTON,
  PILE_FLOOR,
  cushionHeight,
  heightUnderTop,
  topCushionOf,
} from "../../art/elements/brick";
import { FRAMES, type FrameName } from "../../art/frame_names";
import type { SoundName } from "../../effects/sounds";
import type { FeelTuning } from "../feel";
import type { HitOf } from "../hits";
import { lookAt } from "../looks";
import { type Part, cue, moves, sets, spawns } from "../part";
import type { Key, Keys, Place, SpriteTrack } from "../timeline";
import type { WavePlay } from "../wave_play";

/** The layers a brick had before a knock left it some, as no knock leaves 4. */
const KNOCKED_FROM = { 1: 2, 2: 3, 3: 4 } as const satisfies Readonly<
  Record<Exclude<BrickLayers, 4>, BrickLayers>
>;

/** The sound of a layer knocked off, by the layers it leaves: its note a step higher the fewer. */
const KNOCK_SOUNDS = {
  1: "knock-1",
  2: "knock-2",
  3: "knock-3",
} as const satisfies Readonly<Record<Exclude<BrickLayers, 4>, SoundName>>;

/** What each of a hit's draws from `hashShareOf()` is for, as its third number. */
const DRAWS = { aside: 1, spin: 2 } as const satisfies Readonly<
  Record<string, number>
>;

/** Describes something thrown off a brick: from where and when, how fast aside and up, in squares a second, and for how long. */
interface Throw {
  readonly from: Place;
  readonly aside: number;
  readonly rise: number;
  readonly atMs: number;
  readonly ms: number;
}

/** Returns the parts of a layer knocked off a brick, as the hit lands. */
export function knocked(
  hit: HitOf<"knocked">,
  atMs: number,
  play: WavePlay,
): readonly Part[] {
  const { feel } = play;
  const left = hit.layersLeft;
  if (left === 4) {
    throw new RangeError(
      `A knock on square ${String(hit.square)} leaves 4 layers, more than any knock leaves.`,
    );
  }
  const layers = KNOCKED_FROM[left];
  const at = squareOf(hit.square, play.grid.width);
  const top = topCushionOf(layers);
  const cushionAt = { x: at.x + top.x, y: at.y + top.y };
  const full = play.motion === "full";
  return [
    cue(KNOCK_SOUNDS[left], atMs),
    {
      what: "becomes",
      piece: hit.piece,
      atMs,
      drawn: { what: "brick", id: hit.piece, layers: left },
    },
    ...(full
      ? ducked(hit.piece, at, heightUnderTop(layers), atMs, feel)
      : reshaped(hit.piece, at, heightUnderTop(layers), atMs, feel)),
    {
      what: "sprite",
      sprite: full
        ? tumbling(hit, layers, cushionAt, atMs, feel)
        : fading(FRAMES.cushion(layers), cushionAt, atMs, feel),
    },
    spawns({
      what: "fluff",
      atMs,
      at: cushionAt,
      tuft: FRAMES.cushionTuft(layers),
      count: feel.cushionTufts,
      power: feel.cushionTuftPower,
    }),
  ];
}

/** Returns the parts of a brick's last layer burst, as the hit lands, which the bricks' goal counts. */
export function broken(
  hit: HitOf<"broken">,
  atMs: number,
  play: WavePlay,
): readonly Part[] {
  const { feel } = play;
  const at = squareOf(hit.square, play.grid.width);
  const burstMs = atMs + feel.lastLayerMs;
  const buttonAt = { x: at.x + LAST_BUTTON.x, y: at.y + LAST_BUTTON.y };
  return [
    cue("break", atMs),
    ...(play.motion === "full"
      ? moves(hit.piece, atMs, feel.lastLayerMs, "out", {
          scaleX: feel.lastLayerScale,
          scaleY: feel.lastLayerScale,
        })
      : []),
    { what: "leaves", piece: hit.piece, atMs: burstMs },
    spawns({
      what: "fluff",
      atMs: burstMs,
      at,
      tuft: FRAMES.cushionTuft(1),
      count: feel.lastLayerTufts,
      power: feel.lastLayerTuftPower,
    }),
    spawns({
      what: "ring",
      atMs: burstMs,
      ms: feel.ringMs,
      at,
      radius: feel.lastLayerRingSquares,
      ink: "white",
    }),
    {
      what: "sprite",
      sprite: {
        drawn: { what: "frame", frame: FRAMES.button },
        fromMs: burstMs,
        untilMs: burstMs + feel.buttonMs,
        look: lookAt(buttonAt),
        keys: thrownKeys(
          {
            from: buttonAt,
            aside:
              sideOf(hit.piece) *
              (feel.buttonAsideSpeed +
                drawOf(hit.piece, 1, DRAWS.aside) * feel.buttonAsideSpread),
            rise: feel.buttonRiseSpeed,
            atMs: burstMs,
            ms: feel.buttonMs,
          },
          feel,
        ),
      },
    },
    { what: "counted", atMs: burstMs, counts: { what: "brick" } },
  ];
}

/**
 * Returns the parts of a pile ducking under a hit, onto its floor and a
 * little wider, wobbling, and of the cushions left springing up to fill
 * its square again from the height they filled under the one knocked off.
 *
 * The duck springs back with them, as a piece's one scale down takes one
 * spring, so only its spread springs back sooner.
 */
function ducked(
  piece: number,
  at: Place,
  under: number,
  atMs: number,
  feel: FeelTuning,
): readonly Part[] {
  const height = feel.pileDuck * under;
  return [
    ...sets(piece, atMs, {
      scaleX: feel.pileSpread,
      scaleY: height,
      y: onFloor(at, height),
      wobble: feel.pileWobble,
    }),
    ...moves(piece, atMs, feel.pileMs, "spring", { scaleY: 1, y: at.y }),
    ...moves(piece, atMs, feel.pileSpreadMs, "spring", { scaleX: 1 }),
    ...moves(piece, atMs, feel.pileWobbleMs, "out", { wobble: 0 }),
  ];
}

/** Returns the parts of the cushions left under one knocked off taking the pile's new shape, as Less motion has it: no duck and no spring. */
function reshaped(
  piece: number,
  at: Place,
  under: number,
  atMs: number,
  feel: FeelTuning,
): readonly Part[] {
  return [
    ...sets(piece, atMs, { scaleY: under, y: onFloor(at, under) }),
    ...moves(piece, atMs, feel.lessMotionPileMs, "out", {
      scaleY: 1,
      y: at.y,
    }),
  ];
}

/** Returns where the middle of a pile on a square lies, in squares, squashed to a share of its height onto its floor. */
function onFloor(at: Place, height: number): number {
  return at.y + PILE_FLOOR * (1 - height);
}

/**
 * Returns the track of a brick's top cushion tumbling off it: thrown
 * aside, the way the brick's id gives, and up, turning as it flies, its
 * frame stretched taller as it plumps up out from under the pile's
 * weight, no taller than the feel's most, as it shrinks and fades away.
 */
function tumbling(
  hit: HitOf<"knocked">,
  layers: BrickLayers,
  from: Place,
  atMs: number,
  feel: FeelTuning,
): SpriteTrack {
  const side = sideOf(hit.piece);
  const ms = feel.cushionMs;
  const kept = 1 - feel.cushionShrink;
  const plump = Math.min(
    feel.cushionPlump,
    feel.cushionMostHeight / cushionHeight(layers),
  );
  const keptAsPlump = 1 - (feel.cushionShrink * feel.cushionPlumpMs) / ms;
  const spin =
    feel.cushionSpin +
    drawOf(hit.piece, layers, DRAWS.spin) * feel.cushionSpinSpread;
  return {
    drawn: { what: "frame", frame: FRAMES.cushion(layers) },
    fromMs: atMs,
    untilMs: atMs + ms,
    look: lookAt(from),
    keys: {
      ...thrownKeys(
        {
          from,
          aside:
            side *
            (feel.cushionAsideSpeed +
              drawOf(hit.piece, layers, DRAWS.aside) * feel.cushionAsideSpread),
          rise: feel.cushionRiseSpeed,
          atMs,
          ms,
        },
        feel,
      ),
      rotation: [{ atMs, ms, to: (side * spin * ms) / 1000, easing: "linear" }],
      scaleX: [{ atMs, ms, to: kept, easing: "linear" }],
      scaleY: [
        {
          atMs,
          ms: feel.cushionPlumpMs,
          to: plump * keptAsPlump,
          easing: "out",
        },
        {
          atMs: atMs + feel.cushionPlumpMs,
          ms: ms - feel.cushionPlumpMs,
          to: plump * kept,
          easing: "linear",
        },
      ],
    },
  };
}

/** Returns the track of a frame that fades where it lies, as a brick's knocked cushion does with Less motion. */
function fading(
  frame: FrameName,
  at: Place,
  atMs: number,
  feel: FeelTuning,
): SpriteTrack {
  const ms = feel.lessMotionCushionMs;
  return {
    drawn: { what: "frame", frame },
    fromMs: atMs,
    untilMs: atMs + ms,
    look: lookAt(at),
    keys: { fade: [fadeKey(atMs, ms, feel)] },
  };
}

/**
 * Returns the keys of something thrown: straight aside and up, as it
 * leaves, the feel's gravity pulling it down from where that takes it, so
 * it slows and falls, fading toward its end.
 */
function thrownKeys(
  { from, aside, rise, atMs, ms }: Throw,
  feel: FeelTuning,
): Keys {
  const seconds = ms / 1000;
  return {
    x: [{ atMs, ms, to: from.x + aside * seconds, easing: "linear" }],
    y: [{ atMs, ms, to: from.y - rise * seconds, easing: "linear" }],
    // A fall from rest, which "in" eases by its share of the time squared.
    leanY: [
      { atMs, ms, to: (feel.thrownGravity * seconds ** 2) / 2, easing: "in" },
    ],
    fade: [fadeKey(atMs, ms, feel)],
  };
}

/** Returns the key that fades something thrown over a while, toward its end only, as the feel's `looseBitFade` has it. */
function fadeKey(atMs: number, ms: number, feel: FeelTuning): Key {
  const fadeMs = ms / feel.looseBitFade;
  return { atMs: atMs + ms - fadeMs, ms: fadeMs, to: 1, easing: "linear" };
}

/** Returns which way across what is thrown off a brick flies, by its id: right for an odd one, left for an even. */
function sideOf(piece: number): number {
  return piece % 2 === 1 ? 1 : -1;
}

/** Returns a share from 0 up to 1 for a draw a hit on a brick makes, by the brick, its layers and what the draw is for, the same every time. */
function drawOf(piece: number, layers: number, what: number): number {
  return hashShareOf(piece, layers, what, 0);
}
