// What a square can hold: a fuzzball, the frizzball, a brick or a
// sleepyhead. Each has an id it keeps for as long as it is on the board, so
// the record and the view can follow it from square to square.

import type { BrickLayers } from "./elements";
import type { KindId } from "./kinds";
import type { SpecialId } from "./specials";

/**
 * Describes a fuzzball, plain or special, and the cage or the burr a plain
 * one may wear.
 *
 * No special is caged or burred: a bunch that makes one frees it, and no
 * cage or burr comes to one after.
 */
export interface Fuzzball {
  readonly what: "fuzzball";
  readonly id: number;
  readonly kind: KindId;
  /** The special fur it wears, in the board's own frame, or null for a plain fuzzball. */
  readonly special: SpecialId | null;
  /** Whether it is caged, which keeps it from being swapped or falling. */
  readonly caged: boolean;
  /** Whether it wears a burr, which keeps it from being swapped. */
  readonly burred: boolean;
}

/** Describes the frizzball, which has no kind until it goes off. */
export interface Frizzball {
  readonly what: "frizzball";
  readonly id: number;
}

/** Describes a brick, which never moves, a layer coming off at each hit. */
export interface Brick {
  readonly what: "brick";
  readonly id: number;
  readonly layers: BrickLayers;
}

/** Describes a sleepyhead, which falls but is never swapped or bunched, and leaves at a bed. */
export interface Sleepyhead {
  readonly what: "sleepyhead";
  readonly id: number;
}

/** Describes what a square holds. */
export type Piece = Fuzzball | Frizzball | Brick | Sleepyhead;
