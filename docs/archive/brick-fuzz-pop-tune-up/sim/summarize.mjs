#!/usr/bin/env node
/**
 * Reads what `run.mjs` counted of every level and writes the tables the
 * plan quotes.
 *
 *   node docs/archive/brick-fuzz-pop-tune-up/sim/summarize.mjs
 *
 * It reads each level's counts from the scratch folder `run.mjs` writes
 * them to, and writes `results/summary.json`, every number by variant, and
 * `results/results.md`, the same as tables, beside this script, formatted
 * with the repository's Prettier.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MIRROR_FOLDER } from "./mirror.mjs";

/** @import { GameCount, LevelCount, RoundCount } from "./tune_up.ts" */

const SIM = dirname(fileURLToPath(import.meta.url));
const COUNTS = join(MIRROR_FOLDER, "results/levels");
const RESULTS = join(SIM, "results");
const PRETTIER = resolve(
  SIM,
  "../../../../frontend/node_modules/.bin/prettier",
);

/** How far a flight plays back in a second at Normal. */
const UNITS_PER_SECOND = 14;

/** How long a flight plays before it doubles its speed by itself, in seconds. */
const LONG_FLIGHT_SECONDS = 8;

/** How often the careless player must clear a level of each set, in percent. */
const FLOORS = { "warm-up": 90, sparks: 85, tricks: 80, "thick-walls": 40 };

/** The variant the plan recommends. */
const RECOMMENDED = "touch-180-held-360-wool-cap-900";

/** The variant that reads "steel doesn't count" to the letter. */
const EVERY_BRICK_BUT_STEEL = "not-steel-150";

/** The variants the plan weighs against each other, in the order it tells them. */
const SHORTLIST = [
  "base",
  "bored-120",
  "bored-180",
  "touch-120-held-240",
  "touch-180",
  "touch-180-held-360",
  EVERY_BRICK_BUT_STEEL,
  "touch-180-held-360-wool",
  RECOMMENDED,
  "touch-180-held-360-wool-cap-1200",
];

/** The variants a level is told under, one by one. */
const CANDIDATES = ["base", "wool", "touch-120-held-240-wool", RECOMMENDED];

/** Every variant a table names, which each level's counts must hold. */
const VARIANT_IDS = [...new Set([...SHORTLIST, ...CANDIDATES])];

/** The sets, in the game's order. */
const SETS = /** @type {const} */ ([
  "warm-up",
  "sparks",
  "tricks",
  "thick-walls",
]);

/**
 * Returns how long a flight of some units plays at Normal, in seconds, a
 * long one doubling its speed by itself.
 *
 * @param {number} units
 * @returns {number}
 */
function secondsOf(units) {
  const plain = units / UNITS_PER_SECOND;
  if (plain <= LONG_FLIGHT_SECONDS) return plain;
  return LONG_FLIGHT_SECONDS + (plain - LONG_FLIGHT_SECONDS) / 2;
}

/**
 * Returns the value a share of the way up some numbers, sorted.
 *
 * @param {readonly number[]} sorted
 * @param {number} share From 0 to 1.
 * @returns {number}
 */
function quantile(sorted, share) {
  if (sorted.length === 0) return 0;
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? 0
  );
}

/**
 * Returns a number to a few places, as the tables write it.
 *
 * @param {number} value
 * @param {number} [places]
 * @returns {number}
 */
function round(value, places = 1) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

/**
 * Returns what some rounds come to: how many, their fuzzballs and yawns by
 * where the fuzzball was bored, how often the player's own yawned, the
 * bricks broken, and how long the flights were.
 *
 * @param {readonly RoundCount[]} rounds
 * @returns {Record<string, number>}
 */
function roundsSummary(rounds) {
  const lengths = rounds.map((count) => count[6]).sort((a, b) => a - b);
  const sum = (/** @type {number} */ at) =>
    rounds.reduce((total, count) => total + (count[at] ?? 0), 0);
  const yawned = rounds.filter(
    (count) => count[1] + count[2] + count[3] > 0,
  ).length;
  const seconds = lengths.map(secondsOf);
  return {
    rounds: rounds.length,
    balls: sum(0),
    airYawns: sum(1),
    neverYawns: sum(2),
    breakableYawns: sum(3),
    roundsWithYawn: yawned,
    playerYawned: sum(4),
    capped: sum(5),
    broken: sum(8),
    plainWool: sum(9),
    pocketYawns: sum(10),
    lengthMedian: round(quantile(lengths, 0.5)),
    lengthP90: round(quantile(lengths, 0.9)),
    lengthP99: round(quantile(lengths, 0.99)),
    lengthMost: round(lengths.at(-1) ?? 0),
    secondsMean: round(
      seconds.reduce((a, b) => a + b, 0) / (seconds.length || 1),
    ),
    secondsMedian: round(quantile(seconds, 0.5)),
    secondsP90: round(quantile(seconds, 0.9)),
    secondsP99: round(quantile(seconds, 0.99)),
    secondsMost: round(seconds.at(-1) ?? 0),
    over20s: seconds.filter((second) => second > 20).length,
  };
}

/**
 * Returns how two variants' counts of the same shots compare: in how many
 * the second broke more bricks, fewer, or as many.
 *
 * @param {readonly RoundCount[]} base
 * @param {readonly RoundCount[]} other
 * @returns {{more: number, fewer: number, same: number, changed: number}}
 */
function comparison(base, other) {
  let more = 0;
  let fewer = 0;
  let changed = 0;
  for (const [index, count] of other.entries()) {
    const before = base[index];
    if (!before) continue;
    if (count[8] > before[8]) more++;
    else if (count[8] < before[8]) fewer++;
    if (count[6] !== before[6] || count[8] !== before[8]) changed++;
  }
  return { more, fewer, same: other.length - more - fewer, changed };
}

/**
 * Returns what some games come to: how many, how many cleared, and the
 * rounds a cleared one took at the mean.
 *
 * @param {readonly GameCount[]} games
 * @returns {{games: number, cleared: number, clearedPercent: number, rounds: number}}
 */
function gamesSummary(games) {
  const cleared = games.filter((game) => game.cleared);
  return {
    games: games.length,
    cleared: cleared.length,
    clearedPercent: round((cleared.length * 100) / (games.length || 1)),
    rounds: round(
      cleared.reduce((total, game) => total + game.rounds.length, 0) /
        (cleared.length || 1),
    ),
  };
}

/**
 * Returns a table in Markdown from its headings and rows.
 *
 * @param {readonly string[]} headings
 * @param {readonly (readonly (string | number)[])[]} rows
 * @returns {string}
 */
function table(headings, rows) {
  return [
    `| ${headings.join(" | ")} |`,
    `| ${headings.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

/**
 * Returns a count as a share of another, in percent.
 *
 * @param {number} count
 * @param {number} of
 * @returns {number}
 */
function percent(count, of) {
  return round((count * 100) / (of || 1));
}

const files = (await readdir(COUNTS))
  .filter((name) => name.endsWith(".json"))
  .sort();
/** @type {LevelCount[]} */
const levels = [];
for (const name of files) {
  levels.push(JSON.parse(await readFile(join(COUNTS, name), "utf8")));
}
const variantIds = Object.keys(levels[0]?.variants ?? {});
const seeds = levels[0]?.seeds ?? 0;
// A level counted before a variant was added would read as that variant
// playing nothing there.
for (const level of levels) {
  const missing = [...new Set([...variantIds, ...VARIANT_IDS])].filter(
    (id) => !(id in level.variants),
  );
  if (missing.length > 0) {
    throw new Error(
      `Level ${String(level.level)}'s counts lack ${missing.join(", ")}: run run.mjs again.`,
    );
  }
}

/** @type {Record<string, unknown>} */
const summary = { seeds, levels: levels.length, variants: {} };
/** @type {string[]} */
const out = [
  "# The tune-up's sim: results",
  "",
  `Written by \`summarize.mjs\` from \`run.mjs\`'s counts: ${String(levels.length)} levels, each played by the careless player on fields 11, 13, 16, 19 and 22 deep from ${String(seeds)} seeds under every variant, the base games' shots flown again under each, and every certificate replayed on all twelve depths. A flight's seconds are at Normal, 14 units a second, doubling by itself after 8.`,
  "",
];

// The game as it is: where its fuzzballs yawn.
const baseRounds = levels.flatMap((level) =>
  (level.variants["base"]?.games ?? []).flatMap((game) => game.rounds),
);
const baseBySet = SETS.map((set) => {
  const rounds = levels
    .filter((level) => level.set === set)
    .flatMap((level) =>
      (level.variants["base"]?.games ?? []).flatMap((game) => game.rounds),
    );
  return /** @type {const} */ ([set, roundsSummary(rounds)]);
});
out.push(
  "## The game as it is: where a fuzzball yawns",
  "",
  "The careless player's own rounds, the best of sixteen shots each.",
  "",
  table(
    [
      "Set",
      "Rounds",
      "Rounds with a yawn, %",
      "The player's own yawned, %",
      "Yawns per 100 fuzzballs",
      "In open air, %",
      "Among steel, bumpers, %",
      "Among shells, plates, %",
    ],
    [
      ...baseBySet,
      /** @type {const} */ (["all", roundsSummary(baseRounds)]),
    ].map(([set, s]) => {
      const yawns =
        (s["airYawns"] ?? 0) +
        (s["neverYawns"] ?? 0) +
        (s["breakableYawns"] ?? 0);
      return [
        set,
        s["rounds"] ?? 0,
        percent(s["roundsWithYawn"] ?? 0, s["rounds"] ?? 0),
        percent(s["playerYawned"] ?? 0, s["rounds"] ?? 0),
        percent(yawns, s["balls"] ?? 0),
        percent(s["airYawns"] ?? 0, yawns),
        percent(s["neverYawns"] ?? 0, yawns),
        percent(s["breakableYawns"] ?? 0, yawns),
      ];
    }),
  ),
  "",
);

// Each variant, on the same shots, and in whole games.
/** @type {(string | number)[][]} */
const pairedRows = [];
/** @type {(string | number)[][]} */
const randomRows = [];
/** @type {(string | number)[][]} */
const gameRows = [];
/** @type {(string | number)[][]} */
const certificateRows = [];
for (const id of variantIds) {
  const of = (/** @type {LevelCount} */ level) => level.variants[id];
  const paired = levels.flatMap((level) => of(level)?.paired ?? []);
  const pairedBase = levels.flatMap(
    (level) => level.variants["base"]?.paired ?? [],
  );
  const random = levels.flatMap((level) => of(level)?.pairedRandom ?? []);
  const randomBase = levels.flatMap(
    (level) => level.variants["base"]?.pairedRandom ?? [],
  );
  const games = levels.flatMap((level) => of(level)?.games ?? []);
  const certificates = levels.flatMap((level) => of(level)?.certificates ?? []);
  const p = roundsSummary(paired);
  const pb = roundsSummary(pairedBase);
  const r = roundsSummary(random);
  const rb = roundsSummary(randomBase);
  const g = gamesSummary(games);
  const bySet = SETS.map((set) =>
    gamesSummary(
      levels
        .filter((level) => level.set === set)
        .flatMap((level) => of(level)?.games ?? []),
    ),
  );
  // A level and depth under its set's floor.
  const underFloor = levels.flatMap((level) =>
    [11, 13, 16, 19, 22]
      .filter((depth) => {
        const played = (of(level)?.games ?? []).filter(
          (game) => game.depth === depth,
        );
        const cleared = played.filter((game) => game.cleared).length;
        return (
          cleared * 100 <
          FLOORS[/** @type {keyof typeof FLOORS} */ (level.set)] * played.length
        );
      })
      .map((depth) => `${String(level.level)}@${String(depth)}`),
  );
  const holds = certificates.filter((certificate) => certificate.holds).length;
  const clears = certificates.filter(
    (certificate) => certificate.cleared,
  ).length;
  const row = (
    /** @type {Record<string, number>} */ s,
    /** @type {Record<string, number>} */ b,
    /** @type {{more: number, fewer: number, same: number, changed: number}} */ c,
  ) => [
    id,
    round((s["broken"] ?? 0) / (s["rounds"] || 1), 2),
    `${round((((s["broken"] ?? 0) - (b["broken"] ?? 0)) * 100) / (b["broken"] || 1))}%`,
    percent(c.more, s["rounds"] ?? 0),
    percent(c.fewer, s["rounds"] ?? 0),
    percent(s["roundsWithYawn"] ?? 0, s["rounds"] ?? 0),
    s["secondsMedian"] ?? 0,
    s["secondsP90"] ?? 0,
    s["secondsP99"] ?? 0,
    s["secondsMost"] ?? 0,
    percent(s["over20s"] ?? 0, s["rounds"] ?? 0),
    s["capped"] ?? 0,
  ];
  pairedRows.push(row(p, pb, comparison(pairedBase, paired)));
  randomRows.push(row(r, rb, comparison(randomBase, random)));
  const gameRounds = roundsSummary(games.flatMap((game) => game.rounds));
  gameRows.push([
    id,
    g.clearedPercent,
    ...bySet.map((set) => set.clearedPercent),
    g.rounds,
    ...bySet.map((set) => set.rounds),
    underFloor.length === 0 ? "none" : underFloor.join(", "),
    gameRounds["secondsMean"] ?? 0,
    gameRounds["secondsP90"] ?? 0,
    gameRounds["secondsP99"] ?? 0,
  ]);
  certificateRows.push([id, holds, clears, certificates.length]);
  /** @type {Record<string, unknown>} */ (summary["variants"])[id] = {
    pairedBest: p,
    pairedRandom: r,
    games: g,
    gamesBySet: Object.fromEntries(SETS.map((set, at) => [set, bySet[at]])),
    gameRounds,
    underFloor,
    certificates: { holds, clears, of: certificates.length },
  };
}
const pairedHeadings = [
  "Variant",
  "Bricks a round",
  "Against the game's",
  "Broke more, % of shots",
  "Broke fewer, %",
  "Rounds with a yawn, %",
  "Seconds, median",
  "90th in 100",
  "99th",
  "Longest",
  "Over 20 s, %",
  "Capped",
];
out.push(
  "## The same shots under each variant",
  "",
  "A shot drawn at random at each wall the base games came to, flown under each variant: the unbiased sample.",
  "",
  table(pairedHeadings, randomRows),
  "",
  "The shot the careless player chose at each of those walls, the best of sixteen by the game's own rules, flown under each variant. These were picked for doing well as the game is, so a variant that only changes them reads worse here than it plays.",
  "",
  table(pairedHeadings, pairedRows),
  "",
  "## Whole games under each variant",
  "",
  "The careless player choosing its shots by each variant's own rules.",
  "",
  table(
    [
      "Variant",
      "Cleared, %",
      ...SETS.map((set) => `${set}, %`),
      "Rounds to clear",
      ...SETS.map((set) => `${set}, rounds`),
      "Under its floor (level@depth)",
      "A round's seconds, mean",
      "90th in 100",
      "99th",
    ],
    gameRows,
  ),
  "",
  "## The certificates under each variant",
  "",
  "Each of the 432 lines replayed: how many still hold as certificates, clearing in exactly their rounds with a row to spare, and how many still clear at all.",
  "",
  table(["Variant", "Hold", "Clear", "Of"], certificateRows),
  "",
);

// The shortlist the plan weighs, on the careless player's chosen shots.
out.push(
  "## The shortlist",
  "",
  "The rules the plan weighs, on the shots the careless player chose under the game's own rules, so every row flies the same shots at the same walls.",
  "",
  table(
    [
      "Variant",
      "Rounds with a yawn, %",
      "The player's own yawned, %",
      "Yawns in open air",
      "Among steel, bumpers",
      "Among shells, plates",
      "Flown to the cap",
      "Seconds, mean",
      "90th in 100",
      "99th",
      "Longest",
    ],
    SHORTLIST.map((id) => {
      const s = roundsSummary(
        levels.flatMap((level) => level.variants[id]?.paired ?? []),
      );
      return [
        id,
        percent(s["roundsWithYawn"] ?? 0, s["rounds"] ?? 0),
        percent(s["playerYawned"] ?? 0, s["rounds"] ?? 0),
        s["airYawns"] ?? 0,
        s["neverYawns"] ?? 0,
        s["breakableYawns"] ?? 0,
        s["capped"] ?? 0,
        s["secondsMean"] ?? 0,
        s["secondsP90"] ?? 0,
        s["secondsP99"] ?? 0,
        s["secondsMost"] ?? 0,
      ];
    }),
  ),
  "",
  "## By the field's depth: the game's rules and the recommended",
  "",
  `Whole games under each one's own rules: \`base\`, and \`${RECOMMENDED}\`. A phone's field is the deep one.`,
  "",
  table(
    [
      "Depth",
      "The player's own yawned, %, base",
      "recommended",
      "A round's seconds, mean, base",
      "recommended",
      "99th in 100, base",
      "recommended",
      "Rounds to clear, base",
      "recommended",
    ],
    [11, 13, 16, 19, 22].map((depth) => {
      const of = (/** @type {string} */ id) => {
        const games = levels
          .flatMap((level) => level.variants[id]?.games ?? [])
          .filter((game) => game.depth === depth);
        return {
          rounds: roundsSummary(games.flatMap((game) => game.rounds)),
          games: gamesSummary(games),
        };
      };
      const [base, tuned] = [of("base"), of(RECOMMENDED)];
      return [
        depth,
        percent(base.rounds["playerYawned"] ?? 0, base.rounds["rounds"] ?? 0),
        percent(tuned.rounds["playerYawned"] ?? 0, tuned.rounds["rounds"] ?? 0),
        base.rounds["secondsMean"] ?? 0,
        tuned.rounds["secondsMean"] ?? 0,
        base.rounds["secondsP99"] ?? 0,
        tuned.rounds["secondsP99"] ?? 0,
        base.games.rounds,
        tuned.games.rounds,
      ];
    }),
  ),
  "",
  "## By the set: what counting bumpers costs",
  "",
  `A round's seconds at the 99th in 100, in whole games under each one's own rules: \`base\`, \`${EVERY_BRICK_BUT_STEEL}\`, where a bumper resets boredom as a brick that can break does, and \`${RECOMMENDED}\`.`,
  "",
  table(
    ["Set", "base", EVERY_BRICK_BUT_STEEL, RECOMMENDED],
    SETS.map((set) => [
      set,
      ...["base", EVERY_BRICK_BUT_STEEL, RECOMMENDED].map(
        (id) =>
          roundsSummary(
            levels
              .filter((level) => level.set === set)
              .flatMap((level) => level.variants[id]?.games ?? [])
              .flatMap((game) => game.rounds),
          )["secondsP99"] ?? 0,
      ),
    ]),
  ),
  "",
);

// Each level under the game's rules and the candidates.
out.push(
  "## Each level: the game's rules and the candidates",
  "",
  "Cleared, in percent, and the rounds a cleared game took at the mean, over the five depths.",
  "",
  table(
    [
      "#",
      "Level",
      ...CANDIDATES.flatMap((id) => [`${id}, %`, "rounds"]),
      "Plain strikes on wool a game",
    ],
    levels.map((level) => [
      level.level,
      level.name,
      ...CANDIDATES.flatMap((id) => {
        const g = gamesSummary(level.variants[id]?.games ?? []);
        return [g.clearedPercent, g.rounds];
      }),
      round(
        (level.variants["base"]?.games ?? []).reduce(
          (total, game) =>
            total + game.rounds.reduce((sum, count) => sum + count[9], 0),
          0,
        ) / ((level.variants["base"]?.games ?? []).length || 1),
      ),
    ]),
  ),
  "",
);

await mkdir(RESULTS, { recursive: true });
await writeFile(
  join(RESULTS, "summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);
await writeFile(join(RESULTS, "results.md"), `${out.join("\n")}`);
// Formatted as the repository checks every file under docs/.
execFileSync(PRETTIER, ["--write", RESULTS], { stdio: "ignore" });
console.log(out.join("\n"));
