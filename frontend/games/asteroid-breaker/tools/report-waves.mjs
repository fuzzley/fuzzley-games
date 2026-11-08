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
 * the stricter of the two. It loads what it plays, `REPORT_API` in
 * `src/testing/report_api.ts`, through Vite, as the game's build loads the
 * rules. The report is how the climb from wave to wave is tuned: a wave
 * that takes long, or costs ships at Relaxed, is one to look at again.
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
import { runnerImport } from "vite";

import { CONSOLE, misread, readArgs, stopWith } from "./command_line.mjs";

/** @import { FieldName, ReportApi, ReportedWave, ScriptSpeed, WavePlayed } from "../src/testing/script_api.ts" */
/** @import { ScriptIo, Stop } from "./command_line.mjs" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The fields `--field` names, each as the usage describes it.
 *
 * @type {Readonly<Record<FieldName, string>>}
 */
const FIELDS = {
  narrow: "the narrowest field",
  wide: "the widest, on its side",
  tall: "the widest, upright",
};

/** Lists words as a message does, the last after "or". */
const FIELD_LIST = new Intl.ListFormat("en-GB", { type: "disjunction" });

const USAGE = `Usage: yarn report:waves [options]

Prints how the autopilot plays every wave at every speed.

  --seeds <n>     Play each wave from n seeds of its own (default: from its
                  number alone)
  --field <name>  The field to play on (default: narrow):
${Object.entries(FIELDS)
  .map(([name, field]) => `                    ${name.padEnd(6)}  ${field}`)
  .join("\n")}
  --endless       Play Endless's waves 31 to 60 instead
  -h, --help      Show this message`;

/** What lies between the names and each speed's columns. */
const GAP = "   ";

/** How far apart each wave's seeds start with `--seeds`, so no two waves share one. */
const SEED_STRIDE = 1000;

/**
 * What a command line asks the report for.
 *
 * @typedef {object} Request
 * @property {number | undefined} seeds How many seeds each wave is played
 *   from, or none for its number alone.
 * @property {FieldName} field
 * @property {boolean} endless Whether it plays Endless's waves.
 */

/**
 * How a wave went at one speed from one seed: flown with nothing able to
 * take the ship, and as the spec plays it.
 *
 * @typedef {object} Play
 * @property {WavePlayed} untouchable
 * @property {WavePlayed} played
 */

/**
 * The game as the report plays it: the waves asked for, on the field asked.
 *
 * @typedef {object} Game
 * @property {readonly ReportedWave[]} waves The waves, in the order played.
 * @property {readonly ScriptSpeed[]} speeds The speeds, slowest first.
 * @property {number} stepSeconds The game time a step takes, in seconds.
 * @property {number} limit The most steps the autopilot plays a wave.
 * @property {(wave: ReportedWave, speed: ScriptSpeed, seed: number) => Play} playWave
 */

/**
 * The plays the report makes of each wave at each speed, and the columns
 * it shows of them.
 *
 * @typedef {object} Layout
 * @property {(wave: ReportedWave) => number[]} seedsOf The seeds a wave is played from.
 * @property {readonly string[]} headings The heading of each column.
 * @property {readonly number[]} widths How wide each column is.
 * @property {(plays: ReadonlyArray<Play>, game: Game) => string[]} cellsOf
 *   Returns the columns' cells for a wave's plays at one speed.
 */

/** @type {Layout} */
const ONE_PLAY = {
  seedsOf: (wave) => [wave.number],
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
    seedsOf: (wave) =>
      Array.from({ length: count }, (_, i) => wave.number * SEED_STRIDE + i),
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
 * Returns what a command line asks the report for, or, for `--help` or one
 * the report can't read, what to print and the code to exit with.
 *
 * @param {readonly string[]} args
 * @returns {Request | Stop}
 */
export function readCommandLine(args) {
  const values = readArgs(
    args,
    {
      seeds: { type: "string" },
      field: { type: "string", default: "narrow" },
      endless: { type: "boolean", default: false },
    },
    USAGE,
  );
  if ("code" in values) return values;
  const seeds = values.seeds === undefined ? undefined : Number(values.seeds);
  if (seeds !== undefined && (!Number.isInteger(seeds) || seeds < 1)) {
    return misread(
      `--seeds takes a whole number from 1, not "${String(values.seeds)}".`,
      USAGE,
    );
  }
  const { field } = values;
  if (!isFieldName(field)) {
    return misread(
      `--field takes ${FIELD_LIST.format(Object.keys(FIELDS).map(quoted))}, not ${quoted(field)}.`,
      USAGE,
    );
  }
  return { seeds, field, endless: values.endless };
}

/**
 * Returns whether `--field` names a field.
 *
 * @param {string} name
 * @returns {name is FieldName}
 */
function isFieldName(name) {
  return Object.hasOwn(FIELDS, name);
}

/**
 * Returns a word in double quotes, as a message quotes what was given.
 *
 * @param {string} word
 * @returns {string}
 */
function quoted(word) {
  return `"${word}"`;
}

/**
 * Returns what the report plays, `REPORT_API`, loaded through Vite, since
 * Node can't load the rules as they are: they name their modules without
 * extensions and import JSON.
 *
 * @returns {Promise<ReportApi>}
 */
export async function loadReportApi() {
  const { module } = await runnerImport(
    join(ROOT, "src/testing/report_api.ts"),
    { configFile: false, root: ROOT, logLevel: "silent" },
  );
  return /** @type {{ REPORT_API: ReportApi }} */ (module).REPORT_API;
}

/**
 * Returns the game as a request plays it: its waves, the sectors' or
 * Endless's, on its field.
 *
 * @param {ReportApi} api
 * @param {Request} request
 * @returns {Game}
 */
function gameOf(api, request) {
  const torus = api.fields[request.field];
  return {
    waves: request.endless ? api.endless : api.waves,
    speeds: api.speeds,
    stepSeconds: api.stepSeconds,
    limit: api.limit,
    playWave: (wave, speed, seed) => ({
      untouchable: api.playWave(wave.number, speed, {
        seed,
        torus,
        invulnerable: true,
      }),
      played: api.playWave(wave.number, speed, {
        seed,
        torus,
        invulnerable: false,
      }),
    }),
  };
}

/**
 * Prints the report a request asks for, a line at a time, a wave's line as
 * it is played, and returns how many plays didn't clear their wave in time.
 *
 * @param {ReportApi} api
 * @param {Request} request
 * @param {(line: string) => void} print
 * @returns {number}
 */
export function report(api, request, print) {
  const layout =
    request.seeds === undefined ? ONE_PLAY : manyPlays(request.seeds);
  const game = gameOf(api, request);
  const nameWidth = Math.max(
    0,
    ...game.waves.map((wave) => nameOf(wave).length),
  );
  const headings = columns(layout.headings, layout);
  print(
    "".padEnd(nameWidth) +
      GAP +
      game.speeds
        .map((speed) => speed.padEnd(headings.length))
        .join(GAP)
        .trimEnd(),
  );
  print("".padEnd(nameWidth) + GAP + game.speeds.map(() => headings).join(GAP));
  let uncleared = 0;
  for (const wave of game.waves) {
    const cells = game.speeds.map((speed) => {
      const plays = layout
        .seedsOf(wave)
        .map((seed) => game.playWave(wave, speed, seed));
      uncleared += plays
        .flatMap((play) =>
          request.endless
            ? [play.untouchable]
            : [play.untouchable, play.played],
        )
        .filter((play) => !clearedInTime(play, game)).length;
      return columns(layout.cellsOf(plays, game), layout);
    });
    print(nameOf(wave).padEnd(nameWidth) + GAP + cells.join(GAP));
  }
  if (uncleared > 0) {
    print("");
    print(`${String(uncleared)} plays didn't clear their wave in time (-).`);
  }
  return uncleared;
}

/**
 * Returns a wave's name as the report writes it, after its number.
 *
 * @param {ReportedWave} wave
 * @returns {string}
 */
function nameOf(wave) {
  return `${String(wave.number).padStart(2)} ${wave.data.name}`;
}

/**
 * Returns whether a play cleared its wave within the autopilot's limit, as
 * the spec holds every wave to.
 *
 * @param {WavePlayed} play
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
 * @param {WavePlayed} play
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

/**
 * Prints the report a command line asks for, or its usage, and returns the
 * code to exit with: 0, 1 if a play didn't clear its wave in time, or 2 for
 * a command line it can't read, played nothing.
 *
 * @param {readonly string[]} args
 * @param {ScriptIo<ReportApi>} [io]
 * @returns {Promise<number>}
 */
export async function run(
  args,
  {
    load = loadReportApi,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  } = {},
) {
  const request = readCommandLine(args);
  if ("code" in request) return stopWith(request, print, printError);
  return report(await load(), request, print) > 0 ? 1 : 0;
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
