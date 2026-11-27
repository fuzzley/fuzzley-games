/**
 * Writes Fuzz Flux's golden games: the sketch's own play, written down, which
 * the game's rules are held to move by move.
 *
 * `node sketch/golden.mjs` plays every level of `levels/*.json` on each of
 * its deals: along the deal's certificate, then in games of random moves to
 * the level's end, and on its first deals in long games of random moves that
 * play on to 60 moves. It writes, from scratch, the game's
 * `src/rules/golden/<set>.json`, each game's moves in the screen's frame and
 * a digest of the game as dealt and after each move, and
 * `src/testing/golden_samples.ts`, a few small positions of the golden games
 * that between them show every kind of thing a digest writes, each in the
 * game's words beside its digest written out. `--print <set>:<game>` writes
 * one golden game out instead, to read a failure by.
 */

/** @import { Level, State } from "./engine.mjs" */
/** @import { Board, Game } from "../../../frontend/games/fuzz-flux/src/rules/board/board.ts" */
/** @import { KindId } from "../../../frontend/games/fuzz-flux/src/rules/catalog/kinds.ts" */
/** @import { MoveRecord } from "../../../frontend/games/fuzz-flux/src/rules/move/record.ts" */
/** @import { Piece } from "../../../frontend/games/fuzz-flux/src/rules/catalog/pieces.ts" */
/** @import { GoldenSample } from "../../../frontend/games/fuzz-flux/src/testing/golden.ts" */
/** @import { Printer } from "../../../frontend/lib/dev/src/script.ts" */

import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import {
  CONSOLE,
  isStop,
  misread,
  readArgs,
  stopWith,
} from "../../../frontend/lib/dev/src/script.ts";
import { dice } from "./bots.mjs";
import { clone, deal, hash, legalMoves, play } from "./engine.mjs";
import { digestOf, writtenOut } from "./golden_digest.mjs";
import { gameOf, onScreenAt, recordOf } from "./golden_words.mjs";

/** How many golden games a level has beside its certificates' lines, and how long the long ones run. */
const GAMES = {
  /** Games of random moves on each deal, each to the level's end. */
  random: 4,
  /** Long games a level, one on each of its first deals. */
  long: 2,
  /** The moves a long game is dealt, which it plays on to. */
  longMoves: 60,
};

const HERE = import.meta.dirname;
const FRONTEND = join(HERE, "../../../frontend");
const GAME = join(FRONTEND, "games/fuzz-flux");
const GOLDEN = join(GAME, "src/rules/golden");
const SAMPLES = join(GAME, "src/testing/golden_samples.ts");

const USAGE = `Usage: node docs/fuzz-flux/sketch/golden.mjs [--print <set>:<game>]

Plays every level's golden games on the sketch, and writes them, from
scratch, into frontend/games/fuzz-flux/src/rules/golden/, and the moves that
show every kind of thing a digest writes into src/testing/golden_samples.ts.

  --print <set>:<game>  Write out one golden game instead, as dealt and after
                        each move: warm-up:17 for warm-up.json's game 17,
                        counted from 0
  -h, --help            Show this message`;

/** The salt of a golden game's dice, which no draw of the rules takes. */
const DICE_SALT = 99;

/**
 * Describes a game as it stood once dealt or after a move, the move's record,
 * and the two written out.
 * @typedef {object} Position
 * @property {Game} game
 * @property {MoveRecord | null} record Null for the game as dealt.
 * @property {string} writtenOut
 */

/**
 * Describes a golden game as the sketch played it.
 * @typedef {object} PlayedGame
 * @property {Level} level
 * @property {number} deal The deal's seed.
 * @property {number} movesLeft The moves it was dealt.
 * @property {[number, number][]} moves Each move, the square picked up and the one swapped with, in the screen's frame.
 * @property {Position[]} positions The game as dealt, then after each move.
 * @property {boolean} cleared
 */

/**
 * Describes a set of levels as its file under `levels/` holds it.
 * @typedef {{ id: string, levels: Level[] }} LevelSet
 */

/**
 * Returns a level's golden games: on each deal, its certificate's line, then
 * games of random moves to the level's end, then a long game on each of its
 * first deals.
 * @param {Level} level
 * @param {Record<string, number[][]> | undefined} lines Its deals' certificates' lines, by seed, in the sketch's frame.
 * @returns {PlayedGame[]}
 * @throws {Error} for a deal with no certificate, or one whose line no longer clears the level.
 */
export function playedGamesOf(level, lines) {
  const deals = level.deals ?? [];
  const roll = (/** @type {number} */ seed, /** @type {number} */ game) =>
    dice(hash(level.id, seed, game, DICE_SALT));
  return [
    ...deals.flatMap((seed) => {
      const certificate = lines?.[seed];
      if (certificate === undefined) {
        throw new Error(`Level ${level.id}'s deal ${seed} has no certificate.`);
      }
      const line = playedGame(level, seed, level.moves, alongLine(certificate));
      if (!line.cleared) {
        throw new Error(
          `Level ${level.id}'s certificate for deal ${seed} no longer clears it.`,
        );
      }
      return [
        line,
        ...Array.from({ length: GAMES.random }, (_, game) =>
          playedGame(level, seed, level.moves, atRandom(roll(seed, game))),
        ),
      ];
    }),
    ...deals
      .slice(0, GAMES.long)
      .map((seed, game) =>
        playedGame(
          level,
          seed,
          GAMES.longMoves,
          playingOn(roll(seed, GAMES.random + game)),
        ),
      ),
  ];
}

/**
 * Returns positions of the golden games that between them send a digest's
 * writer every way any sends it, few and small, in the order they were
 * played, as samples to hold the game's writer to: each, in turn, the one
 * that sends it the most ways not yet sent for its size as a sample.
 * @param {readonly { set: string, games: readonly PlayedGame[] }[]} sets
 * @returns {GoldenSample[]}
 */
export function samplesOf(sets) {
  const candidates = sets.flatMap(({ set, games }) =>
    games.flatMap((game, place) =>
      game.positions.map((position, move) => ({
        position,
        playedIn: { set, game: place, move },
        ways: new Set(waysWrittenOf(position)),
        size:
          position.writtenOut.length + JSON.stringify(position.record).length,
      })),
    ),
  );
  const unsent = new Set(candidates.flatMap(({ ways }) => [...ways]));
  /** @type {Set<(typeof candidates)[number]>} */
  const chosen = new Set();
  while (unsent.size > 0) {
    let best = candidates[0];
    let bestWorth = 0;
    for (const candidate of candidates) {
      const worth =
        [...candidate.ways].filter((way) => unsent.has(way)).length /
        candidate.size;
      if (worth > bestWorth) {
        best = candidate;
        bestWorth = worth;
      }
    }
    chosen.add(best);
    for (const way of best.ways) unsent.delete(way);
  }
  return candidates
    .filter((candidate) => chosen.has(candidate))
    .map(({ position: { game, record, writtenOut }, playedIn }) => {
      const { board, ...standing } = game;
      return {
        playedIn,
        game: standing,
        board: boardWordsOf(board),
        dust: board.dust,
        beds: board.beds.flatMap((bed, square) => (bed ? [square] : [])),
        record,
        writtenOut: writtenOut.split("\n"),
      };
    });
}

/**
 * Plays every level's golden games, and writes them and their samples, or
 * one golden game out, returning the code to exit with: 0, or 2 for a
 * command line it can't read, having written nothing.
 * @param {readonly string[]} args
 * @param {Partial<Printer>} [io]
 * @returns {Promise<number>}
 */
export async function run(
  args,
  { print = CONSOLE.print, printError = CONSOLE.printError } = {},
) {
  const read = readArgs(args, {
    options: { print: { type: "string" } },
    usage: USAGE,
  });
  if (isStop(read)) return stopWith(read, { print, printError });
  /** @type {Record<string, Record<string, number[][]>>} */
  const certificates = JSON.parse(
    readFileSync(join(HERE, "certificates.json"), "utf8"),
  );
  const sets = levelSets().map(({ id, levels }) => ({
    set: id,
    games: levels.flatMap((level) =>
      playedGamesOf(level, certificates[level.id]),
    ),
  }));
  if (read.values.print !== undefined) {
    const [, set, place] = /^(.+):(\d+)$/.exec(read.values.print) ?? [];
    const game = sets.find((each) => each.set === set)?.games[Number(place)];
    if (game === undefined) {
      return stopWith(
        misread(`No golden game is ${read.values.print}.`, USAGE),
        { print, printError },
      );
    }
    for (const line of printed(game)) print(line);
    return 0;
  }
  const prettier = createRequire(join(FRONTEND, "package.json"))("prettier");
  mkdirSync(GOLDEN, { recursive: true });
  for (const name of readdirSync(GOLDEN)) {
    if (name.endsWith(".json")) rmSync(join(GOLDEN, name));
  }
  for (const { set, games } of sets) {
    const file = join(GOLDEN, `${set}.json`);
    const text = await prettier.format(
      JSON.stringify({ set, games: games.map(goldenEntry) }),
      { ...(await prettier.resolveConfig(file)), filepath: file },
    );
    writeFileSync(file, text);
    const moves = games.reduce((sum, { moves }) => sum + moves.length, 0);
    print(
      `${set}.json: ${games.length} games, ${moves} moves, ${Buffer.byteLength(text)} bytes.`,
    );
  }
  const samples = samplesOf(sets);
  const text = await prettier.format(samplesModule(samples), {
    ...(await prettier.resolveConfig(SAMPLES)),
    filepath: SAMPLES,
  });
  writeFileSync(SAMPLES, text);
  print(
    `golden_samples.ts: ${samples.length} samples, ${Buffer.byteLength(text)} bytes.`,
  );
  return 0;
}

/**
 * Returns each set of levels under `levels/`, in the order of their files'
 * names.
 * @returns {LevelSet[]}
 */
function levelSets() {
  const folder = join(HERE, "../levels");
  return readdirSync(folder)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(folder, name), "utf8")));
}

/**
 * Plays a deal of a level with a player, until the level is cleared, its
 * moves run out or the player stops, written down as dealt and after each
 * move.
 * @param {Level} level
 * @param {number} seed The deal's.
 * @param {number} movesLeft The moves it is dealt.
 * @param {(s: State) => ({ a: number, b: number } | null)} choose The player, who returns null to stop.
 * @returns {PlayedGame}
 */
function playedGame(level, seed, movesLeft, choose) {
  const s = deal({ ...level, moves: movesLeft }, seed);
  const kinds = /** @type {KindId[]} */ (level.kinds);
  /** @type {[number, number][]} */
  const moves = [];
  const positions = [positionOf(gameOf(s, level), null)];
  while (!s.won && !s.lost) {
    const move = choose(s);
    if (move === null) break;
    const before = clone(s);
    const record = play(s, move.a, move.b, true);
    if (record === null) throw new Error("A move kept no record.");
    moves.push([onScreenAt(before, move.a), onScreenAt(before, move.b)]);
    positions.push(
      positionOf(gameOf(s, level), recordOf(record, before, s, kinds)),
    );
  }
  return { level, deal: seed, movesLeft, moves, positions, cleared: s.won };
}

/**
 * Returns a game, and the move that made it, beside the two written out.
 * @param {Game} game
 * @param {MoveRecord | null} record
 * @returns {Position}
 */
function positionOf(game, record) {
  return { game, record, writtenOut: writtenOut(game, record) };
}

/**
 * Returns a player that plays a certificate's line, move by move, then
 * stops.
 * @param {number[][]} line Its moves, in the sketch's frame.
 * @returns {(s: State) => ({ a: number, b: number } | null)}
 */
function alongLine(line) {
  let next = 0;
  return () => {
    const move = line[next++];
    return move === undefined ? null : { a: move[0], b: move[1] };
  };
}

/**
 * Returns a player that plays a random legal move, or stops where there is
 * none.
 * @param {(n: number) => number} roll
 * @returns {(s: State) => ({ a: number, b: number } | null)}
 */
function atRandom(roll) {
  return (s) => {
    const moves = legalMoves(s);
    return moves.length === 0 ? null : moves[roll(moves.length)];
  };
}

/**
 * Returns a player that plays a random legal move that doesn't clear the
 * level, so that its game plays on to its last move, unless every move
 * clears it.
 * @param {(n: number) => number} roll
 * @returns {(s: State) => ({ a: number, b: number } | null)}
 */
function playingOn(roll) {
  return (s) => {
    const moves = legalMoves(s);
    if (moves.length === 0) return null;
    const first = roll(moves.length);
    for (let n = 0; n < moves.length; n++) {
      const move = moves[(first + n) % moves.length];
      const next = clone(s);
      play(next, move.a, move.b);
      if (!next.won) return move;
    }
    return moves[first];
  };
}

/**
 * Returns a golden game as its set's file holds it, a line that Prettier
 * leaves whole: its level, its deal and the moves it was dealt, then its
 * moves as pairs of squares, then the digests of the game as dealt and after
 * each move, as `1 3 14 | 34 35, 15 16 | a6a966c2 01e8f59c c2142385`.
 * @param {PlayedGame} game
 * @returns {string}
 */
function goldenEntry(game) {
  return [
    `${game.level.id} ${game.deal} ${game.movesLeft}`,
    game.moves.map(([from, to]) => `${from} ${to}`).join(", "),
    game.positions.map((position) => digestOf(position.writtenOut)).join(" "),
  ].join(" | ");
}

/**
 * Returns a golden game written out, as dealt and after each move, each
 * under a line that says which, with its digest.
 * @param {PlayedGame} game
 * @returns {string[]}
 */
function printed(game) {
  return game.positions.flatMap((position, move) => [
    move === 0
      ? `Level ${game.level.id}, deal ${game.deal}, dealt (${digestOf(position.writtenOut)}):`
      : `Move ${move}, ${game.moves[move - 1].join(" to ")} (${digestOf(position.writtenOut)}):`,
    position.writtenOut,
    "",
  ]);
}

/**
 * Returns each way a game, and the move that made it, take a digest's
 * writer: each kind of line it writes, of letter and of mark in its board's
 * rows, and of frame its board is turned to, which the game's writer must
 * write as this one does.
 * @param {Position} position
 * @returns {string[]}
 */
function waysWrittenOf({ game, record }) {
  const { board, turns } = game;
  const marked = board.pieces.some(
    (piece) =>
      piece?.what === "fuzzball" && (piece.burred || piece.special !== null),
  );
  const standing = [
    `turns ${turns}, ${board.width === board.height ? "square" : "not square"}`,
    game.wind === null ? "no wind that turns" : "a wind that turns",
    ...game.goals.map(({ what }) =>
      what === "gather" ? "a goal to gather" : "a goal to clear",
    ),
    marked ? "marks" : "no marks",
    board.dust.some((layers) => layers > 0) ? "dust" : "no dust",
    ...(board.beds.includes(true) ? ["a bed"] : []),
    ...board.pieces.flatMap((piece, square) => {
      if (!board.open[square]) return ["a gap"];
      switch (piece?.what) {
        case undefined:
          return ["an empty square"];
        case "fuzzball":
          return [
            `a ${piece.caged ? "caged " : ""}${piece.kind}`,
            ...(piece.burred ? ["a burr"] : []),
            ...(piece.special === null
              ? []
              : [`a ${piece.special}${turns % 2 === 0 ? "" : " turned"}`]),
          ];
        case "brick":
          return [`a brick of ${piece.layers}`];
        default:
          return [`a ${piece.what}`];
      }
    }),
  ];
  if (record === null) return [...standing, "no record"];
  const waves = [...record.waves, ...(record.gust?.waves ?? [])];
  return [
    ...standing,
    record.swap.refused ? "a swap refused" : "a swap",
    record.burrSpread === null ? "no burr spread" : "a burr spread",
    record.gust === null ? "no gust" : "a gust",
    record.shuffle === null ? "no shuffle" : "a shuffle",
    ...waves.flatMap(({ bunches, blasts, hits, falls }) => [
      ...bunches.map(({ makes }) =>
        makes === null ? "a bunch making nothing" : "a bunch making a special",
      ),
      ...blasts.flatMap((blast) => [
        blast.setOffBy === null
          ? "a blast set off by the move"
          : "a blast set off by a blast",
        ...(blast.piece === null ? ["a blast carried"] : []),
        ...(blast.kind === null ? ["a blast of no kind"] : []),
      ]),
      ...hits.map((hit) =>
        "blast" in hit
          ? `${hit.what} by a ${hit.blast === null ? "bunch" : "blast"}${hit.what === "gathered" && hit.kind === null ? " of no kind" : ""}`
          : hit.what,
      ),
      ...falls.map(
        ({ from, kind }) =>
          `${from === null ? "a fuzzball let in" : "a fall"}${kind === null ? " of no kind" : ""}`,
      ),
    ]),
  ];
}

/**
 * Returns a board's squares in its own frame, a row a string, each square in
 * the game's words, as `GoldenSample` says, rather than in the letters
 * either digest draws it in, so that a sample holds the two drawings to each
 * other.
 * @param {Board} board
 * @returns {string[]}
 */
function boardWordsOf(board) {
  return Array.from({ length: board.height }, (_, y) =>
    Array.from({ length: board.width }, (_, x) => {
      const square = y * board.width + x;
      return board.open[square] ? pieceWords(board.pieces[square]) : "gap";
    }).join(" "),
  );
}

/**
 * Returns a square's piece in the game's words, as `GoldenSample` says.
 * @param {Piece | null} piece
 * @returns {string}
 */
function pieceWords(piece) {
  switch (piece?.what) {
    case undefined:
      return "empty";
    case "fuzzball":
      return [
        piece.kind,
        ...(piece.caged ? ["caged"] : []),
        ...(piece.burred ? ["burred"] : []),
        ...(piece.special === null ? [] : [piece.special]),
      ].join("+");
    case "brick":
      return `brick+${piece.layers}`;
    default:
      return piece.what;
  }
}

/**
 * Returns the source of the game's module of golden samples.
 * @param {readonly GoldenSample[]} samples
 * @returns {string}
 */
function samplesModule(samples) {
  return `// The golden games' samples: a few small positions of the sketch's play
// that between them show every kind of thing a golden game's digest writes,
// each in the game's words beside the sketch's digest of it written out,
// which golden.ts's must match. docs/fuzz-flux/sketch/golden.mjs writes this
// file from scratch.

import type { GoldenSample } from "./golden";

/** Each sample, in the order its golden game was played. */
export const GOLDEN_SAMPLES: readonly GoldenSample[] = ${JSON.stringify(samples)};
`;
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
