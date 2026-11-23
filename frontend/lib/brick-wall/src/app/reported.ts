// A wall game's bug reports: its state taken at once from its round's
// driver, with a line that sums it up, shrinking to fit the report's link,
// and a state a report kept read back, played again and taken up, as
// `?debug` loads it. How a state is kept, read and played again is the
// game's own, over `rules/reported`.

import type { Signal } from "@angular/core";
import { count, formatPoints } from "@fz/core/format";
import type { BugReportSource, ReportState } from "@fz/game-ui/bug_report";
import type { ConfirmRequest } from "@fz/ui/confirm";
import {
  type ReplayedGame,
  type ReplayedRound,
  type ReportedGame,
  trimReported,
} from "../rules/reported";
import type { Run } from "../rules/run";
import type { FieldShape } from "../view/field_metrics";
import type { DrivenLevel, DrivenStart } from "./round_driver";

/**
 * What loading a reported game asks before it throws away a run under way,
 * as every game's loader asks it.
 */
const LOAD_QUESTION: ConfirmRequest = {
  title: "Load this game?",
  message: "You'll lose the game in progress.",
  confirmLabel: "Load",
  tone: "danger",
};

/** Describes a reported game read back and played again, as a wall game's reports take it up, whatever the game's own types. */
export type LoadedReport = ReplayedGame<
  unknown,
  DrivenStart,
  unknown,
  unknown,
  ReplayedRound<unknown, unknown>
>;

/**
 * Describes a wall game's round's driver as its bug reports read and move
 * it: the run and what the bar shows of it, whether the board is drawn,
 * the game as it stands, `P`, and a reported game taken up, `G`.
 */
export interface ReportedDriver<P, G> {
  readonly run: Signal<Run<unknown>>;
  readonly level: Signal<DrivenLevel>;
  /** The rounds the level in play has played, as the bar counts them. */
  readonly rounds: Signal<number>;
  /** The run's points so far, as the bar shows them. */
  readonly score: Signal<number>;
  readonly shape: Signal<FieldShape>;
  /** Whether a flight is under way, paused or not. */
  readonly flying: Signal<boolean>;
  readonly drawn: Signal<boolean>;
  /** Resolves to whether to go ahead with what would lose the run in progress, asking a question first where one is. */
  askBeforeLosingRun(question: ConfirmRequest): Promise<boolean>;
  /** Returns the game as it stands, from the game itself. */
  report(): P;
  /** Takes up a reported game read back and played again, off the record and paused. */
  takeUpReplayed(replayed: G): void;
}

/** Describes a debug menu as a wall game's bug reports move it: the field's depth it sets over the room's. */
export interface ReportsMenu {
  setDepth(depth: number): void;
}

/**
 * Holds what a wall game's bug reports are handed: its name and the tag
 * its states are packed under, its round's driver, its debug menu, and how
 * it keeps the game as it stands, `P`, as JSON, and reads a kept state back
 * and plays it again to a game to take up, `G`.
 */
export interface WallReporting<P, G extends LoadedReport> {
  /** The game's name, which a report's title starts with. */
  readonly title: string;
  /** The tag its states are packed under, which changes as their shape does. */
  readonly tag: string;
  readonly driver: ReportedDriver<P, G>;
  readonly menu: ReportsMenu;
  /** Returns the game as a report keeps it, as JSON. */
  readonly keep: (played: P) => ReportedGame<unknown, unknown>;
  /**
   * Returns a state a report kept read back, its runs under a new id, and
   * its level's shots played again, or throws naming the part this build
   * can't trust.
   */
  readonly replay: (state: unknown, id: number) => G;
}

/**
 * Says what a wall game puts in a bug report, and takes a reported state
 * back into play: the game's name and the level in play, its state taken
 * at once from its round's driver, never storage, with a line that sums it
 * up, shrinking to fit the report's link by the level's shots, then the
 * round in play; and a state read back, played again and taken up, paused
 * and off the record, on the depth its round starts on.
 *
 * A game's report source extends it, handing it its `WallReporting` as it
 * is made, and listing its settings.
 */
export abstract class WallReports<
  P,
  G extends LoadedReport,
> implements BugReportSource {
  readonly title: string;
  readonly tag: string;

  protected constructor(private readonly reporting: WallReporting<P, G>) {
    this.title = reporting.title;
    this.tag = reporting.tag;
  }

  /** Returns the game's settings for the report's Environment list. */
  abstract settings(): readonly string[];

  /** Describes the game in play, by its name and its level: "<title> · Level 9: Rocket". */
  game(): string {
    const { driver } = this.reporting;
    return `${this.title} · Level ${String(driver.run().level)}: ${driver.level().data.name}`;
  }

  /** Takes the game's state at once, from the game itself. */
  capture(): ReportState {
    const { driver, keep } = this.reporting;
    const value = keep(driver.report());
    const trim = trimReported(value);
    return {
      summary: summaryOf(driver),
      value,
      ...(trim === undefined ? {} : { trim }),
    };
  }

  /**
   * Puts a reported state in play: reads it and plays its level's shots
   * again, then, asking first where a run in progress would be lost, sets
   * the debug menu's depth to the one its round starts on and has the
   * driver take it up, paused and off the record; resolves to whether it
   * did.
   *
   * @throws Error naming the part that doesn't fit this build, or where a
   *   round is in play and the board isn't drawn yet, which can't fly it,
   *   before anything is asked.
   */
  async load(state: unknown): Promise<boolean> {
    const { driver, menu, replay } = this.reporting;
    const replayed = replay(state, driver.run().id + 1);
    if (replayed.round !== null && !driver.drawn()) {
      throw new Error("The board isn't drawn yet. Try again once it shows.");
    }
    if (!(await driver.askBeforeLosingRun(LOAD_QUESTION))) return false;
    menu.setDepth(replayed.game.start.depth);
    driver.takeUpReplayed(replayed);
    return true;
  }
}

/**
 * Returns a report's line that sums the game up, as the bar and the board
 * show it: "Level 9 · 3 shots · Score 950 · 14 rows · shot in the air".
 */
function summaryOf(driver: ReportedDriver<unknown, unknown>): string {
  const stage = stageOf(driver);
  return [
    `Level ${String(driver.run().level)}`,
    count(driver.rounds(), "shot", "shots"),
    `Score ${formatPoints(driver.score())}`,
    `${String(driver.shape().depth)} rows`,
    ...(stage === null ? [] : [stage]),
  ].join(" · ");
}

/** Returns where the level stands, for the summary, where it isn't simply aiming. */
function stageOf(driver: ReportedDriver<unknown, unknown>): string | null {
  if (driver.flying()) return "shot in the air";
  switch (driver.run().outcome) {
    case "cleared":
      return "level cleared";
    case "won":
      return "every level cleared";
    case "over":
      return "game over";
    default:
      return null;
  }
}
