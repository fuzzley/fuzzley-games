import { Injectable } from "@angular/core";
import { BehaviorSubject, merge } from "rxjs";
import {
  DEFAULT_BACKGROUND_COLOR,
  TablePresentation,
} from "@/engine/render/presentation";

/** The visual style applied to the back of cards. */
export type CardBackStyle = "card-back-blue" | "card-back-red";

const STORAGE_KEY = "fsolitaire-presentation";

/**
 * The key these settings used to share with the Klondike rules.
 *
 * Read once as a fallback so a player who already chose a felt colour or a card
 * back keeps it rather than being silently reset by the split.
 */
const LEGACY_STORAGE_KEY = "fsolitaire-settings";

/** The persisted shape. */
interface PersistedPresentation {
  cardBackStyle: CardBackStyle;
  backgroundColor: string;
}

const DEFAULTS: PersistedPresentation = {
  cardBackStyle: "card-back-blue",
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
};

function isCardBackStyle(value: unknown): value is CardBackStyle {
  return value === "card-back-blue" || value === "card-back-red";
}

/** Reads and validates whichever stored blob is present, filling gaps with defaults. */
function loadPersisted(): PersistedPresentation {
  if (typeof localStorage === "undefined") {
    return { ...DEFAULTS };
  }

  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) continue;

      const parsed = JSON.parse(stored) as Partial<PersistedPresentation>;
      return {
        cardBackStyle: isCardBackStyle(parsed.cardBackStyle)
          ? parsed.cardBackStyle
          : DEFAULTS.cardBackStyle,
        backgroundColor:
          typeof parsed.backgroundColor === "string" && parsed.backgroundColor
            ? parsed.backgroundColor
            : DEFAULTS.backgroundColor,
      };
    } catch (e) {
      console.warn(`Failed to load presentation settings from ${key}:`, e);
    }
  }
  return { ...DEFAULTS };
}

/**
 * The player's choices about how the table looks, independent of what is being
 * played on it.
 *
 * Split out of the Klondike game settings because a card back and a felt colour
 * are the same preference in every game, while a draw count is a Klondike rule.
 * Implements {@link TablePresentation}, which is the shape a board scene asks
 * for, so any game's board can be handed these.
 */
@Injectable({ providedIn: "root" })
export class PresentationSettingsService implements TablePresentation {
  /** The visual style used for face-down card backs. */
  readonly cardBackStyle$: BehaviorSubject<CardBackStyle>;

  /** The board background color, as a CSS/Phaser color string. */
  readonly backgroundColor$: BehaviorSubject<string>;

  constructor() {
    const loaded = loadPersisted();
    this.cardBackStyle$ = new BehaviorSubject(loaded.cardBackStyle);
    this.backgroundColor$ = new BehaviorSubject(loaded.backgroundColor);

    let initialized = false;
    merge(this.cardBackStyle$, this.backgroundColor$).subscribe(() => {
      if (initialized) this.save();
    });
    initialized = true;
  }

  /** @inheritDoc */
  cardBackKey(): string {
    return this.cardBackStyle;
  }

  /** @inheritDoc */
  readonly onBackgroundColor = (listener: (color: string) => void) => {
    const subscription = this.backgroundColor$.subscribe(listener);
    return () => subscription.unsubscribe();
  };

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

  private save(): void {
    if (typeof localStorage === "undefined") return;
    try {
      const data: PersistedPresentation = {
        cardBackStyle: this.cardBackStyle,
        backgroundColor: this.backgroundColor,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save presentation settings:", e);
    }
  }
}
