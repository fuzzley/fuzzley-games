import {
  Injectable,
  Injector,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import {
  CardDeckStatus,
  DEFAULT_BACKGROUND_COLOR,
  TablePresentation,
} from "@/engine/render/presentation";
import {
  CARD_DECKS,
  CardDeckId,
  DEFAULT_CARD_DECK,
  isCardDeckId,
} from "@/engine/render/card_deck";
import { LocalStorageService } from "./local_storage.service";

/** The visual style applied to the back of cards. */
export type CardBackStyle = "card-back-blue" | "card-back-red";

const STORAGE_KEY = "fsolitaire-presentation";


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

/** What a deck is called, for a sentence about it. */
function deckName(deckId: CardDeckId): string {
  return CARD_DECKS.find((deck) => deck.id === deckId)?.name ?? deckId;
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

  /**
   * The deck the board is fetching, if it is fetching one.
   *
   * Session state, not a setting: what is persisted is the deck the player
   * asked for, and on the next visit the board starts by loading it again.
   */
  private readonly pendingCardDeckSignal = signal<CardDeckId | null>(null);

  /** The deck the board last said it was drawing. */
  private readonly drawnCardDeckSignal = signal<CardDeckId>(
    this.loaded.cardDeck,
  );

  /** The deck that could not be fetched, until another choice is made. */
  private readonly unavailableCardDeckSignal = signal<CardDeckId | null>(null);

  /** The visual style used for face-down card backs. */
  readonly cardBackStyle = this.cardBackStyleSignal.asReadonly();

  /** The board background color, as a CSS/Phaser color string. */
  readonly backgroundColor = this.backgroundColorSignal.asReadonly();

  /** The deck the cards are drawn from. */
  readonly cardDeck = this.cardDeckSignal.asReadonly();

  /** The deck being fetched, or null when the table is up to date. */
  readonly pendingCardDeck = this.pendingCardDeckSignal.asReadonly();

  /**
   * Why the last deck the player chose is not the one on the table, or null
   * when there is nothing to explain.
   */
  readonly cardDeckProblem = computed(() => {
    const failed = this.unavailableCardDeckSignal();
    if (!failed) return null;
    return `Couldn't load ${deckName(failed)} — still using ${deckName(
      this.drawnCardDeckSignal(),
    )}.`;
  });

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
    // A fresh choice clears the last complaint, whether or not it succeeds.
    // Leaving it up would attach yesterday's failure to today's deck.
    this.unavailableCardDeckSignal.set(null);
    this.cardDeckSignal.set(deckId);
  }

  /**
   * @inheritDoc
   *
   * A deck that could not be fetched puts the choice back to the one on the
   * table. The alternative is a settings drawer that goes on showing a deck the
   * board never drew — and, worse, persists it, so the next visit starts by
   * failing to load the same deck again.
   */
  reportCardDeckStatus(status: CardDeckStatus): void {
    switch (status.kind) {
      case "loading":
        this.pendingCardDeckSignal.set(status.deckId);
        break;
      case "drawn":
        this.pendingCardDeckSignal.set(null);
        this.drawnCardDeckSignal.set(status.deckId);
        break;
      case "unavailable":
        this.pendingCardDeckSignal.set(null);
        this.unavailableCardDeckSignal.set(status.deckId);
        this.cardDeckSignal.set(this.drawnCardDeckSignal());
        break;
    }
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

  /** Reads stored settings, filling gaps with defaults. */
  private loadPersisted(): PersistedPresentation {
    const parsed =
      this.storage.readObject<Partial<PersistedPresentation>>(STORAGE_KEY);
    if (!parsed) return { ...DEFAULTS };

    return {
      cardBackStyle: isCardBackStyle(parsed.cardBackStyle)
        ? parsed.cardBackStyle
        : DEFAULTS.cardBackStyle,
      backgroundColor:
        typeof parsed.backgroundColor === "string" && parsed.backgroundColor
          ? parsed.backgroundColor
          : DEFAULTS.backgroundColor,
      // Absent for anyone whose settings predate the deck choice, so falls to the default.
      cardDeck: isCardDeckId(parsed.cardDeck)
        ? parsed.cardDeck
        : DEFAULTS.cardDeck,
    };
  }
}
