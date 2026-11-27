// What a move did, as `play()` hands it back beside the next game, for the
// view to play in its own time: the swap, each wave to rest, a burr's
// spread, the gust, a shuffle and how the game stands; and what the encore
// did, as `encore()` hands it back once a move clears the level. Nothing
// may change one.
//
// Every square in it is in the screen's frame, its index y * width + x on
// the board as the screen shows it, whichever way the wind has turned the
// board's own frame. A fall's lane alone is counted in the board's frame,
// as its refills are.

import type { Outcome, QuarterTurns } from "../board/board";
import type { BrickLayers, DustLayers } from "../catalog/elements";
import type { KindId } from "../catalog/kinds";
import type { BlastId, MadeId } from "../catalog/specials";

/** Describes the swap a move made, or was refused. */
export interface Swap {
  /** The square picked up. */
  readonly from: number;
  /** The neighbor it was swapped with, or `from` again for a special set off where it stands. */
  readonly to: number;
  /** Whether it was refused, as a swap that makes no bunch and moves no special is, costing nothing. */
  readonly refused: boolean;
}

/** Describes what a bunch leaves behind, and where. */
export interface Making {
  readonly what: MadeId;
  readonly square: number;
  /**
   * The id of the piece made: the fuzzball's of the bunch that stays, or a
   * new piece's, where that fuzzball was a special and went off.
   */
  readonly piece: number;
}

/** Describes a bunch a wave gathers: 3 or more of a kind in a line, 4 in a square, and all of those that touch. */
export interface Bunch {
  /** Its squares, in the order of their indices. */
  readonly squares: readonly number[];
  readonly kind: KindId;
  /** What it leaves behind, or null for a bunch that leaves nothing. */
  readonly makes: Making | null;
}

/** Describes a square a blast strikes, and when. */
export interface Strike {
  readonly square: number;
  /** How many steps the blast takes to reach it: 0 at its own square, and a ring, a square or a fuzzball more each step out. */
  readonly step: number;
}

/** Describes a special, the frizzball or a pair going off. */
export interface Blast {
  readonly what: BlastId;
  /** Where it goes off. */
  readonly square: number;
  /** The piece that went off, or null for a special a wisp carried, which goes off as a blast of its own once it lands. */
  readonly piece: number | null;
  /** The kind it wore, or the kind a frizzball took; null for two frizzballs, which take none. */
  readonly kind: KindId | null;
  /** The blast that set it off, by its place in the wave's blasts, or null for one the move or a bunch set off. */
  readonly setOffBy: number | null;
  /** The step of the blast that set it off at which it was struck: 0 for one the move or a bunch set off. */
  readonly wait: number;
  /** The squares it strikes, in the order struck: for a wisp, those it flies to. */
  readonly strikes: readonly Strike[];
}

/** Describes where a hit came from: a blast, or the bunch the square is in or beside. */
interface Struck {
  readonly square: number;
  /** The step of the blast that struck it, or, for a bunch, 0 for a square in it and 1 for one beside it. */
  readonly step: number;
  /** The blast that struck it, by its place in the wave's blasts, or null for a bunch. */
  readonly blast: number | null;
}

/**
 * Describes what a wave did to a square, by what it did: a fuzzball or the
 * frizzball gathered, a cage opened, a burr brushed off, a brick knocked or
 * broken, a layer of dust taken off, a sleepyhead ruffled by a blast that
 * can't move it, a special made, or a sleepyhead put to bed.
 */
export type Hit =
  | (Struck & {
      readonly what: "gathered";
      readonly piece: number;
      /** Its kind, or null for the frizzball. */
      readonly kind: KindId | null;
    })
  | (Struck & { readonly what: "uncaged"; readonly piece: number })
  | (Struck & { readonly what: "unburred"; readonly piece: number })
  | (Struck & {
      readonly what: "knocked";
      readonly piece: number;
      readonly layersLeft: BrickLayers;
    })
  | (Struck & { readonly what: "broken"; readonly piece: number })
  | (Struck & { readonly what: "dusted"; readonly layersLeft: DustLayers })
  | (Struck & { readonly what: "ruffled"; readonly piece: number })
  /** A special made by a bunch, which nothing strikes. */
  | {
      readonly what: "born";
      readonly square: number;
      readonly piece: number;
      readonly made: MadeId;
      /** The bunch's kind. */
      readonly kind: KindId;
    }
  /** A sleepyhead put to bed as the board comes to rest, which nothing strikes. */
  | {
      readonly what: "bedded";
      readonly square: number;
      readonly piece: number;
    };

/** Describes one piece's way down in a wave. */
export interface Fall {
  readonly piece: number;
  /** Its kind, as a refill's is drawn; null for the frizzball or a sleepyhead. */
  readonly kind: KindId | null;
  /** Where it fell from, or null for a fuzzball let in at the top of its lane. */
  readonly from: number | null;
  /** Each square it passes, a roll's among them, the last where it lands. */
  readonly path: readonly number[];
  /** The lane it fell down, from 0 across the board's frame, whose refills a fuzzball let in is counted among. */
  readonly lane: number;
}

/** Describes one wave of a move: the bunches gathered, what went off, what was hit, and what fell after. */
export interface Wave {
  /** Its place in its move or gust, from 1; the fall a gust's turn starts with is 0. */
  readonly number: number;
  readonly bunches: readonly Bunch[];
  /** What went off, in the order set off. */
  readonly blasts: readonly Blast[];
  /** What was hit, in the order struck. */
  readonly hits: readonly Hit[];
  readonly falls: readonly Fall[];
  /** What each goal still needs once it is done. */
  readonly goalsLeft: readonly number[];
}

/** Describes a burr spreading from a burred fuzzball to its neighbor, after a move that brushed none off. */
export interface BurrSpread {
  readonly from: number;
  readonly to: number;
  /** The fuzzball it spreads to. */
  readonly piece: number;
}

/** Describes the wind turning after a move, and everything falling the new way. */
export interface Gust {
  /** How far the board's frame is turned from the screen's once it has turned. */
  readonly turns: QuarterTurns;
  /** The fall the turn starts, then each wave it sets off. */
  readonly waves: readonly Wave[];
}

/** Describes a piece moved by a shuffle. */
export interface Shuffled {
  readonly piece: number;
  readonly from: number;
  readonly to: number;
}

/** Describes the plain fuzzballs trading places, where a move left the board without one. */
export interface Shuffle {
  /** Each plain fuzzball, where it was and where it went, those left where they were among them. */
  readonly moves: readonly Shuffled[];
}

/** Describes a spare move of the encore: a plain fuzzball made special and set off. */
export interface SpareMove {
  /** Each wave it played, the first's first blast the special it made. */
  readonly waves: readonly Wave[];
}

/** Describes what the encore did after the move that cleared a level, a spare move at a time. */
export interface EncoreRecord {
  readonly spares: readonly SpareMove[];
}

/** Describes what a move did, in the screen's frame. */
export interface MoveRecord {
  readonly swap: Swap;
  /** Each wave the move played, none for a swap refused. */
  readonly waves: readonly Wave[];
  /** The burr that spread after it, or null. */
  readonly burrSpread: BurrSpread | null;
  /** The wind's turn after it, or null. */
  readonly gust: Gust | null;
  /** The shuffle after it, or null. */
  readonly shuffle: Shuffle | null;
  readonly outcome: Outcome;
}
