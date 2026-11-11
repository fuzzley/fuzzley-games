import type { ZapPattern } from "../../rules/flight/events";
import type { Charge } from "../../rules/shot";

/** One of the eight inks a palette gives the tiles, or the fuzzballs of friends. */
export type Ink = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** How many pips a tough brick shows: the hits it has left, 2 to 6. */
export type Pips = 2 | 3 | 4 | 5 | 6;

/** How many cracks a brick shows: the hits it has taken, 1 to 5. */
export type Cracks = 1 | 2 | 3 | 4 | 5;

/** Names a face of a brick a plate may cover. */
export type PlateFace = "floorward" | "ceilingward" | "left" | "right";

/** How many pips a shell's or a moss brick's frame shows: its hits left, 2 or 3. */
export type ThickHits = 2 | 3;

/** Names a zapper's pattern, which its art draws: every pattern but the bomb's blast. */
export type ZapperPattern = Exclude<ZapPattern, "blast">;

/** Tells a wall's two pairs of portals apart: a dot on the first pair's rings, a diamond on the second's. */
export type PortalMark = 1 | 2;

/** Names how a cage looks: whole, or with a bar broken after its first hit. */
export type CageLook = "whole" | "hit";

/**
 * The names of the atlas's frames, the art's and the scene's one list of
 * them: a builder for each family of frames, and the name of each frame
 * that stands alone.
 */
export const FRAMES = {
  /** The plain tile in an ink, which a tough brick's pips and cracks lie over. */
  tile: (ink: Ink) => `tile-${ink}` as const,
  pips: (pips: Pips) => `pips-${pips}` as const,
  cracks: (cracks: Cracks) => `cracks-${cracks}` as const,
  steel: "steel",
  /** One plate, over a tile, on a face. */
  plate: (face: PlateFace) => `plate-${face}` as const,
  /** A shell brick's shell, core and bolt, which its pips lie over. */
  shellBody: "shell-body",
  /** A shell brick's row of pips for its hits left, from 2, over its body: one with a hit left shows none. */
  shell: (hits: ThickHits) => `shell-${hits}` as const,
  /** A moss brick's die of pips for its hits left, from 2, below its cap: one with a hit left shows none. */
  moss: (hits: ThickHits) => `moss-${hits}` as const,
  /** The cap of moss over a moss brick's tile. */
  mossCap: "moss-cap",
  zapper: (pattern: ZapperPattern) => `zapper-${pattern}` as const,
  bomb: "bomb",
  bumper: "bumper",
  prism: "prism",
  portal: (mark: PortalMark) => `portal-${mark}` as const,
  wool: "wool",
  cage: (look: CageLook) => `cage-${look}` as const,
  /** The player's fuzzball, its fur combed by its charge. */
  fuzzball: (charge: Charge) => `fuzzball-${charge}` as const,
  hotShot: "hot-shot",
  friend: (ink: Ink) => `friend-${ink}` as const,
  /** Any fuzzball's eyes, about its body's middle, which the scene moves the way it looks. */
  eyes: "fuzzball-eyes",
  /** A pip of the charge's meter, lit or not. */
  meterOn: "meter-on",
  meterOff: "meter-off",
  /** A dot of the guide, and its outline of a brick the shot would punch through. */
  guideDot: "guide-dot",
  guidePunch: "guide-punch",
} as const;

/** A frame's name, such as "tile-3" or "steel". */
export type FrameName = {
  readonly [K in keyof typeof FRAMES]: (typeof FRAMES)[K] extends (
    argument: never,
  ) => infer Name
    ? Name
    : (typeof FRAMES)[K];
}[keyof typeof FRAMES];

/** Every ink, in order: each tint's tile's, and each friend's. */
export const INKS = [0, 1, 2, 3, 4, 5, 6, 7] as const satisfies readonly Ink[];

/** Every count of pips a frame shows, in order. */
export const PIPS = [2, 3, 4, 5, 6] as const satisfies readonly Pips[];

/** Every count of cracks a frame shows, in order. */
export const CRACKS = [1, 2, 3, 4, 5] as const satisfies readonly Cracks[];

/** Every charge a fuzzball's frame shows, in order. */
export const CHARGES = [0, 1, 2, 3, 4, 5] as const satisfies readonly Charge[];

/** Every count of pips a shell's or a moss brick's frame shows, in order. */
export const THICK_HITS = [2, 3] as const satisfies readonly ThickHits[];

/** Every frame the atlas holds, each family's in the order of its builder's argument. */
export const FRAME_NAMES: readonly FrameName[] = [
  ...INKS.map((ink) => FRAMES.tile(ink)),
  ...PIPS.map((pips) => FRAMES.pips(pips)),
  ...CRACKS.map((cracks) => FRAMES.cracks(cracks)),
  FRAMES.steel,
  ...(["floorward", "ceilingward", "left", "right"] as const).map((face) =>
    FRAMES.plate(face),
  ),
  FRAMES.shellBody,
  ...THICK_HITS.map((hits) => FRAMES.shell(hits)),
  ...THICK_HITS.map((hits) => FRAMES.moss(hits)),
  FRAMES.mossCap,
  ...(["row", "column", "cross", "x"] as const).map((pattern) =>
    FRAMES.zapper(pattern),
  ),
  FRAMES.bomb,
  FRAMES.bumper,
  FRAMES.prism,
  ...([1, 2] as const).map((mark) => FRAMES.portal(mark)),
  FRAMES.wool,
  ...(["whole", "hit"] as const).map((look) => FRAMES.cage(look)),
  ...CHARGES.map((charge) => FRAMES.fuzzball(charge)),
  FRAMES.hotShot,
  ...INKS.map((ink) => FRAMES.friend(ink)),
  FRAMES.eyes,
  FRAMES.meterOn,
  FRAMES.meterOff,
  FRAMES.guideDot,
  FRAMES.guidePunch,
];
