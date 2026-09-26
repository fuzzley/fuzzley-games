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

/** Maps each event {@link GameState} publishes to its payload. */
type GameStateEvents = {
  /** Emitted whenever any metric changes, carrying them all. */
  "metrics-changed": GameMetrics;
};

/** Publishes the live game metrics the application shell displays. */
export class GameState extends EventEmitter<GameStateEvents> {
  private scoreValue = 0;
  private movesValue = 0;
  private undoDepthValue = 0;

  /** The player's current score. */
  get score(): number {
    return this.scoreValue;
  }
  set score(value: number) {
    if (value !== this.scoreValue) {
      this.scoreValue = value;
      this.publish();
    }
  }

  /** The total number of moves the player has made. */
  get moves(): number {
    return this.movesValue;
  }
  set moves(value: number) {
    if (value !== this.movesValue) {
      this.movesValue = value;
      this.publish();
    }
  }

  /** How many applied actions can still be taken back. */
  get undoDepth(): number {
    return this.undoDepthValue;
  }
  set undoDepth(value: number) {
    if (value !== this.undoDepthValue) {
      this.undoDepthValue = value;
      this.publish();
    }
  }

  /**
   * Follows the metrics, reporting them once immediately, and returns a
   * function that stops following them.
   */
  onChange(listener: (metrics: GameMetrics) => void): () => void {
    const unsubscribe = this.on("metrics-changed", listener);
    listener(this.snapshot());
    return unsubscribe;
  }

  /** Returns the metrics as they stand. */
  snapshot(): GameMetrics {
    return {
      score: this.scoreValue,
      moves: this.movesValue,
      undoDepth: this.undoDepthValue,
    };
  }

  private publish(): void {
    this.emit("metrics-changed", this.snapshot());
  }
}
