// The things on a board beside its fuzzballs that How to play lists: the
// gaps, then each element whose rule is in play, in the order the levels
// bring them in. Each one's words are in a file of its own in entries/, so
// the change that brings an element into play adds a file and a line here,
// and fails to compile until it does.

import type { HelpEntry } from "@fz/game-ui/help_catalog";
import type { ElementId } from "../../rules/catalog/elements";
import type { STAND_INS } from "../../rules/elements/element_rules";
import type { Pictures } from "../../scene/pictures";
import { type CatalogHelp, catalogEntries } from "./catalog_entries";
import { BRICK_HELP } from "./entries/brick";
import { BURR_HELP } from "./entries/burr";
import { CAGE_HELP } from "./entries/cage";
import { DUST_HELP } from "./entries/dust";
import { GAP_HELP } from "./entries/gap";
import { SLEEPYHEAD_HELP } from "./entries/sleepyhead";

/** A thing How to play lists: a gap, or an element whose rule is in play. */
type ThingId = "gap" | Exclude<ElementId, (typeof STAND_INS)[number]>;

/** Every thing How to play lists, by id, in the order the levels bring them in. */
const HELP_THINGS = {
  gap: GAP_HELP,
  dust: DUST_HELP,
  brick: BRICK_HELP,
  cage: CAGE_HELP,
  sleepyhead: SLEEPYHEAD_HELP,
  burr: BURR_HELP,
} as const satisfies Readonly<Record<ThingId, CatalogHelp>>;

/** Returns How to play's entries for the things on a board, each with its picture once the scene has drawn them. */
export function thingEntries(pictures: Pictures | null): readonly HelpEntry[] {
  return catalogEntries(HELP_THINGS, pictures);
}
