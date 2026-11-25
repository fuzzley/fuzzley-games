// The kinds of brick the shell lists, with what each does, each one's words
// in a file of its own in kinds/, so a change that draws a kind and brings
// it into play adds a file and a line here.

import type { KindWords } from "@fz/brick-wall/app/panels";
import type { Wall as WallOf } from "@fz/brick-wall/rules/wall";
import { isKeyOf, isOneOf } from "@fz/core/records";
import {
  KIND_IDS,
  type KindId,
  type Wall,
  kindOf,
} from "../../rules/catalog/kinds";
import { describeKind } from "../../rules/run/describe";
import { BRICK_HELP } from "./kinds/brick";
import { GEM_HELP } from "./kinds/gem";
import { HATCH_HELP } from "./kinds/hatch";
import { PORTAL_HELP } from "./kinds/portal";
import { RAMP_HELP } from "./kinds/ramp";
import { SPRING_HELP } from "./kinds/spring";
import { STEEL_HELP } from "./kinds/steel";
import { TOUGH_HELP } from "./kinds/tough";

/** Describes a kind of brick as the shell lists it. */
export interface KindHelp {
  /** What it does, a verb first, with a second sentence only for a number or a catch. */
  readonly about: string;
}

/** Every kind of brick the shell lists, by id. */
export const HELP_KINDS = {
  brick: BRICK_HELP,
  tough: TOUGH_HELP,
  steel: STEEL_HELP,
  ramp: RAMP_HELP,
  hatch: HATCH_HELP,
  spring: SPRING_HELP,
  gem: GEM_HELP,
  portal: PORTAL_HELP,
} as const satisfies Partial<Readonly<Record<KindId, KindHelp>>>;

/** The id of a kind of brick the shell lists, such as "steel". */
export type HelpKindId = keyof typeof HELP_KINDS;

/** Every kind of brick the shell lists, in the catalog's order. */
export const HELP_KIND_IDS: readonly HelpKindId[] = KIND_IDS.filter(
  (id): id is HelpKindId => isKeyOf(id, HELP_KINDS),
);

/** Returns a kind of brick's name and what it does, as the shell lists it. */
export function kindWords(id: HelpKindId): KindWords {
  return { name: kindOf(id).name, about: HELP_KINDS[id].about };
}

/**
 * Returns what a kind of brick does, as the Ready card says it of the kind
 * a level brings in: the shell's line for a kind it lists, so a kind reads
 * the same wherever the shell names it, and the rules' own for any other.
 */
export function kindAbout(kind: KindId): string {
  return isKeyOf(kind, HELP_KINDS)
    ? HELP_KINDS[kind].about
    : describeKind(kind);
}

/**
 * Returns whether a wall holds only kinds of brick the shell lists, as
 * every level's does, so In this wall can name each of them.
 */
export function holdsListedKinds(wall: Wall): wall is WallOf<HelpKindId> {
  return wall.bricks.every(
    (brick) => brick === null || isOneOf(brick.kind, HELP_KIND_IDS),
  );
}

/** Holds the pictures of the kinds of brick the scene baked, by id, each a URL. */
type BakedPictures = Partial<Readonly<Record<KindId, string>>>;

/**
 * Returns the pictures of the kinds of brick the scene baked, as the
 * shell's lists show them, or null while a kind they list has none, so a
 * list shows every kind's picture or none.
 */
export function kindPictures(
  bricks: BakedPictures,
): Readonly<Record<HelpKindId, string>> | null {
  return hasEveryKind(bricks) ? bricks : null;
}

/** Returns whether the scene baked a picture of every kind the shell lists. */
function hasEveryKind(
  bricks: BakedPictures,
): bricks is BakedPictures & Readonly<Record<HelpKindId, string>> {
  return HELP_KIND_IDS.every((id) => bricks[id] !== undefined);
}
