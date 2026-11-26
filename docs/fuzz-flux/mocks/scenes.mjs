/**
 * Lists the moments of play the mocks show, each a level, a deal and the moves
 * that bring the moment about, and works those moves out with the rules.
 *
 * Run it to see what each scene does: `node docs/fuzz-flux/mocks/scenes.mjs`.
 */

/** @import { Level, Record as Move, State } from '../sketch/engine.mjs' */

import { fileURLToPath } from "node:url";

import { allLevels } from "../levels/drafts.mjs";
import { carefulMove } from "../sketch/bots.mjs";
import { deal, legalMoves, onScreen, play } from "../sketch/engine.mjs";

/**
 * A moment the mocks show.
 * @typedef {object} Scene
 * @property {string} id Its files' name.
 * @property {string} title
 * @property {number | Level} level A draft level's number, or a board made for the scene.
 * @property {('hint' | 'set-off' | 'bot' | number[][])[]} moves A level's own
 *   first move, the special last made set off, the careful player's choice, or
 *   two squares of the screen.
 * @property {(record: Move, after: State, before: State) => boolean} [until] For a 'bot'
 *   move: the move shown is the first the careful player makes that this holds for.
 * @property {(records: Move[]) => boolean} [wants] What the moves must do, for a deal to be chosen.
 * @property {number} [seed] The deal, where any will not do.
 * @property {boolean} [clip] Whether a clip with sound is made of it.
 * @property {number[][]} [at] The moments its storyboard shows: for each move shown, ms from its start.
 * @property {string[]} [says] A few words under each of those moments.
 * @property {boolean} [bar] Whether the storyboard shows the bar above the board.
 * @property {number} [tail] How long the capture runs on after the board comes to rest, in ms.
 */

/**
 * A scene with its moves worked out.
 * @typedef {object} Plan
 * @property {Scene} scene
 * @property {Level} level
 * @property {number} seed
 * @property {{ a: number, b: number }[]} before Moves played before the ones shown.
 * @property {{ a: number, b: number, from: { x: number, y: number }, to: { x: number, y: number } }[]} shown
 * @property {Move[]} records What each move shown did.
 */

const DRAFTS = allLevels();
const K5 = ["blue", "red", "amber", "green", "violet"];

/**
 * Returns a board 7 squares a side with no bunch and no blue on it, and blue
 * fuzzballs where a scene wants them.
 * @param {Record<string, string>} [put] A letter for a square, by "x,y".
 * @returns {string[]}
 */
function quilt(put = {}) {
  const rows = [];
  for (let y = 0; y < 7; y++) {
    let row = "";
    for (let x = 0; x < 7; x++)
      row += put[`${x},${y}`] ?? (y % 2 ? "gvragvr" : "ragvrag")[x];
    rows.push(row);
  }
  return rows;
}

/**
 * Returns a level made for one scene.
 * @param {string} name
 * @param {Partial<Level> & { stars?: number[] }} parts Its stars are the moves to spare each asks.
 * @returns {Level}
 */
function made(name, parts) {
  return {
    id: 0,
    name,
    set: "mock",
    kinds: K5,
    moves: 20,
    goals: [
      { type: "gather", kind: "red", count: 40 },
      { type: "gather", kind: "green", count: 40 },
    ],
    board: quilt(),
    ...parts,
  };
}

const waves = (/** @type {Move} */ r) => r.steps.length;
const struck = (/** @type {Move} */ r, /** @type {string} */ what) =>
  r.steps.reduce(
    (sum, step) => sum + step.hits.filter((h) => h.what === what).length,
    0,
  );
const caged = (/** @type {State} */ s) => s.piece.filter((p) => p?.cage).length;

/** @type {Scene[]} */
export const SCENES = [
  {
    id: "a-bunch-of-3",
    title: "A bunch of 3",
    level: 1,
    moves: ["hint"],
    wants: ([r]) =>
      waves(r) === 1 &&
      r.steps[0].bunches.length === 1 &&
      r.steps[0].bunches[0].cells.length === 3,
    clip: true,
    bar: true,
    at: [[0, 100, 200, 290, 360, 470, 620, 900]],
    says: [
      "tap",
      "the swap",
      "they see each other",
      "huddle",
      "hop off",
      "fluff, and 3 fly to the goal",
      "the rest fall and land",
      "at rest",
    ],
  },
  {
    id: "a-dasher",
    title: "A line of 4 makes a dasher, and it goes off",
    level: 2,
    moves: ["hint", "set-off"],
    wants: ([r, r2]) =>
      waves(r) === 1 &&
      r.steps[0].bunches[0].makes === "dash" &&
      waves(r2) <= 2,
    clip: true,
    at: [
      [200, 290, 360, 440, 620],
      [130, 190, 230, 280, 340, 420, 560],
    ],
    says: [
      "the line of 4",
      "3 run into the 4th",
      "the dasher is made",
      "its fur streams out",
      "settled",
      "swap it",
      "it splits in 2",
      "the streaks run the column",
      "each one hops as a streak passes",
      "fluff",
      "the board falls",
      "at rest",
    ],
  },
  {
    id: "a-wisp",
    title: "A square of 4 makes a wisp, and it flies",
    level: 3,
    moves: ["hint", "set-off"],
    wants: ([r, r2]) =>
      waves(r) === 1 &&
      r.steps[0].bunches[0].makes === "wisp" &&
      waves(r2) <= 2,
    at: [
      [200, 290, 360, 440, 620],
      [130, 250, 370, 490, 610, 700, 900],
    ],
  },
  {
    id: "a-puffer",
    title: "An L makes a puffer, and it goes off",
    level: 4,
    moves: ["hint", "set-off"],
    wants: ([r, r2]) =>
      waves(r) === 1 &&
      r.steps[0].bunches[0].makes === "puff" &&
      waves(r2) <= 2,
    clip: true,
    at: [
      [200, 290, 360, 440, 620],
      [130, 250, 310, 360, 410, 480, 800],
    ],
    says: [
      "the L",
      "4 run into the corner",
      "the puffer is made",
      "a ring and fluff",
      "settled",
      "swap it",
      "it breathes in, the rest lean to it",
      "it lets go",
      "the ring spreads",
      "fluff everywhere",
      "the board springs back",
      "at rest",
    ],
  },
  {
    id: "a-frizzball",
    title: "A line of 5 makes a frizzball, and it takes a kind",
    level: 5,
    moves: ["hint", "set-off"],
    wants: ([r, r2]) =>
      waves(r) === 1 &&
      r.steps[0].bunches[0].makes === "frizz" &&
      waves(r2) <= 3,
    clip: true,
    at: [
      [200, 290, 380, 480, 700],
      [130, 260, 420, 600, 760, 860, 1100],
    ],
    says: [
      "the line of 5",
      "4 run into the middle",
      "the frizzball is made",
      "everyone looks",
      "settled",
      "swap it with a fuzzball",
      "static leaps to the first",
      "and on to each",
      "they stand frizzed",
      "all at once",
      "they hop off together",
      "the board falls",
    ],
  },
  {
    id: "two-dashers",
    title: "Two dashers swapped together",
    level: made("Two dashers", {
      specials: [
        { x: 3, y: 3, kind: "blue", sp: "dash-h" },
        { x: 4, y: 3, kind: "blue", sp: "dash-v" },
      ],
    }),
    moves: [
      [
        [3, 3],
        [4, 3],
      ],
    ],
    wants: ([r]) => waves(r) <= 2,
    at: [[0, 140, 300, 460, 540, 620, 760, 1100]],
  },
  {
    id: "two-puffers",
    title: "Two puffers swapped together",
    level: made("Two puffers", {
      specials: [
        { x: 3, y: 3, kind: "blue", sp: "puff" },
        { x: 3, y: 4, kind: "blue", sp: "puff" },
      ],
    }),
    moves: [
      [
        [3, 3],
        [3, 4],
      ],
    ],
    wants: ([r]) => waves(r) <= 2,
    clip: true,
    at: [[0, 140, 300, 460, 600, 680, 760, 860, 1000, 1300]],
  },
  {
    id: "a-dasher-and-a-puffer",
    title: "A dasher and a puffer swapped together",
    level: made("A dasher and a puffer", {
      specials: [
        { x: 3, y: 3, kind: "blue", sp: "dash-h" },
        { x: 4, y: 3, kind: "blue", sp: "puff" },
      ],
    }),
    moves: [
      [
        [3, 3],
        [4, 3],
      ],
    ],
    wants: ([r]) => waves(r) <= 2,
    at: [[0, 140, 300, 460, 540, 620, 760, 1100]],
  },
  {
    id: "two-wisps",
    title: "Two wisps swapped together",
    level: made("Two wisps", {
      specials: [
        { x: 3, y: 3, kind: "blue", sp: "wisp" },
        { x: 4, y: 3, kind: "blue", sp: "wisp" },
      ],
      board: quilt({ "0,0": "2", "6,0": "2", "0,6": "2" }),
    }),
    moves: [
      [
        [3, 3],
        [4, 3],
      ],
    ],
    wants: ([r]) => waves(r) <= 2,
    at: [[0, 140, 300, 460, 620, 780, 940, 1200]],
  },
  {
    id: "a-frizzball-and-a-dasher",
    title: "A frizzball and a dasher swapped together",
    level: made("A frizzball and a dasher", {
      specials: [
        { x: 3, y: 3, kind: "red", sp: "dash-h" },
        { x: 4, y: 3, kind: "blue", sp: "frizz" },
      ],
    }),
    moves: [
      [
        [4, 3],
        [3, 3],
      ],
    ],
    wants: ([r]) => waves(r) <= 3,
    clip: true,
    at: [[0, 140, 300, 460, 700, 940, 1100, 1300, 1500, 1700, 1900, 2300]],
  },
  {
    id: "two-frizzballs",
    title: "Two frizzballs swapped together",
    level: made("Two frizzballs", {
      specials: [
        { x: 3, y: 3, kind: "blue", sp: "frizz" },
        { x: 4, y: 3, kind: "blue", sp: "frizz" },
      ],
    }),
    moves: [
      [
        [3, 3],
        [4, 3],
      ],
    ],
    at: [[0, 140, 300, 460, 560, 660, 800, 1000, 1300, 1700]],
  },
  {
    id: "five-waves",
    title: "One move, 5 waves",
    level: 9,
    moves: ["bot"],
    until: (r) => waves(r) === 5 && r.steps.every((s) => s.blasts.length === 0),
    clip: true,
    bar: true,
  },
  {
    id: "dust",
    title: "Dust comes off",
    level: 8,
    moves: ["bot"],
    until: (r) =>
      waves(r) <= 2 &&
      r.steps[0].hits.filter((h) => h.what === "dust").length >= 3,
  },
  {
    id: "bricks",
    title: "Bricks lose a layer a hit, and the last one bursts",
    level: made("Soft bricks", {
      id: 11,
      goals: [{ type: "brick", count: 4 }],
      board: quilt({
        "2,3": "b",
        "3,3": "b",
        "4,2": "b",
        "2,4": "4",
        "3,4": "3",
        "4,4": "2",
        "5,3": "1",
        "2,5": "b",
        "3,5": "b",
        "4,6": "b",
      }),
    }),
    moves: [
      [
        [4, 2],
        [4, 3],
      ],
      [
        [4, 6],
        [4, 5],
      ],
    ],
    wants: ([first, second]) =>
      waves(first) === 1 &&
      struck(first, "knock") === 3 &&
      struck(first, "break") === 1 &&
      waves(second) <= 2 &&
      struck(second, "knock") === 2 &&
      struck(second, "break") === 1,
    clip: true,
    bar: true,
    at: [
      [0, 300, 380, 440, 500, 600, 900],
      [380, 440, 500, 620, 1000],
    ],
    says: [
      "4, 3, 2 and 1 layers",
      "a bunch beside all 4",
      "each is hit once: the piles duck",
      "the top cushions tumble off",
      "the piles spring up; the last layer bursts",
      "fluff, and its button flies",
      "at rest: 3, 2 and 1",
      "a bunch under them: the piles duck again",
      "another cushion each",
      "one more bursts",
      "fuzzballs roll in under the bricks",
      "at rest: 2 and 1",
    ],
    tail: 500,
  },
  {
    id: "a-cage",
    title: "A cage opens",
    level: 13,
    moves: ["bot"],
    until: (r, after, before) =>
      waves(r) <= 2 &&
      r.steps[0].blasts.length === 0 &&
      caged(after) < caged(before),
  },
  {
    id: "a-sleepyhead",
    title: "A sleepyhead gets to bed",
    level: 19,
    moves: ["bot"],
    until: (r) => r.steps.some((s) => s.hits.some((h) => h.what === "bed")),
  },
  {
    id: "a-burr-spreads",
    title: "A burr spreads",
    level: 22,
    moves: ["bot"],
    until: (r) => r.burr !== null,
  },
  {
    id: "a-burr-comes-off",
    title: "A burr is brushed off",
    level: 22,
    moves: ["bot"],
    until: (r) =>
      waves(r) <= 2 && r.steps[0].hits.some((h) => h.what === "unburr"),
  },
  {
    id: "the-wind-turns",
    title: "The wind turns",
    level: 30,
    moves: ["bot"],
    until: (r) => r.gust !== null,
    tail: 300,
  },
  {
    id: "a-level-cleared",
    title: "A level cleared, with moves to spare",
    level: made("Nearly there", {
      id: 12,
      stars: [0, 2, 4],
      moves: 5,
      goals: [{ type: "gather", kind: "blue", count: 3 }],
      board: quilt({
        "2,3": "b",
        "3,3": "b",
        "4,2": "b",
        "1,5": "b",
        "2,5": "b",
        "3,6": "b",
      }),
    }),
    moves: [
      [
        [4, 2],
        [4, 3],
      ],
    ],
    clip: true,
    bar: true,
    tail: 2600,
  },
  {
    id: "out-of-moves",
    title: "Out of moves",
    level: made("So close", {
      id: 17,
      moves: 1,
      goals: [
        { type: "gather", kind: "blue", count: 5 },
        { type: "brick", count: 2 },
      ],
      board: quilt({
        "2,3": "b",
        "3,3": "b",
        "4,2": "b",
        "1,5": "b",
        "2,5": "b",
        "3,6": "b",
        "0,6": "2",
        "6,6": "1",
      }),
    }),
    moves: [
      [
        [4, 2],
        [4, 3],
      ],
    ],
    bar: true,
    tail: 1400,
  },
];

/**
 * Returns the squares of a special's set-off: the special last made, and a
 * neighbor to swap it with.
 * @param {State} s
 * @param {number} id The special's id.
 * @returns {{ a: number, b: number } | null}
 */
function setOff(s, id) {
  const a = s.piece.findIndex((p) => p?.id === id);
  if (a < 0) return null;
  // A frizzball is swapped with the kind there is most of beside it; any other, with a plain neighbor.
  const beside = legalMoves(s)
    .filter((m) => m.a === a || m.b === a)
    .map((m) => (m.a === a ? m.b : m.a))
    .filter((b) => s.piece[b]?.t === "fuzz" && !s.piece[b]?.sp);
  if (beside.length === 0) return null;
  const count = (/** @type {number} */ b) =>
    s.piece.filter((p) => p?.t === "fuzz" && p.k === s.piece[b]?.k).length;
  beside.sort((p, q) => count(q) - count(p));
  return { a, b: beside[0] };
}

/**
 * Works a scene's moves out on one deal.
 * @param {Scene} scene
 * @param {Level} level
 * @param {number} seed
 * @returns {Plan | null} Nothing, where the deal does not give the scene what it wants.
 */
function tryDeal(scene, level, seed) {
  const s = deal(level, seed);
  const at = (/** @type {number[]} */ xy) => xy[1] * s.w + xy[0];
  /** @type {Plan} */
  const plan = { scene, level, seed, before: [], shown: [], records: [] };
  let made = -1;
  for (const move of scene.moves) {
    /** @type {{ a: number, b: number } | null} */
    let m = null;
    if (move === "hint") {
      const hint = /** @type {{ hint?: number[][] }} */ (level).hint;
      if (!hint) return null;
      m = { a: at(hint[0]), b: at(hint[1]) };
    } else if (move === "set-off") m = setOff(s, made);
    else if (move === "bot") {
      // The careful player plays on until a move does what the scene is about.
      for (let n = 0; n < 40 && !s.won && !s.lost; n++) {
        const choice = carefulMove(s);
        if (!choice) return null;
        const trial = structuredClone(s);
        const record = /** @type {Move} */ (
          play(trial, choice.a, choice.b, true)
        );
        if (scene.until?.(record, trial, s)) {
          m = choice;
          break;
        }
        play(s, choice.a, choice.b);
        plan.before.push(choice);
      }
    } else m = { a: at(move[0]), b: at(move[1]) };
    if (!m) return null;
    const from = onScreen(s, m.a);
    const to = onScreen(s, m.b);
    const record = /** @type {Move} */ (play(s, m.a, m.b, true));
    if (!record.swap.ok) return null;
    plan.shown.push({ ...m, from, to });
    plan.records.push(record);
    for (const step of record.steps)
      for (const bunch of step.bunches) if (bunch.born) made = bunch.bornId;
  }
  if (scene.wants && !scene.wants(plan.records)) return null;
  return plan;
}

/**
 * Works a scene's moves out, on the first deal that gives what it wants.
 * @param {Scene} scene
 * @returns {Plan}
 */
export function plan(scene) {
  const level =
    typeof scene.level === "number" ? DRAFTS[scene.level - 1] : scene.level;
  for (let seed = scene.seed ?? 1; seed <= (scene.seed ?? 400); seed++) {
    const found = tryDeal(scene, level, seed);
    if (found) return found;
  }
  throw new Error(`No deal gives the scene ${scene.id} what it wants`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const scene of SCENES) {
    const p = plan(scene);
    const told = p.records.map(
      (r) =>
        `${r.steps.length} waves [${r.steps.map((s) => `${s.bunches.map((b) => b.cells.length + (b.makes ? b.makes : "")).join("+")}${s.blasts.length ? ` !${s.blasts.map((b) => b.what).join(",")}` : ""}`).join(" | ")}]${r.burr ? " burr" : ""}${r.gust ? " gust" : ""}${r.won ? " won" : ""}${r.lost ? " lost" : ""}`,
    );
    console.log(
      `${scene.id}: deal ${p.seed}, ${p.before.length} moves before; ${told.join("; then ")}`,
    );
  }
}
