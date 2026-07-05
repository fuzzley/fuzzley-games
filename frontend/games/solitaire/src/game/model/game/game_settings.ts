import { BehaviorSubject } from "rxjs";

/** The visual style applied to the back of cards. */
export type CardBackStyle = "card-back-blue" | "card-back-red";

/** How many cards are drawn from the stock pile per draw action. */
export type DrawCount = 1 | 3;

/** The default board background color (the emerald felt table). */
export const DEFAULT_BACKGROUND_COLOR = "#0f4d0e";

const LOCAL_STORAGE_KEY = "fsolitaire-settings";

interface PersistedSettings {
  drawCount?: DrawCount;
  cardBackStyle?: CardBackStyle;
  backgroundColor?: string;
}

/**
 * Observable, user-configurable game settings.
 *
 * Each field is a BehaviorSubject so consumers can subscribe to individual
 * setting changes. Convenience getters provide synchronous access to the
 * current value.
 */
export class GameSettings {
  /** How many cards to draw from the stock pile at a time. */
  readonly drawCount$: BehaviorSubject<DrawCount>;

  /** The visual style used for face-down card backs. */
  readonly cardBackStyle$: BehaviorSubject<CardBackStyle>;

  /** The board background color, as a CSS/Phaser color string. */
  readonly backgroundColor$: BehaviorSubject<string>;

  constructor() {
    let drawCount: DrawCount = 3;
    let cardBackStyle: CardBackStyle = "card-back-blue";
    let backgroundColor = DEFAULT_BACKGROUND_COLOR;

    if (typeof localStorage !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as PersistedSettings;
          if (parsed.drawCount === 1 || parsed.drawCount === 3) {
            drawCount = parsed.drawCount;
          }
          if (
            parsed.cardBackStyle === "card-back-blue" ||
            parsed.cardBackStyle === "card-back-red"
          ) {
            cardBackStyle = parsed.cardBackStyle;
          }
          if (parsed.backgroundColor) {
            backgroundColor = parsed.backgroundColor;
          }
        }
      } catch (e) {
        console.warn("Failed to load settings from localStorage:", e);
      }
    }

    this.drawCount$ = new BehaviorSubject<DrawCount>(drawCount);
    this.cardBackStyle$ = new BehaviorSubject<CardBackStyle>(cardBackStyle);
    this.backgroundColor$ = new BehaviorSubject<string>(backgroundColor);

    let initialized = false;
    this.drawCount$.subscribe(() => {
      if (initialized) this.saveToLocalStorage();
    });
    this.cardBackStyle$.subscribe(() => {
      if (initialized) this.saveToLocalStorage();
    });
    this.backgroundColor$.subscribe(() => {
      if (initialized) this.saveToLocalStorage();
    });
    initialized = true;
  }

  private saveToLocalStorage(): void {
    if (typeof localStorage !== "undefined") {
      try {
        const data: PersistedSettings = {
          drawCount: this.drawCount,
          cardBackStyle: this.cardBackStyle,
          backgroundColor: this.backgroundColor,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn("Failed to save settings to localStorage:", e);
      }
    }
  }

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
