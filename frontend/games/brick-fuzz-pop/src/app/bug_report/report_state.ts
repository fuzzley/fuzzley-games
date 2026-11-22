import { count, formatPoints } from "@fz/core/format";
import type { ReportState } from "@fz/game-ui/bug_report";
import type { LevelEntry } from "../../rules/levels/levels";
import { reportedGameOf, trimReported } from "../../rules/run/reported_game";
import type { GameService } from "../play/game.service";

/** The tag Brick Fuzz Pop's reported states are packed under, `bp` and the version of their shape. */
export const REPORT_TAG = "bp1";

/**
 * Returns the game's state for a bug report, at once, from the game itself,
 * never storage: what the field shows, as JSON (`ReportedGame`), with a
 * summary line, shrinking to fit the report's link by the level's shots,
 * then the shot in the air.
 */
export function reportStateOf(
  game: GameService,
  levels: readonly LevelEntry[],
): ReportState {
  const value = reportedGameOf(game.report(), levels);
  const trim = trimReported(value);
  return {
    summary: summaryOf(game),
    value,
    ...(trim === undefined ? {} : { trim }),
  };
}

/**
 * Returns a report's summary line, as the bar and the board show the game:
 * "Level 9 · 3 shots · Score 950 · 14 rows · shot in the air".
 */
export function summaryOf(game: GameService): string {
  const stage = stageOf(game);
  return [
    `Level ${String(game.run().level)}`,
    count(game.rounds(), "shot", "shots"),
    `Score ${formatPoints(game.score())}`,
    `${String(game.shape().depth)} rows`,
    ...(stage === null ? [] : [stage]),
  ].join(" · ");
}

/** Returns where the level stands, for the summary, where it isn't simply aiming. */
function stageOf(game: GameService): string | null {
  if (game.flying()) return "shot in the air";
  switch (game.outcome()) {
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
