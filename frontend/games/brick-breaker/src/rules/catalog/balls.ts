/** Describes a kind of ball: what its hits do, and how it moves. */
export interface BallKind {
  /** Names it in How to play, such as "Fire ball". */
  readonly name: string;
  /** Says what it does, in a sentence for How to play. */
  readonly about: string;
  /** The hits a brick takes from it, or "breaks" for every hit it has. */
  readonly damage: number | "breaks";
  /** Whether it passes through the bricks it breaks, rather than turning. */
  readonly passes: boolean;
  /** Whether its hits also hit the eight bricks around the one it strikes. */
  readonly reaches: boolean;
  /** Its speed, against a normal ball's. */
  readonly speed: number;
  /** Its size, against a normal ball's. */
  readonly size: number;
}

/** Every kind of ball, by id, in How to play's order. */
export const BALL_KINDS = {
  normal: {
    name: "Ball",
    about: "Bounces off everything, and hits one brick at a time.",
    damage: 1,
    passes: false,
    reaches: false,
    speed: 1,
    size: 1,
  },
  fire: {
    name: "Fire ball",
    about:
      "Breaks every brick it touches that can break, and passes through it.",
    damage: "breaks",
    passes: true,
    reaches: false,
    speed: 1,
    size: 1,
  },
  blast: {
    name: "Blast ball",
    about: "Hits the eight bricks around each brick it strikes.",
    damage: 1,
    passes: false,
    reaches: true,
    speed: 1,
    size: 1,
  },
} as const satisfies Readonly<Record<string, BallKind>>;

/** A ball kind's id, such as "fire". */
export type BallKindId = keyof typeof BALL_KINDS;

/** Every ball kind's id, in How to play's order. */
// Object.keys() types its keys as strings; the catalog's keys are its ids.
export const BALL_KIND_IDS = Object.keys(BALL_KINDS) as readonly BallKindId[];

/** Returns a ball kind, as the shape every kind has. */
export function ballKind(id: BallKindId): BallKind {
  return BALL_KINDS[id];
}
