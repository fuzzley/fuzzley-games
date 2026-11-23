// What a game's shell takes of the aiming without the `Aiming` class of
// ./aiming.ts, which only its scene runs: the ways a pointer aims and lets
// a shot fly, which its settings choose, and the aim a round starts at. A
// shell that took ./aiming.ts by value would carry the class in its first
// download.

import { AIM_COUNT, type Aim } from "../rules/aims";

/**
 * Names a way the mouse and fingers aim: pointed and held, or pulled back
 * from where they pressed.
 */
export type PointerAiming = "pointAndHold" | "pullBack";

/**
 * Names how a shot a pointer aims is let fly: as its press lets go, or only
 * by a button, the press's letting go leaving the aim where it is.
 */
export type PointerRelease = "onLetGo" | "byButton";

/** The aim straight up, which the aiming starts at. */
export const STRAIGHT_UP: Aim = (AIM_COUNT - 1) / 2;
