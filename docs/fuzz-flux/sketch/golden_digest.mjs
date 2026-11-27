/**
 * Writes a golden game's digest: a game, and the move that made it, written
 * out in the game's words and the screen's frame, and hashed. The game's
 * `src/testing/golden.ts` writes the same from its own `Game` and
 * `MoveRecord`, and says what the text holds and why.
 */

/** @import { Board, Game } from "../../../frontend/games/fuzz-flux/src/rules/board/board.ts" */
/** @import { KindId } from "../../../frontend/games/fuzz-flux/src/rules/catalog/kinds.ts" */
/** @import { Piece } from "../../../frontend/games/fuzz-flux/src/rules/catalog/pieces.ts" */
/** @import { SpecialId } from "../../../frontend/games/fuzz-flux/src/rules/catalog/specials.ts" */
/** @import { Hit, MoveRecord, Wave } from "../../../frontend/games/fuzz-flux/src/rules/move/record.ts" */

import { hash } from "./engine.mjs";
import { onScreenAt, turnedWith } from "./golden_words.mjs";

/**
 * The letter each kind of fuzzball is drawn in, as the levels' legend has
 * it, its capital for one caged.
 * @type {Readonly<Record<KindId, string>>}
 */
const KIND_LETTERS = {
  blue: "b",
  red: "r",
  amber: "a",
  green: "g",
  violet: "v",
  pink: "p",
};

/**
 * The mark each special fuzzball is drawn with, as the game's `pictureOf()`
 * draws it.
 * @type {Readonly<Record<SpecialId, string>>}
 */
const SPECIAL_MARKS = {
  "dasher-across": "-",
  "dasher-down": "|",
  puffer: "o",
  wisp: "w",
};

/** The salt of a digest's hash, which no draw of the rules takes. */
const DIGEST_SALT = 0;

/**
 * Describes a board drawn a row a string, its squares in the order drawn: its
 * pieces, their marks, its dust and its beds.
 * @typedef {{ pieces: string[], marks: string[], dust: string[], beds: string[] }} Drawing
 */

/**
 * Returns a game, and the move that made it, written out as a golden game's
 * digest is: a line each for the record's swap, its waves' parts, what
 * followed the waves and its outcome, then for the game's every field, its
 * board on the screen a row a line, a dash for what isn't there.
 * @param {Game} game
 * @param {MoveRecord | null} record Null for a game as dealt.
 * @returns {string}
 */
export function writtenOut(game, record) {
  return [
    ...(record === null ? [] : recordLines(record)),
    ...gameLines(game),
  ].join("\n");
}

/**
 * Returns a text's digest: 8 hex digits of a 32-bit hash, the sketch's
 * `hash()` folded over it a character at a time.
 * @param {string} text
 * @returns {string}
 */
export function digestOf(text) {
  let digest = 0;
  for (let at = 0; at < text.length; at++) {
    digest = hash(digest, text.charCodeAt(at), at, DIGEST_SALT);
  }
  return digest.toString(16).padStart(8, "0");
}

/**
 * Returns a board drawn as the game's `pictureOf()` draws it, its squares
 * taken in an order, so many to a row, a dasher's way turned with the frame
 * drawn in, and a bed drawn as `+`.
 * @param {Board} board
 * @param {readonly number[]} order Each square of the board's own frame, in the order drawn.
 * @param {number} width The rows' width.
 * @param {number} turns How many quarter turns the frame drawn in is from the board's own.
 * @returns {Drawing}
 */
function drawingOf(board, order, width, turns) {
  const rows = (/** @type {(square: number) => string} */ letterAt) =>
    Array.from({ length: order.length / width }, (_, y) =>
      order
        .slice(y * width, (y + 1) * width)
        .map(letterAt)
        .join(""),
    );
  return {
    pieces: rows((square) =>
      board.open[square] ? pieceLetter(board.pieces[square]) : "_",
    ),
    marks: rows((square) => markOf(board.pieces[square], turns)),
    dust: rows((square) => String(board.dust[square])),
    beds: rows((square) => (board.beds[square] ? "+" : ".")),
  };
}

/**
 * Returns a move's record written out.
 * @param {MoveRecord} record
 * @returns {string[]}
 */
function recordLines({ swap, waves, burrSpread, gust, shuffle, outcome }) {
  return [
    `swap ${swap.from} to ${swap.to}${swap.refused ? ", refused" : ""}`,
    ...waves.flatMap(waveLines),
    burrSpread === null
      ? "burr -"
      : `burr from ${burrSpread.from} to ${burrSpread.to} #${burrSpread.piece}`,
    ...(gust === null
      ? ["gust -"]
      : [`gust turns ${gust.turns}`, ...gust.waves.flatMap(waveLines)]),
    shuffle === null
      ? "shuffle -"
      : `shuffle ${shuffle.moves.map(({ piece, from, to }) => `#${piece} ${from} to ${to}`).join(", ")}`,
    `outcome ${outcome}`,
  ];
}

/**
 * Returns a wave written out: its number and its goals left, then a line
 * each for its bunches, its blasts, its hits and its falls, in their order.
 * @param {Wave} wave
 * @returns {string[]}
 */
function waveLines({ number, bunches, blasts, hits, falls, goalsLeft }) {
  return [
    `wave ${number}, goals left ${goalsLeft.join(" ")}`,
    ...bunches.map(
      ({ squares, kind, makes }) =>
        `  bunch ${kind} ${squares.join(" ")}, makes ${makes === null ? "-" : `${makes.what} at ${makes.square} #${makes.piece}`}`,
    ),
    ...blasts.map(
      (blast) =>
        `  blast ${blast.what} at ${blast.square} ${idOf(blast.piece)} ${blast.kind ?? "-"}, set off by ${blast.setOffBy ?? "-"} at ${blast.wait}, strikes ${blast.strikes.map(({ square, step }) => `${square}/${step}`).join(" ")}`,
    ),
    ...hits.map((hit) => `  ${hitLine(hit)}`),
    ...falls.map(
      ({ piece, kind, from, path, lane }) =>
        `  fall #${piece} ${kind ?? "-"} from ${from ?? "-"} to ${path.join(" ")}, lane ${lane}`,
    ),
  ];
}

/**
 * Returns a hit written out: what it did, where and to what, and for one a
 * bunch or a blast struck, at what step and by which blast.
 * @param {Hit} hit
 * @returns {string}
 */
function hitLine(hit) {
  switch (hit.what) {
    case "born":
      return `born at ${hit.square} #${hit.piece} ${hit.made} ${hit.kind}`;
    case "bedded":
      return `bedded at ${hit.square} #${hit.piece}`;
    default: {
      const struck = `step ${hit.step} by ${hit.blast ?? "-"}`;
      switch (hit.what) {
        case "gathered":
          return `gathered at ${hit.square} #${hit.piece} ${hit.kind ?? "-"}, ${struck}`;
        case "knocked":
          return `knocked at ${hit.square} #${hit.piece} to ${hit.layersLeft}, ${struck}`;
        case "dusted":
          return `dusted at ${hit.square} to ${hit.layersLeft}, ${struck}`;
        default:
          return `${hit.what} at ${hit.square} #${hit.piece}, ${struck}`;
      }
    }
  }
}

/**
 * Returns a game written out: a line each for how it stands, its wind, its
 * kinds, its goals, its goals left and its lanes, then its board as the
 * screen shows it.
 * @param {Game} game
 * @returns {string[]}
 */
function gameLines(game) {
  const { wind } = game;
  return [
    `game turns ${game.turns}, moves left ${game.movesLeft}, played ${game.movesPlayed}, seed ${game.seed}, next #${game.nextPieceId}, ${game.outcome}`,
    wind === null
      ? "wind -"
      : `wind every ${wind.every} turns ${wind.quarters} waits ${wind.wait}`,
    `kinds ${game.kinds.join(" ")}`,
    `goals ${game.goals.map((goal) => (goal.what === "gather" ? `gather ${goal.count} ${goal.kind}` : goal.what)).join(", ")}`,
    `goals left ${game.goalsLeft.join(" ")}`,
    `lanes ${game.lanes.map((lanes) => lanes.join(" ")).join(", ")}`,
    ...boardLines(game),
  ];
}

/**
 * Returns a game's board written out as the screen shows it, a row a line:
 * its pieces, their marks, its dust and its beds.
 * @param {Game} game
 * @returns {string[]}
 */
function boardLines({ board, turns }) {
  const width = turns % 2 === 0 ? board.width : board.height;
  /** @type {number[]} */
  const order = [];
  const frame = { w: board.width, h: board.height, rot: turns };
  board.open.forEach((_, square) => {
    order[onScreenAt(frame, square)] = square;
  });
  const { pieces, marks, dust, beds } = drawingOf(board, order, width, turns);
  return [
    `board ${width} by ${pieces.length}`,
    ...pieces.map(
      (row, y) => `  ${row} | ${marks[y]} | ${dust[y]} | ${beds[y]}`,
    ),
  ];
}

/**
 * Returns the letter a piece is drawn in, a space for none.
 * @param {Piece | null} piece
 * @returns {string}
 */
function pieceLetter(piece) {
  switch (piece?.what) {
    case undefined:
      return " ";
    case "fuzzball": {
      const letter = KIND_LETTERS[piece.kind];
      return piece.caged ? letter.toUpperCase() : letter;
    }
    case "frizzball":
      return "f";
    case "brick":
      return String(piece.layers);
    case "sleepyhead":
      return "z";
  }
}

/**
 * Returns the mark a piece is drawn with: its burr's, its special's or none.
 * @param {Piece | null} piece
 * @param {number} turns How many quarter turns the frame drawn in is from the piece's.
 * @returns {string}
 */
function markOf(piece, turns) {
  if (piece?.what !== "fuzzball") return ".";
  if (piece.burred) return "*";
  if (piece.special === null) return ".";
  return SPECIAL_MARKS[turnedWith(piece.special, turns)];
}

/**
 * Returns a piece's id written out, a dash for none.
 * @param {number | null} piece
 * @returns {string}
 */
function idOf(piece) {
  return piece === null ? "-" : `#${piece}`;
}
