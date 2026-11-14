// What the shell takes from the steering without the `Steering` class,
// which only the scene runs: the ways a pointer aims, and the aim the
// steering starts at.

import type { Aim } from "../../rules/shot";
import { AIM_COUNT } from "../../rules/tuning";

/**
 * Names a way the mouse and fingers aim: pointed and held, or pulled back
 * from where they pressed.
 */
export type PointerAiming = "pointAndHold" | "pullBack";

/** The aim straight up, which the steering starts at. */
export const STRAIGHT_UP: Aim = (AIM_COUNT - 1) / 2;
