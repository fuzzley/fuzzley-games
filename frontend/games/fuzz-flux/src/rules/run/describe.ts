// What the game says of a level in play, in the words on the screen or
// fewer: each goal's name, as the bar says it beside its picture, the line
// about what a level brings in new, and what the announcer says as a level
// begins, as each move is made and as the level ends.

import { count, listed } from "@fz/core/format";
import { isKeyOf, itemAt } from "@fz/core/records";
import { WINDS, type Wind } from "../board/board";
import type { Goal, GoalId } from "../catalog/goals";
import type { BlastId, MadeId } from "../catalog/specials";
import type { NewThing } from "../levels/level";
import type { Blast, Bunch, Hit, MoveRecord, Wave } from "../move/record";

/** The line about each thing a level can bring in new: what you do, then what it does. */
const NEW_THING_LINES: Readonly<Record<NewThing, string>> = {
  bunch: "Swap 2 fuzzballs to line up 3 of a kind.",
  dasher:
    "Line up 4 to make a dasher. It clears the row or column its fur points along.",
  wisp: "Make a square of 4 to get a wisp. It floats to where you need it.",
  puffer:
    "Line up 5 in an L or a T to make a puffer. Swap it to clear the squares around it.",
  frizzball:
    "Line up 5 to make a frizzball. Swap it with a fuzzball to gather all of that kind.",
  pair: "Swap 2 special fuzzballs with each other. They go off together.",
  dust: "Line up 3 on dusty squares to dust them off.",
  brick: "Line up 3 next to a brick to break it.",
  "thick-brick":
    "Thick bricks have 2 to 4 layers. Line up 3 next to one to knock a layer off.",
  cage: "Line up a caged fuzzball with 2 of its kind to free it.",
  sleepyhead:
    "Get each sleepyhead to the bottom row. Clear the fuzzballs under it.",
  burr: "You can't swap a fuzzball that has a burr. Line up 3 next to it to brush the burr off.",
  wind: "The wind is blowing. Fuzzballs fall the way it blows.",
  "turning-wind": "The wind turns every few moves. Watch the arrow.",
};

/** Returns a goal's name, as the bar says it beside its picture: its kind of fuzzball, or the element it clears. */
export function goalName(goal: Goal): string {
  switch (goal.what) {
    case "gather":
      return goal.kind;
    case "dust":
      return "dust";
    case "brick":
      return "bricks";
    case "cage":
      return "cages";
    case "sleepyhead":
      return "sleepyheads";
  }
}

/** Returns the line about something a level brings in new. */
export function newThingLine(thing: NewThing): string {
  return NEW_THING_LINES[thing];
}

/** What is said of a swap the rules refuse. */
const SWAP_REFUSED = "That swap makes no bunch";

/** Each special, as it is said made: a dasher whichever way it runs. */
const MADE_NAMES: Readonly<Record<MadeId, string>> = {
  "dasher-across": "dasher",
  "dasher-down": "dasher",
  puffer: "puffer",
  wisp: "wisp",
  frizzball: "frizzball",
};

/** Each blast, as it is said set off: a special alone, or a pair swapped together. */
const BLAST_NAMES: Readonly<Record<BlastId, string>> = {
  ...MADE_NAMES,
  "two-dashers": "2 dashers",
  "dasher-and-puffer": "dasher and puffer",
  "two-puffers": "2 puffers",
  "two-wisps": "2 wisps",
  "wisp-and-dasher-across": "wisp and dasher",
  "wisp-and-dasher-down": "wisp and dasher",
  "wisp-and-puffer": "wisp and puffer",
  "frizzball-and-dasher": "frizzball and dasher",
  "frizzball-and-puffer": "frizzball and puffer",
  "frizzball-and-wisp": "frizzball and wisp",
  "two-frizzballs": "2 frizzballs",
};

/** Describes how a hit on an element is said: what it hits, one and many, what it does to them, and the goal that counts it, which then says it instead. */
interface HitSaid {
  readonly one: string;
  readonly many: string;
  readonly does: string;
  /** The kind of goal that counts it, or null for a hit none counts. */
  readonly countedBy: GoalId | null;
}

/**
 * How each hit on an element is said, a fuzzball or a square each: a cage
 * opened, a burr brushed off, a brick hit or broken, a square dusted off
 * and a sleepyhead put to bed. A fuzzball gathered, a special born and a
 * sleepyhead ruffled aren't among them: the bunches, the goals and what was
 * made say the first two, and a ruffle changes nothing.
 */
const HITS_SAID = {
  uncaged: { one: "cage", many: "cages", does: "opened", countedBy: "cage" },
  unburred: {
    one: "burr",
    many: "burrs",
    does: "brushed off",
    countedBy: null,
  },
  knocked: { one: "brick", many: "bricks", does: "hit", countedBy: null },
  broken: { one: "brick", many: "bricks", does: "broken", countedBy: "brick" },
  dusted: {
    one: "square",
    many: "squares",
    does: "dusted off",
    countedBy: "dust",
  },
  bedded: {
    one: "sleepyhead",
    many: "sleepyheads",
    does: "put to bed",
    countedBy: "sleepyhead",
  },
} as const satisfies Readonly<Partial<Record<Hit["what"], HitSaid>>>;

/** A hit on an element that is said, such as "uncaged". */
type SaidHit = keyof typeof HITS_SAID;

/** Describes a goal as it is said, as the bar shows it: the goal, and what it still asks for, 0 once met. */
export interface GoalSaid {
  readonly goal: Goal;
  readonly left: number;
}

/** Describes the wind as it is said, as the bar's arrow shows it: the way it blows, and the moves until it turns, or null for one that never does. */
export interface WindSaid {
  readonly blows: Wind;
  readonly turnsIn: number | null;
}

/** Describes a level as it is said begun, as the bar shows it. */
export interface LevelSaid {
  readonly level: { readonly number: number; readonly name: string };
  readonly goals: readonly GoalSaid[];
  readonly movesLeft: number;
  /** The wind, or null for a level with none. */
  readonly wind: WindSaid | null;
}

/** The most words a move is said in, as an event is: what the player needs most is said first, and the rest left out. */
const MOVE_WORDS = 12;

/** Each part a move is said in, in the order said. */
const MOVE_PARTS = [
  "bunches",
  "setOff",
  "made",
  "hits",
  "burr",
  "wind",
  "shuffle",
  "goals",
  "low",
] as const;

/** A part a move is said in, such as "goals". */
type MovePart = (typeof MOVE_PARTS)[number];

/**
 * Each part's rank in what a move keeps within {@link MOVE_WORDS}, the most
 * needed first: the goals, the moves run low, the swap, what was made, the
 * wind's turn and what else happened after, and the hits no goal counts.
 */
const MOVE_RANKS: Readonly<Record<MovePart, number>> = {
  goals: 0,
  low: 1,
  bunches: 2,
  setOff: 3,
  made: 4,
  wind: 5,
  burr: 6,
  shuffle: 7,
  hits: 8,
};

/** Returns what is said of goals still asking for something, as a level begins or ends: "20 blue and 1 cage". */
function goalsAsked(goals: readonly GoalSaid[]): string {
  return listed(
    goals.flatMap(({ goal, left }) =>
      left > 0 ? [goalCount(goal, left)] : [],
    ),
  );
}

/** Returns a goal's count, as said: "20 blue", "16 dust", "1 cage". */
function goalCount(goal: Goal, asked: number): string {
  switch (goal.what) {
    case "gather":
      return `${String(asked)} ${goal.kind}`;
    case "dust":
      return `${String(asked)} dust`;
    case "brick":
      return count(asked, "brick", "bricks");
    case "cage":
      return count(asked, "cage", "cages");
    case "sleepyhead":
      return count(asked, "sleepyhead", "sleepyheads");
  }
}

/**
 * Returns what is said as a level begins, as a list of what the bar shows:
 * its number and name, its goals, its moves and the wind: "Level 28, Gale.
 * 16 dust. 18 moves. Wind right, turns in 2."
 */
export function describeLevelBegun({
  level,
  goals,
  movesLeft,
  wind,
}: LevelSaid): string {
  const parts = [
    `Level ${String(level.number)}, ${level.name}`,
    goalsAsked(goals),
    count(movesLeft, "move", "moves"),
  ];
  if (wind !== null) {
    const { blows, turnsIn } = wind;
    const turning = turnsIn === null ? "" : `, turns in ${String(turnsIn)}`;
    parts.push(`Wind ${blows}${turning}`);
  }
  return sentences(parts);
}

/**
 * Returns what is said as a move is made, in the words the screen shows or
 * fewer, and no more than {@link MOVE_WORDS} where it can: what the swap
 * gathered or set off, what was made, what it did to elements no goal
 * counts, a burr spread, the wind's turn, a shuffle, the goals it brought
 * down or met, and the moves left where it brought them low: "Bunch of 4,
 * blue. Dasher made. 6 blue left." A swap the rules refuse says so.
 *
 * @param before Each goal as the move started.
 * @param after Each goal once the move, and any gust after it, played out.
 * @param lowNow The moves left where the move brought them low and the
 *   level plays on, or null.
 */
export function describeMove(
  record: MoveRecord,
  before: readonly GoalSaid[],
  after: readonly GoalSaid[],
  lowNow: number | null,
): string {
  if (record.swap.refused) return sentences([SWAP_REFUSED]);
  const { bunches, blasts } = itemAt(record.waves, 0);
  const { burrSpread, gust, shuffle } = record;
  return sentences(
    withinBudget({
      bunches: bunchesSaid(bunches),
      setOff: setOffSaid(blasts.filter(({ setOffBy }) => setOffBy === null)),
      made: madeSaid(record.waves),
      hits: hitsSaid(record.waves, before),
      burr: burrSpread === null ? null : "A burr spread",
      wind: gust === null ? null : `Wind ${itemAt(WINDS, gust.turns)}`,
      shuffle: shuffle === null ? null : "Fuzzballs shuffled",
      goals: goalsSaid(before, after),
      low: lowNow === null ? null : `${count(lowNow, "move", "moves")} left`,
    }),
  );
}

/** Returns what is said as a level is cleared, as its card shows it: "Level 12 cleared. 3 stars. 4 moves to spare." */
export function describeCleared(
  level: number,
  stars: number,
  spare: number,
): string {
  const parts = [
    `Level ${String(level)} cleared`,
    count(stars, "star", "stars"),
  ];
  if (spare > 0) parts.push(`${count(spare, "move", "moves")} to spare`);
  return sentences(parts);
}

/** Returns what is said as a level runs out of moves, as its card shows it: "Out of moves. 6 blue and 2 cages left." */
export function describeOver(goals: readonly GoalSaid[]): string {
  return sentences(["Out of moves", `${goalsAsked(goals)} left`]);
}

/** Returns what is said of the bunches a swap gathered: "Bunch of 4, blue", "2 bunches, blue and red", or null for none. */
function bunchesSaid(bunches: readonly Bunch[]): string | null {
  if (bunches.length === 0) return null;
  if (bunches.length === 1) {
    const { squares, kind } = itemAt(bunches, 0);
    return `Bunch of ${String(squares.length)}, ${kind}`;
  }
  const kinds = [...new Set(bunches.map(({ kind }) => kind))];
  return `${String(bunches.length)} bunches, ${listed(kinds)}`;
}

/** Returns what is said of the specials a swap, or its bunches, set off: "Puffer set off", "2 specials set off", or null for none. */
function setOffSaid(setOff: readonly Blast[]): string | null {
  if (setOff.length === 0) return null;
  if (setOff.length > 1) return `${String(setOff.length)} specials set off`;
  return `${BLAST_NAMES[itemAt(setOff, 0).what]} set off`;
}

/** Returns what is said of the specials a move's bunches made: "Dasher made", "2 dashers and wisp made", or null for none. */
function madeSaid(waves: readonly Wave[]): string | null {
  const made = new Map<string, number>();
  for (const { bunches } of waves) {
    for (const { makes } of bunches) {
      if (makes === null) continue;
      const name = MADE_NAMES[makes.what];
      made.set(name, (made.get(name) ?? 0) + 1);
    }
  }
  if (made.size === 0) return null;
  const names = [...made].map(([name, n]) => some(n, name, `${name}s`));
  return `${listed(names)} made`;
}

/**
 * Returns what is said of a move's hits on elements no goal of the level
 * counts, by the fuzzballs or squares hit: "2 cages opened. Brick hit", or
 * null for none. A brick hit and then broken is said broken, and a layer of
 * dust off a square still dusty goes unsaid, as the dust drawn thinner
 * shows it.
 */
function hitsSaid(
  waves: readonly Wave[],
  goals: readonly GoalSaid[],
): string | null {
  const hit = new Map<SaidHit, Set<number>>();
  for (const { hits } of waves) {
    for (const struck of hits) {
      if (!isKeyOf(struck.what, HITS_SAID)) continue;
      if (struck.what === "dusted" && struck.layersLeft > 0) continue;
      const struckOnes = hit.get(struck.what) ?? new Set<number>();
      hit.set(
        struck.what,
        struckOnes.add("piece" in struck ? struck.piece : struck.square),
      );
    }
  }
  for (const brick of hit.get("broken") ?? []) {
    hit.get("knocked")?.delete(brick);
  }
  const counted = new Set<GoalId>(goals.map(({ goal }) => goal.what));
  const said = [...hit].flatMap(([what, struckOnes]) => {
    const { one, many, does, countedBy }: HitSaid = HITS_SAID[what];
    if (struckOnes.size === 0) return [];
    if (countedBy !== null && counted.has(countedBy)) return [];
    return [`${some(struckOnes.size, one, many)} ${does}`];
  });
  return said.length === 0 ? null : sentencesInside(said);
}

/** Returns what is said of the goals a move brought down or met: "Blue done. 6 blue and 4 dust left", or null for none. */
function goalsSaid(
  before: readonly GoalSaid[],
  after: readonly GoalSaid[],
): string | null {
  const done: string[] = [];
  const left: string[] = [];
  after.forEach(({ goal, left: to }, place) => {
    if (to === itemAt(before, place).left) return;
    if (to === 0) done.push(goalName(goal));
    else left.push(goalCount(goal, to));
  });
  const said = [
    ...(done.length > 0 ? [`${listed(done)} done`] : []),
    ...(left.length > 0 ? [`${listed(left)} left`] : []),
  ];
  return said.length === 0 ? null : sentencesInside(said);
}

/**
 * Returns the parts of what is said of a move that fit {@link MOVE_WORDS},
 * in the order said: each part by its rank, the most needed first, kept
 * where it fits.
 */
function withinBudget(
  parts: Readonly<Record<MovePart, string | null>>,
): readonly string[] {
  const kept = new Set<MovePart>();
  let spent = 0;
  const ranked = [...MOVE_PARTS].sort((a, b) => MOVE_RANKS[a] - MOVE_RANKS[b]);
  for (const part of ranked) {
    const words = parts[part];
    if (words === null) continue;
    const cost = words.split(" ").length;
    if (spent + cost > MOVE_WORDS) continue;
    kept.add(part);
    spent += cost;
  }
  return MOVE_PARTS.flatMap((part) => {
    const words = parts[part];
    return words !== null && kept.has(part) ? [words] : [];
  });
}

/** Returns so many of a thing, as said in a short sentence: one by its name alone, "Cage", and more by their number, "2 cages". */
function some(n: number, one: string, many: string): string {
  return n === 1 ? one : `${String(n)} ${many}`;
}

/** Returns parts said as sentences inside one part, every one but the last ended with a full stop. */
function sentencesInside(parts: readonly string[]): string {
  return parts
    .map((part, place) => (place === 0 ? part : capitalized(part)))
    .join(". ");
}

/** Returns parts said as sentences, each begun with a capital and ended with a full stop. */
function sentences(parts: readonly string[]): string {
  return parts.map((part) => `${capitalized(part)}.`).join(" ");
}

/** Returns words begun with a capital. */
function capitalized(words: string): string {
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}
