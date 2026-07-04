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

  /** Current score value. */
  get score(): number {
    return this.score$.value;
  }
  set score(value: number) {
    this.score$.next(value);
  }

  /** Current moves value. */
  get moves(): number {
    return this.moves$.value;
  }
  set moves(value: number) {
    this.moves$.next(value);
  }
}
