import { BehaviorSubject, merge } from "rxjs";

/** The visual style applied to the back of cards. */
export type CardBackStyle = "card-back-blue" | "card-back-red";

/** How many cards are drawn from the stock pile per draw action. */
export type DrawCount = 1 | 3;

/** The draw mode a new game starts in. */
export const DEFAULT_DRAW_COUNT: DrawCount = 3;

/** The default board background color (the emerald felt table). */
export const DEFAULT_BACKGROUND_COLOR = "#0f4d0e";

const LOCAL_STORAGE_KEY = "fsolitaire-settings";

/** The persisted settings shape, mirroring the runtime settings tree. */
interface PersistedSettings {
  drawCount: DrawCount;
  cardBackStyle: CardBackStyle;
  backgroundColor: string;
  debug: {
    almostWin: boolean;
  };
}

/** The values used when nothing valid is found in storage. */
const DEFAULT_SETTINGS: PersistedSettings = {
  drawCount: DEFAULT_DRAW_COUNT,
  cardBackStyle: "card-back-blue",
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
  debug: {
    almostWin: false,
  },
};

/** Returns a deep copy of the default settings so callers can't mutate them. */
function defaultSettings(): PersistedSettings {
  return {
    ...DEFAULT_SETTINGS,
    debug: { ...DEFAULT_SETTINGS.debug },
  };
}

/**
 * Reads and validates persisted settings from localStorage, filling any
 * missing or invalid fields with defaults. Pure aside from the storage read,
 * so the validation logic is easy to test in isolation.
 */
function loadPersistedSettings(): PersistedSettings {
  if (typeof localStorage === "undefined") {
    return defaultSettings();
  }

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) {
      return defaultSettings();
    }

    const parsed = JSON.parse(stored) as Partial<PersistedSettings>;
    return {
      drawCount:
        parsed.drawCount === 1 || parsed.drawCount === 3
          ? parsed.drawCount
          : DEFAULT_SETTINGS.drawCount,
      cardBackStyle:
        parsed.cardBackStyle === "card-back-blue" ||
        parsed.cardBackStyle === "card-back-red"
          ? parsed.cardBackStyle
          : DEFAULT_SETTINGS.cardBackStyle,
      backgroundColor:
        typeof parsed.backgroundColor === "string" && parsed.backgroundColor
          ? parsed.backgroundColor
          : DEFAULT_SETTINGS.backgroundColor,
      debug: {
        almostWin:
          typeof parsed.debug?.almostWin === "boolean"
            ? parsed.debug.almostWin
            : DEFAULT_SETTINGS.debug.almostWin,
      },
    };
  } catch (e) {
    console.warn("Failed to load settings from localStorage:", e);
    return defaultSettings();
  }
}

/**
 * Developer/Debug only settings grouped separately.
 */
export class DebugSettings {
  /** Hidden setting to place the board state into an almost win state. */
  readonly almostWin$: BehaviorSubject<boolean>;

  constructor(almostWin = false) {
    this.almostWin$ = new BehaviorSubject<boolean>(almostWin);
  }

  /** Current almost-win setting value. */
  get almostWin(): boolean {
    return this.almostWin$.value;
  }

  /** Updates the almost-win setting, publishing only on a real change. */
  setAlmostWin(enabled: boolean): void {
    if (this.almostWin !== enabled) {
      this.almostWin$.next(enabled);
    }
  }
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

  /** Nested developer/debug settings. */
  readonly debug: DebugSettings;

  constructor() {
    const loaded = loadPersistedSettings();

    this.drawCount$ = new BehaviorSubject<DrawCount>(loaded.drawCount);
    this.cardBackStyle$ = new BehaviorSubject<CardBackStyle>(
      loaded.cardBackStyle,
    );
    this.backgroundColor$ = new BehaviorSubject<string>(loaded.backgroundColor);
    this.debug = new DebugSettings(loaded.debug.almostWin);

    let initialized = false;
    merge(
      this.drawCount$,
      this.cardBackStyle$,
      this.backgroundColor$,
      this.debug.almostWin$,
    ).subscribe(() => {
      if (initialized) this.saveToLocalStorage();
    });
    initialized = true;
  }

  private saveToLocalStorage(): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      const data: PersistedSettings = {
        drawCount: this.drawCount,
        cardBackStyle: this.cardBackStyle,
        backgroundColor: this.backgroundColor,
        debug: {
          almostWin: this.debug.almostWin,
        },
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save settings to localStorage:", e);
    }
  }

  /** Current draw count value. */
  get drawCount(): DrawCount {
    return this.drawCount$.value;
  }

  /** Updates the draw count, publishing only on a real change. */
  setDrawCount(count: DrawCount): void {
    if (this.drawCount !== count) {
      this.drawCount$.next(count);
    }
  }

  /** Current card back style value. */
  get cardBackStyle(): CardBackStyle {
    return this.cardBackStyle$.value;
  }

  /** Updates the card back style, publishing only on a real change. */
  setCardBackStyle(style: CardBackStyle): void {
    if (this.cardBackStyle !== style) {
      this.cardBackStyle$.next(style);
    }
  }

  /** Current board background color. */
  get backgroundColor(): string {
    return this.backgroundColor$.value;
  }

  /** Updates the board background color, publishing only on a real change. */
  setBackgroundColor(color: string): void {
    if (this.backgroundColor !== color) {
      this.backgroundColor$.next(color);
    }
  }
}
