import type { Square } from "../rules/geometry";
import type { Run } from "../rules/run";

/** Names a sound the board plays. */
export type SoundName = "eat" | "crash" | "best";

/** The sounds, in the order the sprite holds them. */
export const SOUNDS: readonly SoundName[] = ["eat", "crash", "best"];

/** Says what a step calls for beyond drawing the board as it now is. */
export interface StepEffects {
  /** Where crumbs scatter, from an apple eaten; motion. */
  readonly crumbs: Square | null;
  /** Where an apple pops up, newly laid; motion. */
  readonly pop: Square | null;
  /** Whether the board shakes, at a crash; motion. */
  readonly shake: boolean;
  /** Whether the snake fades, at a crash; at once where motion is unwelcome. */
  readonly fade: boolean;
  /** The sound to play, if any. */
  readonly sound: SoundName | null;
}

/** A step that calls for nothing. */
export const NO_EFFECTS: StepEffects = {
  crumbs: null,
  pop: null,
  shake: false,
  fade: false,
  sound: null,
};

/**
 * Returns what a run's last step calls for: crumbs, a pop and a sound where
 * an apple was eaten; a shake, a fade and a sound at a crash, the new best's
 * where the run set one; the new best's at a full board; and the first
 * apple's pop as a run begins. Motion is left out where the player prefers
 * less of it.
 */
export function effectsOf(
  run: Run,
  newBest: boolean,
  motion: boolean,
): StepEffects {
  const head = run.snake[0] ?? null;
  switch (run.last) {
    case "ate":
      return {
        ...NO_EFFECTS,
        crumbs: motion ? head : null,
        pop: motion ? run.apple : null,
        sound: "eat",
      };
    case "crashed":
      return {
        ...NO_EFFECTS,
        shake: motion,
        fade: true,
        sound: newBest ? "best" : "crash",
      };
    case "won":
      return { ...NO_EFFECTS, crumbs: motion ? head : null, sound: "best" };
    case "moved":
      return NO_EFFECTS;
    case null:
      return run.steps === 0 && motion
        ? { ...NO_EFFECTS, pop: run.apple }
        : NO_EFFECTS;
  }
}
