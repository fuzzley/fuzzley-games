// A wave's board as its bunches and blasts strike it, before it falls:
// what a blast's strike and gathering a fuzzball or the frizzball do to a
// square, the special a bunch leaves, and what a bunch does beside it,
// each element taking its part through its rule. Every hit is written down
// in the order struck, and every goal counted as it goes, so a blast set
// off later in the wave sees the goals as they stand.

import { itemAt, recordOf } from "@fz/core/records";
import type { Game } from "../board/board";
import type { BoardSize } from "../board/cells";
import {
  type DustLayers,
  ELEMENT_IDS,
  type ElementId,
} from "../catalog/elements";
import type { KindId } from "../catalog/kinds";
import type { Fuzzball, Piece } from "../catalog/pieces";
import type { MadeId } from "../catalog/specials";
import type {
  Change,
  ElementRule,
  SquareState,
} from "../elements/element_rule";
import { type Taken, countedOff } from "../move/goals";
import type { Blast, Hit } from "../move/record";
import { commonestKind } from "./frizzball";

/**
 * Describes where a hit came from: its square, the step that reached it,
 * and the blast that struck it, by its place in the wave's blasts, or null
 * for a bunch.
 */
export type Struck = Pick<
  Extract<Hit, { readonly what: "gathered" }>,
  "square" | "step" | "blast"
>;

/** Describes a special or the frizzball set off, and the kind it goes off with, before it is known what set it off. */
export type SetOff = Pick<Blast, "square" | "piece"> & {
  readonly what: MadeId;
  readonly kind: KindId;
};

/** Describes a wave's board once its bunches and blasts have struck it, before it falls. */
export interface StruckBoard {
  /** The game as struck: its board's pieces and dust, what each goal still needs, and the id its next piece takes. */
  readonly game: Game;
  /** What was hit, in the order struck. */
  readonly hits: readonly Hit[];
  /** How many of each element's changes counted. */
  readonly counted: Readonly<Record<ElementId, number>>;
}

/** The moments of a wave in which an element's rule can change a square. */
type Moment = "inBunch" | "besideBunch" | "struckUnder";

/** Describes a special a bunch leaves where its fuzzball went off, and its hit, made once the wave's blasts are done. */
interface Remade {
  readonly square: number;
  readonly piece: Piece;
  readonly born: Hit;
}

/** Holds a wave's board as its bunches and blasts strike it, and what they hit. */
export class Striking {
  /** The board's size, which its squares' neighbors ask of it. */
  readonly size: BoardSize;
  private readonly pieces: (Piece | null)[];
  private readonly dust: DustLayers[];
  private goalsLeft: readonly number[];
  private nextPieceId: number;
  /** Whether each square holds what a bunch of the wave left, which nothing strikes. */
  private readonly made: boolean[];
  /** Whether each square's piece has been gathered in the wave. */
  private readonly gathered: boolean[];
  private readonly hits: Hit[] = [];
  private readonly counted: Record<ElementId, number> = recordOf(
    ELEMENT_IDS,
    () => 0,
  );
  private readonly remade: Remade[] = [];

  constructor(
    private readonly game: Game,
    private readonly rules: Readonly<Record<ElementId, ElementRule>>,
  ) {
    this.size = { width: game.board.width, height: game.board.height };
    this.pieces = [...game.board.pieces];
    this.dust = [...game.board.dust];
    this.goalsLeft = game.goalsLeft;
    this.nextPieceId = game.nextPieceId;
    this.made = this.pieces.map(() => false);
    this.gathered = this.pieces.map(() => false);
  }

  /** Lets each element's rule do what a bunch taking in a square's fuzzball does to it, as a cage opened. */
  takeIn(square: number, struck: Struck): void {
    this.takePart("inBunch", square, struck);
  }

  /**
   * Lets each element's rule do what a bunch beside a square does to it,
   * as a brick knocked, unless the square holds nothing or a piece the
   * wave made.
   */
  strikeBeside(square: number, struck: Struck): void {
    if (itemAt(this.pieces, square) !== null && !itemAt(this.made, square)) {
      this.takePart("besideBunch", square, struck);
    }
  }

  /**
   * Strikes a square once for a blast, and returns what goes off there,
   * null but for a special or the frizzball gathered.
   *
   * It sweeps under a bare square; lets the first element's change take
   * the strike, as a cage opened; or else gathers the fuzzball or the
   * frizzball, as `gather()` does. A square the wave made, and a piece no
   * element's rule takes the strike on and no strike gathers, are left as
   * they are.
   */
  strike(square: number, struck: Struck): SetOff | null {
    if (itemAt(this.made, square)) {
      return null;
    }
    const piece = itemAt(this.pieces, square);
    if (piece === null) {
      this.takePart("struckUnder", square, struck);
      return null;
    }
    if (this.takeFirstPart(square, struck)) {
      return null;
    }
    return piece.what === "fuzzball" || piece.what === "frizzball"
      ? this.gather(square, struck)
      : null;
  }

  /**
   * Gathers a square's fuzzball or the frizzball, sweeping what lies under
   * it, and returns what goes off there: the special the fuzzball wore, or
   * the frizzball, taking the kind the board as it stands holds most of;
   * null for a plain fuzzball.
   *
   * @throws {Error} for a square that holds neither.
   */
  gather(square: number, struck: Struck): SetOff | null {
    const piece = itemAt(this.pieces, square);
    if (piece?.what !== "fuzzball" && piece?.what !== "frizzball") {
      throw new Error(
        `Square ${String(square)} holds no fuzzball and no frizzball.`,
      );
    }
    this.pieces[square] = null;
    this.gathered[square] = true;
    const kind = piece.what === "fuzzball" ? piece.kind : null;
    if (kind !== null) {
      this.countOff({ what: "gather", kind });
    }
    this.hits.push({ ...struck, what: "gathered", piece: piece.id, kind });
    this.takePart("struckUnder", square, struck);
    if (piece.what === "frizzball") {
      return {
        what: "frizzball",
        square,
        piece: piece.id,
        kind: commonestKind({ pieces: this.pieces }, this.game.kinds),
      };
    }
    return piece.special === null
      ? null
      : { what: piece.special, square, piece: piece.id, kind: piece.kind };
  }

  /**
   * Leaves what a bunch makes on the square of its fuzzball that stays,
   * and returns the made piece's id and the special set off there, if
   * any: a plain fuzzball is made a special or the frizzball, sweeping
   * what lies under it, and keeps its id; one already special is gathered
   * and goes off, and the square is kept for what the bunch makes, made
   * anew by `remakeSpecials()` once the wave's blasts are done.
   *
   * @throws {Error} for a square that holds no fuzzball.
   */
  leave(
    square: number,
    made: MadeId,
    struck: Struck,
  ): { readonly piece: number; readonly setOff: SetOff | null } {
    const fuzzball = this.fuzzballAt(square);
    this.made[square] = true;
    if (fuzzball.special !== null) {
      const fresh: Fuzzball = {
        what: "fuzzball",
        id: this.nextPieceId,
        kind: fuzzball.kind,
        special: null,
        caged: false,
        burred: false,
      };
      this.nextPieceId++;
      this.remade.push({
        square,
        piece: pieceMade(made, fresh),
        born: bornHit(square, made, fresh),
      });
      return { piece: fresh.id, setOff: this.gather(square, struck) };
    }
    this.pieces[square] = pieceMade(made, fuzzball);
    this.takePart("struckUnder", square, struck);
    this.hits.push(bornHit(square, made, fuzzball));
    return { piece: fuzzball.id, setOff: null };
  }

  /** Makes anew, in the order kept, each special `leave()` kept a square for. */
  remakeSpecials(): void {
    for (const { square, piece, born } of this.remade.splice(0)) {
      this.pieces[square] = piece;
      this.hits.push(born);
    }
  }

  /** Returns whether the wave has gathered a square's piece. */
  isGathered(square: number): boolean {
    return itemAt(this.gathered, square);
  }

  /** Returns the game as struck so far: its board's pieces and dust, what each goal still needs, and the id its next piece takes. */
  soFar(): Game {
    const { game } = this;
    return {
      ...game,
      board: { ...game.board, pieces: [...this.pieces], dust: [...this.dust] },
      goalsLeft: this.goalsLeft,
      nextPieceId: this.nextPieceId,
    };
  }

  /** Returns the board as struck so far, and what was hit. */
  struck(): StruckBoard {
    return {
      game: this.soFar(),
      hits: [...this.hits],
      counted: { ...this.counted },
    };
  }

  /** Lets each element's rule in turn take its part in a moment on a square. */
  private takePart(moment: Moment, square: number, struck: Struck): void {
    for (const element of ELEMENT_IDS) {
      const change =
        this.rules[element][moment]?.(this.stateOf(square)) ?? null;
      if (change !== null) {
        this.change(element, square, change, struck);
      }
    }
  }

  /**
   * Lets the first element's rule that changes a blasted square take the
   * strike, and returns whether one did: a blast strikes a square once,
   * taking the outermost thing there.
   */
  private takeFirstPart(square: number, struck: Struck): boolean {
    for (const element of ELEMENT_IDS) {
      const change =
        this.rules[element].blasted?.(this.stateOf(square)) ?? null;
      if (change !== null) {
        this.change(element, square, change, struck);
        return true;
      }
    }
    return false;
  }

  /** Makes an element's change to a square, writing its hit and counting it where it counts. */
  private change(
    element: ElementId,
    square: number,
    change: Change,
    struck: Struck,
  ): void {
    const before = this.stateOf(square);
    this.pieces[square] = change.square.piece;
    this.dust[square] = change.square.dust;
    if (change.hit !== null) {
      this.hits.push(hitOf(change.hit, struck, before, change.square));
    }
    if (change.counts) {
      this.counted[element]++;
      const goal = this.rules[element].goal;
      if (goal !== undefined) {
        this.countOff({ what: goal.id });
      }
    }
  }

  /** Counts something taken off each goal that counts it. */
  private countOff(taken: Taken): void {
    this.goalsLeft = countedOff(
      { goals: this.game.goals, goalsLeft: this.goalsLeft },
      taken,
    );
  }

  /** Returns what a square holds and the dust on it. */
  private stateOf(square: number): SquareState {
    return {
      piece: itemAt(this.pieces, square),
      dust: itemAt(this.dust, square),
    };
  }

  /** Returns the fuzzball on a square, throwing where it holds none. */
  private fuzzballAt(square: number): Fuzzball {
    const piece = itemAt(this.pieces, square);
    if (piece?.what !== "fuzzball") {
      throw new Error(`Square ${String(square)} holds no fuzzball.`);
    }
    return piece;
  }
}

/** Returns what a bunch leaves made of a fuzzball, which keeps its id: the frizzball, or the fuzzball wearing a special. */
function pieceMade(made: MadeId, fuzzball: Fuzzball): Piece {
  return made === "frizzball"
    ? { what: "frizzball", id: fuzzball.id }
    : { ...fuzzball, special: made };
}

/** Returns the hit of what a bunch leaves made of a fuzzball on a square. */
function bornHit(square: number, made: MadeId, fuzzball: Fuzzball): Hit {
  return {
    what: "born",
    square,
    piece: fuzzball.id,
    made,
    kind: fuzzball.kind,
  };
}

/**
 * Returns what the record writes of an element's change to a square: the
 * piece it changed, and the layers a brick or the dust has left.
 *
 * @throws {Error} for a hit on a piece the square doesn't hold, or a brick
 *   knocked that is no brick after.
 */
function hitOf(
  what: NonNullable<Change["hit"]>,
  struck: Struck,
  before: SquareState,
  after: SquareState,
): Hit {
  switch (what) {
    case "dusted":
      return { ...struck, what, layersLeft: after.dust };
    case "knocked": {
      const brick = after.piece;
      if (brick?.what !== "brick") {
        throw new Error(
          `A brick knocked on square ${String(struck.square)} is no brick after.`,
        );
      }
      return { ...struck, what, piece: idOf(before), layersLeft: brick.layers };
    }
    case "uncaged":
    case "unburred":
    case "broken":
    case "ruffled":
      return { ...struck, what, piece: idOf(before) };
    case "bedded":
      return { what, square: struck.square, piece: idOf(before) };
  }
}

/** Returns the id of a square's piece, throwing for a square that holds none. */
function idOf({ piece }: SquareState): number {
  if (piece === null) {
    throw new Error("A hit on a piece finds the square holding none.");
  }
  return piece.id;
}
