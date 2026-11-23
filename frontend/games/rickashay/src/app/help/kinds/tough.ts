import type { KindHelp } from "../kinds";

/** The tough brick, as the shell lists it. */
export const TOUGH_HELP = {
  about: "Takes 2 to 6 strikes. The pips show how many are left.",
} as const satisfies KindHelp;
