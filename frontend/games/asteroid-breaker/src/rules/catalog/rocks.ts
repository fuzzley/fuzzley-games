import { isKeyOf, isOneOf, keysOf } from "@fz/core/records";

/** The sizes a rock comes in, largest first; a rock breaks into pieces of the size after its own. */
export const ROCK_SIZES = ["boulder", "large", "medium", "small"] as const;

/** Names a size of rock, such as "medium". */
export type RockSize = (typeof ROCK_SIZES)[number];

/** Returns whether a value names a size of rock, as a wave's file may. */
export function isRockSize(value: unknown): value is RockSize {
  return isOneOf(value, ROCK_SIZES);
}

/** Returns the size a rock's pieces are, the size after its own, or null for a small rock, which breaks into nothing. */
export function sizeAfter(size: RockSize): RockSize | null {
  return ROCK_SIZES[ROCK_SIZES.indexOf(size) + 1] ?? null;
}

/** Gives a number for each size a kind of rock comes in, such as its hits. */
export type BySize = Readonly<Partial<Record<RockSize, number>>>;

/** Names something a rock does beyond breaking, with its settings. */
export type RockTrait =
  /**
   * Gives every rock within its reach a hit as it breaks, a beat after,
   * which can set off another; it never hurts the ship.
   */
  | {
      readonly kind: "blasts";
      /** How far its blast reaches at each size it comes in. */
      readonly reach: BySize;
      readonly delayMs: number;
    }
  /** Always lets a pickup go as it breaks. */
  | { readonly kind: "gives" }
  /** Drifts toward the ship, never past its size's speed. */
  | {
      readonly kind: "drawn";
      /** How much faster it drifts toward the ship each second, in units a second. */
      readonly pull: number;
    }
  /** Rings a shot off that doesn't break it. */
  | { readonly kind: "rings" };

/** A rock trait's kind, such as "blasts". */
export type RockTraitKind = RockTrait["kind"];

/** Names what a rock's pieces are: itself, stone, or the kind its wave names. */
export type PieceKind = "self" | "stone" | "wave";

/** Describes a kind of rock: its sizes, what breaking it takes and what it does. */
export interface RockKind {
  /** Names it in How to play, such as "Iron". */
  readonly name: string;
  /** Says what it does, in a sentence for How to play. */
  readonly about: string;
  /** The hits that break it at each size it comes in. */
  readonly hits: BySize;
  /**
   * What it breaks into, pieces of the size after its own, by kind and
   * count: itself, stone, or the kind its wave names; null for a kind that
   * breaks into nothing at any size. A small rock breaks into nothing
   * whatever this says.
   */
  readonly splits: {
    readonly into: PieceKind;
    readonly count: number;
  } | null;
  /**
   * Its speed against its size's; the boulder's size is slower than a large
   * rock's, so its kind needs no factor of its own.
   */
  readonly speed: number;
  /** What it scores at each size it comes in. */
  readonly points: BySize;
  /** What it does beyond breaking. */
  readonly traits: readonly RockTrait[];
}

/** Every kind of rock a wave can hold, by id, in How to play's order. */
export const ROCK_KINDS = {
  stone: {
    name: "Stone",
    about: "Breaks into two smaller rocks, and a small one into nothing.",
    hits: { large: 1, medium: 1, small: 1 },
    splits: { into: "self", count: 2 },
    speed: 1,
    points: { large: 10, medium: 20, small: 40 },
    traits: [],
  },
  crystal: {
    name: "Crystal",
    about: "Always lets a pickup go, and breaks into two stones.",
    hits: { large: 1, medium: 1 },
    splits: { into: "stone", count: 2 },
    speed: 1,
    points: { large: 20, medium: 40 },
    traits: [{ kind: "gives" }],
  },
  ice: {
    name: "Ice",
    about: "Shatters into three smaller, faster pieces.",
    hits: { large: 1, medium: 1, small: 1 },
    splits: { into: "self", count: 3 },
    speed: 1.25,
    points: { large: 15, medium: 30, small: 50 },
    traits: [],
  },
  boulder: {
    name: "Boulder",
    about: "Ends each sector: six hits break it into three large rocks.",
    hits: { boulder: 6 },
    splits: { into: "wave", count: 3 },
    speed: 1,
    points: { boulder: 200 },
    traits: [],
  },
  iron: {
    name: "Iron",
    about:
      "Takes several hits until it is small; a shot that doesn't break it rings off.",
    hits: { large: 3, medium: 2, small: 1 },
    splits: { into: "self", count: 2 },
    speed: 0.75,
    points: { large: 30, medium: 60, small: 90 },
    traits: [{ kind: "rings" }],
  },
  volatile: {
    name: "Volatile",
    about:
      "Blasts as it breaks: every rock near it takes a hit, which can set off another.",
    hits: { large: 1, medium: 1 },
    splits: null,
    speed: 0.9,
    points: { large: 40, medium: 60 },
    traits: [{ kind: "blasts", reach: { large: 6, medium: 4 }, delayMs: 90 }],
  },
  lodestone: {
    name: "Lodestone",
    about: "Drifts toward the ship, a little more each second.",
    hits: { large: 2, medium: 1, small: 1 },
    splits: { into: "self", count: 2 },
    speed: 1,
    points: { large: 25, medium: 50, small: 80 },
    traits: [{ kind: "drawn", pull: 1 }],
  },
} as const satisfies Readonly<Record<string, RockKind>>;

/** A rock kind's id, such as "iron". */
export type RockKindId = keyof typeof ROCK_KINDS;

/** Every rock kind's id, in How to play's order. */
export const ROCK_KIND_IDS = keysOf(ROCK_KINDS);

/** Returns whether a value names a kind of rock, as a wave's file may. */
export function isRockKindId(value: unknown): value is RockKindId {
  return isKeyOf(value, ROCK_KINDS);
}

/** Returns a rock kind, as the shape every kind has. */
export function rockKind(id: RockKindId): RockKind {
  return ROCK_KINDS[id];
}

/**
 * Returns the points a rock of a kind and size scores as it breaks.
 *
 * @throws {RangeError} When its kind doesn't come in the size.
 */
export function pointsFor(id: RockKindId, size: RockSize): number {
  const points = rockKind(id).points[size];
  if (points === undefined) {
    throw new RangeError(`A ${id} rock doesn't come ${size}.`);
  }
  return points;
}

/** Returns whether a kind of rock has a trait. */
export function hasTrait(id: RockKindId, kind: RockTraitKind): boolean {
  return rockKind(id).traits.some((trait) => trait.kind === kind);
}
