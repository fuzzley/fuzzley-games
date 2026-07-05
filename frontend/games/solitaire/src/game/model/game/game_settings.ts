import { BehaviorSubject } from "rxjs";

/** The visual style applied to the back of cards. */
export type CardBackStyle = "card-back-blue" | "card-back-red";

/** How many cards are drawn from the stock pile per draw action. */
export type DrawCount = 1 | 3;

/** The default board background color (the emerald felt table). */
export const DEFAULT_BACKGROUND_COLOR = "#0f4d0e";

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

  /** The board background color, as a CSS/Phaser color string. */
  readonly backgroundColor$ = new BehaviorSubject<string>(
    DEFAULT_BACKGROUND_COLOR,
  );

  /** Current draw count value. */
  get drawCount(): DrawCount {
    return this.drawCount$.value;
  }

  /** Current card back style value. */
  get cardBackStyle(): CardBackStyle {
    return this.cardBackStyle$.value;
  }

  /** Current board background color. */
  get backgroundColor(): string {
    return this.backgroundColor$.value;
  }
}
