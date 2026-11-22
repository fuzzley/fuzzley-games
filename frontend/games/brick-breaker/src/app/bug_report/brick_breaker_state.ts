import { isFiniteNumber, isRecord, unknownKey } from "@fz/core/json";
import type { ReportState } from "@fz/game-ui/bug_report";
import type { LevelEntry } from "../../rules/levels/levels";
import {
  type FieldMoment,
  type ReportedPlay,
  readMoment,
  untrustedPart,
} from "../../rules/run/report_state";
import {
  type SavedGame,
  type TakenUp,
  restoreGame,
} from "../../rules/run/saved_game";
import { BALL_SPEED_SLIDER } from "../settings/debug_tuning";

/**
 * The tag Brick Breaker's state is packed under. A change to the shape of
 * {@link BrickBreakerState}, or of the `SavedGame` and the `FieldMoment` it
 * holds, takes the next one, `bb2`.
 */
export const REPORT_TAG = "bb1";

/**
 * Holds Brick Breaker's state in a bug report: the run as the saved game
 * keeps it, the field's moment beyond it, and the ball's speed as the debug
 * menu tunes it, which outlives the field.
 */
export interface BrickBreakerState {
  /** The run and its level's field as the saved game keeps them, or null for a run that has ended. */
  readonly game: SavedGame | null;
  /** The field's moment, or null where the saved game keeps no field, or the link had no room for it. */
  readonly moment: FieldMoment | null;
  /** How fast the balls go against the speed's own (`GameService.ballSpeedScale`). */
  readonly ballSpeedScale: number;
}

/** Holds a reported state as read back: the run taken up under a new id, and what to lay on it. */
export interface ReadState {
  readonly takenUp: TakenUp;
  readonly moment: FieldMoment | null;
  readonly ballSpeedScale: number;
}

/** Every part of a state, so a reader names one it doesn't know. */
const PARTS: Readonly<Record<keyof BrickBreakerState, true>> = {
  game: true,
  moment: true,
  ballSpeedScale: true,
};

/** What a summary trimmed of the field's moment notes it keeps. */
export const TRIMMED_NOTE = "bricks only";

/**
 * Returns the state a report carries of the level in play, at the ball's
 * speed the debug menu tunes, which drops the field's moment where the link
 * has no room for it.
 */
export function reportState(
  play: ReportedPlay,
  ballSpeedScale: number,
): ReportState {
  const value: BrickBreakerState = {
    game: play.game,
    moment: play.moment,
    ballSpeedScale,
  };
  if (!play.moment) return { summary: play.summary, value };
  return {
    summary: play.summary,
    value,
    trim: {
      most: 1,
      at: () => ({ value: { ...value, moment: null }, note: TRIMMED_NOTE }),
    },
  };
}

/**
 * Returns a state from a bug report as read back, its run taken up under a
 * new id, paused, as the saved game takes one up.
 *
 * @throws Error saying the reported run was over, or naming the first part
 *   that doesn't fit this build: the game as `restoreGame()` refuses it, a
 *   moment `readMoment()` refuses, one with no field kept to lay it on, or
 *   a ball's speed outside the debug menu's range, or the moment's at
 *   another.
 */
export function readBrickBreakerState(
  value: unknown,
  levels: readonly LevelEntry[],
  id: number,
): ReadState {
  if (!isRecord(value)) {
    throw new Error("The game state doesn't fit this build.");
  }
  const unknown = unknownKey(value, PARTS);
  if (unknown !== null) throw untrustedPart(unknown);
  const { game, moment, ballSpeedScale } = value;
  if (game === null) {
    throw new Error(
      "This game was over when it was reported. There's nothing to load.",
    );
  }
  const takenUp = restoreGame(game, levels, id);
  if (!takenUp) throw untrustedPart("game");
  const laid = moment === null ? null : readMoment(moment);
  if (laid && !takenUp.field) throw untrustedPart("moment");
  if (
    !isFiniteNumber(ballSpeedScale) ||
    ballSpeedScale < BALL_SPEED_SLIDER.least ||
    ballSpeedScale > BALL_SPEED_SLIDER.most
  ) {
    throw untrustedPart("ballSpeedScale");
  }
  if (laid && laid.ballSpeedScale !== ballSpeedScale) {
    throw untrustedPart("moment.ballSpeedScale");
  }
  return { takenUp, moment: laid, ballSpeedScale };
}
