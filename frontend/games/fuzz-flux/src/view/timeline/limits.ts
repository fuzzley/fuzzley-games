// The design's limits, which keep the board readable and safe however much
// a move sets off: no more than one flash or glow every so often, no more
// loose bits on the board at once than so many, and no sound of a kind
// starting closer to the last of its kind than its gap. Each takes what
// the move would play, in the order it starts, and keeps what fits.

import { isKeyOf } from "@fz/core/records";
import { GAPPED, type SoundName } from "../effects/sounds";
import type { FeelTuning } from "./feel";
import type { Effect, SoundCue, SpriteTrack } from "./timeline";

/** Describes something that starts at a moment. */
interface Timed {
  readonly atMs: number;
}

/**
 * Returns the flashes and glows that start no sooner than the feel's gap
 * after the last kept, as three a second is the most that is safe.
 */
export function limitFlashes<T extends Timed>(
  flashes: readonly T[],
  feel: FeelTuning,
): readonly T[] {
  let lastMs = -Infinity;
  return flashes.filter(({ atMs }) => {
    if (atMs - lastMs < feel.flashGapMs) {
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
 * sooner than its gap after the last kept of that sound.
 */
export function limitSounds(
  cues: readonly SoundCue[],
  feel: FeelTuning,
): readonly SoundCue[] {
  const lastMs = new Map<SoundName, number>();
  return cues.filter(({ atMs, sound }) => {
    const gap = gapOf(sound);
    if (gap === null) {
      return true;
    }
    if (atMs - (lastMs.get(sound) ?? -Infinity) < feel[gap]) {
      return false;
    }
    lastMs.set(sound, atMs);
    return true;
  });
}

/** Returns the feel's number for the least time between two starts of a sound, or null for one with no gap. */
function gapOf(sound: SoundName): (typeof GAPPED)[keyof typeof GAPPED] | null {
  return isKeyOf(sound, GAPPED) ? GAPPED[sound] : null;
}
