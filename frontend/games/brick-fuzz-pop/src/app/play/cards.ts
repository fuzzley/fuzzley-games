import type { Signal } from "@angular/core";
import { kindIntroducedAt } from "../../rules/catalog/bricks";
import type { LevelEntry } from "../../rules/levels/levels";
import type { RoundStart } from "../../rules/round/round";
import type { Run } from "../../rules/run/run";
import { tallyOf } from "../../rules/run/scoring";
import type { Boon } from "../../rules/shot";
import type { Card } from "../../view/run_state";
import type { BoardCard } from "../board/board_card.component";

/** Describes what of the game the board's card reads. */
export interface CardedGame {
  readonly run: Signal<Run>;
  readonly ended: Signal<boolean>;
  readonly resultClosed: Signal<boolean>;
  readonly card: Signal<Card | null>;
  readonly level: Signal<LevelEntry>;
  readonly levelBoon: Signal<Boon>;
  readonly nextStart: Signal<RoundStart>;
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
    return {
      kind: "cleared",
      level: run.level,
      rounds: run.rounds,
      par: run.par,
      tally: tallyOf(run),
      score: run.score,
      friends: game.nextStart().crew.friends,
    };
  }
  switch (run.outcome) {
    case "ready":
      return {
        kind: "ready",
        level: run.level,
        name: game.level().data.name,
        boon: game.levelBoon(),
        newKind: kindIntroducedAt(run.level),
      };
    case "paused":
      return { kind: "paused", score: game.score() };
    default:
      return null;
  }
}
