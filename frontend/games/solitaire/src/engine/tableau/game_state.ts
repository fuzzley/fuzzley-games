import { EventEmitter } from "@/engine/core/common/event_emitter";

/** The live metrics a game publishes, as a caller reads them. */
export interface GameMetrics {
  /** The player's current score. */
  readonly score: number;
  /** The total number of moves the player has made. */
  readonly moves: number;
  /** How many applied actions can still be taken back. */
  readonly undoDepth: number;
}

/** The events {@link GameState} publishes. */
type GameStateEvents = {
  /** Emitted whenever any metric changes, carrying them all. */
  "metrics-changed": GameMetrics;
};

/**
 * Live game metrics that the application shell displays.
 *
 * Published with the engine's own {@link EventEmitter} rather than with a
 * reactive library. Every game inherits this through its base class, so a
 * `BehaviorSubject` here put rxjs into the dependencies of all fourteen of them
 * — the very thing `src/games/**` is forbidden from importing directly.
 *
 * The getter/setter pairs are what let game logic keep writing `state.score +=
 * 5`, and each setter publishes only on a real change, so a move that scores
 * nothing does not wake the shell.
 */
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

  /**
   * How many applied actions can still be taken back.
   *
   * Published so the UI can enable and disable an undo control without having
   * to reach into the game's history itself.
   */
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
   * Follows the metrics, and reports them once immediately.
   *
   * The immediate call is what a `BehaviorSubject` gave for free and what a
   * subscriber actually needs: a display bound to a game already in progress
   * should show its score, not zero until the next move.
   *
   * @param listener Told the metrics now and on every later change.
   * @returns Unsubscribes the listener.
   */
  onChange(listener: (metrics: GameMetrics) => void): () => void {
    const unsubscribe = this.on("metrics-changed", listener);
    listener(this.snapshot());
    return unsubscribe;
  }

  /** The metrics as they stand. */
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
