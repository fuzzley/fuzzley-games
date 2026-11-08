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
import {
  SEEDS_OPTION,
  middleAndMost,
  printReport,
  readSeeds,
  timeOf,
} from "@fz/dev/report";
import {
  CONSOLE,
  importThroughVite,
  isStop,
  misread,
  readArgs,
  stopWith,
} from "@fz/dev/script";

/** @import { ReportColumns } from "@fz/dev/report" */
/** @import { ScriptIo, Stop } from "@fz/dev/script" */
/** @import { FieldName, ReportApi, ReportedWave, ScriptSpeed, WavePlayed } from "../src/testing/script_api.ts" */

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
 * Returns the columns the report shows of a wave's plays at one speed, from
 * its number alone or from many seeds.
 *
 * @param {Request} request
 * @param {Game} game
 * @returns {ReportColumns<Play>}
 */
function columnsOf(request, game) {
  if (request.seeds === undefined) {
    return {
      headings: ["time", "lost", "home"],
      widths: [5, 5, 5],
      cellsOf: (plays) => {
        const [play] = plays;
        return play
          ? [
              timeOf(stepsOf(play.untouchable, game), game.stepSeconds),
              lostOf(plays, game),
              homeOf(plays),
            ]
          : [];
      },
    };
  }
  return {
    headings: ["middle", "most", "lost", "home"],
    widths: [6, 5, 5, 7],
    cellsOf: (plays) => {
      const [middle, most] = middleAndMost(
        plays.map((play) => stepsOf(play.untouchable, game)),
      );
      return [
        timeOf(middle, game.stepSeconds),
        timeOf(most, game.stepSeconds),
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
  const read = readArgs(args, {
    options: {
      ...SEEDS_OPTION,
      field: { type: "string", default: "narrow" },
      endless: { type: "boolean", default: false },
    },
    usage: USAGE,
  });
  if (isStop(read)) return read;
  const { values } = read;
  const seeds = readSeeds(values.seeds, USAGE);
  if (isStop(seeds)) return seeds;
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
 * Returns what the report plays, `REPORT_API`, loaded through Vite.
 *
 * @returns {Promise<ReportApi>}
 */
export async function loadReportApi() {
  const module = await importThroughVite(
    join(ROOT, "src/testing/report_api.ts"),
    ROOT,
  );
  return /** @type {ReportApi} */ (module["REPORT_API"]);
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
 * it is played, and how many plays didn't clear their wave in time, and
 * returns the code to exit with: 1 where any didn't, and 0 otherwise.
 *
 * @param {ReportApi} api
 * @param {Request} request
 * @param {(line: string) => void} print
 * @returns {number}
 */
export function report(api, request, print) {
  const game = gameOf(api, request);
  return printReport(
    {
      entries: game.waves,
      speeds: game.speeds,
      seeds: request.seeds,
      play: game.playWave,
      ...columnsOf(request, game),
    },
    (plays) => [
      {
        count: plays
          .flatMap((play) =>
            request.endless
              ? [play.untouchable]
              : [play.untouchable, play.played],
          )
          .filter((play) => !clearedInTime(play, game)).length,
        says: "didn't clear their wave in time (-)",
        fails: true,
      },
    ],
    print,
  );
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
  if (isStop(request)) return stopWith(request, { print, printError });
  return report(await load(), request, print);
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
