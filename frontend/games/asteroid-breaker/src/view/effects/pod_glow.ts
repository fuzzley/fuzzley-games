// How the pod lights up: flashing as one of the crew is knocked loose, as
// the kit's `shipLostFx()` flashes a ship lost, and glowing as it zaps, its
// light on the rocks it arcs to, as `plan.md`'s Look has a zap among the
// lights, and its glow where the arcs leave its hull, as the kit's
// `zapFx()` glows at each arc's start.

import { shareDone } from "@fz/core/math";
import type { BeltPalette } from "../colors/palette";
import { mixTone } from "../colors/tones";
import { POD_FLASH_MS, ZAP_HOLD_MS, ZAP_MS } from "./timing";

/**
 * How the pod flashes as one is knocked loose, as the kit's ship lost
 * flashes, under the pod: its glow's reach, in field units; its disc's
 * radius as it starts and how far it grows, in field units; how opaque the
 * disc starts; and how sharply it fades.
 */
export const POD_FLASH = {
  glow: 3.2,
  from: 1.1,
  grows: 0.8,
  alpha: 0.92,
  fade: 1.4,
} as const;

/** Describes the pod's flash at a moment: its disc's radius, in field units, how opaque it is, and how strongly its glow shows. */
export interface PodFlash {
  radius: number;
  alpha: number;
  glow: number;
}

/**
 * Writes the pod's flash a time after one was knocked loose, in
 * milliseconds, into a record and returns it, or returns null before or
 * once it is over: its disc growing and fading fast, its glow evenly.
 */
export function podFlashAt(sinceMs: number, into: PodFlash): PodFlash | null {
  if (!(sinceMs >= 0 && sinceMs < POD_FLASH_MS)) return null;
  const done = shareDone(0, sinceMs, POD_FLASH_MS);
  into.radius = POD_FLASH.from + POD_FLASH.grows * done;
  into.alpha = POD_FLASH.alpha * (1 - done) ** POD_FLASH.fade;
  into.glow = 1 - done;
  return into;
}

/**
 * Returns the tone the pod's flash's disc is drawn in, as the kit's: the
 * accent nearly white on a dark field, and a pale tint of it on a light
 * one, where white would be the field itself.
 */
export function podFlashTone(
  palette: Pick<BeltPalette, "accent" | "mode">,
): number {
  return mixTone(
    palette.accent,
    0xffffff,
    palette.mode === "light" ? 0.62 : 0.9,
  );
}

/**
 * How a zap glows at the pod, round its middle as far as where its arcs
 * leave the hull and the kit's glow past it, in field units, and how
 * strongly, as the kit's.
 */
export const ZAP_GLOW = { reach: 1.9, strength: 0.7 } as const;

/**
 * How a zap lights the rocks about the pod, as one of the scene's lights:
 * as far as the rocks it may arc to lie, in field units, how high over the
 * field, in field units, and how strongly at first.
 */
export const ZAP_LIGHT = { reach: 12, height: 3, strength: 1.5 } as const;

/**
 * Returns how strongly a zap's light and glow show a time after the pod
 * zapped, in milliseconds: whole while the field holds still, then dying
 * away, and none before or once it is over.
 */
export function zapShare(sinceMs: number): number {
  if (!(sinceMs >= 0 && sinceMs < ZAP_MS)) return 0;
  return (1 - shareDone(ZAP_HOLD_MS, sinceMs, ZAP_MS - ZAP_HOLD_MS)) ** 2;
}
