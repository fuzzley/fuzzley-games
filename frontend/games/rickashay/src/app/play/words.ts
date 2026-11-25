import type { Signal } from "@angular/core";
import type { RoundWords } from "@fz/brick-wall/app/round_driver";
import { levelAt, levelIdOf } from "@fz/brick-wall/rules/progress";
import type { Round, RoundStart } from "../../rules/flight/events";
import type { LevelEntry } from "../../rules/levels/levels";
import {
  CALL_WORDS,
  describeCleared,
  describeDanger,
  describeEarned,
  describeEnd,
  describeJump,
  describeLevel,
  describePause,
  describeResume,
  describeRound,
  describeTakenUp,
} from "../../rules/run/describe";
import type { Run } from "../../rules/run/run";
import type { LevelTally } from "../../rules/run/scoring";
import { type Marks, rallyMarkOf, starsEarned } from "../../rules/run/stars";
import type { FlightRules } from "../../rules/tuning";
import type { FlightNews } from "./played_rounds";

/**
 * Says what Rickashay says as its run goes, each moment's words the rules'
 * own, as the round's driver asks for them: a round's end with the wall's
 * jump and the danger after it, a level begun with its par and its rally
 * mark, a level cleared with its stars, the run's end, a pause, going on,
 * and a run taken up.
 *
 * It holds what a frame's flight came to beside them, a floor bounce
 * earned or the call at the rally mark ({@link hold}), which the round's
 * end says first where the same frame ends the round, and the game says
 * on its own after the frame otherwise ({@link takeHeld}), so neither
 * says over the other.
 *
 * A level's par and rally mark are those of the depth its run lays it out
 * on, so the game hands it the run on the board ({@link follow}) as soon as
 * it is made, before any level begins.
 */
export class RunWords implements RoundWords<
  LevelTally,
  LevelEntry,
  RoundStart,
  Round
> {
  /** The run on the board, once the game hands it. */
  private onBoard: Signal<Run> | null = null;
  /** What the frames' flights came to that is not said yet, in order. */
  private readonly held: string[] = [];

  constructor(
    private readonly levels: readonly LevelEntry[],
    private readonly marks: Marks,
    /** The rules the rounds are flown on, which say how many floor bounces a fuzzball holds. */
    private readonly rules: Pick<FlightRules, "mostBounces">,
  ) {}

  /** Takes the run on the board, which a level begun is said on. */
  follow(run: Signal<Run>): void {
    this.onBoard = run;
  }

  /**
   * Holds what a frame's flight came to, in order: "Rally 10: a floor
   * bounce." for each floor bounce earned, and "Rickashay!" as it reached
   * the level's rally mark.
   */
  hold(news: readonly FlightNews[]): void {
    for (const each of news) {
      this.held.push(
        each.kind === "called" ? CALL_WORDS : describeEarned(each, this.rules),
      );
    }
  }

  /** Returns what is held and not yet said, and lets go of it; or null where nothing is. */
  takeHeld(): string | null {
    if (this.held.length === 0) return null;
    return this.held.splice(0).join(" ");
  }

  /**
   * Returns what is said as a round's wall comes to rest: what its flight
   * came to that is held still, then the round's end, of the round aimed
   * next while the level goes on, else of the wall it left; then the
   * wall's jump, and the danger once the round aimed has a brick the level
   * needs over the floor's row.
   */
  round({ outcome, next }: Round, aimed: RoundStart): string {
    const after = outcome.result === "on" ? aimed : next;
    return [
      ...this.held.splice(0),
      describeRound(outcome, after),
      describeJump(outcome),
      describeDanger(outcome, after),
    ]
      .filter((words) => words !== null)
      .join(" ");
  }

  /**
   * Returns what is said as a level begins: its number, its name, and its
   * par and rally mark on the depth the run on the board lays it out on.
   *
   * @throws Error before the game has handed it the run on the board.
   */
  level(level: LevelEntry): string {
    if (this.onBoard === null) {
      throw new Error("No run is on the board to say a level of.");
    }
    const { par, depth } = this.onBoard();
    const mark = rallyMarkOf(level.data.id, depth, this.marks);
    return describeLevel(level, par, mark);
  }

  /** Returns what is said as a level is cleared: its shots, the stars it earned by name, and the score, which the last level's words leave to the run's end. */
  cleared(run: Run): string {
    const { levels, marks } = this;
    const mark = rallyMarkOf(levelIdOf(levels, run.level), run.depth, marks);
    return describeCleared(run, starsEarned(run, levels, marks), mark);
  }

  /** Returns what is said as a run ends: how, where a lost one was lost, its score, and a new best. */
  end(run: Run, newBest: boolean): string {
    return describeEnd(run, levelAt(this.levels, run.level), newBest);
  }

  /** Returns what is said as a run pauses. */
  pause(run: Run): string {
    return describePause(run);
  }

  /** Returns what is said as a paused run goes on. */
  resume(): string {
    return describeResume();
  }

  /** Returns what is said as a run storage kept is taken up, paused. */
  takenUp(run: Run, level: LevelEntry): string {
    return describeTakenUp(run, level);
  }
}
