import { count } from "@fz/core/format";
import { MOSS_REGROWS } from "../../../rules/tuning";
import type { KindHelp } from "../kinds";

/** The moss brick, as the shell lists it, with the hits it grows back from the tuning. */
export const MOSS_HELP = {
  about: `Takes 2 or 3 strikes. Grows ${count(MOSS_REGROWS, "pip", "pips")} back after each shot it survives.`,
} as const satisfies KindHelp;
