import * as Phaser from "phaser";
import { Scene } from "phaser";

import { ALL_PLAYING_CARD_IDS } from "@/game/model/card/playing_card";
import { BoardLayoutManager } from "./layout/board_layout_manager";
import { StockPileVisual } from "../../visual/pile/stock_pile_visual";
import { WastePileVisual } from "../../visual/pile/waste_pile_visual";
import { FoundationPileVisual } from "../../visual/pile/foundation_pile_visual";
import { TableauPileVisual } from "../../visual/pile/tableau_pile_visual";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { PlayingCardVisual } from "../../visual/card/playing_card_visual";
import { playingCardIdToFileName } from "../../asset/card_assets";
import { BoardVisualFactory } from "./board_visual_factory";
import { BoardInputManager } from "./input/board_input_manager";
import { BoardHighlightRenderer } from "./effects/board_highlight_renderer";

/** Union type representing any visual pile wrapper. */
export type PileVisual =
  StockPileVisual | WastePileVisual | FoundationPileVisual | TableauPileVisual;

/**
 * Handles rendering the fSolitaire game board using Phaser, reacting to
 * events emitted by the logical rules engine.
 */
export class BoardScene extends Scene {
  /** Transparency (alpha) level for pile background placeholders. */
  public static readonly PILE_BACKGROUND_ALPHA = 0.5;

  /** The logical solitaire game rules and state engine. */
  public readonly gameModel: SolitaireGame = new SolitaireGame();

  /** Registry of visual cards mapped by their unique string ID. */
  public readonly cardVisualsMap = new Map<string, PlayingCardVisual>();

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

  /** Graphic rendering manager for card/pile hover highlighting. */
  private highlightRenderer!: BoardHighlightRenderer;

  /** Input handling manager for drag-and-drop and interaction. */
  private inputManager!: BoardInputManager;

  /** Factory for creating Phaser sprites. */
  private visualFactory!: BoardVisualFactory;

  /** Constructs the board scene. */
  constructor() {
    super("board-scene");
  }

  /** Gets the layout manager helper instance. */
  public getLayoutManager(): BoardLayoutManager {
    return this.layoutManager;
  }

  /** Getter for highlightGraphics to preserve backward compatibility (e.g. for unit tests). */
  public get highlightGraphics(): Phaser.GameObjects.Graphics {
    return this.highlightRenderer.graphics;
  }
  public set highlightGraphics(val: Phaser.GameObjects.Graphics) {
    this.highlightRenderer.graphics = val;
  }

  /** Getter for hoveredCardVisual to preserve backward compatibility (e.g. for unit tests). */
  public get hoveredCardVisual(): PlayingCardVisual | null {
    return this.inputManager.hoveredCardVisual;
  }
  public set hoveredCardVisual(val: PlayingCardVisual | null) {
    this.inputManager.hoveredCardVisual = val;
  }

  /** Getter for isStockBackgroundHovered to preserve backward compatibility (e.g. for unit tests). */
  public get isStockBackgroundHovered(): boolean {
    return this.inputManager.isStockBackgroundHovered;
  }
  public set isStockBackgroundHovered(val: boolean) {
    this.inputManager.isStockBackgroundHovered = val;
  }

  /** Getter for draggedStack to preserve backward compatibility (e.g. for unit tests). */
  public get draggedStack(): PlayingCardVisual[] {
    return this.inputManager.draggedStack;
  }
  public set draggedStack(val: PlayingCardVisual[]) {
    this.inputManager.draggedStack = val;
  }

  /** Getter for draggedStackOffsets to preserve backward compatibility (e.g. for unit tests). */
  public get draggedStackOffsets(): { x: number; y: number }[] {
    return this.inputManager.draggedStackOffsets;
  }
  public set draggedStackOffsets(val: { x: number; y: number }[]) {
    this.inputManager.draggedStackOffsets = val;
  }

  /**
   * Initializes the game state model, instantiates card sprites,
   * registers model event listeners, and draws the initial layout.
   */
  create() {
    this.highlightRenderer = new BoardHighlightRenderer(this);
    this.inputManager = new BoardInputManager(this);
    this.visualFactory = new BoardVisualFactory(this);

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

    this.inputManager.registerDragListeners();
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
      if (visualCard && visualCard.sprite) {
        const frame = faceUp ? cardId : this.gameModel.settings.cardBackStyle;
        visualCard.sprite.setFrame(frame);
        visualCard.sprite.setOrigin(0, 0);
      }
      this.updateCardCursors();
      this.updateHighlightBorder();
    });

    this.gameModel.on("card-back-changed", () => {
      this.syncVisualPilesWithModel();
      this.layoutManager.updateVisualLayout();
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
      if (visual) {
        this.stockPile.playingCardVisuals.push(visual);
        visual.sprite.setFrame(this.gameModel.settings.cardBackStyle);
        visual.sprite.setOrigin(0, 0);
      }
    }

    for (const card of this.gameModel.waste.getCards()) {
      const visual = this.cardVisualsMap.get(card.id);
      if (visual) {
        this.wastePile.playingCardVisuals.push(visual);
        visual.sprite.setFrame(card.id);
        visual.sprite.setOrigin(0, 0);
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
          visual.sprite.setOrigin(0, 0);
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
          visual.sprite.setFrame(
            card.faceUp ? card.id : this.gameModel.settings.cardBackStyle,
          );
          visual.sprite.setOrigin(0, 0);
        }
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
        const draggable = this.gameModel.isCardDraggable(visual.playingCard);
        this.input.setDraggable(visual.sprite, draggable);
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

      const sprite = this.visualFactory.createCardSprite();
      const visual = new PlayingCardVisual(cardModel);
      visual.sprite = sprite;
      this.cardVisualsMap.set(cardModel.id, visual);

      sprite.setData("cardVisual", visual);
      this.inputManager.registerCardListeners(sprite, visual);
    }
  }

  /**
   * Instantiates and registers the background sprites for the stock and tableau piles.
   */
  private createPileBackgroundSprites(): void {
    // Stock pile background
    const stockSprite = this.visualFactory.createStockBackground(
      BoardScene.PILE_BACKGROUND_ALPHA,
    );
    this.inputManager.registerStockBackgroundListeners(stockSprite);
    this.stockPile.sprite = stockSprite;

    // Tableau piles background
    for (const tableauPile of this.tableauPiles) {
      tableauPile.sprite = this.visualFactory.createTableauBackground(
        BoardScene.PILE_BACKGROUND_ALPHA,
      );
    }

    // Foundation piles background
    for (const foundationPile of this.foundationPiles) {
      foundationPile.sprite = this.visualFactory.createFoundationBackground(
        BoardScene.PILE_BACKGROUND_ALPHA,
      );
    }
  }

  /**
   * Redraws the highlight border around the hovered card or stock pile background if it is interactable.
   */
  public updateHighlightBorder(): void {
    this.highlightRenderer.update(
      this.inputManager.hoveredCardVisual,
      this.inputManager.isStockBackgroundHovered,
      this.inputManager.draggedStack.length > 0,
    );
  }
}
