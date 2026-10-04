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
  TablePresentation,
} from "@/engine/render/presentation";
import {
  CARD_DECKS,
  CardDeckId,
  DEFAULT_CARD_DECK,
  DEFAULT_COMPACT_CARD_DECK,
  isCardDeckId,
} from "@/engine/render/card_deck";
import {
  DEFAULT_THEME,
  TABLE_THEMES,
  ThemeKey,
  isThemeKey,
  themeWithColor,
} from "../model/table_theme";
import { LocalStorageService } from "./local_storage.service";
import { ViewportService } from "./viewport.service";

/** Names the artwork on the back of the cards. */
export type CardBackStyle = "card-back-blue" | "card-back-red";

const STORAGE_KEY = "fsolitaire-presentation";

/** Holds the presentation settings as they are stored. */
interface PersistedPresentation {
  cardBackStyle: CardBackStyle;
  theme: ThemeKey;
  cardDeck: CardDeckId;
}

/**
 * Holds the presentation settings as a build before this one may have stored
 * them, which kept the felt's colour rather than the felt.
 */
interface StoredPresentation extends Partial<PersistedPresentation> {
  backgroundColor?: unknown;
}

/** The defaults every screen shares; the deck depends on the screen. */
const DEFAULTS: Omit<PersistedPresentation, "cardDeck"> = {
  cardBackStyle: "card-back-blue",
  theme: DEFAULT_THEME,
};

function isCardBackStyle(value: unknown): value is CardBackStyle {
  return value === "card-back-blue" || value === "card-back-red";
}

/** Returns what a deck is called, for a sentence about it. */
function deckName(deckId: CardDeckId): string {
  return CARD_DECKS.find((deck) => deck.id === deckId)?.name ?? deckId;
}

/**
 * Holds the player's choices about how the table looks, whatever game is
 * played on it.
 */
@Injectable({ providedIn: "root" })
export class PresentationSettingsService implements TablePresentation {
  private readonly storage = inject(LocalStorageService);
  private readonly injector = inject(Injector);
  private readonly viewport = inject(ViewportService);

  private readonly loaded = this.loadPersisted();

  private readonly cardBackStyleSignal = signal<CardBackStyle>(
    this.loaded.cardBackStyle,
  );
  private readonly themeSignal = signal<ThemeKey>(this.loaded.theme);
  private readonly cardDeckSignal = signal<CardDeckId>(this.loaded.cardDeck);

  /** The deck the board is fetching, if it is fetching one. */
  private readonly pendingCardDeckSignal = signal<CardDeckId | null>(null);

  /** The deck the board last said it was drawing. */
  private readonly drawnCardDeckSignal = signal<CardDeckId>(
    this.loaded.cardDeck,
  );

  /** The deck that could not be fetched, until another choice is made. */
  private readonly unavailableCardDeckSignal = signal<CardDeckId | null>(null);

  /** The visual style used for face-down card backs. */
  readonly cardBackStyle = this.cardBackStyleSignal.asReadonly();

  /** The table felt the player chose. */
  readonly theme = this.themeSignal.asReadonly();

  /** The board background color, as a CSS/Phaser color string. */
  readonly backgroundColor = computed(
    () => TABLE_THEMES[this.themeSignal()].color,
  );

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

  /** Updates the card back style. */
  setCardBackStyle(style: CardBackStyle): void {
    this.cardBackStyleSignal.set(style);
  }

  /** Lays the table with a different felt. */
  setTheme(theme: ThemeKey): void {
    this.themeSignal.set(theme);
  }

  /** Updates the deck the cards are drawn from. */
  setCardDeck(deckId: CardDeckId): void {
    // A fresh choice clears the last failure, whether or not it succeeds.
    this.unavailableCardDeckSignal.set(null);
    this.cardDeckSignal.set(deckId);
  }

  /**
   * Records how the board is getting on with the chosen deck, putting the
   * choice back to the deck on the table if the new one could not be fetched.
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
   * Follows the table colour with an effect, which reports the current value
   * at once and every change after it.
   */
  readonly onBackgroundColor = (listener: (color: string) => void) => {
    const ref = effect(() => listener(this.backgroundColor()), {
      injector: this.injector,
    });
    return () => ref.destroy();
  };

  /** Follows the deck the way {@link onBackgroundColor} follows the colour. */
  readonly onCardDeck = (listener: (deckId: CardDeckId) => void) => {
    const ref = effect(() => listener(this.cardDeckSignal()), {
      injector: this.injector,
    });
    return () => ref.destroy();
  };

  constructor() {
    // Save on every change. The first run rewrites what was just read, which
    // is harmless.
    effect(() => {
      const data: PersistedPresentation = {
        cardBackStyle: this.cardBackStyleSignal(),
        theme: this.themeSignal(),
        cardDeck: this.cardDeckSignal(),
      };
      this.storage.writeObject(STORAGE_KEY, data);
    });
  }

  /** Reads stored settings, filling gaps with defaults. */
  private loadPersisted(): PersistedPresentation {
    const defaults = { ...DEFAULTS, cardDeck: this.defaultCardDeck() };
    const parsed = this.storage.readObject<StoredPresentation>(STORAGE_KEY);
    if (!parsed) return defaults;

    return {
      cardBackStyle: isCardBackStyle(parsed.cardBackStyle)
        ? parsed.cardBackStyle
        : defaults.cardBackStyle,
      theme: isThemeKey(parsed.theme)
        ? parsed.theme
        : (themeWithColor(parsed.backgroundColor) ?? defaults.theme),
      // Absent from settings saved before the deck could be chosen.
      cardDeck: isCardDeckId(parsed.cardDeck)
        ? parsed.cardDeck
        : defaults.cardDeck,
    };
  }

  /**
   * Returns the deck a player who has not chosen one starts on: the phone's
   * deck on a compact screen.
   *
   * The first save stores it like a choice, so turning a phone sideways past
   * the breakpoint does not swap the deck under the player.
   */
  private defaultCardDeck(): CardDeckId {
    return this.viewport.isCompact()
      ? DEFAULT_COMPACT_CARD_DECK
      : DEFAULT_CARD_DECK;
  }
}
