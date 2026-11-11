import {
  Injectable,
  InjectionToken,
  type Signal,
  computed,
  inject,
} from "@angular/core";
import type { RunStage } from "@fz/core/run";
import { keepSaved } from "@fz/ui/storage";
import type { RoundStart } from "../../rules/round/round";
import type { Run } from "../../rules/run/run";
import {
  SAVED_GAME_VERSION,
  type TakenUp,
  restoreGame,
  saveGame,
} from "../../rules/run/saved_game";
import { GAME_LEVELS } from "../tokens";

/** Where the run under way is kept. Renaming it loses every player's. */
const SAVED_GAME_KEY = "brick-fuzz-pop-game";

/**
 * Describes what of the game the saved game reads, and how it hands a kept
 * run back: `GameService`'s, which provides it as {@link KEPT_GAME}.
 */
export interface KeptGame {
  /** The run in play. */
  readonly run: Signal<Run>;
  /**
   * Where the level's next round starts: the round in flight's `next`
   * while one flies, so a round is kept as it is released, else the start
   * waiting to be aimed from. Set it in the same turn as `run`, as the
   * round is released, or the round is kept with the start before it,
   * which storage can't trust, and the run is lost.
   */
  readonly nextStart: Signal<RoundStart>;
  /** Whether the run was played off the record, as the debug menu says, so it keeps no records. */
  readonly tuned: Signal<boolean>;
  /** The run's stage, `RunLifecycle`'s, which changes as it pauses, goes on, clears a level or ends. */
  readonly outcome: Signal<RunStage>;
  /** How many runs the game has begun, `RunLifecycle`'s, which changes as a new one starts. */
  readonly runs: Signal<number>;
  /** Takes up a run storage kept, paused, with where its next round starts. */
  takeUp(takenUp: TakenUp): void;
}

/** The game the saved game keeps: `GameService`, through `useExisting`. */
export const KEPT_GAME = new InjectionToken<KeptGame>("KEPT_GAME");

/**
 * Keeps the run under way, and takes it up again, paused, when the page
 * loads, so a reload, even mid-flight, or a phone dropping the tab loses
 * little.
 *
 * It writes as a round is released, as the run changes course and as a new
 * one begins, and as the page is hidden or goes away, never at a frame; a
 * page reloaded mid-flight comes back after the round, as `saveGame()`
 * keeps the run as it stands once the round lands. Something must inject
 * it at startup for the run to be taken up.
 */
@Injectable({ providedIn: "root" })
export class SavedGameService {
  private readonly game = inject(KEPT_GAME);
  private readonly levels = inject(GAME_LEVELS);
  /** The level in play's rounds, from the run, which change as a round is released. */
  private readonly rounds = computed(() => this.game.run().rounds);

  constructor() {
    keepSaved({
      key: SAVED_GAME_KEY,
      version: SAVED_GAME_VERSION,
      save: () =>
        saveGame(this.game.run(), this.game.nextStart(), this.levels, {
          tuned: this.game.tuned(),
        }),
      restore: (saved) => {
        const takenUp = restoreGame(saved, this.levels, this.game.run().id + 1);
        if (takenUp) this.game.takeUp(takenUp);
      },
      track: () => {
        this.rounds();
        this.game.outcome();
        this.game.runs();
      },
    });
  }
}
