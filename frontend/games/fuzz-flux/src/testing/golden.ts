// The golden games: the design's sketch's own play, written down by
// docs/fuzz-flux/sketch/golden.mjs, which the rules are held to move by
// move. A golden game is a deal of a level and its moves, beside the
// sketch's digest of the game as dealt and after each move.
//
// A digest is a move's record and the game it leaves, written out and
// hashed: every field of the record, every field of the game, and its board
// as the screen shows it, each square's piece, mark, dust and bed, a
// dasher's way the screen's. The record has no board after each wave, and
// the game none but the last, so the digest takes the board after the move
// and each wave's falls, whose paths, with its hits, fix the board after
// it. Only the numbering of the pieces on the board goes unwritten, since a
// hit, a fall or a special made names any piece that a move touches.
// golden_digest.mjs writes the same text from the sketch's play put into
// these words, so the two can only differ by what was played.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isRecord } from "@fz/core/json";
import { hashOf } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import type { Board, Game, QuarterTurns } from "../rules/board/board";
import { indexOf, type Square, squareOf } from "../rules/board/cells";
import type { Piece } from "../rules/catalog/pieces";
import type { Hit, MoveRecord, Wave } from "../rules/move/record";
import { pictureOf } from "./board_picture";

/** Describes where something goes from and to on the board, each a square: a move, a burr's spread or a fuzzball shuffled. */
interface FromTo {
  readonly from: number;
  readonly to: number;
}

/** Describes a golden game: a deal of a level, the moves played on it, and the sketch's digests. */
export interface GoldenGame {
  /** The set whose golden games it is among, which, with its place in the set's file from 0, names it in a failure. */
  readonly set: string;
  readonly place: number;
  /** Its level's id. */
  readonly level: string;
  /** Its deal's seed. */
  readonly deal: number;
  /** The moves it is dealt: its level's, or more for a long game. */
  readonly movesLeft: number;
  /** Its moves, each the square picked up and the neighbor it was swapped with, in the screen's frame. */
  readonly moves: readonly FromTo[];
  /** The sketch's digest of the game as dealt, then after each move. */
  readonly digests: readonly string[];
}

/** Plays a move on a game, as the rules' `play()` does, the move coming in in the screen's frame. */
export type Play = (
  game: Game,
  from: number,
  to: number,
) => { readonly game: Game; readonly record: MoveRecord };

/** The folder that holds each set's golden games, a file a set. */
const GOLDEN = join(import.meta.dirname, "../rules/golden");

/** The salt of a digest's hash, as golden_digest.mjs folds it, which no draw of the rules takes. */
const DIGEST_SALT = 0;

/**
 * A golden game as its set's file writes it: its level, its deal and the
 * moves it is dealt, then its moves, pairs of squares, then its digests.
 */
const GOLDEN_GAME =
  /^(\S+) (\d+) (\d+) \| ((?:\d+ \d+)(?:, \d+ \d+)*)? \| ([0-9a-f]{8}(?: [0-9a-f]{8})*)$/;

/** Returns a set's golden games, as its file under `src/rules/golden/` holds them, throwing for a set with no file there. */
export function goldenSet(set: string): readonly GoldenGame[] {
  return goldenGamesOf(
    JSON.parse(readFileSync(join(GOLDEN, `${set}.json`), "utf8")),
  );
}

/**
 * Returns the golden games of a set from its file, as it reads.
 *
 * @throws {Error} for a file of no golden games' shape, naming the game
 *   that isn't.
 */
export function goldenGamesOf(file: unknown): readonly GoldenGame[] {
  if (!isRecord(file) || typeof file["set"] !== "string") {
    throw new Error("A golden set's file names its set.");
  }
  const { set, games } = file;
  if (!Array.isArray(games)) {
    throw new Error(`The golden set "${set}" lists no games.`);
  }
  return games.map((game: unknown, place) => {
    const read = goldenGameOf(game, set, place);
    if (read === null) {
      throw new Error(
        `Game ${String(place)} of the golden set "${set}" isn't a golden game.`,
      );
    }
    return read;
  });
}

/**
 * Returns a game, and the move that made it, written out as a golden game's
 * digest is: a line each for the record's swap, its waves' parts, what
 * followed the waves and its outcome, then for the game's every field, its
 * board on the screen a row a line, a dash for what isn't there.
 *
 * @param record Null for a game as dealt.
 */
export function writtenOut(game: Game, record: MoveRecord | null): string {
  return [
    ...(record === null ? [] : recordLines(record)),
    ...gameLines(game),
  ].join("\n");
}

/** Returns a text's digest: 8 hex digits of a 32-bit hash, `hashOf()` folded over it a character at a time. */
export function digestOf(text: string): string {
  let digest = 0;
  for (let at = 0; at < text.length; at++) {
    digest = hashOf(digest, text.charCodeAt(at), at, DIGEST_SALT);
  }
  return digest.toString(16).padStart(8, "0");
}

/**
 * Plays a golden game's moves on its opening through a `play()`, throwing at
 * the first digest that isn't the sketch's: the game's, dealt or after a
 * move, which says which move, the two digests side by side, the game's
 * written out, and how to have the sketch's written out to read beside it.
 *
 * @param opening The game its deal deals.
 */
export function replayGolden(
  golden: GoldenGame,
  opening: Game,
  play: Play,
): void {
  let game = opening;
  let record: MoveRecord | null = null;
  golden.digests.forEach((sketch, move) => {
    if (move > 0) {
      const { from, to } = itemAt(golden.moves, move - 1);
      ({ game, record } = play(game, from, to));
    }
    const written = writtenWithDigest(game, record);
    if (written.digest !== sketch) {
      throw new Error(mismatch(golden, move, sketch, written));
    }
  });
}

/**
 * Returns a game, and the move that made it, written out with its digest,
 * or why it can't be, its digest `none`, for a board that no play leaves,
 * such as one with a special caged or burred, which `pictureOf()` won't
 * draw.
 */
function writtenWithDigest(
  game: Game,
  record: MoveRecord | null,
): { readonly text: string; readonly digest: string } {
  try {
    const text = writtenOut(game, record);
    return { text, digest: digestOf(text) };
  } catch (error) {
    return {
      text:
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      digest: "none",
    };
  }
}

/** Returns a golden game from its line in its set's file, or null for a line of no golden game's form. */
function goldenGameOf(
  line: unknown,
  set: string,
  place: number,
): GoldenGame | null {
  const read = typeof line === "string" ? GOLDEN_GAME.exec(line) : null;
  if (read === null) {
    return null;
  }
  const [, level = "", deal = "", movesLeft = "", moves = "", digests = ""] =
    read;
  const pairs =
    moves === ""
      ? []
      : moves.split(", ").map((pair) => {
          const [from = 0, to = 0] = pair.split(" ").map(Number);
          return { from, to };
        });
  const sketch = digests.split(" ");
  if (sketch.length !== pairs.length + 1) {
    return null;
  }
  return {
    set,
    place,
    level,
    deal: Number(deal),
    movesLeft: Number(movesLeft),
    moves: pairs,
    digests: sketch,
  };
}

/** Returns what a golden game's replay says where a digest isn't the sketch's. */
function mismatch(
  golden: GoldenGame,
  move: number,
  sketch: string,
  { text, digest }: { readonly text: string; readonly digest: string },
): string {
  const { set, place, level, deal } = golden;
  const when =
    move === 0
      ? "as dealt"
      : `after move ${String(move)}, ${fromTo(itemAt(golden.moves, move - 1))}`;
  return [
    `The golden set "${set}"'s game ${String(place)}, of level ${level}'s deal ${String(deal)}, isn't the sketch's ${when}.`,
    `  the sketch's digest  ${sketch}`,
    `  the game's digest    ${digest}`,
    "The game's, written out:",
    text,
    `The sketch's: node docs/fuzz-flux/sketch/golden.mjs --print ${set}:${String(place)}`,
  ].join("\n");
}

/** Returns where a move, a spread or a fuzzball shuffled goes from and to, in words. */
function fromTo({ from, to }: FromTo): string {
  return `${String(from)} to ${String(to)}`;
}

/** Returns a move's record written out. */
function recordLines({
  swap,
  waves,
  burrSpread,
  gust,
  shuffle,
  outcome,
}: MoveRecord): string[] {
  return [
    `swap ${fromTo(swap)}${swap.refused ? ", refused" : ""}`,
    ...waves.flatMap(waveLines),
    burrSpread === null
      ? "burr -"
      : `burr from ${fromTo(burrSpread)} #${String(burrSpread.piece)}`,
    ...(gust === null
      ? ["gust -"]
      : [`gust turns ${String(gust.turns)}`, ...gust.waves.flatMap(waveLines)]),
    shuffle === null
      ? "shuffle -"
      : `shuffle ${shuffle.moves.map(({ piece, ...move }) => `#${String(piece)} ${fromTo(move)}`).join(", ")}`,
    `outcome ${outcome}`,
  ];
}

/** Returns a wave written out: its number and its goals left, then a line each for its bunches, its blasts, its hits and its falls, in their order. */
function waveLines({
  number,
  bunches,
  blasts,
  hits,
  falls,
  goalsLeft,
}: Wave): string[] {
  return [
    `wave ${String(number)}, goals left ${goalsLeft.join(" ")}`,
    ...bunches.map(
      ({ squares, kind, makes }) =>
        `  bunch ${kind} ${squares.join(" ")}, makes ${makes === null ? "-" : `${makes.what} at ${String(makes.square)} #${String(makes.piece)}`}`,
    ),
    ...blasts.map(
      (blast) =>
        `  blast ${blast.what} at ${String(blast.square)} ${idOf(blast.piece)} ${blast.kind ?? "-"}, set off by ${String(blast.setOffBy ?? "-")} at ${String(blast.wait)}, strikes ${blast.strikes.map(({ square, step }) => `${String(square)}/${String(step)}`).join(" ")}`,
    ),
    ...hits.map((hit) => `  ${hitLine(hit)}`),
    ...falls.map(
      ({ piece, kind, from, path, lane }) =>
        `  fall #${String(piece)} ${kind ?? "-"} from ${String(from ?? "-")} to ${path.join(" ")}, lane ${String(lane)}`,
    ),
  ];
}

/** Returns a hit written out: what it did, where and to what, and for one a bunch or a blast struck, at what step and by which blast. */
function hitLine(hit: Hit): string {
  const at = `at ${String(hit.square)}`;
  switch (hit.what) {
    case "born":
      return `born ${at} #${String(hit.piece)} ${hit.made} ${hit.kind}`;
    case "bedded":
      return `bedded ${at} #${String(hit.piece)}`;
    default: {
      const struck = `step ${String(hit.step)} by ${String(hit.blast ?? "-")}`;
      switch (hit.what) {
        case "gathered":
          return `gathered ${at} #${String(hit.piece)} ${hit.kind ?? "-"}, ${struck}`;
        case "knocked":
          return `knocked ${at} #${String(hit.piece)} to ${String(hit.layersLeft)}, ${struck}`;
        case "dusted":
          return `dusted ${at} to ${String(hit.layersLeft)}, ${struck}`;
        case "uncaged":
        case "unburred":
        case "broken":
        case "ruffled":
          return `${hit.what} ${at} #${String(hit.piece)}, ${struck}`;
        default:
          return hit satisfies never;
      }
    }
  }
}

/** Returns a game written out: a line each for how it stands, its wind, its kinds, its goals, its goals left and its lanes, then its board as the screen shows it. */
function gameLines(game: Game): string[] {
  const { wind } = game;
  return [
    `game turns ${String(game.turns)}, moves left ${String(game.movesLeft)}, played ${String(game.movesPlayed)}, seed ${String(game.seed)}, next #${String(game.nextPieceId)}, ${game.outcome}`,
    wind === null
      ? "wind -"
      : `wind every ${String(wind.every)} turns ${String(wind.quarters)} waits ${String(wind.wait)}`,
    `kinds ${game.kinds.join(" ")}`,
    `goals ${game.goals.map((goal) => (goal.what === "gather" ? `gather ${String(goal.count)} ${goal.kind}` : goal.what)).join(", ")}`,
    `goals left ${game.goalsLeft.join(" ")}`,
    `lanes ${game.lanes.map((lanes) => lanes.join(" ")).join(", ")}`,
    ...boardLines(boardOnScreen(game)),
  ];
}

/** Returns a board written out a row a line: its pieces, their marks and its dust, as `pictureOf()` draws them, and its beds, a bed as `+`. */
function boardLines(board: Board): string[] {
  const { pieces, marks, dust } = pictureOf(board);
  return [
    `board ${String(board.width)} by ${String(board.height)}`,
    ...pieces.map((row, y) => {
      const beds = Array.from({ length: board.width }, (_, x) =>
        itemAt(board.beds, indexOf({ x, y }, board.width)) ? "+" : ".",
      ).join("");
      return `  ${row} | ${marks?.[y] ?? ".".repeat(board.width)} | ${dust?.[y] ?? "0".repeat(board.width)} | ${beds}`;
    }),
  ];
}

/** Returns a game's board as the screen shows it, a dasher's way the screen's. */
function boardOnScreen({ board, turns }: Game): Board {
  const width = turns % 2 === 0 ? board.width : board.height;
  const height = turns % 2 === 0 ? board.height : board.width;
  const own = Array.from({ length: width * height }, (_, square) =>
    ownSquareOf(squareOf(square, width), width, height, turns),
  );
  return {
    width,
    height,
    open: own.map((square) => itemAt(board.open, square)),
    pieces: own.map((square) => turned(itemAt(board.pieces, square), turns)),
    dust: own.map((square) => itemAt(board.dust, square)),
    beds: own.map((square) => itemAt(board.beds, square)),
  };
}

/**
 * Returns the square of a board's own frame that a square of the screen's
 * is, the frame turned clockwise so many quarter turns, each taking a board
 * so wide and high to one as high as it was wide.
 */
function ownSquareOf(
  onScreen: Square,
  width: number,
  height: number,
  turns: QuarterTurns,
): number {
  let square = onScreen;
  let across = width;
  let down = height;
  for (let turn = 0; turn < turns; turn++) {
    square = { x: down - 1 - square.y, y: square.x };
    [across, down] = [down, across];
  }
  return indexOf(square, across);
}

/** Returns a piece as a frame turned so many quarter turns from its own holds it: a dasher's way turned with it. */
function turned(piece: Piece | null, turns: QuarterTurns): Piece | null {
  if (piece?.what !== "fuzzball" || turns % 2 === 0) {
    return piece;
  }
  switch (piece.special) {
    case "dasher-across":
      return { ...piece, special: "dasher-down" };
    case "dasher-down":
      return { ...piece, special: "dasher-across" };
    default:
      return piece;
  }
}

/** Returns a piece's id written out, a dash for none. */
function idOf(piece: number | null): string {
  return piece === null ? "-" : `#${String(piece)}`;
}
