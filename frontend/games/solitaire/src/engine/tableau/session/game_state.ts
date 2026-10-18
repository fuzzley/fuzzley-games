import { EventEmitter } from "@/engine/core/common/event_emitter";

/** Holds the live metrics a game publishes. */
export interface GameMetrics {
  /** The player's current score. */
  readonly score: number;
  /** The total number of moves the player has made. */
  readonly moves: number;
  /** How many applied actions can still be taken back. */
  readonly undoDepth: number;
}

/** Exposes the live metrics a shell may read and follow, but not write. */
export interface ReadableGameState extends GameMetrics {
  /**
   * Follows the metrics, reporting them once immediately, and returns a
   * function that stops following them.
   */
  onChange(listener: (metrics: GameMetrics) => void): () => void;

  /** Returns the metrics as they stand. */
  snapshot(): GameMetrics;
}

/** Maps each event {@link GameState} publishes to its payload. */
type GameStateEvents = {
  /** Emitted whenever any metric changes, carrying them all. */
  "metrics-changed": GameMetrics;
};

/** Publishes the live game metrics the application shell displays. */
export class GameState
  extends EventEmitter<GameStateEvents>
  implements ReadableGameState
{
  private current: GameMetrics = { score: 0, moves: 0, undoDepth: 0 };

  /** The player's current score. */
  get score(): number {
    return this.current.score;
  }

  /** The total number of moves the player has made. */
  get moves(): number {
    return this.current.moves;
  }

  /** How many applied actions can still be taken back. */
  get undoDepth(): number {
    return this.current.undoDepth;
  }

  /**
   * Changes any of the metrics, and announces them once if any changed.
   *
   * One call per action, so a follower hears a move once, with every metric
   * already in step, rather than once per field.
   */
  update(changes: Partial<GameMetrics>): void {
    const next = { ...this.current, ...changes };
    if (
      next.score === this.current.score &&
      next.moves === this.current.moves &&
      next.undoDepth === this.current.undoDepth
    ) {
      return;
    }
    this.current = next;
    this.emit("metrics-changed", this.snapshot());
  }

  /** @inheritDoc */
  onChange(listener: (metrics: GameMetrics) => void): () => void {
    const unsubscribe = this.on("metrics-changed", listener);
    listener(this.snapshot());
    return unsubscribe;
  }

  /** @inheritDoc */
  snapshot(): GameMetrics {
    return { ...this.current };
  }
}
