import { BehaviorSubject } from "rxjs";

/**
 * Observable, live game metrics that the UI displays.
 *
 * Each field is a BehaviorSubject so consumers can subscribe to changes.
 * Getter/setter pairs allow existing game logic (e.g. `state.score += 5`)
 * to work unchanged while automatically pushing values through the stream.
 */
export class GameState {
  /** The player's current score. */
  readonly score$ = new BehaviorSubject<number>(0);

  /** The total number of moves the player has made. */
  readonly moves$ = new BehaviorSubject<number>(0);

  /**
   * How many applied actions can still be taken back.
   *
   * Published so the UI can enable and disable an undo control without having
   * to reach into the game's history itself.
   */
  readonly undoDepth$ = new BehaviorSubject<number>(0);

  /** Current score value. */
  get score(): number {
    return this.score$.value;
  }
  set score(value: number) {
    if (value !== this.score$.value) {
      this.score$.next(value);
    }
  }

  /** Current moves value. */
  get moves(): number {
    return this.moves$.value;
  }
  set moves(value: number) {
    if (value !== this.moves$.value) {
      this.moves$.next(value);
    }
  }

  /** Current undo depth. */
  get undoDepth(): number {
    return this.undoDepth$.value;
  }
  set undoDepth(value: number) {
    if (value !== this.undoDepth$.value) {
      this.undoDepth$.next(value);
    }
  }
}
