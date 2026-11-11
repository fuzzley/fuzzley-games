// What the shell takes from the steering without the `Steering` class,
// which only the scene runs: the ways a pointer aims, and the aim the
// steering starts at.

import type { Aim } from "../../rules/shot";
import { AIM_COUNT } from "../../rules/tuning";

/** Names a way a pointer aims: pulled back from where it pressed, or pointed and held. */
export type PointerAiming = "pullBack" | "pointAndHold";

/** Says how each kind of pointer aims. */
export interface PointerAimings {
  readonly mouse: PointerAiming;
  readonly finger: PointerAiming;
}

/**
 * Each kind of pointer its own way, as the settings' "by the pointer" has
 * them: a finger pulls back, and a mouse points and holds.
 */
export const BY_POINTER: PointerAimings = {
  mouse: "pointAndHold",
  finger: "pullBack",
};

/** The aim straight up, which the steering starts at. */
export const STRAIGHT_UP: Aim = (AIM_COUNT - 1) / 2;
