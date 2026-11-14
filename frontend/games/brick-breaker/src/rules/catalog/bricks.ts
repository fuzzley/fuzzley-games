import { isKeyOf, keysOf } from "@fz/core/records";

/** Names something a brick does beyond taking hits, with its settings. */
export type BrickTrait =
  /** Breaks the bricks around it a beat after it breaks. */
  | { readonly kind: "blasts"; readonly delayMs: number }
  /** Always lets a capsule fall, the level's pinned one or one drawn. */
  | { readonly kind: "gives" }
  /** Shows only as a faint outline until it is first hit. */
  | { readonly kind: "hidden" }
  /** Grows back a while after it breaks, once no ball is in its place. */
  | { readonly kind: "regrows"; readonly afterMs: number }
  /** Frees a friend as it breaks, a ball more, which leaves upward. */
  | { readonly kind: "frees" }
  /**
   * Turns back a ball rising into its underside, its bottom face and
   * corners, and spends a bolt there, taking no hit.
   */
  | { readonly kind: "plated" }
  /** Opens every gate as it breaks, if it was the level's last key. */
  | { readonly kind: "unlocks" }
  /** Stands as steel until the level's last key breaks, then opens. */
  | { readonly kind: "locked" }
  /**
   * Is round, a disc at its cell's middle, off which a ball turns as off a
   * circle, taking no hit; its cell is open about it.
   */
  | { readonly kind: "bumps" }
  /**
   * Is a portal, a disc at its cell's middle: a ball that touches it leaves
   * its twin's middle, going as it went; its cell is open about it.
   */
  | { readonly kind: "jumps" };

/** A brick trait's kind, such as "blasts". */
export type TraitKind = BrickTrait["kind"];

/** Describes a kind of brick: what breaking it takes, and what it does. */
export interface BrickKind {
  /** Names it in How to play, such as "Steel brick". */
  readonly name: string;
  /** Says what it does, in a sentence for How to play. */
  readonly about: string;
  /** How many hits break it, or "never". */
  readonly hits: number | "never";
  /**
   * The most hits a level's legend may give it; without one it takes
   * `hits`. 0 for one that never breaks.
   */
  readonly mostHits: number;
  /** Whether a level needs it broken to be cleared. */
  readonly needed: boolean;
  /** What it scores for each hit it takes. */
  readonly points: number;
  /** What it does beyond taking hits. */
  readonly traits: readonly BrickTrait[];
}

/** Every kind of brick a level can hold, by id, in How to play's order. */
export const BRICK_KINDS = {
  plain: {
    name: "Brick",
    about: "Breaks at a hit.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 50,
    traits: [],
  },
  tough: {
    name: "Tough brick",
    about: "Takes two to four hits, a pip for each one left.",
    hits: 2,
    mostHits: 4,
    needed: true,
    points: 50,
    traits: [],
  },
  steel: {
    name: "Steel brick",
    about: "Never breaks: it turns every ball and stops every bolt.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    traits: [],
  },
  blast: {
    name: "Blast brick",
    about: "Breaks, and hits the eight bricks around it.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 100,
    traits: [{ kind: "blasts", delayMs: 100 }],
  },
  gift: {
    name: "Gift brick",
    about: "Always lets a capsule fall.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 100,
    traits: [{ kind: "gives" }],
  },
  ghost: {
    name: "Ghost brick",
    about:
      "Shows as a faint outline until it is first hit, then takes one more.",
    hits: 2,
    mostHits: 2,
    needed: true,
    points: 50,
    traits: [{ kind: "hidden" }],
  },
  regrow: {
    name: "Regrowing brick",
    about: "Grows back 10 seconds after it breaks; a level doesn't need it.",
    hits: 1,
    mostHits: 1,
    needed: false,
    points: 20,
    traits: [{ kind: "regrows", afterMs: 10_000 }],
  },
  cage: {
    name: "Cage",
    about:
      "Takes two hits: the first bends a bar, the second frees a friend, a ball more.",
    hits: 2,
    mostHits: 2,
    needed: true,
    points: 50,
    traits: [{ kind: "frees" }],
  },
  plated: {
    name: "Plated brick",
    about:
      "Takes one or two hits from above or a side; from below, its plate turns the ball back unhurt.",
    hits: 1,
    mostHits: 2,
    needed: true,
    points: 50,
    traits: [{ kind: "plated" }],
  },
  key: {
    name: "Key brick",
    about:
      "Breaks at a hit; the hit that breaks a level's last key opens every gate.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 100,
    traits: [{ kind: "unlocks" }],
  },
  gate: {
    name: "Gate",
    about:
      "Stands as steel while a key is left, and opens with every gate as the last one breaks; a level doesn't need it.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    traits: [{ kind: "locked" }],
  },
  bumper: {
    name: "Bumper",
    about:
      "Never breaks: it is round, and a ball leaves it at the angle a circle gives.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    traits: [{ kind: "bumps" }],
  },
  portal: {
    name: "Portal",
    about:
      "Never breaks: a ball that touches it leaves its twin, going as it went.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    traits: [{ kind: "jumps" }],
  },
} as const satisfies Readonly<Record<string, BrickKind>>;

/** A brick kind's id, such as "steel". */
export type BrickKindId = keyof typeof BRICK_KINDS;

/** Every brick kind's id, in How to play's order. */
export const BRICK_KIND_IDS = keysOf(BRICK_KINDS);

/** Returns a brick kind, as the shape every kind has. */
export function brickKind(id: BrickKindId): BrickKind {
  return BRICK_KINDS[id];
}

/** Returns whether a value names a brick kind. */
export function isBrickKindId(value: unknown): value is BrickKindId {
  return isKeyOf(value, BRICK_KINDS);
}

/** Returns whether a level needs a brick of a kind broken to be cleared. */
export function isNeeded(id: BrickKindId): boolean {
  return brickKind(id).needed;
}

/** Returns whether a brick kind has a trait of a kind. */
export function hasTrait(id: BrickKindId, kind: TraitKind): boolean {
  return brickKind(id).traits.some((trait) => trait.kind === kind);
}
