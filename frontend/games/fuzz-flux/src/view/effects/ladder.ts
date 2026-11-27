// The ladder a move's waves climb, as the scene and the sound lab play it: a
// rung of C major's five-note scale a wave, from C5 to A6, where it holds.
// The sprite holds each sound that climbs it at four of its rungs, each made
// at that rung's own pitch, and a rung plays the take nearest it, tuned by
// the cents between, so no rung is raised far enough to be cut short or
// brightened past the design's 6 kHz.

import { ladderCentsOf } from "@fz/core/note_ladder";
import { keysOf } from "@fz/core/records";
import type { SoundName } from "./sounds";

/**
 * How far each rung lies above the ladder's foot, in cents, a rung at a
 * time from the first: C5, D5, E5, G5, A5, C6, D6, E6, G6 and A6. They are
 * the sound kit's steps of the key (`@fz/dev/synth`'s `centsOf()`), copied,
 * as the game imports nothing of `@fz/dev`.
 */
export const LADDER_CENTS = [
  0, 200, 400, 700, 900, 1200, 1400, 1600, 1900, 2100,
] as const satisfies readonly number[];

/**
 * The sounds that climb the ladder, each named as its take at the foot: a
 * bunch's note, each fuzzball's bubble as it hops off, and the frizzball's
 * zap on each fuzzball it reaches.
 */
export const LADDERED = [
  "note",
  "pop",
  "zap",
] as const satisfies readonly SoundName[];

/** A sound that climbs the ladder, such as "pop". */
export type LadderedSound = (typeof LADDERED)[number];

/**
 * The rungs above the foot at which the sprite holds each laddered sound
 * too, by the notes its takes there are named for, each with its rung, 0
 * at the foot. Every rung lies within 300 cents of one of them or of the
 * foot.
 */
const TAKES_UP = { g5: 3, d6: 6, a6: 9 } as const satisfies Readonly<
  Record<string, number>
>;

/** Describes a take of a laddered sound the sprite holds: its name, and the rung it is made at, 0 at the foot. */
export interface LadderTake {
  readonly sound: SoundName;
  readonly rung: number;
}

/** Describes how a laddered sound plays on a rung: the take it plays, and how far it is tuned from that take's own pitch, in cents. */
export interface RungPlay {
  readonly sound: SoundName;
  readonly cents: number;
}

/** How much softer a bunch's note plays a rung up the ladder, in dB, as the design's notes do. */
const SOFTER_A_RUNG_DB = 0.4;

/** Returns how far a rung, 0 at the foot, lies above the ladder's foot, in cents: none at the foot or under it, and the top's past the top. */
function rungCentsOf(rung: number): number {
  return ladderCentsOf(rung + 1, LADDER_CENTS);
}

/** Returns the takes of a laddered sound the sprite holds, from the foot up. */
export function takesOf(sound: LadderedSound): readonly LadderTake[] {
  return [
    { sound, rung: 0 },
    ...keysOf(TAKES_UP).map((note) => ({
      sound: `${sound}-${note}` as const,
      rung: TAKES_UP[note],
    })),
  ];
}

/**
 * Returns how a laddered sound plays on a rung, 0 at the ladder's foot,
 * where a move's first wave plays: the take the sprite holds nearest it,
 * tuned by the cents between. A rung past the top plays as the top, and
 * one under the foot as the foot.
 */
export function onRung(sound: LadderedSound, rung: number): RungPlay {
  const cents = rungCentsOf(rung);
  return takesOf(sound)
    .map((take) => ({
      sound: take.sound,
      cents: cents - rungCentsOf(take.rung),
    }))
    .reduce((nearest, play) =>
      Math.abs(play.cents) < Math.abs(nearest.cents) ? play : nearest,
    );
}

/**
 * Returns how loud a bunch's note plays on a rung, 0 at the foot, against
 * the foot's: a little softer a rung up the ladder, and as soft as the
 * top's past it.
 */
export function noteVolumeOf(rung: number): number {
  const up = Math.min(Math.max(rung, 0), LADDER_CENTS.length - 1);
  return 10 ** ((-SOFTER_A_RUNG_DB * up) / 20);
}
