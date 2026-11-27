// A level's deal: its opening game, fixed by one seed. The deal lays the
// level's board out as its pictures draw it, places its specials, and
// gives each fuzzball of any kind the first kind, in an order drawn from
// the seed, that bunches with nothing laid before it. A board with a bunch
// standing, or with fewer moves than a deal opens with, is dealt again, a
// salt a try.

import { hashOf } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import { findBunches, standsInBunch } from "../bunches/find";
import type { ElementId } from "../catalog/elements";
import type { ElementGoalId } from "../catalog/goals";
import type { KindId } from "../catalog/kinds";
import type { Piece } from "../catalog/pieces";
import { SALTS } from "../draws";
import type { ElementRule } from "../elements/element_rule";
import type { Level, PlacedSpecial } from "../levels/level";
import { legalMoves } from "../move/swap";
import { DEAL_TRIES, OPENING_MOVES } from "../tuning";
import { type Board, type Game, WINDS } from "./board";
import { indexOf } from "./cells";
import type { Placed } from "./legend";
import { freshLanes, turnFrame } from "./orientation";
import { layOut } from "./picture";

/** Describes a fuzzball of any kind as its level lays it, still to be dealt a kind. */
interface AnyKind {
  readonly what: "any-kind";
  readonly id: number;
  readonly caged: boolean;
  readonly burred: boolean;
}

/** Describes a level's board as it lays it out, each fuzzball of any kind still to be dealt a kind. */
interface Laid {
  readonly board: Omit<Board, "pieces">;
  readonly pieces: readonly (Piece | AnyKind | null)[];
  /** The id the next piece made takes, past every piece laid. */
  readonly nextPieceId: number;
}

/**
 * Returns a level's opening game on the deal a seed names: its board
 * dealt, its frame turned for its wind, its goals counted on the board,
 * and no move played.
 *
 * The elements' holds decide which try deals, through the moves a board
 * allows, so a level deals its proven boards only by the elements' own
 * rules.
 *
 * @throws {Error} where no try deals a board with no bunch standing and
 *   the moves a deal opens with, or where no element's rule counts a goal
 *   the level sets.
 */
export function deal(
  level: Level,
  seed: number,
  rules: Readonly<Record<ElementId, ElementRule>>,
): Game {
  const laid = boardLaid(level);
  const board = dealtBoard(level, laid, seed, rules);
  const turning = level.wind?.turns ?? null;
  const game: Game = {
    board,
    turns: 0,
    kinds: level.kinds,
    goals: level.goals,
    goalsLeft: level.goals.map((goal) =>
      goal.what === "gather" ? goal.count : countOn(board, goal.what, rules),
    ),
    movesLeft: level.moves,
    movesPlayed: 0,
    seed,
    lanes: freshLanes(board),
    nextPieceId: laid.nextPieceId,
    wind: turning === null ? null : { ...turning, wait: turning.every },
    outcome: "playing",
  };
  return level.wind === null
    ? game
    : turnFrame(game, WINDS.indexOf(level.wind.blows));
}

/** Returns a level's board as it lays it out: each square's piece numbered in the order read, then each special placed, numbered after them all. */
function boardLaid(level: Level): Laid {
  const { placed, ...laid } = layOut(level.board, level.dust);
  const board = { ...laid, open: placed.map(({ what }) => what !== "gap") };
  let id = 0;
  const pieces = placed.map((square): Piece | AnyKind | null => {
    if (square.what === "gap") {
      return null;
    }
    id++;
    return laidPiece(square, id);
  });
  for (const special of level.specials) {
    id++;
    pieces[indexOf(special.at, board.width)] = specialPiece(special, id);
  }
  return { board, pieces, nextPieceId: id + 1 };
}

/**
 * Returns a level's board dealt from a seed, on the first try that leaves
 * no bunch standing and the moves a deal opens with.
 */
function dealtBoard(
  level: Level,
  laid: Laid,
  seed: number,
  rules: Readonly<Record<ElementId, ElementRule>>,
): Board {
  for (let salt = 0; salt < DEAL_TRIES; salt++) {
    const board = kindsDealt(laid, level.kinds, seed, salt);
    if (
      findBunches(board, null).length === 0 &&
      legalMoves(board, rules).length >= OPENING_MOVES
    ) {
      return board;
    }
  }
  throw new Error(
    `Level ${level.id} would not deal from seed ${String(seed)}.`,
  );
}

/**
 * Returns a board laid out with a kind dealt to each fuzzball of any kind,
 * in the order read: the first, in an order drawn from the seed and the
 * try's salt, that stands in no bunch with what is laid before it.
 */
function kindsDealt(
  { board, pieces: laid }: Laid,
  kinds: readonly KindId[],
  seed: number,
  salt: number,
): Board {
  const pieces = laid.map((piece) =>
    piece?.what === "any-kind" ? null : piece,
  );
  const dealt = { ...board, pieces };
  for (const [square, piece] of laid.entries()) {
    if (piece?.what !== "any-kind") {
      continue;
    }
    const first = hashOf(seed, salt, square, SALTS.deal);
    for (let tried = 0; tried < kinds.length; tried++) {
      pieces[square] = {
        what: "fuzzball",
        id: piece.id,
        kind: itemAt(kinds, (first + tried) % kinds.length),
        special: null,
        caged: piece.caged,
        burred: piece.burred,
      };
      if (!standsInBunch(dealt, square)) {
        break;
      }
    }
  }
  return dealt;
}

/** Returns the piece a letter of a level's board puts on its square, numbered, a fuzzball of any kind still to be dealt one. */
function laidPiece(
  placed: Exclude<Placed, { readonly what: "gap" }>,
  id: number,
): Piece | AnyKind {
  switch (placed.what) {
    case "fuzzball": {
      const { kind, caged, burred } = placed;
      return kind === null
        ? { what: "any-kind", id, caged, burred }
        : { what: "fuzzball", id, kind, special: null, caged, burred };
    }
    case "brick":
      return { what: "brick", id, layers: placed.layers };
    case "sleepyhead":
      return { what: "sleepyhead", id };
  }
}

/** Returns the piece a level's special puts on its square, numbered. */
function specialPiece(special: PlacedSpecial, id: number): Piece {
  return special.what === "frizzball"
    ? { what: "frizzball", id }
    : {
        what: "fuzzball",
        id,
        kind: special.kind,
        special: special.what,
        caged: false,
        burred: false,
      };
}

/**
 * Returns how many of an element a dealt board holds, as the element's
 * rule counts its goal.
 *
 * @throws {Error} where the element's rule counts no goal, as a stand-in's.
 */
function countOn(
  board: Board,
  goal: ElementGoalId,
  rules: Readonly<Record<ElementId, ElementRule>>,
): number {
  const counted = rules[goal].goal;
  if (counted === undefined) {
    throw new Error(
      `A level's goal counts every ${goal}, whose element's rule counts no goal of it.`,
    );
  }
  return counted.countOn(board);
}
