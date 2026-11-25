import { count } from "@fz/core/format";
import { FLIGHT_RULES } from "../../../rules/tuning";
import type { KindHelp } from "../kinds";

/** The lock, as the shell lists it, with the turns that draw each bolt back from the tuning. */
export const LOCK_HELP = {
  about: `Opens after ${count(FLIGHT_RULES.boltTurns, "turn", "turns")} of your shot for each bolt. Then takes 1 strike.`,
} as const satisfies KindHelp;
