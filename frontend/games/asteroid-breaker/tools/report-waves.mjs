#!/usr/bin/env node
/**
 * Prints how the autopilot plays every wave at every speed.
 *
 *   yarn report:waves [--seeds <n>] [--field <narrow|wide|tall>] [--endless]
 *
 * For each wave and speed it plays the wave twice through the autopilot's
 * `playWave()`, as the specs in `src/rules/waves/every_wave/` do, so the
 * report and the specs play the same games: once with nothing able to take
 * the ship, for the game time the wave took to clear and the strays brought
 * home of those sent, and once as the specs play it, for the ships it cost.
 * It fails when a play doesn't clear its wave within the autopilot's limit
 * (`-`), as the specs do, but it counts the untouchable plays too, so it is
 * the stricter of the two. It loads the rules and the autopilot through
 * Vite, as the game's build does. The report is how the climb from wave to
 * wave is tuned: a wave that takes long, or costs ships at Relaxed, is one
 * to look at again.
 *
 * With `--seeds`, it plays each wave that many times at each speed, from
 * seeds of its own, and prints the middle time, the longest, the most ships
 * lost and the strays brought home of all those sent, since the rocks and
 * pickups one seed lays out can make a wave look far easier or harder than
 * it is. It fails on any seed's play that doesn't clear its wave in time.
 *
 * With `--field wide`, it plays every wave on the widest field on its side,
 * and with `--field tall` upright, rather than on the narrowest, the three
 * the spec plays.
 *
 * With `--endless`, it plays Endless's waves 31 to 60, as the spec does,
 * rather than the sectors', each made from the seed it is played from, and
 * fails only on a play that doesn't clear its wave in time with nothing
 * able to take the ship: Endless is held to being fair, not to what it
 * costs, as it climbs until a run's ships run out.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runnerImport } from "vite";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** How wide the column of the waves' names is. */
const NAME_WIDTH = 16;

/** How far apart each wave's seeds start with `--seeds`, so no two waves share one. */
const SEED_STRIDE = 1000;

/**
 * A wave as the rules list it.
 *
 * @typedef {object} WaveEntry
 * @property {number} number Its place in the game, from 1.
 * @property {{ id: string, name: string }} data
 */

/**
 * The shape of a field, in units.
 *
 * @typedef {object} Torus
 * @property {number} width
 * @property {number} height
 */

/**
 * How the autopilot's play of a wave went.
 *
 * @typedef {object} AutopilotReport
 * @property {boolean} cleared
 * @property {number} steps
 * @property {number} shipsLost
 * @property {number} straysSent
 * @property {number} straysHome
 */

/**
 * How a wave went at one speed from one seed: flown with nothing able to
 * take the ship, and as the spec plays it.
 *
 * @typedef {object} Play
 * @property {AutopilotReport} untouchable
 * @property {AutopilotReport} played
 */

/**
 * What the script takes from the rules and the autopilot.
 *
 * @typedef {object} Rules
 * @property {readonly WaveEntry[]} waves Every wave, in the order played.
 * @property {readonly WaveEntry[]} endless Endless's waves the spec plays.
 * @property {readonly string[]} speeds The speeds, slowest first.
 * @property {number} stepSeconds The game time a step takes, in seconds.
 * @property {number} limit The most steps the autopilot plays a wave.
 * @property {Torus} narrowest
 * @property {Torus} widest
 * @property {Torus} tallest
 * @property {(entry: WaveEntry, speed: string, options: { seed: number, torus: Torus, invulnerable: boolean }) => AutopilotReport} playWave
 */

/**
 * The game as the report plays it: the rules, on the field asked.
 *
 * @typedef {object} Game
 * @property {readonly WaveEntry[]} waves Every wave, in the order played.
 * @property {readonly string[]} speeds The speeds, slowest first.
 * @property {number} stepSeconds The game time a step takes, in seconds.
 * @property {number} limit The most steps the autopilot plays a wave.
 * @property {(entry: WaveEntry, speed: string, seed: number) => Play} playWave
 */

/**
 * The plays the report makes of each wave at each speed, and the columns
 * it shows of them.
 *
 * @typedef {object} Layout
 * @property {(entry: WaveEntry) => number[]} seedsOf The seeds a wave is played from.
 * @property {readonly string[]} headings The heading of each column.
 * @property {readonly number[]} widths How wide each column is.
 * @property {(plays: ReadonlyArray<Play>, game: Game) => string[]} cellsOf
 *   Returns the columns' cells for a wave's plays at one speed.
 */

/** @type {Layout} */
const ONE_PLAY = {
  seedsOf: (entry) => [entry.number],
  headings: ["time", "lost", "home"],
  widths: [5, 5, 5],
  cellsOf: (plays, game) => {
    const [play] = plays;
    return play
      ? [
          timeOf(stepsOf(play.untouchable, game), game),
          lostOf(plays, game),
          homeOf(plays),
        ]
      : [];
  },
};

/**
 * Returns the layout of a report that plays each wave from a number of
 * seeds at each speed.
 *
 * @param {number} count
 * @returns {Layout}
 */
function manyPlays(count) {
  return {
    seedsOf: (entry) =>
      Array.from({ length: count }, (_, i) => entry.number * SEED_STRIDE + i),
    headings: ["middle", "most", "lost", "home"],
    widths: [6, 5, 5, 7],
    cellsOf: (plays, game) => {
      const steps = plays
        .map((play) => stepsOf(play.untouchable, game))
        .sort((a, b) => a - b);
      return [
        timeOf(steps[Math.floor(steps.length / 2)], game),
        timeOf(steps.at(-1), game),
        lostOf(plays, game),
        homeOf(plays),
      ];
    },
  };
}

/**
 * Returns a module of the game's source, loaded through Vite.
 *
 * @param {string} file Its path from the workspace's folder.
 * @returns {Promise<Record<string, unknown>>}
 */
async function load(file) {
  const { module } = await runnerImport(join(ROOT, file), {
    configFile: false,
    root: ROOT,
    logLevel: "silent",
  });
  return /** @type {Record<string, unknown>} */ (module);
}

/**
 * Returns the game as the report plays it, on the field `--field` asks
 * for, the narrowest by default, and its sectors' waves or Endless's, as
 * `--endless` asks, or throws an error that says what is wrong with the
 * field.
 *
 * @param {string | undefined} fieldAsked
 * @param {boolean} endless
 * @returns {Promise<Game>}
 */
async function loadGame(fieldAsked, endless) {
  const [waves, speed, tuning, autopilot] = await Promise.all([
    load("src/rules/waves/waves.ts"),
    load("src/rules/speed.ts"),
    load("src/rules/tuning.ts"),
    load("src/testing/autopilot.ts"),
  ]);
  const rules = /** @type {Rules} */ ({
    waves: waves["WAVES"],
    endless: autopilot["ENDLESS_PLAYED"],
    speeds: speed["SPEEDS"],
    stepSeconds: tuning["STEP_S"],
    limit: autopilot["AUTOPILOT_LIMIT"],
    narrowest: autopilot["NARROWEST"],
    widest: autopilot["WIDEST"],
    tallest: autopilot["TALLEST"],
    playWave: autopilot["playWave"],
  });
  const torus = fieldOf(fieldAsked, rules);
  return {
    waves: endless ? rules.endless : rules.waves,
    speeds: rules.speeds,
    stepSeconds: rules.stepSeconds,
    limit: rules.limit,
    playWave: (entry, speed, seed) => ({
      untouchable: rules.playWave(entry, speed, {
        seed,
        torus,
        invulnerable: true,
      }),
      played: rules.playWave(entry, speed, {
        seed,
        torus,
        invulnerable: false,
      }),
    }),
  };
}

/**
 * Returns the layout `--seeds` asks for, or throws an error that says what
 * is wrong with it.
 *
 * @param {string | undefined} seeds
 * @returns {Layout}
 */
function layoutAsked(seeds) {
  if (seeds === undefined) return ONE_PLAY;
  const count = Number(seeds);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`--seeds takes a whole number from 1, not "${seeds}".`);
  }
  return manyPlays(count);
}

/**
 * Returns the field `--field` asks for, the narrowest by default, or throws
 * an error that says what is wrong with it.
 *
 * @param {string | undefined} field
 * @param {Rules} rules
 * @returns {Torus}
 */
function fieldOf(field, rules) {
  if (field === undefined || field === "narrow") return rules.narrowest;
  if (field === "wide") return rules.widest;
  if (field === "tall") return rules.tallest;
  throw new Error(`--field takes "narrow", "wide" or "tall", not "${field}".`);
}

/**
 * Returns whether a play cleared its wave within the autopilot's limit, as
 * the spec holds every wave to.
 *
 * @param {AutopilotReport} play
 * @param {Game} game
 * @returns {boolean}
 */
function clearedInTime(play, game) {
  return play.cleared && play.steps < game.limit;
}

/**
 * Returns the steps a play took to clear its wave, or infinity if it
 * didn't clear it in time.
 *
 * @param {AutopilotReport} play
 * @param {Game} game
 * @returns {number}
 */
function stepsOf(play, game) {
  return clearedInTime(play, game) ? play.steps : Number.POSITIVE_INFINITY;
}

/**
 * Returns a count of steps as the game time it takes, in minutes and
 * seconds, or `-` for a wave not cleared in time.
 *
 * @param {number | undefined} steps
 * @param {Game} game
 * @returns {string}
 */
function timeOf(steps, game) {
  if (steps === undefined || steps === Number.POSITIVE_INFINITY) return "-";
  const seconds = Math.round(steps * game.stepSeconds);
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Returns the most ships the plays as the spec plays them cost, or `-` if
 * any of them didn't clear its wave in time.
 *
 * @param {ReadonlyArray<Play>} plays
 * @param {Game} game
 * @returns {string}
 */
function lostOf(plays, game) {
  if (plays.some((play) => !clearedInTime(play.played, game))) return "-";
  return String(Math.max(...plays.map((play) => play.played.shipsLost)));
}

/**
 * Returns the strays the untouchable plays brought home, of those their
 * waves sent.
 *
 * @param {ReadonlyArray<Play>} plays
 * @returns {string}
 */
function homeOf(plays) {
  const home = plays.reduce(
    (sum, play) => sum + play.untouchable.straysHome,
    0,
  );
  const sent = plays.reduce(
    (sum, play) => sum + play.untouchable.straysSent,
    0,
  );
  return `${String(home)}/${String(sent)}`;
}

/**
 * Returns a speed's cells, or their headings, each right-aligned in its
 * column.
 *
 * @param {readonly string[]} cells
 * @param {Layout} layout
 * @returns {string}
 */
function columns(cells, layout) {
  return cells.map((cell, i) => cell.padStart(layout.widths[i] ?? 0)).join(" ");
}

const { values: asked } = parseArgs({
  options: {
    seeds: { type: "string" },
    field: { type: "string" },
    endless: { type: "boolean", default: false },
  },
});
const layout = layoutAsked(asked.seeds);
const game = await loadGame(asked.field, asked.endless);
const headings = columns(layout.headings, layout);
console.log(
  "".padEnd(NAME_WIDTH) +
    game.speeds.map((speed) => speed.padEnd(headings.length)).join("   "),
);
console.log(
  "".padEnd(NAME_WIDTH) + game.speeds.map(() => headings).join("   "),
);
let uncleared = 0;
for (const entry of game.waves) {
  const cells = game.speeds.map((speed) => {
    const plays = layout
      .seedsOf(entry)
      .map((seed) => game.playWave(entry, speed, seed));
    uncleared += plays
      .flatMap((play) =>
        asked.endless ? [play.untouchable] : [play.untouchable, play.played],
      )
      .filter((play) => !clearedInTime(play, game)).length;
    return columns(layout.cellsOf(plays, game), layout);
  });
  const name = `${String(entry.number).padStart(2)} ${entry.data.name}`;
  console.log(name.padEnd(NAME_WIDTH) + cells.join("   "));
}
if (uncleared > 0) {
  console.log();
  console.log(
    `${String(uncleared)} plays didn't clear their wave in time (-).`,
  );
  process.exitCode = 1;
}
