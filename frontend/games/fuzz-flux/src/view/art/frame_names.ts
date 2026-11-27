// The names of the atlas's frames, the one list the art draws, the scene
// bakes and the view's tracks and effects name: each body once a pose, the
// eyes apart from it a face, the squares and what lies on them, and the
// effects' kit.

import { FUZZBALL_FACES, type FuzzballFace } from "@fz/style/fuzzball";
import {
  BRICK_LAYERS,
  type BrickLayers,
  type DustLayers,
} from "../../rules/catalog/elements";
import { KIND_IDS, type KindId } from "../../rules/catalog/kinds";
import { SPECIAL_IDS, type SpecialId } from "../../rules/catalog/specials";

/** Every fur a fuzzball's body is drawn in: its own alone, or a special's second fur behind it. */
export const FURS = ["plain", ...SPECIAL_IDS] as const satisfies readonly (
  "plain" | SpecialId
)[];

/** A body's fur, such as "puffer". */
export type Fur = (typeof FURS)[number];

/** Every way a body's fur stands: at rest, or on end with static, the sign that something is about to happen to it. */
export const LIFTS = ["rest", "on-end"] as const satisfies readonly string[];

/** How a body's fur stands. */
export type Lift = (typeof LIFTS)[number];

/** Every count of layers of dust a square shows. */
export const DUSTY = [1, 2] as const satisfies readonly DustLayers[];

/** How many layers of dust a square shows. */
export type Dusty = (typeof DUSTY)[number];

/** Every count a wave's mark shows, from "×2" to "×9". */
export const TIMES = [
  2, 3, 4, 5, 6, 7, 8, 9,
] as const satisfies readonly number[];

/** The count a wave's mark shows. */
export type Times = (typeof TIMES)[number];

/** The names of the atlas's frames: a builder for each family of frames, and the name of each frame that stands alone. */
export const FRAMES = {
  /** A fuzzball's body, its kind's silhouette in its ink, in a fur that stands at rest or on end. */
  body: (kind: KindId, fur: Fur, lift: Lift) =>
    `body-${kind}-${fur}-${lift}` as const,
  /** The frizzball's body. */
  frizzball: "frizzball",
  /** A sleepyhead's body, in its nightcap. */
  sleepyhead: "sleepyhead",
  /** A fuzzball's eyes in a face, which the scene moves as they look. */
  eyes: (face: FuzzballFace) => `eyes-${face}` as const,
  /** The frizzball's eyes in a face, in the palette's color for them, which the scene moves as they look. */
  frizzballEyes: (face: FuzzballFace) => `frizzball-eyes-${face}` as const,
  /** A square's well. */
  square: "square",
  /** A square's dust, paler for each layer. */
  dust: (layers: Dusty) => `dust-${layers}` as const,
  /** A brick's pile of felt cushions, a cushion a layer left. */
  brick: (layers: BrickLayers) => `brick-${layers}` as const,
  /** A pile's top cushion knocked off, in the shade and the size it has on top of a pile of its layers. */
  cushion: (layers: BrickLayers) => `cushion-${layers}` as const,
  /** A tuft of a cushion's felt, in the shade it has on top of a pile of its layers. */
  cushionTuft: (layers: BrickLayers) => `cushion-tuft-${layers}` as const,
  /** The button a brick's last cushion throws up as it bursts. */
  button: "button",
  /** A cage's four steel bars in their frame, over its fuzzball. */
  cage: "cage",
  /** A bar of a cage opened, flying as a hard bit. */
  cageBar: "cage-bar",
  /** A burr's ring of thorns, behind its fuzzball. */
  burr: "burr",
  /** A tuft of a kind's fur. */
  tuft: (kind: KindId) => `tuft-${kind}` as const,
  /** The thin ring that spreads from a bunch and a blast. */
  ring: "ring",
  /** A dasher's streak. */
  streak: "streak",
  /** A frizzball's bolt of static. */
  bolt: "bolt",
  /** The hand that shows a level's first move. */
  hand: "hand",
  /** A line of wind, which a gust sends across the board. */
  gustLine: "gust-line",
  /** A wave's mark, its count after a "×". */
  times: (times: Times) => `times-${times}` as const,
} as const;

/** A frame's name, such as "body-red-wisp-rest" or "cage". */
export type FrameName = {
  readonly [K in keyof typeof FRAMES]: (typeof FRAMES)[K] extends (
    ...values: never
  ) => infer Name
    ? Name
    : (typeof FRAMES)[K];
}[keyof typeof FRAMES];

/** Every frame the atlas holds, each family's in the order of its builder's arguments. */
export const FRAME_NAMES: readonly FrameName[] = [
  ...KIND_IDS.flatMap((kind) =>
    FURS.flatMap((fur) => LIFTS.map((lift) => FRAMES.body(kind, fur, lift))),
  ),
  FRAMES.frizzball,
  FRAMES.sleepyhead,
  ...FUZZBALL_FACES.map((face) => FRAMES.eyes(face)),
  ...FUZZBALL_FACES.map((face) => FRAMES.frizzballEyes(face)),
  FRAMES.square,
  ...DUSTY.map((layers) => FRAMES.dust(layers)),
  ...BRICK_LAYERS.map((layers) => FRAMES.brick(layers)),
  ...BRICK_LAYERS.map((layers) => FRAMES.cushion(layers)),
  ...BRICK_LAYERS.map((layers) => FRAMES.cushionTuft(layers)),
  FRAMES.button,
  FRAMES.cage,
  FRAMES.cageBar,
  FRAMES.burr,
  ...KIND_IDS.map((kind) => FRAMES.tuft(kind)),
  FRAMES.ring,
  FRAMES.streak,
  FRAMES.bolt,
  FRAMES.hand,
  FRAMES.gustLine,
  ...TIMES.map((times) => FRAMES.times(times)),
];
