// The ball's speed as the debug menu tunes it in play, which a development
// build offers, and a production one at `?debug`, written back as the lines
// of `speed.ts` it would replace, so a speed found by playing is pasted in.

import type { TuningSlider } from "@fz/game-ui/debug_menu";
import { PRESET_SPEEDS, SPEED_INFO } from "../../rules/speed";

/** The debug menu's one slider: how fast the balls go against the speed's own, from ×0.5 to ×2. */
export const BALL_SPEED_SLIDER = {
  id: "ballSpeedScale",
  name: "Ball speed",
  least: 0.5,
  most: 2,
  step: 0.05,
} as const satisfies TuningSlider<"ballSpeedScale">;

/** Returns a scale of the ball's speed as the debug menu writes it: "×1.50". */
export function formatScale(scale: number): string {
  return `×${scale.toFixed(2)}`;
}

/** Returns a speed in units a second as the debug menu writes it, to a tenth. */
export function unitsOf(speed: number): string {
  return String(Math.round(speed * 10) / 10);
}

/**
 * Returns the lines of `speed.ts` a scale of the ball's speed would replace:
 * each preset speed's base and top, scaled, to three places, as a step of
 * the slider leaves them, under the name of the record that holds them,
 * Normal's being `NORMAL`, which Custom spreads.
 */
export function speedLines(scale: number): string {
  const scaled = (speed: number): string =>
    String(Math.round(speed * scale * 1000) / 1000);
  return PRESET_SPEEDS.flatMap((speed) => {
    const { base, top } = SPEED_INFO[speed];
    const record = speed === "normal" ? "NORMAL" : `SPEED_INFO.${speed}`;
    return [`// ${record}`, `base: ${scaled(base)},`, `top: ${scaled(top)},`];
  }).join("\n");
}
