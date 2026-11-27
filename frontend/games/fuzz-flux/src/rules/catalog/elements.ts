// The elements, what a board holds beside its fuzzballs: dust on a square,
// a brick or a sleepyhead as a piece of its own, and a cage or a burr on a
// fuzzball. What each does is its rule's.

/** Every element, in the order the levels bring them in. */
export const ELEMENT_IDS = [
  "dust",
  "brick",
  "cage",
  "sleepyhead",
  "burr",
] as const satisfies readonly string[];

/** An element, such as "cage". */
export type ElementId = (typeof ELEMENT_IDS)[number];

/** Every count of layers a square's dust can have, from none. */
export const DUST_LAYERS = [0, 1, 2] as const satisfies readonly number[];

/** How many layers of dust a square has. */
export type DustLayers = (typeof DUST_LAYERS)[number];

/** Every count of layers a brick can have, its hits left. */
export const BRICK_LAYERS = [1, 2, 3, 4] as const satisfies readonly number[];

/** How many layers a brick has left. */
export type BrickLayers = (typeof BRICK_LAYERS)[number];
