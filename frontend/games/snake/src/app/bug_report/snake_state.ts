import { isRecord } from "@fz/core/json";
import { isKeyOf } from "@fz/core/records";
import type { ChoiceOption } from "@fz/ui/radio_group";
import {
  type ReportedRun,
  readReportedRun,
  untrustedPart,
} from "../../rules/reported_run";
import type { Run } from "../../rules/run";
import { isSpeed } from "../../rules/speed";
import type { EndStage, ResultCard } from "../play/game.service";
import { ARROWS, MOVEMENTS } from "../settings/settings.component";
import type { Settings } from "../settings/settings.service";

/**
 * Holds Snake's state in a bug report: the run, an ended one too, what the
 * board shows of it, and the settings.
 */
export interface SnakeState {
  readonly run: ReportedRun;
  readonly stage: EndStage;
  readonly settings: Settings;
}

/** Holds a reported state as read back, its run under a new id, to take up. */
export interface ReadState {
  readonly run: Run;
  readonly stage: EndStage;
  readonly settings: Settings;
}

const CARDS: Readonly<Record<ResultCard, true>> = {
  coming: true,
  open: true,
  closed: true,
};

/**
 * Returns a state from a bug report as read back, its run under a new id.
 *
 * @throws Error naming the first part that doesn't fit this build.
 */
export function readSnakeState(value: unknown, id: number): ReadState {
  if (!isRecord(value)) {
    throw new Error("The game state doesn't fit this build.");
  }
  return {
    run: readReportedRun(value["run"], id),
    stage: readStage(value["stage"]),
    settings: readSettings(value["settings"]),
  };
}

/** Returns what a report says the board showed of its run. */
function readStage(value: unknown): EndStage {
  if (!isRecord(value)) throw untrustedPart("stage");
  const { newBest, card } = value;
  if (typeof newBest !== "boolean") throw untrustedPart("stage.newBest");
  if (!isKeyOf(card, CARDS)) throw untrustedPart("stage.card");
  return { newBest, card };
}

/** Returns a report's settings, each as the settings offer it. */
function readSettings(value: unknown): Settings {
  if (!isRecord(value)) throw untrustedPart("settings");
  const { speed, movement, arrows, sound } = value;
  if (!isSpeed(speed)) throw untrustedPart("settings.speed");
  if (!isOffered(movement, MOVEMENTS)) throw untrustedPart("settings.movement");
  if (!isOffered(arrows, ARROWS)) throw untrustedPart("settings.arrows");
  if (typeof sound !== "boolean") throw untrustedPart("settings.sound");
  return { speed, movement, arrows, sound };
}

/** Returns whether a value is the id of a choice the settings offer. */
function isOffered<T extends string>(
  value: unknown,
  options: readonly ChoiceOption<T>[],
): value is T {
  return options.some((option) => option.id === value);
}
