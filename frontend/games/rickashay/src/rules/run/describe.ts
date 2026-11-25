// What the announcer says of the game, and what G and R read, as the
// design's "Accessibility" has it.

import { AIMS_PER_DEGREE, FIRST_AIM_DEGREES } from "@fz/brick-wall/rules/aims";
import type { Aim } from "@fz/brick-wall/rules/aims";
import { COLUMNS } from "@fz/brick-wall/rules/field";
import {
  FLOORWARD,
  LEFT,
  RIGHT,
  brickAt,
  fieldRowOf,
} from "@fz/brick-wall/rules/grid";
import { endTitle, whereLost } from "@fz/brick-wall/rules/end_words";
import { inDanger, lowestNeededRow } from "@fz/brick-wall/rules/wall";
import { count, formatPoints, listed } from "@fz/core/format";
import { WALL_RULES } from "../bricks/wall_rules";
import { type Brick, kindOf } from "../catalog/kinds";
import type {
  EarnedBy,
  FlightEvent,
  RoundOutcome,
  RoundStart,
} from "../flight/events";
import type { LevelEntry } from "../levels/levels";
import type { FlightRules } from "../tuning";
import type { Run } from "./run";
import { STARS, type Star, type StarFlags } from "./stars";

/** How many of the field's lowest rows holding a brick R reads. */
export const ROWS_READ = 3;

/** Describes a floor bounce a flight earned, as the announcer says it: what earned it, the rally as it did, and whether it was kept. */
export interface EarnedBounce {
  readonly by: EarnedBy;
  readonly rally: number;
  /** Whether it was kept, or lost to the most a fuzzball holds. */
  readonly kept: boolean;
}

/** Returns what is said of an aim, as the keys change it: "62 degrees". */
export function describeAim(aim: Aim): string {
  return `${String(FIRST_AIM_DEGREES + aim / AIMS_PER_DEGREE)} degrees`;
}

/**
 * Returns what G reads of the guide for an aim, from the events of the
 * rules' own flight the guide draws and where the round starts: the aim,
 * then each turn it shows, by what turned it, a brick by its kind and its
 * field row with its hits where it takes more than one: "62 degrees. A
 * brick in row 7, the right wall, a tough brick in row 8, 2 hits."
 */
export function describeGuide(
  aim: Aim,
  events: readonly FlightEvent[],
  start: RoundStart,
): string {
  const turns = events.flatMap((event) =>
    event.kind === "turn" ? [turnWords(event, start)] : [],
  );
  const words = `${describeAim(aim)}.`;
  return turns.length === 0
    ? words
    : `${words} ${capitalized(turns.join(", "))}.`;
}

/**
 * Returns what is said as a flight earns a floor bounce, by the rally or a
 * spring brick: "Rally 10: a floor bounce.", and for one lost to the most a
 * fuzzball holds, "Rally 70: a floor bounce, but you already have 3."
 */
export function describeEarned(
  { by, rally, kept }: EarnedBounce,
  { mostBounces }: Pick<FlightRules, "mostBounces">,
): string {
  const from = by === "rally" ? `Rally ${String(rally)}` : "Spring brick";
  const lost = kept ? "" : `, but you already have ${String(mostBounces)}`;
  return `${from}: a floor bounce${lost}.`;
}

/**
 * Returns what is said as a round ends: its rally, what it broke, and a
 * brick reaching the floor or, with the level still on, how far the lowest
 * brick it needs stands from the floor: "A rally of 14. Broke 6. 5 rows to
 * the floor."
 */
export function describeRound(
  { rally, broken, result }: RoundOutcome,
  next: RoundStart,
): string {
  const words = [
    rally === 0 ? "No rally." : `A rally of ${String(rally)}.`,
    broken === 0 ? "Broke none." : `Broke ${String(broken)}.`,
  ];
  if (result === "lost") words.push("A brick reached the floor.");
  if (result === "on") {
    const rows = count(lowestNeededRow(next.wall, WALL_RULES), "row", "rows");
    words.push(`${rows} to the floor.`);
  }
  return words.join(" ");
}

/** Returns what is said of the wall's jump after a round, following the round's end, or null where the wall didn't jump. */
export function describeJump({
  jumped,
  rowsDown,
}: RoundOutcome): string | null {
  return jumped
    ? `The wall jumped ${count(rowsDown, "row", "rows")}. Your next shot is a hot shot.`
    : null;
}

/** What the wall's jump does, as Coming next says it beside the field. */
export const JUMP_WORDS =
  "If you break everything you can below the dashed line, the wall jumps. Then your next shot is a hot shot.";

/** Returns what is said following a round's end once it leaves a brick the level needs in the row over the floor's, or null. */
export function describeDanger(
  { result }: RoundOutcome,
  { wall }: RoundStart,
): string | null {
  return result === "on" && inDanger(wall, WALL_RULES)
    ? "Danger. Break the bottom bricks this shot, or you lose the level."
    : null;
}

/** Returns what is said as a level begins: its number, its name, its par and its rally mark on this field. */
export function describeLevel(
  entry: LevelEntry,
  par: number,
  mark: number,
): string {
  return `Level ${String(entry.number)}, ${entry.data.name}. ${describeParAndMark(par, mark)}`;
}

/**
 * Returns a level's par and rally mark as they are said, as it begins and
 * again as the field takes another depth before its first shot: "Par 9.
 * Rally mark 15."
 */
export function describeParAndMark(par: number, mark: number): string {
  return `Par ${String(par)}. Rally mark ${String(mark)}.`;
}

/** What the announcer says as a flight reaches the level's rally mark, the call the shell shows over the field too. */
export const CALL_WORDS = "Rickaashay!";

/**
 * Returns a star's name on the Cleared card, by its par and the rally mark
 * it was cleared against: "Cleared", "Within 9 shots" and "A rally of 24".
 */
export function starLabel(star: Star, par: number, mark: number): string {
  return capitalized(starWords(star, par, mark));
}

/**
 * Returns what is said as a level is cleared, the last among them: its
 * shots, the stars it earned, each by name, and the score: "Level 2
 * cleared in 5 shots. 2 stars: cleared and within 9 shots. Score 1,640."
 * For the last level, which wins the run, it leaves the score out, because
 * the run's end is said straight after and says it.
 */
export function describeCleared(
  run: Pick<Run, "level" | "rounds" | "par" | "score" | "outcome">,
  stars: StarFlags,
  mark: number,
): string {
  const earned = STARS.filter((star) => stars[star]).map((star) =>
    starWords(star, run.par, mark),
  );
  const words = `Level ${String(run.level)} cleared in ${count(run.rounds, "shot", "shots")}. ${count(earned.length, "star", "stars")}: ${listed(earned)}.`;
  return run.outcome === "won"
    ? words
    : `${words} Score ${formatPoints(run.score)}.`;
}

/** Returns how many rows wait over the ceiling, as the lintel says it: "5 rows waiting", or "No rows waiting". */
export function rowsWaiting(rows: number): string {
  return rows === 0
    ? "No rows waiting"
    : `${count(rows, "row", "rows")} waiting`;
}

/** Returns what is said as a run pauses: its score, and the key that resumes it. */
export function describePause({ score }: Pick<Run, "score">): string {
  return `Paused. Score ${formatPoints(score)}. Press Enter to resume.`;
}

/** Returns what is said as a paused run goes on. */
export function describeResume(): string {
  return "Resumed.";
}

/**
 * Returns what is said as a run kept before the page was left is taken up,
 * paused: its level, the shots it has taken there, its score and the key
 * that resumes it.
 */
export function describeTakenUp(
  { rounds, score }: Pick<Run, "rounds" | "score">,
  entry: LevelEntry,
): string {
  const shots = rounds === 0 ? "" : ` ${count(rounds, "shot", "shots")} taken.`;
  return `Paused on level ${String(entry.number)}, ${entry.data.name}.${shots} Score ${formatPoints(score)}. Press Enter to resume.`;
}

/**
 * Returns what is said as a run ends, on the level handed: how it ended,
 * where a lost one was lost, its score, and whether that is a new best:
 * "Game over. Lost on level 3, Columns. Score 1,240. New best."
 */
export function describeEnd(
  run: Pick<Run, "outcome" | "score">,
  entry: LevelEntry,
  newBest: boolean,
): string {
  const words = [`${endTitle(run).replace(/!$/, "")}.`];
  if (run.outcome !== "won") {
    words.push(`${whereLost(entry.number, entry.data.name)}.`);
  }
  words.push(`Score ${formatPoints(run.score)}.`);
  if (newBest) words.push("New best.");
  return words.join(" ");
}

/**
 * Returns what R reads: the field's lowest rows that hold a brick, from the
 * floor, up to {@link ROWS_READ} of them, each cell a brick's kind, with
 * what tells it from another of its kind, or a gap: "Row 2: brick, gap,
 * tough brick, 3 hits, …".
 */
export function describeRows(start: RoundStart): string {
  const { wall, depth } = start;
  const rows: string[] = [];
  for (let row = 0; row < depth && rows.length < ROWS_READ; row++) {
    const bricks = Array.from({ length: COLUMNS }, (_, column) =>
      brickAt(wall, depth, column, row),
    );
    if (bricks.some((brick) => brick !== null)) {
      const words = bricks.map((brick) => brickWords(brick, start));
      rows.push(`Row ${String(row)}: ${words.join(", ")}.`);
    }
  }
  return rows.length > 0 ? rows.join(" ") : "No bricks on the screen.";
}

/** Returns a star's words in a sentence, by its par and the rally mark it was cleared against. */
function starWords(star: Star, par: number, mark: number): string {
  switch (star) {
    case "cleared":
      return "cleared";
    case "par":
      return `within ${count(par, "shot", "shots")}`;
    case "mark":
      return `a rally of ${String(mark)}`;
  }
}

/** Returns what G says of a turn of the guide: what turned it, a brick by its kind and its row. */
function turnWords(
  turn: Extract<FlightEvent, { readonly kind: "turn" }>,
  { wall }: RoundStart,
): string {
  switch (turn.off) {
    case "wall":
      return turn.x < COLUMNS / 2 ? "the left wall" : "the right wall";
    case "ceiling":
      return "the ceiling";
    case "floor":
      return "the floor";
    case "brick":
    case "bar":
      return metWords(turn, wall);
  }
}

/**
 * Returns what G says of the brick a turn off a brick or a bar met: the
 * first brick it met, or for a bar the first hatch, since a turn's cells
 * hold both, by its kind and its field row, with its hits where it takes
 * more than one. It throws for a turn that met none, as no flight's does.
 */
function metWords(
  { off, cells }: Extract<FlightEvent, { readonly kind: "turn" }>,
  wall: RoundStart["wall"],
): string {
  for (const cell of cells) {
    const brick = wall.bricks[cell] ?? null;
    if (brick !== null && (brick.kind === "hatch") === (off === "bar")) {
      const hits =
        brick.full > 1 ? `, ${count(brick.hits, "hit", "hits")}` : "";
      return `a ${nameOf(brick)} in row ${String(fieldRowOf(wall, cell))}${hits}`;
    }
  }
  throw new RangeError(`A turn off a ${off} met no ${off} of the wall.`);
}

/** The faces a plated brick's plates cover, as R names them: the floor's alone, or with both sides, as the legend plates them. */
const PLATE_WORDS: readonly (readonly [faces: number, words: string])[] = [
  [FLOORWARD, "the floor"],
  [LEFT | RIGHT, "both sides"],
];

/**
 * Returns what R says of a cell where a round starts: its brick's kind, a
 * portal with its pair's mark, then its hits left where it takes more than
 * one and what else tells it from another of its kind; or a gap.
 */
function brickWords(brick: Brick | null, start: RoundStart): string {
  if (brick === null) return "gap";
  const words = [`${nameOf(brick)}${markWords(brick)}`];
  if (brick.full > 1) words.push(count(brick.hits, "hit", "hits"));
  const told = toldApart(brick, start);
  if (told !== null) words.push(told);
  return words.join(", ");
}

/**
 * Returns what R adds to a portal's name, its pair's mark as the art draws
 * it, a dot on the first pair and a diamond on the second, a portal's tint
 * being its pair's place among the legend's marks; and nothing to any
 * other brick's.
 */
function markWords({ kind, tint }: Brick): string {
  if (kind !== "portal") return "";
  return tint === 0 ? " with a dot" : " with a diamond";
}

/**
 * Returns what R says tells a brick from another of its kind: the faces a
 * plated brick is plated on, the way a ramp's long face looks, a lock's
 * bolts, and a portal shut while its twin waits over the ceiling; or null
 * where nothing does but its hits.
 */
function toldApart(
  { kind, plates, tint, twin }: Brick,
  { wall, depth }: RoundStart,
): string | null {
  switch (kind) {
    case "plated":
      return platedWords(plates);
    case "ramp":
      return `facing ${(plates & FLOORWARD) !== 0 ? "up" : "down"} and ${(plates & LEFT) !== 0 ? "right" : "left"}`;
    case "lock":
      return count(tint, "bolt", "bolts");
    case "portal":
      return twin !== null && fieldRowOf(wall, twin) >= depth ? "shut" : null;
    case "brick":
    case "tough":
    case "steel":
    case "hatch":
    case "spring":
    case "gem":
    case "moss":
      return null;
  }
}

/** Returns what R says of a brick's plates: "plated toward the floor and both sides". */
function platedWords(plates: number): string {
  const faces = PLATE_WORDS.filter(
    ([covered]) => (plates & covered) === covered,
  ).map(([, words]) => words);
  return `plated toward ${listed(faces)}`;
}

/** Returns a brick's kind as a sentence names it, such as "tough brick". */
function nameOf({ kind }: Brick): string {
  return kindOf(kind).name.toLowerCase();
}

/** Returns words with their first letter a capital, as a sentence starts. */
function capitalized(words: string): string {
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}
