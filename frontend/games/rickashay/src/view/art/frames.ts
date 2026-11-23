// The names of the atlas's frames, the art's and the scene's one list of
// them, as the design's "Look" draws each kind and the fuzzball: the art
// bakes a frame under each name, and the scene draws a frame by its name.

/** Every ink a palette gives the tiles and the gems, by a brick's tint, in order. */
export const INKS = [
  0, 1, 2, 3, 4, 5, 6, 7,
] as const satisfies readonly number[];

/** One of the eight inks. */
export type Ink = (typeof INKS)[number];

/** Every count of pips a tough brick shows, its hits left, in order. */
export const PIPS = [2, 3, 4, 5, 6] as const satisfies readonly number[];

/** How many pips a tough brick shows. */
export type Pips = (typeof PIPS)[number];

/** Every count of cracks a tough brick shows, the hits it has taken, in order. */
export const CRACKS = [1, 2, 3, 4, 5] as const satisfies readonly number[];

/** How many cracks a tough brick shows. */
export type Cracks = (typeof CRACKS)[number];

/** Every corner of its cell a ramp's right angle sits in, as its plates name the faces of its short sides, in the legend's order: L, J, F, 7. */
export const RAMP_CORNERS = [
  "floorward-left",
  "floorward-right",
  "ceilingward-left",
  "ceilingward-right",
] as const satisfies readonly string[];

/** Names the corner a ramp's right angle sits in. */
export type RampCorner = (typeof RAMP_CORNERS)[number];

/** Every count of dots a hatch's bar shows, the holds the hatches have left between them, in order. */
export const HATCH_HOLDS = [1, 2, 3] as const satisfies readonly number[];

/** How many dots a hatch's bar shows. */
export type HatchHolds = (typeof HATCH_HOLDS)[number];

/** Every mark that tells a wall's two pairs of portals apart: a dot on the first pair's rings, a diamond on the second's. */
export const PORTAL_MARKS = [1, 2] as const satisfies readonly number[];

/** Tells a pair of portals from the other. */
export type PortalMark = (typeof PORTAL_MARKS)[number];

/** Every set of faces a plated brick's plates cover, as the levels plate them: its lower face, or that and both its sides. */
export const PLATINGS = [
  "floorward",
  "floorward-sides",
] as const satisfies readonly string[];

/** Names the faces a plated brick's plates cover. */
export type Plating = (typeof PLATINGS)[number];

/** Every count of hits left a plated brick's frame shows, in order. */
export const PLATED_HITS = [1, 2, 3] as const satisfies readonly number[];

/** How many hits a plated brick's frame shows it has left. */
export type PlatedHits = (typeof PLATED_HITS)[number];

/** Every count of pips a moss brick's frame shows, its hits left; one with a hit left shows none. */
export const MOSS_HITS = [2, 3] as const satisfies readonly number[];

/** How many pips a moss brick's frame shows. */
export type MossHits = (typeof MOSS_HITS)[number];

/** Every count of bolts a lock has, its slots, in order. */
export const BOLTS = [1, 2, 3] as const satisfies readonly number[];

/** How many bolts a lock has. */
export type Bolts = (typeof BOLTS)[number];

/**
 * Every look of a lock, by its bolts: its bolts and how many of them are
 * still shut, from none, an open lock's, to all, a slot standing empty once
 * its bolt is back.
 */
export const LOCK_LOOKS = {
  1: ["1-0", "1-1"],
  2: ["2-0", "2-1", "2-2"],
  3: ["3-0", "3-1", "3-2", "3-3"],
} as const satisfies {
  readonly [B in Bolts]: readonly `${B}-${0 | Bolts}`[];
};

/** A lock's look, such as "3-1", a lock of 3 bolts with 1 still shut. */
export type LockLook = (typeof LOCK_LOOKS)[Bolts][number];

/** Every lift of the fuzzball's fur, by its flight's rally: 0 waiting and to a rally of 9, then 1, 2 and 3 from each of `RALLY_MARKS`. */
export const FURS = [0, 1, 2, 3] as const satisfies readonly number[];

/** How far the fuzzball's fur has lifted. */
export type Fur = (typeof FURS)[number];

/**
 * The names of the atlas's frames: a builder for each family of frames, and
 * the name of each frame that stands alone.
 */
export const FRAMES = {
  /** The plain tile in an ink, a brick's, and a tough brick's under its pips and cracks. */
  tile: (ink: Ink) => `tile-${ink}` as const,
  pips: (pips: Pips) => `pips-${pips}` as const,
  cracks: (cracks: Cracks) => `cracks-${cracks}` as const,
  steel: "steel",
  /** A ramp's steel wedge, its right angle in a corner of its cell. */
  ramp: (corner: RampCorner) => `ramp-${corner}` as const,
  /** A hatch's bar with a dot for each hold left, and its chevrons under it. */
  hatch: (holds: HatchHolds) => `hatch-${holds}` as const,
  /** A hatch swung open: two short posts at its cell's sides, the bar gone, the chevrons left. */
  hatchOpen: "hatch-open",
  spring: "spring",
  /** A gem on its point, in an ink. */
  gem: (ink: Ink) => `gem-${ink}` as const,
  portal: (mark: PortalMark) => `portal-${mark}` as const,
  /** A plated brick's plates for its plating, and its pips for its hits left, over its tile. */
  plated: (plating: Plating, hits: PlatedHits) =>
    `plated-${plating}-${hits}` as const,
  /** The scalloped cap of moss over a moss brick's tile. */
  mossCap: "moss-cap",
  /** A moss brick's pips for its hits left, below its cap. */
  moss: (hits: MossHits) => `moss-${hits}` as const,
  /** A lock's tile and a slot for each of its bolts, those still shut in theirs. */
  lock: (look: LockLook) => `lock-${look}` as const,
  /** The fuzzball, its fur lifted by its rally. */
  fuzzball: (fur: Fur) => `fuzzball-${fur}` as const,
  /** The hot shot, red-hot under a crown of flame. */
  hotShot: "hot-shot",
  /** The fuzzball's eyes, about its body's middle, which the scene moves the way it flies. */
  eyes: "fuzzball-eyes",
  /** A dot of the guide, and its ring at each turn. */
  guideDot: "guide-dot",
  guideRing: "guide-ring",
  /** A floor bounce's spring in the floor's band: grey until earned, lit while held. */
  bounceOff: "bounce-off",
  bounceOn: "bounce-on",
} as const;

/** A frame's name, such as "tile-3" or "steel". */
export type FrameName = {
  readonly [K in keyof typeof FRAMES]: (typeof FRAMES)[K] extends (
    ...values: never
  ) => infer Name
    ? Name
    : (typeof FRAMES)[K];
}[keyof typeof FRAMES];

/** Every frame the atlas holds, each family's in the order of its builder's arguments. */
export const FRAME_NAMES: readonly FrameName[] = [
  ...INKS.map((ink) => FRAMES.tile(ink)),
  ...PIPS.map((pips) => FRAMES.pips(pips)),
  ...CRACKS.map((cracks) => FRAMES.cracks(cracks)),
  FRAMES.steel,
  ...RAMP_CORNERS.map((corner) => FRAMES.ramp(corner)),
  ...HATCH_HOLDS.map((holds) => FRAMES.hatch(holds)),
  FRAMES.hatchOpen,
  FRAMES.spring,
  ...INKS.map((ink) => FRAMES.gem(ink)),
  ...PORTAL_MARKS.map((mark) => FRAMES.portal(mark)),
  ...PLATINGS.flatMap((plating) =>
    PLATED_HITS.map((hits) => FRAMES.plated(plating, hits)),
  ),
  FRAMES.mossCap,
  ...MOSS_HITS.map((hits) => FRAMES.moss(hits)),
  ...BOLTS.flatMap((bolts) =>
    LOCK_LOOKS[bolts].map((look) => FRAMES.lock(look)),
  ),
  ...FURS.map((fur) => FRAMES.fuzzball(fur)),
  FRAMES.hotShot,
  FRAMES.eyes,
  FRAMES.guideDot,
  FRAMES.guideRing,
  FRAMES.bounceOff,
  FRAMES.bounceOn,
];
