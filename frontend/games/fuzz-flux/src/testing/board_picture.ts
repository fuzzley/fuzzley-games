// A board drawn as text, for a spec to play on and to read back: its pieces
// in the levels' legend, with what a fuzzball wears beyond its kind and the
// dust each drawn beside it, as a level draws its dust.

import { isKeyOf, keysOf, recordOf } from "@fz/core/records";
import type { Board, Game, TurningWind } from "../rules/board/board";
import { indexOf, squareOf } from "../rules/board/cells";
import { LEGEND, type Placed } from "../rules/board/legend";
import { layOut } from "../rules/board/picture";
import type { ElementGoalId, Goal } from "../rules/catalog/goals";
import { KIND_IDS, type KindId } from "../rules/catalog/kinds";
import type { Piece } from "../rules/catalog/pieces";
import type { SpecialId } from "../rules/catalog/specials";

/**
 * Describes a board drawn as text, each picture a row a string and a square
 * a letter, every picture of its pieces' shape.
 */
export interface BoardPicture {
  /**
   * Its pieces, in the levels' legend, with `f` for the frizzball and a
   * space for a square that holds nothing.
   *
   * There being no deal, `.`, `?` and `*` take kinds that bunch with
   * nothing: the first two kinds in play that no other letter names, in
   * turn, as a checkerboard's squares are colored.
   */
  readonly pieces: readonly string[];
  /**
   * What each fuzzball wears beyond its kind, `.` for nothing: `-` and `|`,
   * the streaks of a dasher across and down; `o`, a puffer's ruff; `w`, a
   * wisp's seed-head; and `*`, a burr.
   */
  readonly marks?: readonly string[];
  /** Its dust, as a level draws it. */
  readonly dust?: readonly string[];
}

/** Describes a spec's game beyond its board, each option left out where `gameFrom()`'s own will do. */
export interface GameOptions {
  /** The kinds in play: every kind unless given. */
  readonly kinds?: readonly KindId[] | undefined;
  /** Its goals: none unless given. */
  readonly goals?: readonly Goal[] | undefined;
  /**
   * What each goal still needs: unless given, a gather's count, and every
   * one of an element the board holds, of dust a layer each.
   */
  readonly goalsLeft?: readonly number[] | undefined;
  /** Its moves left: 20 unless given. */
  readonly movesLeft?: number | undefined;
  /** Its deal's seed: 1 unless given. */
  readonly seed?: number | undefined;
  /** The wind that turns: none unless given. */
  readonly wind?: TurningWind | undefined;
}

/** The letter that draws the frizzball, which a level places by its specials. */
const FRIZZBALL = "f";

/** The letter that draws a square holding nothing, which no level has. */
const EMPTY = " ";

/** The legend's letters for a gap and a sleepyhead. */
const GAP = "_";
const SLEEPYHEAD = "z";

/** The mark of a fuzzball that wears nothing beyond its kind. */
const NO_MARK = ".";

/** The mark of a burred fuzzball. */
const BURR = "*";

/** Every mark of a special fuzzball, each with its special. */
const SPECIAL_MARKS = {
  "-": "dasher-across",
  "|": "dasher-down",
  o: "puffer",
  w: "wisp",
} as const satisfies Readonly<Record<string, SpecialId>>;

/** Each kind's letters in the legend, plain and caged. */
const KIND_LETTERS = recordOf(KIND_IDS, (kind) => ({
  plain: legendLetter(kind, false),
  caged: legendLetter(kind, true),
}));

/**
 * Returns a board drawn as a picture, or as its pieces' picture alone, its
 * pieces numbered from 1 in the order read, row by row, and its beds where
 * a level's would be.
 *
 * @param kinds The kinds in play, of which `.`, `?` and `*` take theirs.
 * @throws {Error} for a picture that draws what no board holds: a letter
 *   or a mark of neither legend, a mark on a piece that can't wear it,
 *   pictures of other shapes, or a fuzzball of any kind where too few kinds
 *   are left to it.
 */
export function boardFrom(
  picture: BoardPicture | readonly string[],
  kinds: readonly KindId[] = KIND_IDS,
): Board {
  const { pieces, marks, dust } = isRows(picture)
    ? { pieces: picture, marks: undefined, dust: undefined }
    : picture;
  const {
    width,
    height,
    placed,
    dust: layers,
    beds,
  } = layOut(
    pieces.map((row) => row.replaceAll(FRIZZBALL, ".").replaceAll(EMPTY, ".")),
    dust ?? null,
  );
  const letters = Array.from(pieces.join(""));
  const markLetters = marksOf(marks ?? null, pieces);
  const strange = KIND_IDS.find(
    (kind) => namesKind(letters, kind) && !kinds.includes(kind),
  );
  if (strange !== undefined) {
    throw new Error(
      `A picture draws a ${strange} fuzzball, a kind not in play.`,
    );
  }
  const anyKinds = kinds.filter((kind) => !namesKind(letters, kind));
  let id = 0;
  return {
    width,
    height,
    open: placed.map(({ what }) => what !== "gap"),
    pieces: placed.map((place, square) => {
      if (place.what === "gap" || letters[square] === EMPTY) {
        return null;
      }
      id++;
      const piece: Piece =
        letters[square] === FRIZZBALL
          ? { what: "frizzball", id }
          : pieceOf(place, id, () => anyKindAt(anyKinds, square, width));
      return wearing(piece, markLetters[square] ?? NO_MARK, square, width);
    }),
    dust: layers,
    beds,
  };
}

/**
 * Returns a game on a board drawn as a picture, as `boardFrom()` reads it:
 * its frame the screen's, no move played, no lane yet to let a fuzzball
 * in, and the rest as the options give it.
 */
export function gameFrom(
  picture: BoardPicture | readonly string[],
  options: GameOptions = {},
): Game {
  const kinds = options.kinds ?? KIND_IDS;
  const board = boardFrom(picture, kinds);
  const goals = options.goals ?? [];
  const strange = goals.find(
    (goal) => goal.what === "gather" && !kinds.includes(goal.kind),
  );
  if (strange?.what === "gather") {
    throw new Error(
      `A game's goal gathers ${strange.kind} fuzzballs, a kind not in play.`,
    );
  }
  const lanes = (count: number): number[] => Array<number>(count).fill(0);
  return {
    board,
    turns: 0,
    kinds,
    goals,
    goalsLeft:
      options.goalsLeft ??
      goals.map((goal) =>
        goal.what === "gather" ? goal.count : countOn(board, goal.what),
      ),
    movesLeft: options.movesLeft ?? 20,
    movesPlayed: 0,
    seed: options.seed ?? 1,
    lanes: [
      lanes(board.width),
      lanes(board.height),
      lanes(board.width),
      lanes(board.height),
    ],
    nextPieceId: board.pieces.filter((piece) => piece !== null).length + 1,
    wind: options.wind ?? null,
    outcome: "playing",
  };
}

/** Returns a board drawn as a picture, in the letters `boardFrom()` reads, its marks and its dust left out where it has none. */
export function pictureOf(board: Board): BoardPicture {
  const rows = (letterAt: (square: number) => string): string[] =>
    Array.from({ length: board.height }, (_, y) =>
      Array.from({ length: board.width }, (_, x) =>
        letterAt(indexOf({ x, y }, board.width)),
      ).join(""),
    );
  const pieces = rows((square) =>
    board.open[square] === true
      ? pieceLetter(board.pieces[square] ?? null)
      : GAP,
  );
  const marks = rows((square) => markLetter(board.pieces[square] ?? null));
  const dust = rows((square) => String(board.dust[square] ?? 0));
  return {
    pieces,
    ...(marks.every((row) => /^\.*$/.test(row)) ? {} : { marks }),
    ...(board.dust.some((layers) => layers > 0) ? { dust } : {}),
  };
}

/** Returns whether a picture is its pieces' rows alone. */
function isRows(
  picture: BoardPicture | readonly string[],
): picture is readonly string[] {
  return Array.isArray(picture);
}

/** Returns the marks of a picture by square, none where it has none, throwing for marks not of its pieces' shape. */
function marksOf(
  marks: readonly string[] | null,
  pieces: readonly string[],
): readonly string[] {
  if (marks === null) {
    return [];
  }
  if (
    marks.length !== pieces.length ||
    marks.some((row, y) => row.length !== pieces[y]?.length)
  ) {
    throw new Error("A picture's marks are drawn in its pieces' shape.");
  }
  return Array.from(marks.join(""));
}

/** Returns whether a picture's letters name a fuzzball of a kind. */
function namesKind(letters: readonly string[], kind: KindId): boolean {
  return letters.some((letter) => {
    if (!isKeyOf(letter, LEGEND)) {
      return false;
    }
    const placed: Placed = LEGEND[letter];
    return placed.what === "fuzzball" && placed.kind === kind;
  });
}

/** Returns the kind a fuzzball of any kind takes at a square, the two kinds left to it in turn. */
function anyKindAt(
  anyKinds: readonly KindId[],
  square: number,
  width: number,
): KindId {
  const { x, y } = squareOf(square, width);
  const kind = anyKinds[(x + y) % 2];
  if (anyKinds.length < 2 || kind === undefined) {
    throw new Error(
      "A picture with a fuzzball of any kind leaves two kinds in play to it, naming none of them.",
    );
  }
  return kind;
}

/** Returns the piece a letter of the legend puts on a square, a fuzzball of any kind taking the kind given. */
function pieceOf(
  placed: Exclude<Placed, { readonly what: "gap" }>,
  id: number,
  anyKind: () => KindId,
): Piece {
  switch (placed.what) {
    case "fuzzball":
      return {
        what: "fuzzball",
        id,
        kind: placed.kind ?? anyKind(),
        special: null,
        caged: placed.caged,
        burred: placed.burred,
      };
    case "brick":
      return { what: "brick", id, layers: placed.layers };
    case "sleepyhead":
      return { what: "sleepyhead", id };
    default:
      return placed satisfies never;
  }
}

/** Returns a piece wearing what its mark draws, throwing for a mark of no legend or one it can't wear. */
function wearing(
  piece: Piece,
  mark: string,
  square: number,
  width: number,
): Piece {
  if (mark === NO_MARK) {
    return piece;
  }
  const plain =
    piece.what === "fuzzball" &&
    !piece.caged &&
    (mark === BURR || !piece.burred);
  if (!plain || (mark !== BURR && !isKeyOf(mark, SPECIAL_MARKS))) {
    throw new Error(
      `A picture's "${mark}" ${squareWords(square, width)} is no mark the piece there can wear.`,
    );
  }
  return isKeyOf(mark, SPECIAL_MARKS)
    ? { ...piece, special: SPECIAL_MARKS[mark] }
    : { ...piece, burred: true };
}

/** Returns how many of an element the goal it counts for asks of a board: of dust, a layer each. */
function countOn(board: Board, goal: ElementGoalId): number {
  const pieces = board.pieces.filter((piece) => piece !== null);
  switch (goal) {
    case "dust":
      return board.dust.reduce<number>((sum, layers) => sum + layers, 0);
    case "brick":
      return pieces.filter(({ what }) => what === "brick").length;
    case "cage":
      return pieces.filter((piece) => piece.what === "fuzzball" && piece.caged)
        .length;
    case "sleepyhead":
      return pieces.filter(({ what }) => what === "sleepyhead").length;
    default:
      return goal satisfies never;
  }
}

/** Returns the letter a square's piece is drawn in, a space for none. */
function pieceLetter(piece: Piece | null): string {
  switch (piece?.what) {
    case undefined:
      return EMPTY;
    case "fuzzball":
      return KIND_LETTERS[piece.kind][piece.caged ? "caged" : "plain"];
    case "frizzball":
      return FRIZZBALL;
    case "brick":
      return String(piece.layers);
    case "sleepyhead":
      return SLEEPYHEAD;
    default:
      return piece satisfies never;
  }
}

/** Returns the mark a square's piece is drawn with: its special's, a burr's or none. */
function markLetter(piece: Piece | null): string {
  if (piece?.what !== "fuzzball") {
    return NO_MARK;
  }
  if (piece.special !== null && (piece.caged || piece.burred)) {
    throw new Error(
      `No board holds a special that is caged or burred, as piece ${String(piece.id)} is.`,
    );
  }
  if (piece.burred) {
    return BURR;
  }
  return (
    keysOf(SPECIAL_MARKS).find(
      (mark) => SPECIAL_MARKS[mark] === piece.special,
    ) ?? NO_MARK
  );
}

/** Returns the legend's letter for a fuzzball of a kind, plain or caged. */
function legendLetter(kind: KindId, caged: boolean): string {
  const letter = keysOf(LEGEND).find((each) => {
    const placed: Placed = LEGEND[each];
    return (
      placed.what === "fuzzball" &&
      placed.kind === kind &&
      placed.caged === caged &&
      !placed.burred
    );
  });
  if (letter === undefined) {
    throw new Error(`The legend draws no ${caged ? "caged " : ""}${kind}.`);
  }
  return letter;
}

/** Returns where a square is, in words: its column and its row, each from 1, as a level's problems say it. */
function squareWords(square: number, width: number): string {
  const { x, y } = squareOf(square, width);
  return `at column ${String(x + 1)}, row ${String(y + 1)}`;
}
