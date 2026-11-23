import type { KindHelp } from "../kinds";

/** The steel brick, as the shell lists it. */
export const STEEL_HELP = {
  about: "Can't be broken. A bounce off it doesn't add to your rally.",
} as const satisfies KindHelp;
