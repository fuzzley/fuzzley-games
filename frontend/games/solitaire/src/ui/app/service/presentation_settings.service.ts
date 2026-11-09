import {
  Injectable,
  Injector,
  type WritableSignal,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { ThemeService } from "@fz/ui/theme";
import {
  type CardDeckStatus,
  DEFAULT_BACKGROUND_COLOR,
  type TablePresentation,
} from "@/engine/render/view/presentation";
import {
  type BoardArrangement,
  DEFAULT_BOARD_ARRANGEMENT,
  type OrAuto,
  type PilePosition,
  type ResolvedArrangement,
  type StockSide,
  resolveArrangement,
} from "@/engine/render/layout/board_arrangement";
import {
  CARD_DECKS,
  type CardDeckId,
  DEFAULT_DESKTOP_CARD_DECK,
  type DesktopCardDeckId,
  MOBILE_CARD_DECK,
  isDesktopCardDeckId,
} from "@/engine/render/deck/card_deck";
import {
  type CardBackStyle,
  DEFAULT_CARD_BACK,
  isCardBackStyle,
} from "@/engine/render/deck/card_back";
import {
  DEFAULT_FELT,
  type FeltChoice,
  TABLE_FELTS,
  feltWithColor,
  isFeltChoice,
  isFeltKey,
} from "../model/table_felt";
import { LocalStorageService, storedSignal } from "@fz/ui/storage";
import { GameViewportService } from "@fz/game-ui/viewport";

/**
 * Says whether the cards are drawn for a phone, for a larger screen, or for
 * whichever the viewport is at the moment.
 */
export type CardStyle = "auto" | "mobile" | "desktop";

const STORAGE_KEY = "fsolitaire-presentation";
const STORAGE_VERSION = 1;

/** Holds the presentation settings as they are stored. */
interface PersistedPresentation {
  cardBackStyle: CardBackStyle;
  felt: FeltChoice;
  cardStyle: CardStyle;
  desktopCardDeck: DesktopCardDeckId;
  piles: OrAuto<PilePosition>;
  stockSide: OrAuto<StockSide>;
}

/**
 * Holds the presentation settings as a build before this one may have stored
 * them, which kept the felt as `theme`, before the palette had one, or its
 * colour rather than the felt, one deck rather than a card style and a
 * desktop deck, and where an upright phone put its piles and the player's
 * hand rather than where every screen puts them and the stock's side.
 */
interface StoredPresentation extends Partial<PersistedPresentation> {
  theme?: unknown;
  backgroundColor?: unknown;
  cardDeck?: unknown;
  phonePiles?: unknown;
  hand?: unknown;
}

const DEFAULTS: PersistedPresentation = {
  cardBackStyle: DEFAULT_CARD_BACK,
  felt: DEFAULT_FELT,
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

/**
 * Returns the felt an earlier build stored, as `theme` or as its colour, with
 * the Emerald Felt, which was every player's default, as the palette's.
 */
function earlierFelt(parsed: StoredPresentation): FeltChoice {
  const felt = isFeltKey(parsed.theme)
    ? parsed.theme
    : feltWithColor(parsed.backgroundColor);
  return felt === undefined || felt === "green" ? DEFAULT_FELT : felt;
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
  private readonly viewport = inject(GameViewportService);

  /** The palette's own felt, empty where no stylesheet sets one. */
  private readonly paletteFelt = inject(ThemeService).role("felt");

  /** The player's choices, as they are stored. */
  private readonly persisted = this.storedChoices();

  /** Where the piles go and the stock's side, together. */
  private readonly arrangement = computed<BoardArrangement>(() => ({
    piles: this.piles(),
    stockSide: this.stockSide(),
  }));

  /** The deck the player's choices and the viewport call for. */
  private readonly wantedCardDeck = computed<CardDeckId>(() => {
    const { cardStyle, desktopCardDeck } = this.persisted();
    const mobile =
      cardStyle === "mobile" ||
      (cardStyle === "auto" && this.viewport.isCompact());
    return mobile ? MOBILE_CARD_DECK.id : desktopCardDeck;
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
  readonly cardBackStyle = computed(() => this.persisted().cardBackStyle);

  /** The table felt the player chose, or "theme" for the palette's. */
  readonly felt = computed(() => this.persisted().felt);

  /**
   * The felt on the table as a CSS/Phaser color string: the one the player
   * chose, or the palette's.
   */
  readonly backgroundColor = computed(() => {
    const felt = this.felt();
    if (felt !== "theme") return TABLE_FELTS[felt].color;
    return this.paletteFelt() || DEFAULT_BACKGROUND_COLOR;
  });

  /** Whether the cards are drawn for a phone, a larger screen, or either. */
  readonly cardStyle = computed(() => this.persisted().cardStyle);

  /** The deck the cards are drawn from whenever they are drawn for desktop. */
  readonly desktopCardDeck = computed(() => this.persisted().desktopCardDeck);

  /**
   * Where a game with arranged grids puts the piles that are not columns, or
   * Auto.
   */
  readonly piles = computed(() => this.persisted().piles);

  /** Which side a game with arranged grids puts the stock on, or Auto. */
  readonly stockSide = computed(() => this.persisted().stockSide);

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
    this.choose({ cardBackStyle: style });
  }

  /** Lays the table with a different felt, or the palette's. */
  setFelt(felt: FeltChoice): void {
    this.choose({ felt });
  }

  /** Draws the cards for a phone, a larger screen, or whichever this is. */
  setCardStyle(style: CardStyle): void {
    // A fresh choice clears the last failure, so choosing again retries it.
    this.unavailableCardDeckSignal.set(null);
    this.choose({ cardStyle: style });
  }

  /** Updates the deck the cards are drawn from whenever they are for desktop. */
  setDesktopCardDeck(deckId: DesktopCardDeckId): void {
    this.unavailableCardDeckSignal.set(null);
    this.choose({ desktopCardDeck: deckId });
  }

  /** Puts the piles at the top or the bottom, or wherever the screen suits. */
  setPiles(position: OrAuto<PilePosition>): void {
    this.choose({ piles: position });
  }

  /** Puts the stock at the left or the right, or wherever the screen suits. */
  setStockSide(side: OrAuto<StockSide>): void {
    this.choose({ stockSide: side });
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
    return this.cardBackStyle();
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
  readonly onBackgroundColor = (
    listener: (color: string) => void,
  ): (() => void) => {
    const ref = effect(
      () => {
        listener(this.backgroundColor());
      },
      {
        injector: this.injector,
      },
    );
    return () => {
      ref.destroy();
    };
  };

  /** Follows the deck the way {@link onBackgroundColor} follows the colour. */
  readonly onCardDeck = (
    listener: (deckId: CardDeckId) => void,
  ): (() => void) => {
    const ref = effect(
      () => {
        listener(this.cardDeck());
      },
      {
        injector: this.injector,
      },
    );
    return () => {
      ref.destroy();
    };
  };

  /** Changes some of the player's choices, and keeps them. */
  private choose(change: Partial<PersistedPresentation>): void {
    this.persisted.update((persisted) => ({ ...persisted, ...change }));
  }

  /**
   * Returns the player's choices held as they are stored, once settings a
   * build before versions stored bare are rewritten in this build's shape.
   */
  private storedChoices(): WritableSignal<PersistedPresentation> {
    this.rewriteEarlier();
    return storedSignal({
      key: STORAGE_KEY,
      version: STORAGE_VERSION,
      read: (saved) => (saved ? this.loadPersisted(saved) : DEFAULTS),
    });
  }

  /**
   * Rewrites the settings a build before versions stored bare in this
   * build's shape, so each setting is read from one place from then on.
   *
   * An entry with a version, this build's or another's, is left as it is.
   */
  private rewriteEarlier(): void {
    const earlier = this.storage.readObject(STORAGE_KEY);
    if (!earlier || Array.isArray(earlier) || "version" in earlier) return;
    this.storage.writeVersioned(
      STORAGE_KEY,
      STORAGE_VERSION,
      this.loadPersisted(earlier),
    );
  }

  /** Reads stored settings, filling gaps with defaults. */
  private loadPersisted(parsed: StoredPresentation): PersistedPresentation {
    // An earlier build stored the one deck it offered as `cardDeck`.
    const desktopCardDeck = parsed.desktopCardDeck ?? parsed.cardDeck;
    return {
      cardBackStyle: isCardBackStyle(parsed.cardBackStyle)
        ? parsed.cardBackStyle
        : DEFAULTS.cardBackStyle,
      felt: isFeltChoice(parsed.felt) ? parsed.felt : earlierFelt(parsed),
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
