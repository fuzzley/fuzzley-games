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
  | { readonly kind: "jumps" }
  /**
   * Steps a cell along its row on the field's beat, with the sliders it
   * touches heading its way, and turns at a wall or a brick.
   */
  | { readonly kind: "slides" };

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
    about: "Takes 1 hit.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 50,
    traits: [],
  },
  tough: {
    name: "Tough brick",
    about: "Takes 2 to 4 hits. The pips show how many are left.",
    hits: 2,
    mostHits: 4,
    needed: true,
    points: 50,
    traits: [],
  },
  steel: {
    name: "Steel brick",
    about: "Can't be broken. Balls bounce off it, and it blocks laser bolts.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    traits: [],
  },
  blast: {
    name: "Blast brick",
    about: "Takes 1 hit. When it breaks, it hits the 8 bricks around it.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 100,
    traits: [{ kind: "blasts", delayMs: 100 }],
  },
  gift: {
    name: "Gift brick",
    about: "Takes 1 hit, and always drops a capsule.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 100,
    traits: [{ kind: "gives" }],
  },
  ghost: {
    name: "Ghost brick",
    about: "Takes 2 hits. You only see its outline until you hit it.",
    hits: 2,
    mostHits: 2,
    needed: true,
    points: 50,
    traits: [{ kind: "hidden" }],
  },
  regrow: {
    name: "Regrowing brick",
    about: "Grows back after 10 seconds. You don't need to clear it.",
    hits: 1,
    mostHits: 1,
    needed: false,
    points: 20,
    traits: [{ kind: "regrows", afterMs: 10_000 }],
  },
  cage: {
    name: "Cage",
    about: "Takes 2 hits. The friend inside joins you as an extra ball.",
    hits: 2,
    mostHits: 2,
    needed: true,
    points: 50,
    traits: [{ kind: "frees" }],
  },
  plated: {
    name: "Plated brick",
    about:
      "Takes 1 or 2 hits from above or the side. From below, balls bounce off its plate.",
    hits: 1,
    mostHits: 2,
    needed: true,
    points: 50,
    traits: [{ kind: "plated" }],
  },
  key: {
    name: "Key brick",
    about: "Takes 1 hit. Break every key to open the gates.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 100,
    traits: [{ kind: "unlocks" }],
  },
  gate: {
    name: "Gate",
    about: "Can't be broken. Opens when you break every key.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    traits: [{ kind: "locked" }],
  },
  bumper: {
    name: "Bumper",
    about:
      "Can't be broken. It's round, so a ball can bounce off it in any direction.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    traits: [{ kind: "bumps" }],
  },
  portal: {
    name: "Portal",
    about:
      "Can't be broken. Sends the ball out of the matching portal, going the same way.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    traits: [{ kind: "jumps" }],
  },
  slider: {
    name: "Slider",
    about:
      "Takes 1 hit. Moves along its row and turns around at a wall or a brick.",
    hits: 1,
    mostHits: 1,
    needed: true,
    points: 50,
    traits: [{ kind: "slides" }],
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
