import type { PointerAiming } from "@fz/brick-wall/view/aim_settings";
import { count } from "@fz/core/format";
import type { FlightSpeed } from "../../view/play/pace";
import type { GuideTurns } from "./settings.service";

/** Each way a pointer may aim, as the settings and a bug report name it, and Brick Fuzz Pop's too. */
export const AIMING_NAMES: Readonly<Record<PointerAiming, string>> = {
  pointAndHold: "Point and hold",
  pullBack: "Pull back",
};

/** Each of the flight's speeds, as the settings and a bug report name it, and Brick Fuzz Pop's too. */
export const SPEED_NAMES: Readonly<Record<FlightSpeed, string>> = {
  normal: "Normal",
  fast: "Fast",
};

/** Returns how far the guide follows a shot, as the settings and a bug report name it: "3 turns". */
export function guideName(turns: GuideTurns): string {
  return count(turns, "turn", "turns");
}
