import { count, formatPoints } from "@fz/core/format";
import { brickKind } from "../catalog/bricks";
import { brickAt, fieldRowOf } from "../grid";
import type { LevelEntry } from "../levels/levels";
import type { RoundOutcome, RoundStart } from "../round/round";
import type { Boon, Shot } from "../shot";
import { AIMS_PER_DEGREE, COLUMNS, FIRST_AIM_DEGREES } from "../tuning";
import { isNeeded } from "../wall/lower";
import { type Brick, type Wall, thirdsOf } from "../wall/wall";
import type { Run } from "./run";
import { starsOf } from "./stars";

/** How many of the field's lowest rows holding a brick R reads. */
export const ROWS_READ = 3;

/** Each boon's name, as a player calls it. */
const BOON_NAMES: Readonly<Record<Boon, string>> = {
  hot: "hot shot",
  triple: "triple shot",
};

/** Returns a boon's name: "hot shot" or "triple shot". */
export function boonName(boon: Boon): string {
  return BOON_NAMES[boon];
}

/**
 * Returns what a level's jumps earn, in a sentence, as the Ready card and
 * the announcer say it: "Clear to the dashed line and the wall jumps: your
 * next shot is a hot shot."
 */
export function describeBoon(boon: Boon): string {
  return `Clear to the dashed line and the wall jumps: your next shot is a ${boonName(boon)}.`;
}

/** Returns what is said as a level begins: its number, its name and its boon. */
export function describeLevel(entry: LevelEntry, boon: Boon): string {
  return `Level ${String(entry.number)}, ${entry.data.name}. ${describeBoon(boon)}`;
}

/** Returns what is said as the keys change the aim or the charge: "62 degrees, charge 3". */
export function describeShot({ aim, charge }: Shot): string {
  const degrees = FIRST_AIM_DEGREES + aim / AIMS_PER_DEGREE;
  return `${String(degrees)} degrees, charge ${String(charge)}`;
}

/**
 * Returns what is said as a round ends, from what it came to and where the
 * next starts: what it broke and freed; then a brick reaching the floor,
 * the wall's jump, or its step, with how far the wall stands from the
 * floor, how many bricks stand between the player and a jump, and the
 * danger of a brick in the row over the floor's; and the boon the next
 * shot carries. A round that clears its level says only what it broke and
 * freed, which `describeCleared()` follows.
 */
export function describeRound(
  { broken, freed, rowsDown, jumped, result }: RoundOutcome,
  next: RoundStart,
): string {
  const words = [broken === 0 ? "Broke none." : `Broke ${String(broken)}.`];
  if (freed > 0) {
    words.push(
      freed === 1 ? "Freed a friend." : `Freed ${String(freed)} friends.`,
    );
  }
  if (result === "lost") {
    words.push("A brick reached the floor.");
  }
  if (result === "on") {
    words.push(
      jumped
        ? `The lower two-thirds are clear. The wall jumped ${count(rowsDown, "row", "rows")}.`
        : stepWords(next, rowsDown),
    );
    if (next.boon !== null) words.push(`Next shot: ${boonName(next.boon)}.`);
  }
  return words.join(" ");
}

/**
 * Returns what R reads: the field's lowest rows that hold a brick, from the
 * floor, up to {@link ROWS_READ} of them, each cell a brick's kind, with
 * its hits left where it takes more than one, or a gap: "Row 4: brick,
 * brick, gap, tough brick, 3 hits, …".
 */
export function describeRows({ wall, depth }: RoundStart): string {
  const rows: string[] = [];
  for (let row = 0; row < depth && rows.length < ROWS_READ; row++) {
    const bricks = Array.from({ length: COLUMNS }, (_, column) =>
      brickAt(wall, depth, column, row),
    );
    if (bricks.some((brick) => brick !== null)) {
      rows.push(`Row ${String(row)}: ${bricks.map(brickWords).join(", ")}.`);
    }
  }
  return rows.length > 0 ? rows.join(" ") : "No bricks in the field.";
}

/**
 * Returns what is said as a level is cleared, the last among them: the
 * rounds it took against its par, the stars they earned, and the score.
 */
export function describeCleared(run: Run): string {
  return `Level ${String(run.level)} cleared in ${count(run.rounds, "round", "rounds")}, par ${String(run.par)}: ${count(starsOf(run), "star", "stars")}! Score ${formatPoints(run.score)}.`;
}

/** Returns what is said as a run pauses. */
export function describePause(run: Run): string {
  return `Paused, with a score of ${formatPoints(run.score)}. Press Enter to go on.`;
}

/** Returns what is said as a paused run goes on. */
export function describeResume(): string {
  return "Going on.";
}

/** Returns what is said as a run kept before the page was left is taken up: where it stands, paused. */
export function describeTakenUp(run: Run, entry: LevelEntry): string {
  const rounds =
    run.rounds === 0 ? "" : ` ${count(run.rounds, "round", "rounds")} in,`;
  return `Your last run is paused on level ${String(entry.number)}, ${entry.data.name},${rounds} with a score of ${formatPoints(run.score)}. Press Enter to go on.`;
}

/** Returns what an ended run is called, on its card and as the announcer says it ends. */
export function endTitle(run: Pick<Run, "outcome">): string {
  return run.outcome === "won" ? "Every level cleared!" : "Game over";
}

/** Returns what is said as a run ends: how, the score, the level reached, and whether it is a new best. */
export function describeEnd(run: Run, newBest: boolean): string {
  const best = newBest ? " A new best!" : "";
  return `${asSentence(endTitle(run))} Score ${formatPoints(run.score)}, at level ${String(run.level)}.${best}`;
}

/**
 * Returns what is said of the wall's step: how far it came, how far its
 * lowest brick the level needs stands from the floor, how many bricks it
 * needs stand under the jump line, and the danger once one stands in the
 * row over the floor's.
 */
function stepWords({ wall, depth }: RoundStart, rowsDown: number): string {
  const { jumpLine } = thirdsOf(depth);
  const lowest = fieldRowOf(wall, wall.bricks.findIndex(isNeeded));
  const toJump = neededBelow(wall, jumpLine);
  const words = `The wall came down ${count(rowsDown, "row", "rows")}: ${count(lowest, "row", "rows")} from the floor, ${count(toJump, "brick", "bricks")} to a jump.`;
  return lowest === 1
    ? `${words} Danger: the next step down loses the level.`
    : words;
}

/** Returns how many bricks a level needs stand in the field under a row. */
function neededBelow(wall: Wall, row: number): number {
  return wall.bricks.filter(
    (brick, cell) => isNeeded(brick) && fieldRowOf(wall, cell) < row,
  ).length;
}

/** Returns what R says of a cell: its brick's kind, with its hits left where it takes more than one, or a gap. */
function brickWords(brick: Brick | null): string {
  if (brick === null) return "gap";
  const name = brickKind(brick.kind).name.toLowerCase();
  return brick.full > 1 ? `${name}, ${count(brick.hits, "hit", "hits")}` : name;
}

/** Returns words as a sentence: ending in a full stop, unless they end in a mark of their own. */
function asSentence(words: string): string {
  return /[.!?]$/.test(words) ? words : `${words}.`;
}
