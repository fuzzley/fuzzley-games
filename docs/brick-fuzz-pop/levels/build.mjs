// Builds the draft walls from their courses and writes the four sets beside
// this file: `node build.mjs`. A wall is a stack of courses, each a few rows of
// bricks, with rows of air between them, and the same few courses come round
// again as it climbs. `node build.mjs pictures` prints the plan's appendix.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * @typedef {object} Draft
 * @property {string} name
 * @property {"hot" | "triple"} boon What the shot after a jump gets.
 * @property {Record<string, string[]>} courses Each course's rows, top first.
 * @property {string} order The courses from the lowest up, by letter. A digit
 *   is how many rows of air come before the next course, in place of one.
 */

/**
 * @typedef {object} Level
 * @property {string} id
 * @property {string} name
 * @property {"hot" | "triple"} boon
 * @property {string[]} bricks The wall's rows, top first.
 */

const AIR = ".........";

/** @type {readonly Draft[]} */
export const DRAFTS = [
  // Warm-up
  {
    name: "Hello, wall",
    boon: "hot",
    courses: {
      a: [".ooooooo.", "..ooooo.."],
      b: ["..ooooo..", ".ooooooo."],
      c: ["...ooo...", "..ooooo.."],
    },
    order: "abcabc",
  },
  {
    name: "Stripes",
    boon: "hot",
    courses: {
      a: [".ooooooo."],
      b: ["ooooooooo"],
      c: ["o.o.o.o.o"],
      d: ["ooooooooo", ".ooooooo."],
    },
    order: "ababcdabc",
  },
  {
    name: "Pips",
    boon: "hot",
    courses: {
      a: ["o2o2o2o2o", "ooooooooo", ".ooooooo."],
      b: ["2o2o2o2o2", "ooooooooo"],
      c: ["..2o2o2..", ".o2o2o2o."],
    },
    order: "abcabc",
  },
  {
    name: "Punch through",
    boon: "hot",
    courses: {
      a: ["ooooooooo", "ooooooooo", "222222222"],
      b: ["ooooooooo", "22.222.22"],
      c: [".ooooooo.", "..22222.."],
    },
    order: "cbacb",
  },
  {
    name: "Girder",
    boon: "hot",
    courses: {
      a: ["ooooooooo", "o2ooooo2o", "##.....##"],
      b: ["o2ooooo2o", "#..ooo..#"],
      c: ["ooooooooo", ".##...##."],
    },
    order: "abcabc",
  },
  {
    name: "Zip line",
    boon: "hot",
    courses: {
      a: ["222222222", "2222-2222", "ooooooooo", ".o.o.o.o."],
      b: ["2222-2222", "ooooooooo"],
      c: ["22-222-22", "ooooooooo"],
    },
    order: "abcabc",
  },
  {
    name: "Plumb line",
    boon: "hot",
    courses: {
      a: ["3o3o3o3o3", "3o3o3o3o3", "3o3o3o3o3", "o|ooooo|o"],
      b: ["3o3o3o3o3", "3o3o3o3o3", "ooo|o|ooo"],
      c: ["3o3o3o3o3", "o|o|o|o|o"],
    },
    order: "abcabc",
  },
  {
    name: "Pyramid",
    boon: "hot",
    courses: {
      a: ["....o....", "...o2o...", "..o2-2o..", ".o2ooo2o.", "ooooooooo"],
      b: ["ooooooooo", ".o2ooo2o.", "..o2-2o..", "...o2o...", "....o...."],
    },
    order: "abab",
  },
  {
    name: "Gatehouse",
    boon: "hot",
    courses: {
      a: ["##.###.##", "3o3o|o3o3", "222-2-222", "ooooooooo", "o.o.o.o.o"],
      b: ["2222-2222", "ooooooooo"],
      c: ["##.###.##", "3o3o|o3o3", "222-2-222", "ooooooooo"],
    },
    order: "abcbac",
  },
  // Sparks
  {
    name: "Fuse",
    boon: "triple",
    courses: {
      a: ["222222222", "2*22222*2", "222222222", "ooo2*2ooo"],
      b: ["2*22222*2", "222222222", "ooooooooo"],
      c: ["22*222*22", "222222222"],
    },
    order: "abcabc",
  },
  {
    name: "Crossroads",
    boon: "hot",
    courses: {
      a: ["222222222", "33+333+33", "222222222", "ooooooooo"],
      b: ["3333+3333", "222222222", "ooooooooo"],
      c: ["33+333+33", "222222222"],
    },
    order: "abcabc",
  },
  {
    name: "Chain reaction",
    boon: "triple",
    courses: {
      a: ["2*2*2*2*2", "*2*2*2*2*", "2*2*2*2*2", "ooooooooo"],
      b: ["*2*2*2*2*", "2*2*2*2*2", "ooooooooo"],
    },
    order: "ababab",
  },
  {
    name: "Crisscross",
    boon: "hot",
    courses: {
      a: ["3.3.3.3.3", ".3.3.3.3.", "3.3.x.3.3", ".3.3.3.3.", "o.o.o.o.o"],
      b: [".3.3.3.3.", "3.x.3.x.3", ".3.3.3.3.", "o.o.o.o.o"],
    },
    order: "ababa",
  },
  {
    name: "Wool socks",
    boon: "triple",
    courses: {
      a: ["222222222", "3W3.3.3W3", "2W22W22W2", "ooooooooo"],
      b: ["3W33.33W3", "22W222W22", "ooooooooo"],
      c: ["2W22W22W2", "ooooooooo"],
    },
    order: "abcabc",
  },
  {
    name: "Jailbreak",
    boon: "hot",
    courses: {
      a: ["..33333..", ".3ooooo3.", ".3o.C.o3.", ".3ooooo3.", "..33333.."],
      b: ["..33333..", ".3o.C.o3.", "..33333.."],
    },
    order: "abbab",
  },
  {
    name: "Honeycomb",
    boon: "triple",
    courses: {
      a: ["o.o.o.o.o", ".2.2.2.2.", "o.o*o*o.o", ".2.2.2.2.", "o.o.o.o.o"],
      b: [".2.2.2.2.", "o.o*o*o.o", ".2.2.2.2.", "o.o.o.o.o"],
    },
    order: "ababa",
  },
  {
    name: "Switchboard",
    boon: "hot",
    courses: {
      a: ["#-#3#3#-#", "333|3|333", "22+222+22", "ooooooooo", "o2o2o2o2o"],
      b: ["#3#-#-#3#", "333333333", "22+222+22", "ooooooooo"],
    },
    order: "abbab",
  },
  {
    name: "Powder keg",
    boon: "hot",
    courses: {
      a: [
        "444444444",
        "4*4*4*4*4",
        "333C3C333",
        "22W222W22",
        "2*2ooo2*2",
        "ooooooooo",
      ],
      b: ["2*22222*2", "222222222", "ooo2*2ooo"],
      c: ["444444444", "4*4*4*4*4", "333C3C333", "22W222W22"],
    },
    order: "abcab",
  },
  // Tricks
  {
    name: "Pinball",
    boon: "hot",
    courses: {
      a: ["ooooooooo", "o.B.o.B.o", "222222222", ".B.ooo.B.", "ooooooooo"],
      b: ["o.B.o.B.o", "222222222", ".B.ooo.B.", "ooooooooo"],
    },
    order: "ababa",
  },
  {
    name: "Prism break",
    boon: "triple",
    courses: {
      a: ["222222222", "2P22222P2", "222222222", "ooooPoooo"],
      b: ["2P22222P2", "222222222", "ooooPoooo"],
      c: ["222P2P222", "ooooooooo"],
    },
    order: "abcabc",
  },
  {
    name: "Wormhole",
    boon: "hot",
    courses: {
      a: ["oo2o2o2oo", "ooooooooo"],
      b: ["ooooooooo", "o2o2o2o2o", ".ooooooo."],
      c: ["ooooooooo", "oo2o@o2oo", "#########", ".........", "...o@o..."],
    },
    order: "ababac",
  },
  {
    name: "Shutters",
    boon: "triple",
    courses: {
      a: ["ooooooooo", "v.v.v.v.v", ".o.o.o.o.", "v.v.v.v.v", "ooooooooo"],
      b: ["v.v.v.v.v", ".o.o.o.o.", "v.v.v.v.v", "ooooooooo"],
    },
    order: "ababa",
  },
  {
    name: "Kaleidoscope",
    boon: "hot",
    courses: {
      a: ["3.3x3x3.3", ".P.....P.", "3.B.3.B.3", ".3.3.3.3.", "2.2.P.2.2"],
      b: [".P.....P.", "3.B.3.B.3", ".3.3.3.3.", "2.2.P.2.2"],
    },
    order: "ababa",
  },
  {
    name: "Bumper cars",
    boon: "triple",
    courses: {
      a: ["2.2.2.2.2", ".B.B.B.B.", "2.2.2.2.2", ".2.2.2.2.", "o.o.o.o.o"],
      b: [".B.B.B.B.", "2.2.2.2.2", ".2.2.2.2.", "o.o.o.o.o"],
    },
    order: "ababa",
  },
  {
    name: "Split decision",
    boon: "hot",
    courses: {
      a: ["222222222", "#2#2.2#2#", "P.o.P.o.P"],
      b: ["222222222", "P.o.P.o.P"],
    },
    order: "aabaaba",
  },
  {
    name: "Back door",
    boon: "triple",
    courses: {
      a: ["..ooooo..", ".v.v.v.v.", "ooooooooo"],
      b: ["...o@o...", "..ooooo..", ".UUUUUUU.", ".........", "....@...."],
    },
    order: "aabab",
  },
  {
    name: "Fun house",
    boon: "hot",
    courses: {
      a: [
        "ooo333o3o",
        "o@o3x3ooo",
        "###3P3###",
        ".B..2..B.",
        "2v2...2v2",
        "..@...P..",
      ],
      b: ["o.B.o.B.o", "222222222", ".B.ooo.B.", "ooooooooo"],
      c: ["v.v.v.v.v", ".o.o.o.o.", "ooooooooo"],
    },
    order: "abcab",
  },
  // Thick walls
  {
    name: "Nutcracker",
    boon: "triple",
    courses: {
      a: ["ooooooooo", "oSo.W.oSo", ".o.oSo.o.", "ooooooooo"],
      b: ["o.S.-.S.o", "ooooooooo"],
      c: ["S.o.S.o.S", "ooooWoooo"],
    },
    order: "abcabc",
  },
  {
    name: "Moss garden",
    boon: "hot",
    courses: {
      a: ["MMMMMMMMM", "ooooooooo", "M.M.M.M.M", "ooooooooo", ".M.M.M.M."],
      b: ["ooooooooo", "M.M.M.M.M", "ooooooooo", ".M.M.M.M."],
    },
    order: "ababa",
  },
  {
    name: "Thunderhead",
    boon: "triple",
    courses: {
      a: [
        "4-4|4|4-4",
        "444444444",
        "3+33x33+3",
        "333333333",
        "2*22-22*2",
        "222222222",
      ],
      b: ["3+33x33+3", "333333333", "2*22-22*2", "222222222"],
    },
    order: "abab",
  },
  {
    name: "Overgrown",
    boon: "hot",
    courses: {
      a: ["NNNNNNNNN", "N-NNWNN-N", "MMMMMMMMM", "M|MMMMM|M", "ooooooooo"],
      b: ["N-NNWNN-N", "MMMMMMMMM", "ooooooooo"],
    },
    order: "abbab",
  },
  {
    name: "Armory",
    boon: "triple",
    courses: {
      a: ["3v3v3v3v3", "S*S*S*S*S", "2v2v2v2v2", "SS.....SS", "ooooooooo"],
      b: ["S*S*S*S*S", "2v2v2v2v2", "ooooooooo"],
    },
    order: "abbab",
  },
  {
    name: "Bank vault",
    boon: "hot",
    courses: {
      a: ["S2S2S2S2S", "ooooooooo"],
      b: ["2*2+2*2..", "..2222222"],
      c: ["#########", "#2*2+2*2#", "#2222222#", "#SS#.#SS#", "ooooooooo"],
    },
    order: "abababc",
  },
  {
    name: "Labyrinth",
    boon: "triple",
    courses: {
      a: ["2S2S2S2S2", "ooooooooo"],
      b: ["222C2C222", "2##.#.##2", "2#@...2#2", "2..2#2.@2", "ooooooooo"],
    },
    order: "aabaab",
  },
  {
    name: "Six-pack",
    boon: "hot",
    courses: {
      a: [".6.5W5.6.", "4.4.4.4.4", ".3.3.3.3.", "222222222", "ooooooooo"],
      b: ["4.4.W.4.4", ".3.3.3.3.", "222222222", "ooooooooo"],
    },
    order: "abab",
  },
  {
    name: "The Great Wall",
    boon: "triple",
    courses: {
      a: ["2S2W2W2S2", "22-222-22", "ooooooooo"],
      b: [
        "4v4S4S4v4",
        "44*444*44",
        "3M3M3M3M3",
        "33+333+33",
        "2S2W2W2S2",
        "22-222-22",
        "ooooooooo",
      ],
      c: ["4v4S4S4v4", "44*444*44", "3M3M3M3M3", "33+333+33"],
    },
    order: "abcabc",
  },
];

/** The sets in order, nine walls each. */
const SETS = [
  ["warm-up", "Warm-up"],
  ["sparks", "Sparks"],
  ["tricks", "Tricks"],
  ["thick-walls", "Thick walls"],
];

/**
 * Returns a draft's wall, top row first.
 * @param {Draft} draft
 * @returns {string[]}
 */
export function wallOf(draft) {
  /** @type {string[]} */
  const rows = [];
  let air = 0;
  let pairs = 0;
  for (const mark of draft.order) {
    if (mark >= "0" && mark <= "9") {
      air = Number(mark);
      continue;
    }
    const course = draft.courses[mark];
    if (!course) throw new Error(`${draft.name}: no course ${mark}`);
    for (const row of course)
      if (row.length !== 9) throw new Error(`${draft.name}: ${row}`);
    if (rows.length) for (let i = 0; i < (air || 1); i++) rows.unshift(AIR);
    air = 0;
    // A wall's second pair of portals takes the legend's second mark.
    const portals = course.some((row) => row.includes("@"));
    if (portals && pairs > 1) throw new Error(`${draft.name}: three pairs`);
    const second = portals && pairs++ > 0;
    rows.unshift(
      ...(second ? course.map((row) => row.replaceAll("@", "&")) : course),
    );
  }
  return rows;
}

/**
 * Returns the id a name gives a level or a set.
 * @param {string} name
 * @returns {string}
 */
function idOf(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** @type {readonly Level[]} */
export const LEVELS = DRAFTS.map((draft) => ({
  id: idOf(draft.name),
  name: draft.name,
  boon: draft.boon,
  bricks: wallOf(draft),
}));

/**
 * Returns the plan's appendix: each set's walls as their courses side by
 * side, top row first, under the order they are stacked in.
 * @returns {string}
 */
function pictures() {
  const boons = { hot: "hot shot", triple: "triple shot" };
  /** @type {string[]} */
  const lines = [];
  SETS.forEach(([, name], at) => {
    lines.push(`### ${name}, walls ${at * 9 + 1} to ${at * 9 + 9}`, "");
    lines.push("```text");
    DRAFTS.slice(at * 9, at * 9 + 9).forEach((draft, within) => {
      const marks = Object.keys(draft.courses);
      const order = [...draft.order].join(" ");
      const rows = wallOf(draft).length;
      if (within) lines.push("");
      lines.push(
        `${at * 9 + within + 1} ${draft.name}: ${boons[draft.boon]}, ${rows} rows, stacked ${order}`,
        "",
      );
      lines.push(
        marks
          .map((mark) => mark.padEnd(13))
          .join("")
          .trimEnd(),
      );
      const tallest = Math.max(
        ...marks.map((mark) => draft.courses[mark].length),
      );
      for (let row = 0; row < tallest; row++)
        lines.push(
          marks
            .map((mark) => (draft.courses[mark][row] ?? "").padEnd(13))
            .join("")
            .trimEnd(),
        );
    });
    lines.push("```", "");
  });
  return lines.join("\n");
}

if (process.argv[1] !== fileURLToPath(import.meta.url)) {
  // Imported for its walls: nothing to write.
} else if (process.argv[2] === "pictures") {
  console.log(pictures());
} else {
  SETS.forEach(([id, name], at) => {
    const levels = LEVELS.slice(at * 9, at * 9 + 9);
    const path = new URL(`./${id}.json`, import.meta.url);
    writeFileSync(path, JSON.stringify({ id, name, levels }, null, 2) + "\n");
  });
  const rows = LEVELS.map((level) => level.bricks.length);
  console.log(`wrote ${LEVELS.length} walls, ${rows.join(" ")} rows`);
}
