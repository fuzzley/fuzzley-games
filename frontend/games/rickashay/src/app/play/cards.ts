import type { Signal } from "@angular/core";
import type { LevelCard } from "@fz/brick-wall/view/rounds_played";
import { kindIntroducedAt } from "../../rules/catalog/kinds";
import type { LevelEntry } from "../../rules/levels/levels";
import type { Run } from "../../rules/run/run";
import { levelPoints } from "../../rules/run/scoring";
import { starCount, starsFor } from "../../rules/run/stars";
import type { BoardCard } from "../board/board_card.component";

/** Describes what of the game the board's card reads. */
export interface CardedGame {
  readonly run: Signal<Run>;
  readonly ended: Signal<boolean>;
  readonly resultClosed: Signal<boolean>;
  readonly card: Signal<LevelCard | null>;
  readonly level: Signal<LevelEntry>;
  /** The level in play's rally mark on the depth it began on. */
  readonly rallyMark: Signal<number>;
  /** The run's points as the bar shows them. */
  readonly score: Signal<number>;
}

/**
 * Returns the card the board shows over the field: Ready as a level waits
 * for its first shot, Paused, Cleared once its card is due, the run's end
 * once its result is put away, or null for none.
 */
export function boardCardOf(game: CardedGame): BoardCard | null {
  const run = game.run();
  if (game.ended() && game.resultClosed()) {
    return run.outcome === "won"
      ? { kind: "ended", outcome: "won", score: run.score }
      : {
          kind: "ended",
          outcome: "over",
          level: run.level,
          name: game.level().data.name,
          score: run.score,
        };
  }
  if (game.card() === "cleared") {
    const mark = game.rallyMark();
    const stars = starsFor({
      rounds: run.rounds,
      par: run.par,
      rally: run.tally.bestRally,
      mark,
    });
    return {
      kind: "cleared",
      level: run.level,
      rounds: run.rounds,
      par: run.par,
      mark,
      stars,
      bestRally: run.tally.bestRally,
      points: levelPoints(run, starCount(stars)),
      score: run.score,
    };
  }
  switch (run.outcome) {
    case "ready": {
      const { data } = game.level();
      return {
        kind: "ready",
        level: run.level,
        name: data.name,
        around: data.around,
        par: run.par,
        mark: game.rallyMark(),
        newKind: kindIntroducedAt(run.level),
      };
    }
    case "paused":
      return { kind: "paused", score: game.score() };
    default:
      return null;
  }
}
