import type { KindHelp } from "../kinds";

/** The plated brick, as the shell lists it. */
export const PLATED_HELP = {
  about: "Takes 2 or 3 strikes. A bounce off its steel doesn't count.",
} as const satisfies KindHelp;
