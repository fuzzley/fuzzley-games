// The design's limits, which keep the board readable and safe however much
// a move sets off: no more than one flash or glow every so often, no more
// loose bits on the board at once than so many, and no sound of a kind
// starting closer to the last of its kind than its gap; and the scene's
// pools, which hold no more of an effect or a wave's mark at once than the
// busiest moves show. Each takes what the move would play, in the order it
// starts, and keeps what fits.

import { isKeyOf } from "@fz/core/records";
import { rungCentsOf } from "../effects/ladder";
import { GAPPED, type SoundName } from "../effects/sounds";
import type { FeelTuning } from "./feel";
import type { SoundPart } from "./part";
import type { Effect, SpriteTrack, WaveMark } from "./timeline";

/** Describes something that starts at a moment. */
interface Timed {
  readonly atMs: number;
}

/** An effect the scene draws from a pool of its own, a pool a kind. */
type Pooled = Extract<
  Effect,
  { readonly what: "ring" | "streak" | "bolt" | "flash" | "gust-line" }
>;

/**
 * How many of each effect, and of the waves' marks, the scene's pools
 * hold: as many as the busiest moves a timeline plays show at once, a
 * frizzball swapped onto a dasher, a dasher swapped with a puffer and two
 * frizzballs swapped together on a board 8 by 9, and a gust's lines of
 * wind, as `limits.spec.ts` measures them.
 */
export const POOLS = {
  ring: 72,
  streak: 12,
  bolt: 5,
  flash: 1,
  "gust-line": 16,
  mark: 3,
} as const satisfies Readonly<Record<Pooled["what"] | "mark", number>>;

/** Describes how many of each effect, and of the waves' marks, a scene's pools hold, as `POOLS` sizes them. */
export type Pools = Readonly<Record<keyof typeof POOLS, number>>;

/**
 * Returns the flashes and glows that start no sooner than the feel's gap
 * after the last kept, as three a second is the most that is safe: from
 * the moment a tap may hurry what plays on, the gap at the hurried pace.
 */
export function limitFlashes<T extends Timed>(
  flashes: readonly T[],
  hurriedFromMs: number,
  feel: FeelTuning,
): readonly T[] {
  let lastMs = -Infinity;
  return flashes.filter(({ atMs }) => {
    const gapMs =
      atMs < hurriedFromMs
        ? feel.flashGapMs
        : feel.flashGapMs * feel.hurriedPace;
    if (atMs - lastMs < gapMs) {
      return false;
    }
    lastMs = atMs;
    return true;
  });
}

/**
 * Returns the effects but the fluff that would put more loose bits on the
 * board at once than the feel's most: each tuft of a fluff kept until the
 * longest a tuft flies, and each loose sprite drawn as a frame while its
 * track shows, as the brick's cushions and the cage's bars are.
 */
export function limitFluff(
  effects: readonly Effect[],
  sprites: readonly SpriteTrack[],
  feel: FeelTuning,
): readonly Effect[] {
  const tuftMs = feel.tuftLifeMs + feel.tuftLifeSpreadMs;
  const frames = sprites.filter(({ drawn }) => drawn.what === "frame");
  const kept: Effect[] = [];
  for (const effect of effects) {
    if (effect.what === "fluff") {
      const loose =
        kept.reduce(
          (sum, each) =>
            each.what === "fluff" && effect.atMs - each.atMs < tuftMs
              ? sum + each.count
              : sum,
          0,
        ) +
        frames.filter(
          ({ fromMs, untilMs }) =>
            fromMs <= effect.atMs && effect.atMs < untilMs,
        ).length;
      if (loose + effect.count > feel.mostLooseBits) {
        continue;
      }
    }
    kept.push(effect);
  }
  return kept;
}

/**
 * Returns the sound cues but those of a sound with a gap that start
 * sooner than its gap after the last kept of that sound on that rung, as
 * the sketch names each rung's sound apart, whichever take then plays it.
 */
export function limitSounds(
  cues: readonly SoundPart[],
  feel: FeelTuning,
): readonly SoundPart[] {
  const lastMs = new Map<string, number>();
  return cues.filter(({ atMs, sound, rung }) => {
    const gap = gapOf(sound);
    if (gap === null) {
      return true;
    }
    const rungSound = `${sound}@${String(rung === null ? 0 : rungCentsOf(rung))}`;
    if (atMs - (lastMs.get(rungSound) ?? -Infinity) < feel[gap]) {
      return false;
    }
    lastMs.set(rungSound, atMs);
    return true;
  });
}

/** Returns the feel's number for the least time between two starts of a sound, or null for one with no gap. */
function gapOf(sound: SoundName): (typeof GAPPED)[keyof typeof GAPPED] | null {
  return isKeyOf(sound, GAPPED) ? GAPPED[sound] : null;
}

/** Returns the effects but those of a pooled kind that start while their pool's every one still shows. */
export function limitPooledEffects(
  effects: readonly Effect[],
  pools: Pools,
): readonly Effect[] {
  const showing: Pooled[] = [];
  const kept: Effect[] = [];
  for (const effect of effects) {
    if (!isPooled(effect)) {
      kept.push(effect);
      continue;
    }
    const alike = showing.filter(
      (other) =>
        other.what === effect.what && effect.atMs < other.atMs + other.ms,
    );
    if (alike.length < pools[effect.what]) {
      showing.push(effect);
      kept.push(effect);
    }
  }
  return kept;
}

/** Returns the waves' marks but those that start while the marks' pool's every one still shows, each for the feel's while. */
export function limitMarks(
  marks: readonly WaveMark[],
  pools: Pools,
  feel: FeelTuning,
): readonly WaveMark[] {
  const kept: WaveMark[] = [];
  for (const mark of marks) {
    if (
      kept.filter((other) => mark.atMs < other.atMs + feel.markMs).length <
      pools.mark
    ) {
      kept.push(mark);
    }
  }
  return kept;
}

/** Returns whether an effect is of a kind the scene draws from a pool. */
function isPooled(effect: Effect): effect is Pooled {
  return isKeyOf(effect.what, POOLS);
}
