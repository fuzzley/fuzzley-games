/**
 * Writes Fuzz Flux's golden games: the sketch's own play, written down, which
 * the game's rules are held to move by move.
 *
 * `node sketch/golden.mjs` plays every level of `levels/*.json` on each of
 * its deals: along the deal's certificate, then in games of random moves to
 * the level's end, and on its first deals in long games of random moves that
 * play on to 60 moves. It writes, from scratch, the game's
 * `src/rules/golden/<set>.json`, each game's moves in the screen's frame and
 * a digest of the game as dealt and after each move. `--print <set>:<game>`
 * writes one golden game out instead, to read a failure by.
 */

/** @import { Level, State } from "./engine.mjs" */
/** @import { KindId } from "../../../frontend/games/fuzz-flux/src/rules/catalog/kinds.ts" */
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

const USAGE = `Usage: node docs/fuzz-flux/sketch/golden.mjs [--print <set>:<game>]

Plays every level's golden games on the sketch, and writes them, from
scratch, into frontend/games/fuzz-flux/src/rules/golden/.

  --print <set>:<game>  Write out one golden game instead, as dealt and after
                        each move: warm-up:17 for warm-up.json's game 17,
                        counted from 0
  -h, --help            Show this message`;

/** The salt of a golden game's dice, which no draw of the rules takes. */
const DICE_SALT = 99;

/**
 * Describes a golden game as the sketch played it.
 * @typedef {object} PlayedGame
 * @property {Level} level
 * @property {number} deal The deal's seed.
 * @property {number} movesLeft The moves it was dealt.
 * @property {[number, number][]} moves Each move, the square picked up and the one swapped with, in the screen's frame.
 * @property {string[]} writtenOut The game as dealt, then after each move, each with the move that made it, written out.
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
 * Plays every level's golden games, and writes them, or one golden game out,
 * returning the code to exit with: 0, or 2 for a command line it can't read,
 * having written nothing.
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
  const written = [writtenOut(gameOf(s, level), null)];
  while (!s.won && !s.lost) {
    const move = choose(s);
    if (move === null) break;
    const before = clone(s);
    const record = play(s, move.a, move.b, true);
    if (record === null) throw new Error("A move kept no record.");
    moves.push([onScreenAt(before, move.a), onScreenAt(before, move.b)]);
    written.push(
      writtenOut(gameOf(s, level), recordOf(record, before, s, kinds)),
    );
  }
  return {
    level,
    deal: seed,
    movesLeft,
    moves,
    writtenOut: written,
    cleared: s.won,
  };
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
    game.writtenOut.map(digestOf).join(" "),
  ].join(" | ");
}

/**
 * Returns a golden game written out, as dealt and after each move, each
 * under a line that says which, with its digest.
 * @param {PlayedGame} game
 * @returns {string[]}
 */
function printed(game) {
  return game.writtenOut.flatMap((text, move) => [
    move === 0
      ? `Level ${game.level.id}, deal ${game.deal}, dealt (${digestOf(text)}):`
      : `Move ${move}, ${game.moves[move - 1].join(" to ")} (${digestOf(text)}):`,
    text,
    "",
  ]);
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
