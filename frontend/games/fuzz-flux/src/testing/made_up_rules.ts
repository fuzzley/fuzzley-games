// Elements' rules made up for specs, so a spec can play a moment of a move
// with an element that takes part in it, or with none, whichever of the
// elements' own rules have been brought in; and the wind's, made up the
// same way.

import { hashOf } from "@fz/core/random";
import { itemAt, pick, recordOf } from "@fz/core/records";
import type { Board } from "../rules/board/board";
import { neighborsOf } from "../rules/board/cells";
import {
  type BrickLayers,
  ELEMENT_IDS,
  type ElementId,
} from "../rules/catalog/elements";
import { SALTS } from "../rules/draws";
import { DUST_RULE } from "../rules/elements/dust";
import { WISP_RANKS } from "../rules/tuning";
import type {
  Change,
  ElementRule,
  MoveEnd,
  Spread,
  SquareState,
  WindRule,
} from "../rules/elements/element_rule";

/** Every element's rule taking part in no moment of a move. */
export const NO_PART: Readonly<Record<ElementId, ElementRule>> = recordOf(
  ELEMENT_IDS,
  () => ({}),
);

/**
 * Every element's rule holding what the design says it holds, and taking
 * part in no other moment: a brick and a cage keep their pieces from being
 * swapped and from falling, and a sleepyhead and a burr theirs from being
 * swapped.
 */
export const DESIGN_HOLDS: Readonly<Record<ElementId, ElementRule>> = {
  dust: {},
  brick: { holdsSwap: isBrick, holdsFall: isBrick },
  cage: { holdsSwap: isCaged, holdsFall: isCaged },
  sleepyhead: {
    holdsSwap: ({ piece }) => piece?.what === "sleepyhead",
  },
  burr: {
    holdsSwap: ({ piece }) => piece?.what === "fuzzball" && piece.burred,
  },
};

/**
 * Every element's rule holding what `DESIGN_HOLDS` holds, and counting the
 * goal it counts for on a dealt board: every layer of dust, and every
 * brick, caged fuzzball and sleepyhead.
 */
export const DESIGN_HOLDS_AND_GOALS: Readonly<Record<ElementId, ElementRule>> =
  {
    dust: pick(DUST_RULE, ["goal"]),
    brick: {
      ...DESIGN_HOLDS.brick,
      goal: { id: "brick", countOn: (board) => countOf(board, isBrick) },
    },
    cage: {
      ...DESIGN_HOLDS.cage,
      goal: { id: "cage", countOn: (board) => countOf(board, isCaged) },
    },
    sleepyhead: {
      ...DESIGN_HOLDS.sleepyhead,
      goal: {
        id: "sleepyhead",
        countOn: (board) =>
          countOf(board, ({ piece }) => piece?.what === "sleepyhead"),
      },
    },
    burr: DESIGN_HOLDS.burr,
  };

/**
 * Every element's rule holding and counting what
 * `DESIGN_HOLDS_AND_GOALS` does, and taking the part the design's sketch
 * gives it as a wave strikes, dust by its own rule: a bunch opens a cage
 * and brushes off a burr
 * on each fuzzball it takes in, and knocks a brick or brushes off a burr
 * beside it; a blast knocks a brick, ruffles a sleepyhead, opens a cage or
 * brushes off a burr rather than gathering; a layer of dust is swept from
 * under each fuzzball gathered or made special and each square struck
 * bare; a caged fuzzball takes no fur the frizzball gives, and a burred
 * one loses its burr as it takes it; a wisp weighs a caged fuzzball, a
 * brick, whatever holds a sleepyhead up, a burr and a dusty square, in
 * that order, each worth more where its goal is open; a sleepyhead on a
 * bed is put to bed once the board is at rest, which counts; and after a
 * move that brushed no burr off, a burr spreads to a plain fuzzball beside
 * one, drawn as the sketch draws it.
 */
export const DESIGN_PARTS: Readonly<Record<ElementId, ElementRule>> = {
  dust: DUST_RULE,
  brick: {
    ...DESIGN_HOLDS_AND_GOALS.brick,
    besideBunch: knocked,
    blasted: knocked,
    wisp: {
      rank: WISP_RANKS.brick,
      worth: ({ pieces }, square, goalOpen) => {
        const piece = itemAt(pieces, square);
        if (piece?.what !== "brick") {
          return null;
        }
        return goalOpen ? 80 - piece.layers : 24;
      },
    },
  },
  cage: {
    ...DESIGN_HOLDS_AND_GOALS.cage,
    inBunch: (square) => uncaged(square, null),
    blasted: (square) => uncaged(square, "uncaged"),
    givenFur: (square) => (isCaged(square) ? null : square),
    wisp: {
      rank: WISP_RANKS.cage,
      worth: ({ pieces }, square, goalOpen) => {
        if (!isCaged({ piece: itemAt(pieces, square) })) {
          return null;
        }
        return goalOpen ? 90 : 30;
      },
    },
  },
  sleepyhead: {
    ...DESIGN_HOLDS_AND_GOALS.sleepyhead,
    blasted: (square) =>
      square.piece?.what === "sleepyhead"
        ? { square, hit: "ruffled", counts: false }
        : null,
    settled: ({ piece, dust }, bed) =>
      bed && piece?.what === "sleepyhead"
        ? { square: { piece: null, dust }, hit: "bedded", counts: true }
        : null,
    wisp: {
      rank: WISP_RANKS.sleepyhead,
      worth: (board, square, goalOpen) =>
        goalOpen && holdsSleepyheadUp(board, square) ? 70 : null,
    },
  },
  burr: {
    ...DESIGN_HOLDS_AND_GOALS.burr,
    inBunch: (square) => unburred(square, null),
    besideBunch: (square) => unburred(square, "unburred"),
    blasted: (square) => unburred(square, "unburred"),
    givenFur: (square) => unburred(square, null)?.square ?? square,
    moveEnded: burrSpread,
    wisp: {
      rank: WISP_RANKS.burr,
      worth: ({ pieces }, square) => {
        const piece = itemAt(pieces, square);
        return piece?.what === "fuzzball" && piece.burred ? 60 : null;
      },
    },
  },
};

/**
 * The wind's rule as the design's sketch plays it: after each move a
 * turning wind waits a move less, and once it has waited its moves it
 * turns the board's frame its quarters and begins its wait again.
 */
export const DESIGN_WIND: WindRule = {
  afterMove: (wind) =>
    wind.wait > 1
      ? { wind: { ...wind, wait: wind.wait - 1 }, quarters: 0 }
      : { wind: { ...wind, wait: wind.every }, quarters: wind.quarters },
};

/**
 * Returns the burr's spread at the end of a move that brushed none off: to
 * a plain fuzzball, neither caged nor burred, beside a burred one, the
 * ways it can by the burred one's square and then right, left, down and
 * up, one drawn from the deal's seed and the moves played; or null where
 * none can.
 */
function burrSpread({ game, counted }: MoveEnd): Spread | null {
  if (counted > 0) {
    return null;
  }
  const { board } = game;
  const isPlain = (square: number): boolean => {
    const piece = itemAt(board.pieces, square);
    return (
      piece?.what === "fuzzball" &&
      piece.special === null &&
      !piece.caged &&
      !piece.burred
    );
  };
  const ways = board.pieces.flatMap((piece, from) =>
    piece?.what === "fuzzball" && piece.burred
      ? neighborsOf(from, board)
          .filter(isPlain)
          .map((to) => ({ from, to }))
      : [],
  );
  if (ways.length === 0) {
    return null;
  }
  const draw = hashOf(game.seed, game.movesPlayed, ways.length, SALTS.burr);
  return itemAt(ways, draw % ways.length);
}

/** Returns whether a square holds up a sleepyhead: the nearest piece above it, past gaps and empty squares, is one. */
function holdsSleepyheadUp(board: Board, square: number): boolean {
  if (itemAt(board.pieces, square) === null) {
    return false;
  }
  for (let above = square - board.width; above >= 0; above -= board.width) {
    const piece = itemAt(board.pieces, above);
    if (itemAt(board.open, above) && piece !== null) {
      return piece.what === "sleepyhead";
    }
  }
  return false;
}

/** The layers a brick has left once knocked, by the layers it had. */
const LAYERS_LEFT = { 2: 1, 3: 2, 4: 3 } as const satisfies Readonly<
  Record<Exclude<BrickLayers, 1>, BrickLayers>
>;

/** Returns a brick on a square knocked, a layer off, or broken at its last, which counts. */
function knocked({ piece, dust }: SquareState): Change | null {
  if (piece?.what !== "brick") {
    return null;
  }
  return piece.layers === 1
    ? { square: { piece: null, dust }, hit: "broken", counts: true }
    : {
        square: {
          piece: { ...piece, layers: LAYERS_LEFT[piece.layers] },
          dust,
        },
        hit: "knocked",
        counts: false,
      };
}

/** Returns a caged fuzzball on a square let out, which counts, with the hit given. */
function uncaged(
  { piece, dust }: SquareState,
  hit: "uncaged" | null,
): Change | null {
  return piece?.what === "fuzzball" && piece.caged
    ? { square: { piece: { ...piece, caged: false }, dust }, hit, counts: true }
    : null;
}

/** Returns a burred fuzzball on a square brushed off, which counts, with the hit given. */
function unburred(
  { piece, dust }: SquareState,
  hit: "unburred" | null,
): Change | null {
  return piece?.what === "fuzzball" && piece.burred
    ? {
        square: { piece: { ...piece, burred: false }, dust },
        hit,
        counts: true,
      }
    : null;
}

/** Returns how many squares of a board a test holds for, asked of each square's piece. */
function countOf(
  { pieces }: Board,
  holds: (square: Pick<SquareState, "piece">) => boolean,
): number {
  return pieces.filter((piece) => holds({ piece })).length;
}

/** Returns whether a square holds a brick. */
function isBrick({ piece }: Pick<SquareState, "piece">): boolean {
  return piece?.what === "brick";
}

/** Returns whether a square holds a caged fuzzball. */
function isCaged({ piece }: Pick<SquareState, "piece">): boolean {
  return piece?.what === "fuzzball" && piece.caged;
}
