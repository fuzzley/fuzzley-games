// Elements' rules made up for specs, so a spec can play a moment of a move
// with an element that takes part in it, or with none, whichever of the
// elements' own rules have been brought in.

import { itemAt, recordOf } from "@fz/core/records";
import type { Board } from "../rules/board/board";
import {
  type BrickLayers,
  ELEMENT_IDS,
  type ElementId,
} from "../rules/catalog/elements";
import type {
  Change,
  ElementRule,
  SquareState,
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
    dust: {
      goal: {
        id: "dust",
        countOn: ({ dust }) =>
          dust.reduce<number>((sum, layers) => sum + layers, 0),
      },
    },
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
 * gives it as a wave strikes: a bunch opens a cage and brushes off a burr
 * on each fuzzball it takes in, and knocks a brick or brushes off a burr
 * beside it; a blast knocks a brick, ruffles a sleepyhead, opens a cage or
 * brushes off a burr rather than gathering; a layer of dust is swept from
 * under each fuzzball gathered or made special and each square struck
 * bare; and a wisp weighs a caged fuzzball, a brick, whatever
 * holds a sleepyhead up, a burr and a dusty square, in that order, each
 * worth more where its goal is open.
 */
export const DESIGN_PARTS: Readonly<Record<ElementId, ElementRule>> = {
  dust: {
    ...DESIGN_HOLDS_AND_GOALS.dust,
    struckUnder: ({ piece, dust }) =>
      dust === 0
        ? null
        : {
            square: { piece, dust: dust === 2 ? 1 : 0 },
            hit: "dusted",
            counts: true,
          },
    wisp: {
      rank: 4,
      worth: ({ pieces, dust }, square, goalOpen) => {
        const layers = itemAt(dust, square);
        const piece = itemAt(pieces, square);
        return goalOpen &&
          layers > 0 &&
          piece !== null &&
          piece.what !== "sleepyhead"
          ? 50 + layers
          : null;
      },
    },
  },
  brick: {
    ...DESIGN_HOLDS_AND_GOALS.brick,
    besideBunch: knocked,
    blasted: knocked,
    wisp: {
      rank: 1,
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
    wisp: {
      rank: 0,
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
    wisp: {
      rank: 2,
      worth: (board, square, goalOpen) =>
        goalOpen && holdsSleepyheadUp(board, square) ? 70 : null,
    },
  },
  burr: {
    ...DESIGN_HOLDS_AND_GOALS.burr,
    inBunch: (square) => unburred(square, null),
    besideBunch: (square) => unburred(square, "unburred"),
    blasted: (square) => unburred(square, "unburred"),
    wisp: {
      rank: 3,
      worth: ({ pieces }, square) => {
        const piece = itemAt(pieces, square);
        return piece?.what === "fuzzball" && piece.burred ? 60 : null;
      },
    },
  },
};

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
