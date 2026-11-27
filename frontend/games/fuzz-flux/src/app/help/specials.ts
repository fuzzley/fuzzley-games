// The special fuzzballs How to play lists, and what each pair of them does
// swapped together, each number in their words the rules' own.

import type { HelpEntry } from "@fz/game-ui/help_catalog";
import type { MadeId } from "../../rules/catalog/specials";
import {
  DASHER_AND_PUFFER_SPREAD,
  PUFFER_REACH,
  TWO_PUFFERS_REACH,
  TWO_WISPS_FLIGHTS,
} from "../../rules/tuning";
import type { Pictures } from "../../scene/pictures";
import { type CatalogHelp, catalogEntries } from "./catalog_entries";

/** A special How to play lists: what a bunch can leave, a dasher whichever way it runs. */
type SpecialHelpId = "dasher" | Exclude<MadeId, `dasher-${string}`>;

/** Every special fuzzball and the frizzball, by id, in the order the levels bring them in. */
const HELP_SPECIALS = {
  dasher: {
    name: "Dasher",
    about: "Clears its row or its column, the way its streaks point.",
    pictureIn: (pictures) => pictures.specials["dasher-across"],
  },
  wisp: {
    name: "Wisp",
    about: "Floats to the square that most helps a goal, and clears it.",
    pictureIn: (pictures) => pictures.specials.wisp,
  },
  puffer: {
    name: "Puffer",
    about: `Clears every square within ${String(PUFFER_REACH)} steps.`,
    pictureIn: (pictures) => pictures.specials.puffer,
  },
  frizzball: {
    name: "Frizzball",
    about:
      "Swapped with a fuzzball, clears every fuzzball of that kind. Set off another way, it clears the commonest kind.",
    pictureIn: (pictures) => pictures.frizzball,
  },
} as const satisfies Readonly<Record<SpecialHelpId, CatalogHelp>>;

/** Returns How to play's entries for the special fuzzballs, each with its picture once the scene has drawn them. */
export function specialEntries(
  pictures: Pictures | null,
): readonly HelpEntry[] {
  return catalogEntries(HELP_SPECIALS, pictures);
}

/** Describes a row of a table How to play shows: what it names, and what that does or leaves. */
export interface HelpRow {
  readonly what: string;
  readonly does: string;
}

/** What each bunch leaves, from the smallest. */
export const BUNCHES: readonly HelpRow[] = [
  { what: "3 in a line", does: "Nothing" },
  { what: "4 in a line", does: "A dasher" },
  { what: "4 in a square", does: "A wisp" },
  { what: "5 or more in an L or a T", does: "A puffer" },
  { what: "5 or more in a line", does: "A frizzball" },
];

/** How many rows, and as many columns, a dasher and a puffer swapped together clear: their own and as many either side as they spread to. */
const PAIRED_LINES = String(2 * DASHER_AND_PUFFER_SPREAD + 1);

/** What each pair of specials does swapped together, in the order the rules list them. */
export const PAIRS: readonly HelpRow[] = [
  { what: "Dasher and dasher", does: "Clears the row and the column" },
  {
    what: "Dasher and puffer",
    does: `Clears ${PAIRED_LINES} rows and ${PAIRED_LINES} columns`,
  },
  {
    what: "Puffer and puffer",
    does: `Clears every square within ${String(TWO_PUFFERS_REACH)} steps`,
  },
  {
    what: "Wisp and wisp",
    does: `Sends ${String(TWO_WISPS_FLIGHTS)} wisps, each to a square of its own`,
  },
  {
    what: "Wisp and dasher or puffer",
    does: "Carries the other to the wisp's square, where it goes off",
  },
  {
    what: "Frizzball and a special",
    does: "Turns every fuzzball of the special's kind into that special, and sets them all off",
  },
  { what: "Frizzball and frizzball", does: "Clears the whole board" },
];
