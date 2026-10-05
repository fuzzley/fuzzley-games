import {
  CardDeckStatus,
  TablePresentation,
} from "@/engine/render/presentation";
import {
  CardDeckId,
  DEFAULT_DESKTOP_CARD_DECK,
} from "@/engine/render/card_deck";
import {
  BoardArrangement,
  DEFAULT_BOARD_ARRANGEMENT,
} from "@/engine/render/layout/board_layouts";

/** Implements {@link TablePresentation} with plain values a test can set. */
export class TestPresentation implements TablePresentation {
  private readonly listeners: ((color: string) => void)[] = [];
  private readonly deckListeners: ((deckId: CardDeckId) => void)[] = [];
  private readonly deckStatuses: CardDeckStatus[] = [];
  private arrangement: BoardArrangement = DEFAULT_BOARD_ARRANGEMENT;

  constructor(
    private cardBack = "card-back-blue",
    private backgroundColor = "#0f4d0e",
    private deckId: CardDeckId = DEFAULT_DESKTOP_CARD_DECK,
  ) {}

  /** @inheritDoc */
  cardBackKey(): string {
    return this.cardBack;
  }

  /** @inheritDoc */
  cardDeckId(): CardDeckId {
    return this.deckId;
  }

  /** @inheritDoc */
  boardArrangement(): BoardArrangement {
    return this.arrangement;
  }

  /** Changes where the piles go and the stock's side. */
  setBoardArrangement(arrangement: BoardArrangement): void {
    this.arrangement = arrangement;
  }

  /** @inheritDoc */
  readonly onBackgroundColor = (listener: (color: string) => void) => {
    this.listeners.push(listener);
    listener(this.backgroundColor);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  };

  /** @inheritDoc */
  readonly onCardDeck = (listener: (deckId: CardDeckId) => void) => {
    this.deckListeners.push(listener);
    listener(this.deckId);
    return () => {
      const index = this.deckListeners.indexOf(listener);
      if (index !== -1) this.deckListeners.splice(index, 1);
    };
  };

  /** Changes the card back the board should draw. */
  setCardBackKey(key: string): void {
    this.cardBack = key;
  }

  /** Changes the deck, notifying whoever is following it. */
  setCardDeck(deckId: CardDeckId): void {
    this.deckId = deckId;
    for (const listener of [...this.deckListeners]) {
      listener(deckId);
    }
  }

  /** Changes the table colour, notifying whoever is following it. */
  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
    for (const listener of [...this.listeners]) {
      listener(color);
    }
  }

  /** How many followers are currently subscribed, for leak checks. */
  get listenerCount(): number {
    return this.listeners.length;
  }

  /** How many deck followers are currently subscribed, for leak checks. */
  get deckListenerCount(): number {
    return this.deckListeners.length;
  }

  /** @inheritDoc */
  reportCardDeckStatus(status: CardDeckStatus): void {
    this.deckStatuses.push(status);
  }

  /** Everything the board has said about the deck, oldest first. */
  get cardDeckStatuses(): readonly CardDeckStatus[] {
    return this.deckStatuses;
  }
}
