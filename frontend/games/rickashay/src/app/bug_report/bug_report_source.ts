import { Injectable, type Provider, inject } from "@angular/core";
import { WallReports } from "@fz/brick-wall/app/reported";
import type { PlayedGame } from "@fz/brick-wall/rules/reported";
import type { PointerAiming } from "@fz/brick-wall/view/aim_settings";
import { count } from "@fz/core/format";
import { BUG_REPORT_SOURCE } from "@fz/game-ui/bug_report";
import type { RoundStart } from "../../rules/flight/events";
import {
  type ReplayedGame,
  readReportedGame,
  replayReported,
  reportedGameOf,
} from "../../rules/run/reported_game";
import type { LevelTally } from "../../rules/run/scoring";
import type { Shot } from "../../rules/shot";
import type { FlightRules } from "../../rules/tuning";
import type { FlightSpeed } from "../../view/play/pace";
import { DebugService } from "../debug/debug.service";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { GAME_LEVELS, GAME_MARKS, PLAY_ROUND } from "../tokens";

/** The tag Rickashay's reported states are packed under, `rk` and the version of their shape. */
export const REPORT_TAG = "rk1";

/** The game as the round's driver reports it, each round as it was released. */
type DrivenGame = PlayedGame<LevelTally, RoundStart, Shot, FlightRules>;

/** Each way a pointer may aim, as Brick Fuzz Pop's settings and report name it. */
const AIMING_NAMES: Readonly<Record<PointerAiming, string>> = {
  pointAndHold: "Point and hold",
  pullBack: "Pull back",
};

/** Each of the flight's speeds, as Brick Fuzz Pop's settings and report name it. */
const SPEED_NAMES: Readonly<Record<FlightSpeed, string>> = {
  normal: "Normal",
  fast: "Fast",
};

/** Returns a setting that is on or off, as the report lists it. */
function onOrOff(name: string, on: boolean): string {
  return `${name}: ${on ? "On" : "Off"}`;
}

/**
 * Says what Rickashay puts in a bug report, as every wall game's reports
 * do, with its settings and the depth the debug menu has set: its state
 * kept as `rules/run/reported_game` keeps it, and read back by the levels'
 * marks and played again through the round player.
 */
@Injectable({ providedIn: "root" })
export class RickashayReports extends WallReports<DrivenGame, ReplayedGame> {
  private readonly store = inject(SettingsService);
  private readonly debug = inject(DebugService);

  constructor() {
    const levels = inject(GAME_LEVELS);
    const marks = inject(GAME_MARKS);
    const play = inject(PLAY_ROUND);
    super({
      title: "Rickashay",
      tag: REPORT_TAG,
      driver: inject(GameService),
      menu: inject(DebugService),
      // Rickashay has no Drop: its driver flies every round whole.
      keep: (played) =>
        reportedGameOf(
          {
            ...played,
            rounds: played.rounds.map((round) => ({ ...round, dropped: null })),
          },
          levels,
        ),
      replay: (state, id) =>
        replayReported(readReportedGame(state, levels, id, marks), play),
    });
  }

  /**
   * Returns the settings the game plays by, named as Brick Fuzz Pop's
   * report names those the two games share, then the depth the debug menu
   * has set, if it has.
   */
  settings(): readonly string[] {
    const settings = this.store.settings();
    const depth = this.debug.depth();
    return [
      `Aiming: ${AIMING_NAMES[settings.aiming]}`,
      onOrOff("Release with a button", settings.releaseByButton),
      `Aim guide: ${count(settings.guideTurns, "turn", "turns")}`,
      `Shot speed: ${SPEED_NAMES[settings.flightSpeed]}`,
      onOrOff("Play sounds", settings.sound),
      onOrOff("Fast-forward", settings.fastForward),
      ...(depth === null
        ? []
        : [`The field's depth: ${String(depth)} rows (debug)`]),
    ];
  }
}

/**
 * Returns the providers that hand the bug reports Rickashay's source, so the
 * settings drawer offers Report a bug.
 */
export function provideBugReports(): Provider[] {
  return [{ provide: BUG_REPORT_SOURCE, useExisting: RickashayReports }];
}
