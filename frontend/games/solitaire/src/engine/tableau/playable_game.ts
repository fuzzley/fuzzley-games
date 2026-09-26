import { GameSnapshot } from "./game_snapshot";
import { GameMetrics } from "./game_state";

/** Names the lifecycle events every playable game publishes. */
export type PlayableGameEvent = "game-won" | "game-reset";

/** Exposes the live metrics a shell may read and follow, but not write. */
export interface ReadableGameState extends GameMetrics {
  /** Follows the metrics, reporting them once immediately. */
  onChange(listener: (metrics: GameMetrics) => void): () => void;
}

/** Gives an application shell what it needs to run a session of any game. */
export interface PlayableGame {
  /** Live metrics: score, moves and undo depth. */
  readonly state: ReadableGameState;

  /** Deals a fresh game. */
  startNewGame(): void;

  /** Deals the same game again from the start. */
  restartGame(): void;

  /** Takes back the most recent action, returning whether there was one. */
  undo(): boolean;

  /** Captures the game so it can be restored. */
  snapshot(): GameSnapshot;

  /** Puts the game back as a snapshot describes it. */
  restore(snapshot: GameSnapshot): void;

  /** Subscribes to a lifecycle event. */
  on(event: PlayableGameEvent, listener: () => void): void;

  /** Unsubscribes from a lifecycle event. */
  off(event: PlayableGameEvent, listener: () => void): void;
}
