import { Scene } from "phaser";

import {
  ALL_PLAYING_CARD_IDS,
  PlayingCardId,
  Suit,
  Type,
} from "../../model/card/playing_card";
import { BoardLayoutManager } from "../layout/board_layout_manager";
import { StockPileVisual } from "../visual/pile/stock_pile_visual";
import { WastePileVisual } from "../visual/pile/waste_pile_visual";
import { FoundationPileVisual } from "../visual/pile/foundation_pile_visual";
import { TableauPileVisual } from "../visual/pile/tableau_pile_visual";
import { SolitaireGame } from "../../model/game/solitaire_game";
import { PlayingCardVisual } from "../visual/card/playing_card_visual";

/** Union type representing any visual pile wrapper. */
export type PileVisual =
  StockPileVisual | WastePileVisual | FoundationPileVisual | TableauPileVisual;

/**
 * Handles rendering the fSolitaire game board using Phaser, reacting to
 * events emitted by the logical rules engine.
 */
export class BoardScene extends Scene {
  /** The logical solitaire game rules and state engine. */
  private gameModel: SolitaireGame = new SolitaireGame();

  /** Registry of visual cards mapped by their unique string ID. */
  private readonly cardVisualsMap = new Map<string, PlayingCardVisual>();

  /** Registry of visual piles mapped by their unique string ID. */
  private readonly pileVisualsMap = new Map<string, PileVisual>();

  /** Visual representation of the stock pile. */
  public readonly stockPile = new StockPileVisual(this.gameModel.stock);
  /** Visual representation of the waste pile. */
  public readonly wastePile = new WastePileVisual(this.gameModel.waste);

  /** Visual representations of the four foundation piles. */
  public readonly foundationPiles = [
    new FoundationPileVisual(this.gameModel.foundations[0]),
    new FoundationPileVisual(this.gameModel.foundations[1]),
    new FoundationPileVisual(this.gameModel.foundations[2]),
    new FoundationPileVisual(this.gameModel.foundations[3]),
  ];

  /** Visual representations of the seven tableau piles. */
  public readonly tableauPiles = [
    new TableauPileVisual(this.gameModel.tableaus[0]),
    new TableauPileVisual(this.gameModel.tableaus[1]),
    new TableauPileVisual(this.gameModel.tableaus[2]),
    new TableauPileVisual(this.gameModel.tableaus[3]),
    new TableauPileVisual(this.gameModel.tableaus[4]),
    new TableauPileVisual(this.gameModel.tableaus[5]),
    new TableauPileVisual(this.gameModel.tableaus[6]),
  ];

  /** Layout coordinator for positioning piles and card sprites. */
  private readonly layoutManager = new BoardLayoutManager(this);

  /** Graphics object for drawing the highlight border. */
  private highlightGraphics: Phaser.GameObjects.Graphics;

  /** The currently hovered card visual wrapper. */
  private hoveredCardVisual: PlayingCardVisual | null = null;

  /** Whether the stock pile background sprite is currently hovered. */
  private isStockBackgroundHovered = false;

  /** Constructs the board scene. */
  constructor() {
    super("board-scene");
  }

  /**
   * Initializes the game state model, instantiates card sprites,
   * registers model event listeners, and draws the initial layout.
   */
  create() {
    this.highlightGraphics = this.add.graphics();
    this.highlightGraphics.setDepth(2000);

    this.registerPileVisuals();
    this.gameModel.startNewGame();
    this.createPileBackgroundSprites();
    this.createCardVisuals();
    this.setupEventListeners();

    this.syncVisualPilesWithModel();
    this.layoutManager.createInitialLayout();
    this.layoutManager.updateVisualLayout();

    this.scale.on("resize", () => {
      this.layoutManager.createInitialLayout();
      this.layoutManager.updateVisualLayout();
    });
  }

  /** Registers all visual piles in the map registry for quick lookup. */
  private registerPileVisuals(): void {
    this.pileVisualsMap.set("stock", this.stockPile);
    this.pileVisualsMap.set("waste", this.wastePile);
    this.foundationPiles.forEach((pile, index) => {
      this.pileVisualsMap.set(`foundation-${index}`, pile);
    });
    this.tableauPiles.forEach((pile, index) => {
      this.pileVisualsMap.set(`tableau-${index}`, pile);
    });
  }

  /**
   * Translates a pile ID string to its corresponding pile visual wrapper instance.
   *
   * @param pileId The unique ID of the pile.
   * @returns The visual pile wrapper or null if not found.
   */
  public getPileVisualById(pileId: string): PileVisual | null {
    return this.pileVisualsMap.get(pileId) || null;
  }

  /** Registers listeners on the game model to update graphics dynamically. */
  private setupEventListeners() {
    this.gameModel.on("card-moved", () => {
      this.syncVisualPilesWithModel();
      this.layoutManager.updateVisualLayout();
      this.updateHighlightBorder();
    });

    this.gameModel.on("card-flipped", ({ cardId, faceUp }) => {
      const visualCard = this.cardVisualsMap.get(cardId);
      if (visualCard.sprite) {
        const frame = faceUp ? cardId : "card-back-blue";
        visualCard.sprite.setFrame(frame);
        visualCard.sprite.setOrigin(0, 0);
      }
      this.updateCardCursors();
      this.updateHighlightBorder();
    });

    this.gameModel.on("stock-recycled", () => {
      this.syncVisualPilesWithModel();
      this.layoutManager.updateVisualLayout();
      this.updateHighlightBorder();
    });

    this.gameModel.on("game-won", () => {
      console.log("Congratulations! You won!");
    });
  }

  /** Copies current card assignments from the logical model into Phaser piles. */
  private syncVisualPilesWithModel() {
    this.stockPile.playingCardVisuals.length = 0;
    this.wastePile.playingCardVisuals.length = 0;
    this.foundationPiles.forEach((p) => (p.playingCardVisuals.length = 0));
    this.tableauPiles.forEach((p) => (p.playingCardVisuals.length = 0));

    for (const card of this.gameModel.stock.getCards()) {
      const visual = this.cardVisualsMap.get(card.id);
      this.stockPile.playingCardVisuals.push(visual);
      visual.sprite.setFrame("card-back-blue");
      visual.sprite.setOrigin(0, 0);
    }

    for (const card of this.gameModel.waste.getCards()) {
      const visual = this.cardVisualsMap.get(card.id);
      this.wastePile.playingCardVisuals.push(visual);
      visual.sprite.setFrame(card.id);
      visual.sprite.setOrigin(0, 0);
    }

    for (let i = 0; i < this.gameModel.foundations.length; i++) {
      const modelPile = this.gameModel.foundations[i];
      const visualPile = this.foundationPiles[i];
      for (const card of modelPile.getCards()) {
        const visual = this.cardVisualsMap.get(card.id);
        visualPile.playingCardVisuals.push(visual);
        visual.sprite.setFrame(card.id);
        visual.sprite.setOrigin(0, 0);
      }
    }

    for (let i = 0; i < this.gameModel.tableaus.length; i++) {
      const modelPile = this.gameModel.tableaus[i];
      const visualPile = this.tableauPiles[i];
      for (const card of modelPile.getCards()) {
        const visual = this.cardVisualsMap.get(card.id);
        visualPile.playingCardVisuals.push(visual);
        visual.sprite.setFrame(card.faceUp ? card.id : "card-back-blue");
        visual.sprite.setOrigin(0, 0);
      }
    }

    this.updateCardCursors();
  }

  /**
   * Updates the hand cursor for each card sprite based on whether the card is currently interactable.
   */
  private updateCardCursors(): void {
    for (const visual of this.cardVisualsMap.values()) {
      if (visual.sprite && visual.sprite.input) {
        const interactable = this.gameModel.isCardInteractable(
          visual.playingCard,
        );
        visual.sprite.input.cursor = interactable ? "pointer" : "default";
      }
    }

    if (this.stockPile.sprite?.input) {
      const isEmpty = this.gameModel.stock.getCards().length === 0;
      this.stockPile.sprite.input.cursor = isEmpty ? "pointer" : "default";
    }
  }

  /**
   * Instantiates and registers the visual sprites for all playing cards in the game.
   */
  private createCardVisuals(): void {
    for (const cardId of ALL_PLAYING_CARD_IDS) {
      const fileName = playingCardIdToFileName(cardId);
      const cardModel = this.gameModel.getCardById(fileName);
      if (!cardModel) {
        throw new Error(`Card model not found for: ${fileName}`);
      }

      // Initially draw all cards face down using the card-back frame
      const sprite = this.add.sprite(0, 0, "card_assets", "card-back-blue");
      sprite.setOrigin(0, 0);

      const visual = new PlayingCardVisual(cardModel);
      visual.sprite = sprite;
      this.cardVisualsMap.set(cardModel.id, visual);

      // Make card sprite interactive for pointer events
      sprite.setInteractive({ useHandCursor: true });

      sprite.on("pointerover", () => {
        this.hoveredCardVisual = visual;
        this.updateHighlightBorder();
      });

      sprite.on("pointerout", () => {
        if (this.hoveredCardVisual === visual) {
          this.hoveredCardVisual = null;
          this.updateHighlightBorder();
        }
      });

      sprite.on("pointerdown", () => {
        const pile = this.gameModel.getPileContainingCard(
          visual.playingCard.id,
        );
        if (!pile) {
          throw new Error(`Card ${visual.playingCard.id} is not in a pile`);
        }

        if (pile.id === "stock") {
          const cards = pile.getCards();
          if (
            cards.length > 0 &&
            cards[cards.length - 1] === visual.playingCard
          ) {
            this.gameModel.drawCardsFromStock();
          }
        }
      });
    }
  }

  /**
   * Instantiates and registers the background sprites for the stock and tableau piles.
   */
  private createPileBackgroundSprites(): void {
    // Stock pile background
    const stockSprite = this.add.sprite(
      0,
      0,
      "card_assets",
      "card-placeholder",
    );
    stockSprite.setOrigin(0, 0);
    // Make stock pile placeholder interactive to allow recycling when stock is empty
    stockSprite.setInteractive({ useHandCursor: true });
    stockSprite.on("pointerdown", () => {
      if (this.gameModel.stock.getCards().length === 0) {
        this.gameModel.drawCardsFromStock();
      }
    });
    stockSprite.on("pointerover", () => {
      this.isStockBackgroundHovered = true;
      this.updateHighlightBorder();
    });
    stockSprite.on("pointerout", () => {
      this.isStockBackgroundHovered = false;
      this.updateHighlightBorder();
    });
    this.stockPile.sprite = stockSprite;

    // Tableau piles background
    for (const tableauPile of this.tableauPiles) {
      const tableauSprite = this.add.sprite(
        0,
        0,
        "card_assets",
        "card-placeholder",
      );
      tableauSprite.setOrigin(0, 0);
      tableauPile.sprite = tableauSprite;
    }
  }

  /**
   * Redraws the thick, rounded, semi-transparent yellow highlight border around the hovered card if it is interactable.
   */
  public updateHighlightBorder(): void {
    if (!this.highlightGraphics) {
      return;
    }
    this.highlightGraphics.clear();

    const stockEmpty = this.gameModel.stock.getCards().length === 0;
    if (this.isStockBackgroundHovered && stockEmpty) {
      const sprite = this.stockPile.sprite;
      if (sprite.active) {
        this.drawHighlight(sprite);
      }
      return;
    }

    if (!this.hoveredCardVisual) {
      return;
    }

    const card = this.hoveredCardVisual.playingCard;
    if (!this.gameModel.isCardInteractable(card)) {
      return;
    }

    const sprite = this.hoveredCardVisual.sprite;
    if (sprite.active) {
      this.drawHighlight(sprite);
    }
  }

  /**
   * Draws a thick, rounded, semi-transparent yellow highlight border around a sprite.
   *
   * @param sprite The sprite to highlight.
   */
  private drawHighlight(sprite: Phaser.GameObjects.Sprite): void {
    const scale = this.layoutManager.getScaleFactor();
    const width = sprite.displayWidth;
    const height = sprite.displayHeight;

    // Draw a thick, rounded, semi-transparent yellow border around the sprite
    const thickness = 10 * scale;
    const radius = 16 * scale;
    this.highlightGraphics.lineStyle(thickness, 0xebef9b, 0.8);
    this.highlightGraphics.strokeRoundedRect(
      sprite.x,
      sprite.y,
      width,
      height,
      radius,
    );
  }
}

/**
 * Maps a structural playing card identity to its corresponding frame name inside the texture atlas.
 *
 * @param playingCardId The suit and value of the card.
 * @returns The matching string filename key.
 */
function playingCardIdToFileName(playingCardId: PlayingCardId): string {
  function suitToFileName(suit: Suit) {
    switch (suit) {
      case Suit.SPADE:
        return "spades";
      case Suit.HEART:
        return "hearts";
      case Suit.DIAMOND:
        return "diamonds";
      case Suit.CLUB:
        return "clubs";
    }
    throw new Error(`Unknown Suit: ${suit as number}`);
  }

  function typeToFileName(type: Type) {
    switch (type) {
      case Type.ACE:
        return "ace";
      case Type.TWO:
        return "2";
      case Type.THREE:
        return "3";
      case Type.FOUR:
        return "4";
      case Type.FIVE:
        return "5";
      case Type.SIX:
        return "6";
      case Type.SEVEN:
        return "7";
      case Type.EIGHT:
        return "8";
      case Type.NINE:
        return "9";
      case Type.TEN:
        return "10";
      case Type.JACK:
        return "jack";
      case Type.QUEEN:
        return "queen";
      case Type.KING:
        return "king";
    }
    throw new Error(`Unknown Type: ${type as number}`);
  }

  return `card-${suitToFileName(playingCardId.suit)}-${typeToFileName(
    playingCardId.type,
  )}`;
}
