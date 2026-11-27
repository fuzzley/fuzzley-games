// The design's take of the game's sounds, made in the page from the
// design's own recipes (docs/fuzz-flux/sound/sounds.mjs), as its
// make-sounds.mjs makes its sprite and its reels: each of its sounds, and
// each that climbs the ladder made at every step of it, a bunch's chords
// among them, so the lab plays the design's ladder as it rings, each rung
// at its own pitch.

import { keysOf } from "@fz/core/records";
import type { LabSounds } from "@fz/dev/sound-lab-page";
import designMap from "../../../../../docs/fuzz-flux/sound/sprite.json";
import {
  SOUNDS,
  note,
  pop,
  zap,
} from "../../../../../docs/fuzz-flux/sound/sounds.mjs";
import {
  SR,
  add,
  silence,
  wav,
} from "../../../../../docs/fuzz-flux/sound/synth.mjs";

/** A sound of the design's, by its name in its sprite. */
export type DesignSound = keyof typeof designMap;

/**
 * The design's sounds that climb its ladder, each made at a step of it, 0
 * at the foot, by the design's own recipe: a bunch's note by its size, a
 * fuzzball's bubble and a frizzball's zap. A note takes the first of the
 * design's three takes of its puff of air, the one its reels' bunches
 * play, where its reel of the ladder plays all three in turn.
 */
const CLIMBING = {
  note: (step: number) => note(step, 3),
  "note-4": (step: number) => note(step, 4),
  "note-5": (step: number) => note(step, 5),
  pop,
  zap,
} as const satisfies Readonly<
  Partial<Record<DesignSound, (step: number) => Float32Array>>
>;

/** A sound of the design's that climbs its ladder, such as "note-4". */
type DesignClimbing = keyof typeof CLIMBING;

/**
 * A take of the design's: one of its sounds, or one that climbs its ladder
 * made at a step, as "pop@3", its step written by `String()`, which the
 * type can't tell from any other string.
 */
export type DesignTake = DesignSound | `${DesignClimbing}@${string}`;

/** How many steps the design's ladder has, the last holding past its top. */
const STEPS = 10;

/** The silence before each take in the sprite, and after the last, in seconds, as the design's sprite has. */
const GAP_S = 0.1;

/** The design's recipes, by their sounds' names. */
const RECIPES = new Map(SOUNDS.map((sound) => [sound.id, sound]));

/** Returns the design's recipe of a sound, or throws for one none makes. */
function recipeOf(name: DesignSound): (typeof SOUNDS)[number] {
  const recipe = RECIPES.get(name);
  if (recipe === undefined) throw new Error(`No recipe makes "${name}".`);
  return recipe;
}

/**
 * Returns the take of a sound that climbs the design's ladder made at a
 * step, 0 at the foot, and the top's for a step past it: at the pitch the
 * design's own plays there, though a zap past the top ticks as the top's,
 * where the design's would tick a little differently.
 */
export function climbedTo(sound: DesignClimbing, step: number): DesignTake {
  return `${sound}@${String(Math.min(Math.max(step, 0), STEPS - 1))}`;
}

/** Returns every take of the design's, each made by its recipe, by its name: its sounds in their order, then those that climb its ladder at each step. */
function designTakes(): ReadonlyMap<DesignTake, Float32Array> {
  const takes = new Map<DesignTake, Float32Array>();
  for (const name of keysOf(designMap)) takes.set(name, recipeOf(name).make());
  for (const sound of keysOf(CLIMBING)) {
    for (let step = 0; step < STEPS; step++) {
      takes.set(climbedTo(sound, step), CLIMBING[sound](step));
    }
  }
  return takes;
}

/**
 * Returns the design's take as the lab plays a sprite: every take made and
 * packed into a WAV the page holds, with its map, and the design's sounds,
 * each with what plays it, in its order.
 */
export function designTake(): LabSounds<DesignTake> {
  const placed: { name: DesignTake; samples: Float32Array; start: number }[] =
    [];
  let seconds = GAP_S;
  for (const [name, samples] of designTakes()) {
    placed.push({ name, samples, start: seconds });
    seconds += samples.length / SR + GAP_S;
  }
  const sprite = silence(seconds);
  for (const { samples, start } of placed) add(sprite, samples, start);
  return {
    sprite: {
      // Copied into memory of its own, as a Blob takes no bytes that may be shared.
      url: URL.createObjectURL(
        new Blob([new Uint8Array(wav(sprite))], { type: "audio/wav" }),
      ),
      spritemap: {
        spritemap: Object.fromEntries(
          placed.map(({ name, samples, start }) => [
            name,
            { start, end: start + samples.length / SR, loop: false },
          ]),
        ),
      },
    },
    sounds: keysOf(designMap).map((name) => ({
      name,
      plays: recipeOf(name).when,
    })),
  };
}
