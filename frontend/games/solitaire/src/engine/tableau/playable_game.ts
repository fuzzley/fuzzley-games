import { GameMetrics } from "./game_state";

/** The lifecycle events every playable game publishes. */
export type PlayableGameEvent = "game-won" | "game-reset";

/**
 * The live metrics a shell may read and follow, but not write.
 *
 * A game's own {@link GameState} satisfies this. Narrowing it here is what
 * stops a consumer from assigning `game.state.score = 999`: the score is the
 * game's to keep, and a display only ever reads it.
 */
export interface ReadableGameState extends GameMetrics {
  /** Follows the metrics, reporting them once immediately. */
  onChange(listener: (metrics: GameMetrics) => void): () => void;
}

/**
 * What an application shell needs from a game to run a session of it: live
 * metrics, the lifecycle actions, and the two events worth reacting to.
 *
 * Narrow on purpose, and free of anything particular. A header showing a score
 * and a move count, a stopwatch that starts on the first move, an undo button
 * and a victory overlay are the same in Klondike, FreeCell and Spider — so the
 * shell is written against this rather than against any of them.
 */
export interface PlayableGame {
  /** Live metrics: score, moves, undo depth. Read-only from out here. */
  readonly state: ReadableGameState;

  /** Deals a fresh game. */
  startNewGame(): void;

  /** Deals the same game again from the start. */
  restartGame(): void;

  /** Takes back the most recent action. */
  undo(): boolean;

  /** Subscribes to a lifecycle event. */
  on(event: PlayableGameEvent, listener: () => void): void;

  /** Unsubscribes from a lifecycle event. */
  off(event: PlayableGameEvent, listener: () => void): void;
}
