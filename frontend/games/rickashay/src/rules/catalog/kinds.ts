// Rickashay's eleven kinds of brick, each one's data in a file of its own
// in kinds/, so a package that brings a kind in adds a file and a line:
// its name, the hits that break it, whether a level needs it broken, the
// characters a level's picture writes it in, the level that brings it in
// and what it does beyond taking hits. What its traits do in a flight, its
// art and its words in How to play are other modules'.

import type {
  Brick as BrickOf,
  Wall as WallOf,
} from "@fz/brick-wall/rules/wall";
import { isOneOf } from "@fz/core/records";
import { BRICK } from "./kinds/brick";
import { GEM } from "./kinds/gem";
import { HATCH } from "./kinds/hatch";
import { LOCK } from "./kinds/lock";
import { MOSS } from "./kinds/moss";
import { PLATED } from "./kinds/plated";
import { PORTAL } from "./kinds/portal";
import { RAMP } from "./kinds/ramp";
import { SPRING } from "./kinds/spring";
import { STEEL } from "./kinds/steel";
import { TOUGH } from "./kinds/tough";

/** Every kind's id, in How to play's order, which is the order the levels bring them in. */
export const KIND_IDS = [
  "brick",
  "tough",
  "steel",
  "ramp",
  "hatch",
  "spring",
  "gem",
  "portal",
  "plated",
  "moss",
  "lock",
] as const satisfies readonly string[];

/** A kind's id, such as "steel". */
export type KindId = (typeof KIND_IDS)[number];

/** Describes a brick of one of the eleven kinds, as it stands this round. */
export type Brick = BrickOf<KindId>;

/** Describes a wall of the eleven kinds' bricks. */
export type Wall = WallOf<KindId>;

/** Names something a kind of brick does beyond taking hits. */
export type Trait =
  /** Never breaks, so a level doesn't need it, and a turn off it is no strike: steel, a ramp, a hatch, a portal. */
  | { readonly kind: "never" }
  /**
   * Fills half its cell, a steel wedge whose two short sides lie along the
   * faces its brick's `plates` name and whose long face, at 45°, turns a
   * flight a quarter turn: a ramp.
   */
  | { readonly kind: "slants" }
  /**
   * Is a bar along the top of its cell that a fuzzball flying up passes as
   * air and one coming down is turned back up by, until the hatches have
   * held a flight `FlightRules.hatchHolds` times between them: a hatch.
   */
  | { readonly kind: "holds" }
  /** Gives the flight a floor bounce as it breaks: a spring brick. */
  | { readonly kind: "springs" }
  /** Stands on its point, all four of its faces at 45°, each turning a flight as a cut corner does: a gem. */
  | { readonly kind: "faceted" }
  /** Sends a fuzzball whose middle crosses into its eye out of its twin's, flying the same way: a portal. */
  | { readonly kind: "teleports" }
  /** Is plated on the faces its brick's `plates` name, where a strike takes nothing: a plated brick. */
  | { readonly kind: "plated" }
  /** Grows a hit back after each round it survives, up to what it began with: a moss brick. */
  | { readonly kind: "regrows" }
  /** Stays shut, a strike taking nothing, until the flight's turns have slid back each of its bolts: a lock. */
  | { readonly kind: "bolted" };

/** A trait's kind, such as "holds". */
export type TraitKind = Trait["kind"];

/** Describes a kind of brick: what breaking it takes, how a level writes it, and what it does. */
export interface Kind {
  /** Names it in How to play, such as "Steel brick". */
  readonly name: string;
  /** How many hits break it, the fewest its characters give it, or "never". */
  readonly hits: number | "never";
  /** The most hits its characters give it: 0 for one that never breaks. */
  readonly mostHits: number;
  /** Whether a level needs it broken to be cleared. */
  readonly needed: boolean;
  /** The characters a level's picture writes it in, each one the legend reads as a brick of this kind. */
  readonly letters: readonly string[];
  /** The number of the level that brings it in, which no level before it uses. */
  readonly firstLevel: number;
  /** What it does beyond taking hits. */
  readonly traits: readonly Trait[];
}

/** Every kind of brick a level can hold, by id, in How to play's order. */
export const KINDS = {
  brick: BRICK,
  tough: TOUGH,
  steel: STEEL,
  ramp: RAMP,
  hatch: HATCH,
  spring: SPRING,
  gem: GEM,
  portal: PORTAL,
  plated: PLATED,
  moss: MOSS,
  lock: LOCK,
} as const satisfies Readonly<Record<KindId, Kind>>;

/** Returns a kind of brick, as the shape every kind has. */
export function kindOf(id: KindId): Kind {
  return KINDS[id];
}

/** Returns whether a value names one of the eleven kinds. */
export function isKindId(value: unknown): value is KindId {
  return isOneOf(value, KIND_IDS);
}

/** Returns whether a kind of brick has a trait of a kind. */
export function hasTrait(id: KindId, trait: TraitKind): boolean {
  return kindOf(id).traits.some(({ kind }) => kind === trait);
}

/** Returns the kind of brick a level brings in, or null for a level that brings none in. */
export function kindIntroducedAt(level: number): KindId | null {
  return KIND_IDS.find((id) => kindOf(id).firstLevel === level) ?? null;
}
