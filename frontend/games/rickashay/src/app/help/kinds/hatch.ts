import { count } from "@fz/core/format";
import { FLIGHT_RULES } from "../../../rules/tuning";
import type { KindHelp } from "../kinds";

/** The hatch, as the shell lists it, with the holds a shot gets from the tuning. */
export const HATCH_HELP = {
  about: `Lets the fuzzball up through. All the hatches bounce it back up ${count(FLIGHT_RULES.hatchHolds, "time", "times")} a shot, then open.`,
} as const satisfies KindHelp;
