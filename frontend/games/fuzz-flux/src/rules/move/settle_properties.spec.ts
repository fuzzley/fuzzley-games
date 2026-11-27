import { createRandom } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import { DESIGN_HOLDS } from "../../testing/made_up_rules";
import type { Board, Game, QuarterTurns } from "../board/board";
import { squareOf } from "../board/cells";
import { findBunches } from "../bunches/find";
import { ELEMENT_IDS } from "../catalog/elements";
import { KIND_IDS } from "../catalog/kinds";
import type { Piece } from "../catalog/pieces";
import { MOST_WAVES } from "../tuning";
import type { Fall } from "./record";
import { type Settled, settle } from "./settle";

/** The seeds of the property specs' sources of numbers, one a batch. */
const SEEDS: readonly number[] = [20261127, 20261128];

/** How many random games each batch settles. */
const GAMES_A_BATCH = 400;

/**
 * Returns a batch's random games: boards of every size the design allows
 * and smaller, a square each holding nothing, a gap, a brick, the
 * frizzball, a sleepyhead, or a fuzzball plain, special, caged or burred,
 * in any frame, after any number of moves.
 */
function gamesOf(seed: number): Game[] {
  const random = createRandom(seed);
  const below = (count: number): number => Math.floor(random() * count);
  return Array.from({ length: GAMES_A_BATCH }, (): Game => {
    const width = 2 + below(7);
    const height = 2 + below(8);
    const kinds = KIND_IDS.slice(0, 3 + below(4));
    const pieces = Array.from({ length: width * height }, (_, square) =>
      randomPiece(square + 1, below, kinds),
    );
    const turns = itemAt<QuarterTurns>([0, 1, 2, 3], below(4));
    const lanes = (count: number): number[] =>
      Array.from({ length: count }, () => below(9));
    const upright = [lanes(width), lanes(height)];
    return {
      board: {
        width,
        height,
        open: pieces.map((piece) => piece !== "gap"),
        pieces: pieces.map((piece) => (piece === "gap" ? null : piece)),
        dust: pieces.map(() => 0),
        beds: pieces.map(() => false),
      },
      turns,
      kinds,
      goals: [],
      goalsLeft: [],
      movesLeft: 20,
      movesPlayed: below(40),
      seed: below(2 ** 32),
      lanes: [
        itemAt(upright, turns % 2),
        itemAt(upright, (turns + 1) % 2),
        itemAt(upright, turns % 2),
        itemAt(upright, (turns + 1) % 2),
      ],
      nextPieceId: width * height + 1,
      wind: null,
      outcome: "playing",
    };
  });
}

/** Returns what a random square holds, numbered, or "gap" for none at all. */
function randomPiece(
  id: number,
  below: (count: number) => number,
  kinds: Game["kinds"],
): Piece | "gap" | null {
  const roll = below(20);
  const kind = itemAt(kinds, below(kinds.length));
  const fuzzball = {
    what: "fuzzball",
    id,
    kind,
    caged: false,
    burred: false,
  } as const;
  switch (roll) {
    case 0:
      return "gap";
    case 1:
      return { what: "brick", id, layers: 1 };
    case 2:
      return { what: "frizzball", id };
    case 3:
      return { what: "sleepyhead", id };
    case 4:
      return { ...fuzzball, special: "puffer" };
    case 5:
      return { ...fuzzball, special: null, caged: true };
    case 6:
      return { ...fuzzball, special: null, burred: true };
    default:
      return roll < 13 ? null : { ...fuzzball, special: null };
  }
}

/** Returns the ids of the pieces a board holds, in the order of their squares. */
function idsOn({ pieces }: Board): number[] {
  return pieces.flatMap((piece) => (piece === null ? [] : [piece.id]));
}

/** Returns whether a rule of the design's holds a square's piece where it is. */
function isHeld(board: Board, square: number): boolean {
  const piece = itemAt(board.pieces, square);
  const state = { piece, dust: itemAt(board.dust, square) };
  return ELEMENT_IDS.some((id) => DESIGN_HOLDS[id].holdsFall?.(state) === true);
}

/**
 * Returns the squares of a board left empty that something could fill:
 * each open, holding nothing, without a piece held above it in its
 * column, past gaps and empty squares. A square only a roll could fill is
 * left to the settle after.
 */
function fillableEmpty(board: Board): number[] {
  return board.pieces.flatMap((piece, square) => {
    if (piece !== null || !itemAt(board.open, square)) {
      return [];
    }
    const { x, y } = squareOf(square, board.width);
    const above = Array.from(
      { length: y },
      (_, row) => (y - 1 - row) * board.width + x,
    ).find((each) => itemAt(board.pieces, each) !== null);
    return above !== undefined && isHeld(board, above) ? [] : [square];
  });
}

/**
 * Returns a game with every bunch standing on it gathered as a wave
 * gathers it, but making no special and setting none off.
 */
function gathered(game: Game): Game {
  const squares = new Set(
    findBunches(game.board, null).flatMap((bunch) => bunch.squares),
  );
  const pieces = game.board.pieces.map((piece, square) =>
    squares.has(square) ? gatheredPiece(piece) : piece,
  );
  return { ...game, board: { ...game.board, pieces } };
}

/** Returns what a wave leaves of a bunch's fuzzball: a caged one uncaged, a burred one unburred, and nothing of any other. */
function gatheredPiece(piece: Piece | null): Piece | null {
  if (piece?.what !== "fuzzball") {
    return piece;
  }
  if (piece.caged) {
    return { ...piece, caged: false };
  }
  return piece.burred ? { ...piece, burred: false } : null;
}

/** Returns what is wrong with a board a settle left, against the board it was handed: a piece doubled, one lost, or one in a gap. */
function wholenessOf(before: Board, after: Board): string[] {
  const ids = idsOn(after);
  return [
    ...(new Set(ids).size === ids.length ? [] : ["a piece doubled"]),
    ...(idsOn(before).every((id) => ids.includes(id)) ? [] : ["a piece lost"]),
    ...(after.pieces.some(
      (piece, square) => piece !== null && !itemAt(after.open, square),
    )
      ? ["a piece in a gap"]
      : []),
  ];
}

/** Returns each piece of a board a rule held that a settle moved. */
function heldMoved(before: Board, after: Board): (Piece | null)[] {
  return before.pieces.filter(
    (piece, square) =>
      isHeld(before, square) && itemAt(after.pieces, square) !== piece,
  );
}

/**
 * Returns each fall with a step that lands no lower, or a column aside but
 * by a roll, one row down and one column across.
 */
function strayFalls(falls: readonly Fall[], width: number): Fall[] {
  return falls.filter(({ from, path }) =>
    path.some((square, step) => {
      const before = step === 0 ? from : itemAt(path, step - 1);
      if (before === null) {
        return false;
      }
      const was = squareOf(before, width);
      const now = squareOf(square, width);
      const aside = Math.abs(now.x - was.x);
      return now.y <= was.y || aside > (now.y - was.y === 1 ? 1 : 0);
    }),
  );
}

/**
 * Returns whether what a settle let in disagrees with what each lane of the
 * frame counted, with the ids next in turn, or with the column of its lane
 * it landed in.
 */
function miscounted(before: Game, { game: after, falls }: Settled): boolean {
  const letIn = falls.filter(({ from }) => from === null);
  const counted = after.lanes[before.turns].map(
    (count, lane) => count - itemAt(before.lanes[before.turns], lane),
  );
  const fallen = counted.map(
    (_, lane) => letIn.filter((fall) => fall.lane === lane).length,
  );
  const { width } = before.board;
  return (
    counted.some((count, lane) => count !== itemAt(fallen, lane)) ||
    letIn.some(({ piece }, made) => piece !== before.nextPieceId + made) ||
    letIn.some(
      ({ path, lane }) => squareOf(itemAt(path, 0), width).x !== lane,
    ) ||
    after.nextPieceId !== before.nextPieceId + letIn.length
  );
}

/**
 * Returns whether a game, settled, then settled again with every bunch
 * standing gathered, as a wave that makes no special gathers it, still
 * has a bunch standing after the most waves a move plays.
 */
function isRestless(game: Game): boolean {
  let resting = settle(game, DESIGN_HOLDS).game;
  for (let wave = 0; wave < MOST_WAVES; wave++) {
    if (findBunches(resting.board, null).length === 0) {
      return false;
    }
    resting = settle(gathered(resting), DESIGN_HOLDS).game;
  }
  return findBunches(resting.board, null).length > 0;
}

describe("settle(), over random boards", () => {
  it.each(SEEDS)(
    "leaves no piece doubled, lost or in a gap, batch %i",
    (seed) => {
      const problems = gamesOf(seed).flatMap((game) =>
        wholenessOf(game.board, settle(game, DESIGN_HOLDS).game.board),
      );

      expect(problems).toEqual([]);
    },
  );

  it.each(SEEDS)(
    "leaves no square empty that something could fill, and nothing to fall, batch %i",
    (seed) => {
      const unrested = gamesOf(seed).flatMap((game) => {
        const rested = settle(game, DESIGN_HOLDS).game;
        return [
          ...fillableEmpty(rested.board),
          ...settle(rested, DESIGN_HOLDS).falls,
        ];
      });

      expect(unrested).toEqual([]);
    },
  );

  it.each(SEEDS)("moves no piece a rule holds, batch %i", (seed) => {
    const moved = gamesOf(seed).flatMap((game) =>
      heldMoved(game.board, settle(game, DESIGN_HOLDS).game.board),
    );

    expect(moved).toEqual([]);
  });

  it.each(SEEDS)(
    "lands each falling piece lower at every step, a roll a column aside, batch %i",
    (seed) => {
      const strays = gamesOf(seed).flatMap((game) =>
        strayFalls(settle(game, DESIGN_HOLDS).falls, game.board.width),
      );

      expect(strays).toEqual([]);
    },
  );

  it.each(SEEDS)(
    "lets in a fuzzball for each count a lane of the frame adds, each the next id, down its lane's column, batch %i",
    (seed) => {
      const miscounts = gamesOf(seed).filter((game) =>
        miscounted(game, settle(game, DESIGN_HOLDS)),
      );

      expect(miscounts).toEqual([]);
    },
  );

  it.each(SEEDS)(
    "comes to rest with no bunch standing, each gathered as a wave gathers it, within the waves a move plays, batch %i",
    (seed) => {
      expect(gamesOf(seed).filter(isRestless)).toEqual([]);
    },
  );
});
