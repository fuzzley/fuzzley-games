/** Names something a brick does beyond taking hits, with its settings. */
export type BrickTrait =
  /** Never breaks, stops a fire ball, and stops laser bolts. */
  | { readonly kind: "hard" }
  /** Breaks the bricks around it a beat after it breaks. */
  | { readonly kind: "blasts"; readonly delayMs: number }
  /** Always lets a capsule fall, the level's pinned one or one drawn. */
  | { readonly kind: "gives" }
  /** Shows only as a faint outline until it is first hit. */
  | { readonly kind: "hidden" }
  /** Grows back a while after it breaks, once no ball is in its place. */
  | { readonly kind: "regrows"; readonly afterMs: number };

/** Describes a kind of brick: what breaking it takes, and what it does. */
export interface BrickKind {
  /** Names it in How to play, such as "Steel brick". */
  readonly name: string;
  /** Says what it does, in a sentence for How to play. */
  readonly about: string;
  /** How many hits break it, or "never". */
  readonly hits: number | "never";
  /** The most hits a level's legend may give it, where it may give more. */
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
    about: "Never breaks, and turns every ball and bolt.",
    hits: "never",
    mostHits: 0,
    needed: false,
    points: 0,
    traits: [{ kind: "hard" }],
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
} as const satisfies Readonly<Record<string, BrickKind>>;

/** A brick kind's id, such as "steel". */
export type BrickKindId = keyof typeof BRICK_KINDS;

/** Every brick kind's id, in How to play's order. */
// Object.keys() types its keys as strings; the catalog's keys are its ids.
export const BRICK_KIND_IDS = Object.keys(
  BRICK_KINDS,
) as readonly BrickKindId[];

/** Returns a brick kind, as the shape every kind has. */
export function brickKind(id: BrickKindId): BrickKind {
  return BRICK_KINDS[id];
}

/** Returns whether a brick kind has a trait of a kind. */
export function hasTrait(id: BrickKindId, trait: BrickTrait["kind"]): boolean {
  return brickKind(id).traits.some((each) => each.kind === trait);
}
