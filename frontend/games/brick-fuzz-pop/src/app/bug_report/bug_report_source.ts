import { Injectable, type Provider, inject } from "@angular/core";
import { WallReports } from "@fz/brick-wall/app/reported";
import { BUG_REPORT_SOURCE } from "@fz/game-ui/bug_report";
import {
  type PlayedGame,
  type ReplayedGame,
  readReportedGame,
  replayReported,
  reportedGameOf,
} from "../../rules/run/reported_game";
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

/** The tag Brick Fuzz Pop's reported states are packed under, `bp` and the version of their shape. */
export const REPORT_TAG = "bp1";

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
 * Says what Brick Fuzz Pop puts in a bug report, as every wall game's
 * reports do, with its settings and what the debug menu has set: its state
 * kept as `rules/run/reported_game` keeps it, and read back and played
 * again through the round player.
 */
@Injectable({ providedIn: "root" })
export class BrickFuzzPopReports extends WallReports<PlayedGame, ReplayedGame> {
  private readonly store = inject(SettingsService);
  private readonly debug = inject(DebugService);

  constructor() {
    const levels = inject(GAME_LEVELS);
    const play = inject(PLAY_ROUND);
    super({
      title: "Brick Fuzz Pop",
      tag: REPORT_TAG,
      driver: inject(GameService),
      menu: inject(DebugService),
      keep: (played) => reportedGameOf(played, levels),
      replay: (state, id) =>
        replayReported(readReportedGame(state, levels, id), levels, play),
    });
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
}

/** Returns the providers that hand the bug reports Brick Fuzz Pop's source, so the settings drawer offers Report a bug. */
export function provideBugReports(): Provider[] {
  return [{ provide: BUG_REPORT_SOURCE, useExisting: BrickFuzzPopReports }];
}
