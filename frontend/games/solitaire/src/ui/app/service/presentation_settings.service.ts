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
} from "@/engine/render/view/presentation";
import {
  BoardArrangement,
  DEFAULT_BOARD_ARRANGEMENT,
  OrAuto,
  PilePosition,
  ResolvedArrangement,
  StockSide,
  resolveArrangement,
} from "@/engine/render/layout/board_arrangement";
import {
  CARD_DECKS,
  CardDeckId,
  DEFAULT_DESKTOP_CARD_DECK,
  DesktopCardDeckId,
  MOBILE_CARD_DECK,
  isDesktopCardDeckId,
} from "@/engine/render/deck/card_deck";
import {
  CardBackStyle,
  DEFAULT_CARD_BACK,
  isCardBackStyle,
} from "@/engine/render/deck/card_back";
import {
  DEFAULT_THEME,
  TABLE_THEMES,
  ThemeKey,
  isThemeKey,
  themeWithColor,
} from "../model/table_theme";
import { LocalStorageService } from "./local_storage.service";
import { ViewportService } from "./viewport.service";

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
  piles: OrAuto<PilePosition>;
  stockSide: OrAuto<StockSide>;
}

/**
 * Holds the presentation settings as a build before this one may have stored
 * them, which kept the felt's colour rather than the felt, one deck rather
 * than a card style and a desktop deck, and where an upright phone put its
 * piles and the player's hand rather than where every screen puts them and the
 * stock's side.
 */
interface StoredPresentation extends Partial<PersistedPresentation> {
  backgroundColor?: unknown;
  cardDeck?: unknown;
  phonePiles?: unknown;
  hand?: unknown;
}

const DEFAULTS: PersistedPresentation = {
  cardBackStyle: DEFAULT_CARD_BACK,
  theme: DEFAULT_THEME,
  cardStyle: "auto",
  desktopCardDeck: DEFAULT_DESKTOP_CARD_DECK,
  ...DEFAULT_BOARD_ARRANGEMENT,
};

function isCardStyle(value: unknown): value is CardStyle {
  return value === "auto" || value === "mobile" || value === "desktop";
}

function isPilesChoice(value: unknown): value is OrAuto<PilePosition> {
  return value === "auto" || value === "top" || value === "bottom";
}

function isStockSideChoice(value: unknown): value is OrAuto<StockSide> {
  return value === "auto" || value === "left" || value === "right";
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
  private readonly pilesSignal = signal<OrAuto<PilePosition>>(
    this.loaded.piles,
  );
  private readonly stockSideSignal = signal<OrAuto<StockSide>>(
    this.loaded.stockSide,
  );

  /** Where the piles go and the stock's side, together. */
  private readonly arrangement = computed<BoardArrangement>(() => ({
    piles: this.pilesSignal(),
    stockSide: this.stockSideSignal(),
  }));

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
   * Where a game with arranged grids puts the piles that are not columns, or
   * Auto.
   */
  readonly piles = this.pilesSignal.asReadonly();

  /** Which side a game with arranged grids puts the stock on, or Auto. */
  readonly stockSide = this.stockSideSignal.asReadonly();

  /**
   * Where the piles go and the stock's side on the screen as it is now, with
   * Auto decided as the board decides it.
   */
  readonly resolvedArrangement = computed<ResolvedArrangement>(() =>
    resolveArrangement(this.arrangement(), this.viewport.formFactor()),
  );

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

  /** Puts the piles at the top or the bottom, or wherever the screen suits. */
  setPiles(position: OrAuto<PilePosition>): void {
    this.pilesSignal.set(position);
  }

  /** Puts the stock at the left or the right, or wherever the screen suits. */
  setStockSide(side: OrAuto<StockSide>): void {
    this.stockSideSignal.set(side);
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

  /** @inheritDoc */
  boardArrangement(): BoardArrangement {
    return this.arrangement();
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
        piles: this.pilesSignal(),
        stockSide: this.stockSideSignal(),
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
      // An earlier build's piles at the top and left hand mean what they did
      // on the phones they were offered on; anything else becomes Auto.
      piles: isPilesChoice(parsed.piles)
        ? parsed.piles
        : parsed.phonePiles === "top"
          ? "top"
          : DEFAULTS.piles,
      stockSide: isStockSideChoice(parsed.stockSide)
        ? parsed.stockSide
        : parsed.hand === "left"
          ? "left"
          : DEFAULTS.stockSide,
    };
  }
}
