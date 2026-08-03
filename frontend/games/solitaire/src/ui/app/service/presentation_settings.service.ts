import { Injectable, Injector, effect, inject, signal } from "@angular/core";
import {
  DEFAULT_BACKGROUND_COLOR,
  TablePresentation,
} from "@/engine/render/presentation";
import {
  CardDeckId,
  DEFAULT_CARD_DECK,
  isCardDeckId,
} from "@/engine/render/card_deck";
import { LocalStorageService } from "./local_storage.service";

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
  cardDeck: CardDeckId;
}

const DEFAULTS: PersistedPresentation = {
  cardBackStyle: "card-back-blue",
  backgroundColor: DEFAULT_BACKGROUND_COLOR,
  cardDeck: DEFAULT_CARD_DECK,
};

function isCardBackStyle(value: unknown): value is CardBackStyle {
  return value === "card-back-blue" || value === "card-back-red";
}

/**
 * The player's choices about how the table looks, independent of what is being
 * played on it.
 *
 * Split out of the Klondike game settings because a card back and a felt colour
 * are the same preference in every game, while a draw count is a Klondike rule.
 *
 * Held as signals, like the rest of the application. It implements
 * {@link TablePresentation} — the shape a board scene asks for — by adapting
 * at that boundary rather than by being reactive in the renderer's idiom
 * throughout: the Phaser side wants a subscribe-and-unsubscribe callback, and
 * that is the only place one is built.
 */
@Injectable({ providedIn: "root" })
export class PresentationSettingsService implements TablePresentation {
  private readonly storage = inject(LocalStorageService);
  private readonly injector = inject(Injector);

  private readonly loaded = this.loadPersisted();

  private readonly cardBackStyleSignal = signal<CardBackStyle>(
    this.loaded.cardBackStyle,
  );
  private readonly backgroundColorSignal = signal(this.loaded.backgroundColor);
  private readonly cardDeckSignal = signal<CardDeckId>(this.loaded.cardDeck);

  /** The visual style used for face-down card backs. */
  readonly cardBackStyle = this.cardBackStyleSignal.asReadonly();

  /** The board background color, as a CSS/Phaser color string. */
  readonly backgroundColor = this.backgroundColorSignal.asReadonly();

  /** The deck the cards are drawn from. */
  readonly cardDeck = this.cardDeckSignal.asReadonly();

  /**
   * Updates the card back style.
   *
   * Writing the same value again is a no-op by virtue of signal equality, so
   * there is no guard here and no spurious save behind it.
   */
  setCardBackStyle(style: CardBackStyle): void {
    this.cardBackStyleSignal.set(style);
  }

  /** Updates the board background color. */
  setBackgroundColor(color: string): void {
    this.backgroundColorSignal.set(color);
  }

  /** Updates the deck the cards are drawn from. */
  setCardDeck(deckId: CardDeckId): void {
    this.cardDeckSignal.set(deckId);
  }

  /** @inheritDoc */
  cardBackKey(): string {
    return this.cardBackStyleSignal();
  }

  /** @inheritDoc */
  cardDeckId(): CardDeckId {
    return this.cardDeckSignal();
  }

  /**
   * @inheritDoc
   *
   * The adapter between the signal held here and the callback the Phaser
   * board follows. `effect` delivers the current value on registration and
   * every change after it, which is the contract the board expects, and
   * destroying the effect is what unsubscribing means.
   */
  readonly onBackgroundColor = (listener: (color: string) => void) => {
    const ref = effect(() => listener(this.backgroundColorSignal()), {
      injector: this.injector,
    });
    return () => ref.destroy();
  };

  /**
   * @inheritDoc
   *
   * The same adapter as {@link onBackgroundColor}, for the same reason.
   */
  readonly onCardDeck = (listener: (deckId: CardDeckId) => void) => {
    const ref = effect(() => listener(this.cardDeckSignal()), {
      injector: this.injector,
    });
    return () => ref.destroy();
  };

  constructor() {
    // Persist whenever either setting changes. The effect also runs once on
    // registration, which rewrites what was just read — harmless, and cheaper
    // than the `let initialized` flag that used to suppress it.
    effect(() => {
      const data: PersistedPresentation = {
        cardBackStyle: this.cardBackStyleSignal(),
        backgroundColor: this.backgroundColorSignal(),
        cardDeck: this.cardDeckSignal(),
      };
      this.storage.writeObject(STORAGE_KEY, data);
    });
  }

  /** Reads whichever stored blob is present, filling gaps with defaults. */
  private loadPersisted(): PersistedPresentation {
    for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
      const parsed =
        this.storage.readObject<Partial<PersistedPresentation>>(key);
      if (!parsed) continue;

      return {
        cardBackStyle: isCardBackStyle(parsed.cardBackStyle)
          ? parsed.cardBackStyle
          : DEFAULTS.cardBackStyle,
        backgroundColor:
          typeof parsed.backgroundColor === "string" && parsed.backgroundColor
            ? parsed.backgroundColor
            : DEFAULTS.backgroundColor,
        // Absent for anyone whose settings predate the deck choice, and for
        // everyone reading the legacy key, so both fall to the default.
        cardDeck: isCardDeckId(parsed.cardDeck)
          ? parsed.cardDeck
          : DEFAULTS.cardDeck,
      };
    }
    return { ...DEFAULTS };
  }
}
