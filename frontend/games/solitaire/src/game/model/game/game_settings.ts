import { BehaviorSubject } from "rxjs";

/** The visual style applied to the back of cards. */
export type CardBackStyle = "card-back-blue" | "card-back-red";

/** How many cards are drawn from the stock pile per draw action. */
export type DrawCount = 1 | 3;

/**
 * Observable, user-configurable game settings.
 *
 * Each field is a BehaviorSubject so consumers can subscribe to individual
 * setting changes. Convenience getters provide synchronous access to the
 * current value.
 */
export class GameSettings {
  /** How many cards to draw from the stock pile at a time. */
  readonly drawCount$ = new BehaviorSubject<DrawCount>(3);

  /** The visual style used for face-down card backs. */
  readonly cardBackStyle$ = new BehaviorSubject<CardBackStyle>(
    "card-back-blue",
  );

  /** Current draw count value. */
  get drawCount(): DrawCount {
    return this.drawCount$.value;
  }

  /** Current card back style value. */
  get cardBackStyle(): CardBackStyle {
    return this.cardBackStyle$.value;
  }
}
