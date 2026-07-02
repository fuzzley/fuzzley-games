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
  | StockPileVisual
  | WastePileVisual
  | FoundationPileVisual
  | TableauPileVisual;

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
  public readonly stockPile = new StockPileVisual();
  /** Visual representation of the waste pile. */
  public readonly wastePile = new WastePileVisual();

  /** Visual representations of the four foundation piles. */
  public readonly foundationPiles = [
    new FoundationPileVisual(),
    new FoundationPileVisual(),
    new FoundationPileVisual(),
    new FoundationPileVisual(),
  ];

  /** Visual representations of the seven tableau piles. */
  public readonly tableauPiles = [
    new TableauPileVisual(),
    new TableauPileVisual(),
    new TableauPileVisual(),
    new TableauPileVisual(),
    new TableauPileVisual(),
    new TableauPileVisual(),
    new TableauPileVisual(),
  ];

  /** Layout coordinator for positioning piles and card sprites. */
  private readonly layoutManager = new BoardLayoutManager(this);

  /** Constructs the board scene. */
  constructor() {
    super("board-scene");
  }

  /**
   * Initializes the game state model, instantiates card sprites,
   * registers model event listeners, and draws the initial layout.
   */
  create() {
    this.registerPileVisuals();
    this.createCardVisuals();
    this.setupEventListeners();

    this.gameModel.startNewGame();

    this.syncVisualPilesWithModel();
    this.layoutManager.createInitialLayout();
    this.layoutManager.updateVisualLayout();
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
    this.gameModel.on("card-moved", ({ cardId, fromPileId, toPileId }) => {
      const visualCard = this.cardVisualsMap.get(cardId);
      const fromPileVisual = this.getPileVisualById(fromPileId);
      const toPileVisual = this.getPileVisualById(toPileId);

      if (visualCard && fromPileVisual && toPileVisual) {
        const index = fromPileVisual.playingCardVisuals.indexOf(visualCard);
        if (index > -1) {
          fromPileVisual.playingCardVisuals.splice(index, 1);
        }

        toPileVisual.playingCardVisuals.push(visualCard);

        this.layoutManager.updateVisualLayout();
      }
    });

    this.gameModel.on("card-flipped", ({ cardId, faceUp }) => {
      const visualCard = this.cardVisualsMap.get(cardId);
      if (visualCard && visualCard.sprite) {
        const frame = faceUp ? cardId : "card-back-blue";
        visualCard.sprite.setFrame(frame);
      }
    });

    this.gameModel.on("stock-recycled", () => {
      this.stockPile.playingCardVisuals.length = 0;
      this.wastePile.playingCardVisuals.length = 0;
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
      if (visual) {
        this.stockPile.playingCardVisuals.push(visual);
        visual.sprite.setFrame("card-back-blue");
      }
    }

    for (const card of this.gameModel.waste.getCards()) {
      const visual = this.cardVisualsMap.get(card.id);
      if (visual) {
        this.wastePile.playingCardVisuals.push(visual);
        visual.sprite.setFrame(card.id);
      }
    }

    for (let i = 0; i < this.gameModel.foundations.length; i++) {
      const modelPile = this.gameModel.foundations[i];
      const visualPile = this.foundationPiles[i];
      for (const card of modelPile.getCards()) {
        const visual = this.cardVisualsMap.get(card.id);
        if (visual) {
          visualPile.playingCardVisuals.push(visual);
          visual.sprite.setFrame(card.id);
        }
      }
    }

    for (let i = 0; i < this.gameModel.tableaus.length; i++) {
      const modelPile = this.gameModel.tableaus[i];
      const visualPile = this.tableauPiles[i];
      for (const card of modelPile.getCards()) {
        const visual = this.cardVisualsMap.get(card.id);
        if (visual) {
          visualPile.playingCardVisuals.push(visual);
          visual.sprite.setFrame(card.faceUp ? card.id : "card-back-blue");
        }
      }
    }
  }

  /**
   * Instantiates and registers the visual sprites for all playing cards in the game.
   */
  private createCardVisuals(): void {
    for (const cardId of ALL_PLAYING_CARD_IDS) {
      const fileName = playingCardIdToFileName(cardId);
      const cardModel = this.gameModel.getCardById(fileName);
      if (cardModel) {
        // Initially draw all cards face down using the card-back frame
        const sprite = this.add.sprite(0, 0, "card_assets", "card-back-blue");
        sprite.setOrigin(0, 0);

        const visual = new PlayingCardVisual(cardModel);
        visual.sprite = sprite;
        this.cardVisualsMap.set(cardModel.id, visual);
      }
    }
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
