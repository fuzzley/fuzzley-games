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
  DEFAULT_DESKTOP_CARD_DECK,
  DesktopCardDeckId,
  MOBILE_CARD_DECK,
  isDesktopCardDeckId,
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

/**
 * Says whether the cards are drawn for a phone, for a larger screen, or for
 * whichever the viewport is at the moment.
 */
export type CardStyle = "auto" | "mobile" | "desktop";

const STORAGE_KEY = "fsolitaire-presentation";

/** Holds the presentation settings as they are stored. */
interface PersistedPresentation {
  cardBackStyle: CardBackStyle;
  theme: ThemeKey;
  cardStyle: CardStyle;
  desktopCardDeck: DesktopCardDeckId;
}

/**
 * Holds the presentation settings as a build before this one may have stored
 * them, which kept the felt's colour rather than the felt, and one deck rather
 * than a card style and a desktop deck.
 */
interface StoredPresentation extends Partial<PersistedPresentation> {
  backgroundColor?: unknown;
  cardDeck?: unknown;
}

const DEFAULTS: PersistedPresentation = {
  cardBackStyle: "card-back-blue",
  theme: DEFAULT_THEME,
  cardStyle: "auto",
  desktopCardDeck: DEFAULT_DESKTOP_CARD_DECK,
};

function isCardBackStyle(value: unknown): value is CardBackStyle {
  return value === "card-back-blue" || value === "card-back-red";
}

function isCardStyle(value: unknown): value is CardStyle {
  return value === "auto" || value === "mobile" || value === "desktop";
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
  private readonly cardStyleSignal = signal<CardStyle>(this.loaded.cardStyle);
  private readonly desktopCardDeckSignal = signal<DesktopCardDeckId>(
    this.loaded.desktopCardDeck,
  );

  /** The deck the player's choices and the viewport call for. */
  private readonly wantedCardDeck = computed<CardDeckId>(() => {
    const style = this.cardStyleSignal();
    const mobile =
      style === "mobile" || (style === "auto" && this.viewport.isCompact());
    return mobile ? MOBILE_CARD_DECK.id : this.desktopCardDeckSignal();
  });

  /** The deck the board is fetching, if it is fetching one. */
  private readonly pendingCardDeckSignal = signal<CardDeckId | null>(null);

  /** The deck the board last said it was drawing. */
  private readonly drawnCardDeckSignal = signal<CardDeckId>(
    this.wantedCardDeck(),
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

  /** Whether the cards are drawn for a phone, a larger screen, or either. */
  readonly cardStyle = this.cardStyleSignal.asReadonly();

  /** The deck the cards are drawn from whenever they are drawn for desktop. */
  readonly desktopCardDeck = this.desktopCardDeckSignal.asReadonly();

  /**
   * Whether the cards are drawn for desktop: chosen, or picked by auto for a
   * screen too wide to compact.
   */
  readonly drawsDesktopCards = computed(
    () => this.wantedCardDeck() !== MOBILE_CARD_DECK.id,
  );

  /**
   * The deck the cards are drawn from: the one the choices and the viewport
   * call for, unless it could not be fetched, which leaves the board on the
   * deck it is drawing.
   */
  readonly cardDeck = computed<CardDeckId>(() => {
    const wanted = this.wantedCardDeck();
    return wanted === this.unavailableCardDeckSignal()
      ? this.drawnCardDeckSignal()
      : wanted;
  });

  /** The deck being fetched, or null when the table is up to date. */
  readonly pendingCardDeck = this.pendingCardDeckSignal.asReadonly();

  /**
   * Why the deck the choices call for is not the one on the table, or null
   * when there is nothing to explain.
   */
  readonly cardDeckProblem = computed(() => {
    const failed = this.unavailableCardDeckSignal();
    // Auto may have moved on to a deck that loads.
    if (!failed || failed !== this.wantedCardDeck()) return null;
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

  /** Draws the cards for a phone, a larger screen, or whichever this is. */
  setCardStyle(style: CardStyle): void {
    // A fresh choice clears the last failure, so choosing again retries it.
    this.unavailableCardDeckSignal.set(null);
    this.cardStyleSignal.set(style);
  }

  /** Updates the deck the cards are drawn from whenever they are for desktop. */
  setDesktopCardDeck(deckId: DesktopCardDeckId): void {
    this.unavailableCardDeckSignal.set(null);
    this.desktopCardDeckSignal.set(deckId);
  }

  /** Records how the board is getting on with the deck it was asked for. */
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
        break;
    }
  }

  /** @inheritDoc */
  cardBackKey(): string {
    return this.cardBackStyleSignal();
  }

  /** @inheritDoc */
  cardDeckId(): CardDeckId {
    return this.cardDeck();
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
    const ref = effect(() => listener(this.cardDeck()), {
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
        cardStyle: this.cardStyleSignal(),
        desktopCardDeck: this.desktopCardDeckSignal(),
      };
      this.storage.writeObject(STORAGE_KEY, data);
    });
  }

  /** Reads stored settings, filling gaps with defaults. */
  private loadPersisted(): PersistedPresentation {
    const parsed = this.storage.readObject<StoredPresentation>(STORAGE_KEY);
    if (!parsed) return DEFAULTS;

    // An earlier build stored the one deck it offered as `cardDeck`.
    const desktopCardDeck = parsed.desktopCardDeck ?? parsed.cardDeck;
    return {
      cardBackStyle: isCardBackStyle(parsed.cardBackStyle)
        ? parsed.cardBackStyle
        : DEFAULTS.cardBackStyle,
      theme: isThemeKey(parsed.theme)
        ? parsed.theme
        : (themeWithColor(parsed.backgroundColor) ?? DEFAULTS.theme),
      cardStyle: isCardStyle(parsed.cardStyle)
        ? parsed.cardStyle
        : DEFAULTS.cardStyle,
      desktopCardDeck: isDesktopCardDeckId(desktopCardDeck)
        ? desktopCardDeck
        : DEFAULTS.desktopCardDeck,
    };
  }
}
