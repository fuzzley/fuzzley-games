// Builds the draft walls from their courses and writes the four sets beside
// this file: `node build.mjs`. A wall is a stack of courses, each a few rows of
// bricks, with rows of air between them, and the same few courses come round
// again as it climbs. `node build.mjs pictures` prints the design's appendix.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * @typedef {object} Draft
 * @property {string} name
 * @property {string} around What the wall is built around, for the design's
 *   table and the mocks.
 * @property {Record<string, string[]>} courses Each course's rows, top first.
 * @property {string} order The courses from the lowest up, by letter. A digit
 *   is how many rows of air come before the next course, in place of one.
 */

/**
 * @typedef {object} Level
 * @property {string} id
 * @property {string} name
 * @property {string} around
 * @property {string[]} bricks The wall's rows, top first.
 */

const AIR = ".........";

/**
 * Returns a course of one row repeated.
 * @param {string} row
 * @param {number} times
 * @returns {string[]}
 */
function rows(row, times) {
  return Array.from({ length: times }, () => row);
}

/** @type {readonly Draft[]} */
export const DRAFTS = [
  // Warm-up
  {
    name: "First bounce",
    around: "Thin courses with a gap at each side",
    courses: {
      a: [".ooooooo.", "..ooooo.."],
      b: ["..ooooo..", ".ooooooo."],
      c: ["...ooo...", "..ooooo.."],
    },
    order: "abcabc",
  },
  {
    name: "Side door",
    around: "Rows with one door, left then right",
    courses: {
      a: [".oooooooo"],
      b: ["oooooooo."],
    },
    order: "ababababa",
  },
  {
    name: "Columns",
    around: "Chimneys: columns of bricks a cell apart",
    courses: {
      a: rows("oo..o..oo", 3),
      b: rows("o.o.o.o.o", 3),
      c: rows("o..ooo..o", 3),
    },
    order: "abcb",
  },
  {
    name: "Pips",
    around: "The first tough bricks, as chimney walls",
    courses: {
      a: rows("2.o.2.o.2", 3),
      b: rows(".2.o.o.2.", 3),
    },
    order: "baba",
  },
  {
    name: "Alleys",
    around: "Towers with an alley up each side wall",
    courses: {
      a: rows(".oo.o.oo.", 3),
      b: rows("oo.ooo.oo", 2),
    },
    order: "ababab",
  },
  {
    name: "Stairs",
    around: "A rest: two flights of steps, a slanted lane between",
    courses: {
      a: [
        "oo...oo..",
        ".oo...oo.",
        "..oo...oo",
        "o..oo...o",
        "oo..oo...",
        ".oo..oo..",
        "..oo..oo.",
        "...oo..oo",
      ],
    },
    order: "a0a",
  },
  {
    name: "Girders",
    around: "Steel posts: chimney walls that never break",
    courses: {
      a: ["#.2.#.2.#", "#.2.#.2.#", "..2...2.."],
      b: ["2.#.2.#.2", "2.#.2.#.2", "2...2...2"],
    },
    order: "abab",
  },
  {
    name: "Attic",
    around: "Thick slabs: up an alley and in over the top",
    courses: {
      a: [".2222222.", ".ooooooo."],
      b: ["222...222", "ooo...ooo"],
    },
    order: "ababab",
  },
  {
    name: "Gatehouse",
    around: "The set's last: posts, chimneys and side doors",
    courses: {
      a: ["#.2.#.2.#", "#.2.#.2.#", "..2...2.."],
      b: [".oooooooo"],
      c: rows("2.2.2.2.2", 2),
      d: ["oooooooo."],
    },
    order: "abcdabcd",
  },

  // Angles
  {
    name: "Launcher",
    around: "Ramps: up an alley, thrown across the top",
    courses: {
      a: ["ooooooooo", "F.......7", ".ooooooo.", ".ooooooo."],
    },
    order: "aaaa",
  },
  {
    name: "Banked turn",
    around: "Ramps over the tops of chimneys",
    courses: {
      a: ["F.7.F.7.F", "o.2.o.2.o", "o.2.o.2.o"],
      b: ["7.F.7.F.7", ".2.o.o.2.", ".2.o.o.2."],
    },
    order: "abab",
  },
  {
    name: "Trapdoor",
    around: "Hatches: up through one, then held up three times",
    courses: {
      a: ["222222222", ".........", "oo=====oo"],
      b: ["222222222", ".........", "o==ooo==o"],
    },
    order: "abab",
  },
  {
    name: "Springboard",
    around: "A rest: spring bricks, a floor bounce each",
    courses: {
      a: ["o.S.o.S.o", "o.o.o.o.o", "o.o.o.o.o"],
      b: [".o.o.o.o.", ".o.S.S.o.", ".o.o.o.o."],
    },
    order: "abab",
  },
  {
    name: "Loft",
    around: "Storeys with a hatch or two in each floor",
    courses: {
      a: ["222222222", ".........", "2=22222=2"],
      b: ["2.2.2.2.2", "2.2.2.2.2", ".........", "222=2=222"],
    },
    order: "abab",
  },
  {
    name: "Slalom",
    around: "A door at one end, a ramp at the other",
    courses: {
      a: ["ooooooooo", "F........", "2222222.."],
      b: ["ooooooooo", "........7", "..2222222"],
    },
    order: "ababab",
  },
  {
    name: "Skylight",
    around: "Chimneys with a hatch at each foot",
    courses: {
      a: ["2.2.2.2.2", "2.2.2.2.2", "2=2=2=2=2"],
      b: [".3.3.3.3.", ".3.3.3.3.", "=3=3=3=3="],
    },
    order: "abab",
  },
  {
    name: "Bounce house",
    around: "A rest: springs behind side doors",
    courses: {
      a: [".ooSooSoo"],
      b: ["ooSooSoo."],
      c: ["o.o.S.o.o", "o.o.o.o.o"],
    },
    order: "abcabcab",
  },
  {
    name: "Clockwork",
    around: "The set's last: ramps, hatches and springs",
    courses: {
      a: ["2o2o2o2o2", "F.......7", "2===.===2"],
      b: ["o.S.o.S.o", "2.2.2.2.2", "2=2=2=2=2"],
      c: ["ooooooooo", "F.......7", ".ooooooo."],
    },
    order: "cbacb",
  },

  // Tricks
  {
    name: "Gems",
    around: "Gems: bricks set on a point, every face a slope",
    courses: {
      a: ["2.G.2.G.2", "2.2.2.2.2", "G.2.G.2.G"],
    },
    order: "aaaa",
  },
  {
    name: "Chandelier",
    around: "A lattice of gems under plain rows",
    courses: {
      a: ["oo.ooo.oo", "G.G.G.G.G", ".G.G.G.G."],
      b: ["ooo.o.ooo", ".G.G.G.G.", "G.G.G.G.G"],
    },
    order: "abab",
  },
  {
    name: "Elevator",
    around: "A steel floor only the portal passes",
    courses: {
      a: ["222222222", ".........", "@........", "#########", "........@"],
      b: ["2.2.2.2.2", "2.2.2.2.2"],
    },
    order: "baba",
  },
  {
    name: "Shutters",
    around: "Plates toward the floor, on chimney walls",
    courses: {
      a: rows("v.v.v.v.v", 3),
      b: rows(".v.o.o.v.", 3),
    },
    order: "abab",
  },
  {
    name: "Kaleidoscope",
    around: "A rest: gems and springs in a mesh",
    courses: {
      a: ["G.o.G.o.G", ".S.G.G.S.", "G.o.G.o.G"],
      b: ["o.G.o.G.o", ".G.o.o.G.", "o.G.o.G.o"],
    },
    order: "abab",
  },
  {
    name: "Awning",
    around: "Slabs plated underneath: in over the top",
    courses: {
      a: ["..ooooo..", "..vvvvv.."],
      b: ["oo.....oo", "vv.....vv"],
    },
    order: "ababab",
  },
  {
    name: "Back door",
    around: "A plated row, and a chimney up to the portal past it",
    courses: {
      a: [
        "o.@.o.o.o",
        "vvvvvvvvv",
        "...@.....",
        "o.2.o.2.o",
        "o.2.o.2.o",
        "o.2.o.2.o",
      ],
    },
    order: "aa",
  },
  {
    name: "Prism hall",
    around: "Gems where the ramps throw a fuzzball",
    courses: {
      a: ["ooooooooo", "F..G.G..7", ".2o2.2o2."],
      b: ["ooooooooo", "F.G...G.7", ".o2o.o2o."],
    },
    order: "abab",
  },
  {
    name: "Fun house",
    around: "The set's last: every trick",
    courses: {
      a: ["222222222", ".........", "@........", "#########", "........@"],
      b: ["2.G.2.G.2", "v.2.o.2.v", "2=2=2=2=2"],
      c: ["ooooooooo", "F..G.G..7", ".v.v.v.v."],
    },
    order: "cbcba",
  },

  // Long rallies
  {
    name: "Moss garden",
    around: "Moss: break it in one flight or it grows back",
    courses: {
      a: rows("o.M.o.M.o", 3),
      b: rows(".M.o.o.M.", 3),
    },
    order: "abab",
  },
  {
    name: "Combination",
    around: "Locks: one bolt, drawn by the flight's fourth turn",
    courses: {
      a: ["2.x.2.x.2", "2.2.2.2.2", "2.2.2.2.2"],
      b: [".2.2.2.2.", ".x.2.2.x.", ".2.2.2.2."],
    },
    order: "abab",
  },
  {
    name: "Greenhouse",
    around: "A rest: moss over floors of hatches",
    courses: {
      a: ["MMMMMMMMM", ".........", "========="],
      b: ["MoMoMoMoM", ".........", "===o=o==="],
    },
    order: "abab",
  },
  {
    name: "Overgrown",
    around: "Towers of moss, three hits at their hearts",
    courses: {
      a: rows(".Mo.M.oM.", 3),
      b: rows("oM.MNM.Mo", 2),
    },
    order: "abab",
  },
  {
    name: "Vault",
    around: "Locks of two bolts over floors with a hatch or two",
    courses: {
      a: ["2y2y2y2y2", ".........", "33=333=33"],
      b: ["y2y2y2y2y", ".........", "3=33333=3"],
    },
    order: "abab",
  },
  {
    name: "Deadbolt",
    around: "Locks of three bolts at the top of tall chimneys",
    courses: {
      a: ["2.z.2.z.2", "2.2.2.2.2", "2.2.2.2.2", "2.2.2.2.2"],
      b: [".2.2.2.2.", ".2.2.2.2.", ".2.z.z.2.", ".2.2.2.2."],
    },
    order: "abab",
  },
  {
    name: "Thicket",
    around: "Moss behind plates, ramps to reach it",
    courses: {
      a: ["MoMoMoMoM", "F.......7", ".v.v.v.v."],
      b: ["oMoMoMoMo", "F.......7", ".2.2.2.2."],
    },
    order: "abab",
  },
  {
    name: "Six-pack",
    around: "Bricks of 5 and 6: a wall to rally on",
    courses: {
      a: rows("4.5.6.5.4", 2),
      b: rows(".3.4.4.3.", 3),
    },
    order: "baba",
  },
  {
    name: "The long way up",
    around: "The last: 29 rows, and every trick in them",
    courses: {
      a: ["2.x.2.x.2", "2.2.2.2.2", "2=2=2=2=2"],
      b: ["MMMMMMMMM", "F..G.G..7", ".vvvvvvv."],
      c: ["3y3y3y3y3", ".........", "@........", "#########", "........@"],
      d: [".N.S.S.N.", ".N.3.3.N.", "=N=3=3=N="],
    },
    order: "abdcabd",
  },
];

/** The sets, nine walls each, in the order the game plays them. */
export const SETS = [
  ["warm-up", "Warm-up"],
  ["angles", "Angles"],
  ["tricks", "Tricks"],
  ["long-rallies", "Long rallies"],
];

/**
 * Returns a draft's wall, top row first: its courses stacked from the lowest
 * up, a row of air between each two unless the order says how many.
 * @param {Draft} draft
 * @returns {string[]}
 */
function wallOf(draft) {
  /** @type {string[]} */
  const wall = [];
  /** @type {number | undefined} */
  let air;
  let pairs = 0;
  for (const mark of draft.order) {
    if (/\d/.test(mark)) {
      air = Number(mark);
      continue;
    }
    const course = draft.courses[mark];
    if (!course) throw new Error(`${draft.name}: no course ${mark}`);
    for (const row of course)
      if (row.length !== 9) throw new Error(`${draft.name}: ${row}`);
    if (wall.length) for (let i = 0; i < (air ?? 1); i++) wall.unshift(AIR);
    air = undefined;
    // A wall's second pair of portals takes the legend's second mark.
    const portals = course.some((row) => row.includes("@"));
    if (portals && pairs > 1) throw new Error(`${draft.name}: three pairs`);
    const second = portals && pairs++ > 0;
    wall.unshift(
      ...(second ? course.map((row) => row.replaceAll("@", "&")) : course),
    );
  }
  return wall;
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
  around: draft.around,
  bricks: wallOf(draft),
}));

/**
 * Returns the design's appendix: each set's walls as their courses side by
 * side, top row first, under the order they are stacked in.
 * @returns {string}
 */
function pictures() {
  /** @type {string[]} */
  const lines = [];
  SETS.forEach(([, name], at) => {
    lines.push(`### ${name}, levels ${at * 9 + 1} to ${at * 9 + 9}`, "");
    lines.push("```text");
    DRAFTS.slice(at * 9, at * 9 + 9).forEach((draft, within) => {
      const marks = Object.keys(draft.courses);
      const order = [...draft.order].join(" ");
      const height = wallOf(draft).length;
      if (within) lines.push("");
      lines.push(
        `${at * 9 + within + 1} ${draft.name}: ${height} rows, stacked ${order}`,
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
  const heights = LEVELS.map((level) => level.bricks.length);
  console.log(`wrote ${LEVELS.length} walls, ${heights.join(" ")} rows`);
}
