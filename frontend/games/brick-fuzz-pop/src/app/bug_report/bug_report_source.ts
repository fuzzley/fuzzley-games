import { Injectable, type Provider, inject } from "@angular/core";
import {
  BUG_REPORT_SOURCE,
  type BugReportSource,
  type ReportState,
} from "@fz/game-ui/bug_report";
import {
  TUNED_NUMBERS,
  TUNING_SLIDERS,
  formatTuning,
} from "../../view/debug/debug_tuning";
import { DebugService } from "../debug/debug.service";
import { GameService } from "../play/game.service";
import {
  type Aiming,
  type FlightSpeed,
  SettingsService,
} from "../settings/settings.service";
import { GAME_LEVELS, PLAY_ROUND } from "../tokens";
import { loadReport } from "./load_report";
import { REPORT_TAG, reportStateOf } from "./report_state";

/** Each way a pointer may aim, as the settings drawer names it. */
const AIMING_NAMES: Readonly<Record<Aiming, string>> = {
  pointAndHold: "Point and hold",
  pullBack: "Pull back",
};

/** Each of the flight's speeds, as the settings drawer names it. */
const SPEED_NAMES: Readonly<Record<FlightSpeed, string>> = {
  normal: "Normal",
  fast: "Fast",
};

/** Returns a setting that is on or off, as the report lists it. */
function onOrOff(name: string, on: boolean): string {
  return `${name}: ${on ? "On" : "Off"}`;
}

/**
 * Says what Brick Fuzz Pop puts in a bug report: its name, the level in
 * play, its settings and what the debug menu has set, and its state, from
 * the game itself; and takes a reported state back into play.
 */
@Injectable({ providedIn: "root" })
export class BrickFuzzPopReports implements BugReportSource {
  private readonly playing = inject(GameService);
  private readonly store = inject(SettingsService);
  private readonly debug = inject(DebugService);
  private readonly levels = inject(GAME_LEVELS);
  private readonly playRound = inject(PLAY_ROUND);

  readonly title = "Brick Fuzz Pop";

  readonly tag = REPORT_TAG;

  /** Describes the game in play: "Brick Fuzz Pop · Level 9: Rocket". */
  game(): string {
    const { number, data } = this.playing.level();
    return `${this.title} · Level ${String(number)}: ${data.name}`;
  }

  /**
   * Returns the settings as the drawer and the bar word them, then what the
   * debug menu has moved, as its controls name it.
   */
  settings(): readonly string[] {
    const settings = this.store.settings();
    const depth = this.debug.depth();
    const tuned = this.debug.tuning.tuning();
    return [
      `Aiming: ${AIMING_NAMES[settings.aiming]}`,
      `Shot speed: ${SPEED_NAMES[settings.flightSpeed]}`,
      onOrOff("Speed up long shots", settings.speedUpLongFlights),
      onOrOff("Show aim guide", settings.guide),
      onOrOff("Play sounds", settings.sound),
      onOrOff("Fast-forward", settings.fastForward),
      ...(depth === null
        ? []
        : [`The field's depth: ${String(depth)} rows (debug)`]),
      ...TUNING_SLIDERS.filter(({ id }) => tuned[id] !== TUNED_NUMBERS[id]).map(
        ({ id, name }) => `${name}: ${formatTuning(id, tuned[id])} (debug)`,
      ),
    ];
  }

  /** Takes the game's state at once, from the game itself. */
  capture(): ReportState {
    return reportStateOf(this.playing, this.levels);
  }

  /**
   * Puts a reported state in play, paused and off the record, asking first
   * where a run in progress would be lost; resolves to whether it did.
   *
   * @throws Error naming the part that doesn't fit this build.
   */
  load(state: unknown): Promise<boolean> {
    return loadReport(state, this.playing, this.levels, this.playRound);
  }
}

/** Returns the providers that hand the bug reports Brick Fuzz Pop's source, so the settings drawer offers Report a bug. */
export function provideBugReports(): Provider[] {
  return [{ provide: BUG_REPORT_SOURCE, useExisting: BrickFuzzPopReports }];
}
