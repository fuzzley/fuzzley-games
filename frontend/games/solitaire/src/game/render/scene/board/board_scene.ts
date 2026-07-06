import { Scene } from "phaser";

import {
  ALL_PLAYING_CARD_IDS,
  PlayingCard,
} from "@/game/model/card/playing_card";
import { StockPileVisual } from "../../visual/pile/stock_pile_visual";
import { WastePileVisual } from "../../visual/pile/waste_pile_visual";
import { FoundationPileVisual } from "../../visual/pile/foundation_pile_visual";
import { TableauPileVisual } from "../../visual/pile/tableau_pile_visual";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { getGameModel } from "@/game/model/game/game_model_factory";
import { PlayingCardVisual } from "../../visual/card/playing_card_visual";
import { playingCardIdToFileName } from "../../asset/card_assets";
import { BoardVisualFactory } from "./board_visual_factory";
import { BoardInputManager } from "./input/board_input_manager";
import { BoardViewApplier } from "./view/board_view_applier";
import { buildBoardViewState } from "./view/board_view_state_builder";
import {
  DESIGN_WIDTH_PX,
  DESIGN_HEIGHT_PX,
} from "./layout/board_layout_constants";

/**
 * Handles rendering the fSolitaire game board using Phaser, reacting to
 * events emitted by the logical rules engine.
 */
export class BoardScene extends Scene {
  /** Transparency (alpha) level for pile background placeholders. */
  public static readonly PILE_BACKGROUND_ALPHA = 0.5;

  /** The logical solitaire game rules and state engine. */
  public readonly gameModel: SolitaireGame;

  /** Registry of visual cards mapped by their unique string ID. */
  public readonly cardVisualsMap = new Map<string, PlayingCardVisual>();

  /** Visual representation of the stock pile. */
  public readonly stockPile: StockPileVisual;
  /** Visual representation of the waste pile. */
  public readonly wastePile: WastePileVisual;

  /** Visual representations of the four foundation piles. */
  public readonly foundationPiles: FoundationPileVisual[];

  /** Visual representations of the seven tableau piles. */
  public readonly tableauPiles: TableauPileVisual[];

  /** Input handling manager for drag-and-drop and interaction. */
  private inputManager!: BoardInputManager;

  /** Factory for creating Phaser sprites. */
  private visualFactory!: BoardVisualFactory;

  /** Applier to commit calculated view states onto sprites and graphics. */
  private viewApplier!: BoardViewApplier;

  /**
   * Constructs the board scene.
   *
   * @param gameModel The shared game model to render. Defaults to the shared
   *   singleton so Phaser can construct the scene with no arguments, and is
   *   injectable so tests can supply their own model.
   */
  constructor(gameModel: SolitaireGame = getGameModel()) {
    super("board-scene");

    this.gameModel = gameModel;
    this.stockPile = new StockPileVisual(gameModel.stock);
    this.wastePile = new WastePileVisual(
      gameModel.waste,
      [],
      () => gameModel.settings.drawCount,
    );
    this.foundationPiles = gameModel.foundations.map(
      (pile) => new FoundationPileVisual(pile),
    );
    this.tableauPiles = gameModel.tableaus.map(
      (pile) => new TableauPileVisual(pile),
    );
  }

  /**
   * Initializes the game state model, instantiates card sprites,
   * registers model event listeners, and draws the initial layout.
   */
  create() {
    this.inputManager = new BoardInputManager(this);
    this.viewApplier = new BoardViewApplier(this);
    this.visualFactory = new BoardVisualFactory(
      this,
      () => this.gameModel.settings.cardBackStyle,
    );

    this.gameModel.startNewGame();
    this.createPileBackgroundSprites();
    this.createCardVisuals();
    this.setupEventListeners();

    // Apply the table background color and follow future changes (e.g. theme
    // switches from the Angular UI) through the shared model.
    this.gameModel.settings.backgroundColor$.subscribe((color) => {
      this.cameras?.main?.setBackgroundColor(color);
    });

    if (this.inputManager) {
      this.inputManager.snapAll = true;
    }

    this.scale.on("resize", () => {
      if (this.inputManager) {
        this.inputManager.snapAll = true;
      }
    });

    this.inputManager.registerDragListeners();
  }

  /** Registers listeners on the game model to update graphics dynamically. */
  private setupEventListeners() {
    this.gameModel.on("game-reset", () => {
      if (this.inputManager) {
        this.inputManager.hoveredCardVisual = null;
        this.inputManager.isStockBackgroundHovered = false;
        this.inputManager.drag = null;
        this.inputManager.draggedStack = [];
        this.inputManager.draggedStackOffsets = [];
        this.inputManager.snapAll = true;
      }
    });
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
   * Phaser scene update lifecycle hook. Automatically invoked every frame to compute and
   * apply the desired board view state.
   */
  override update(time: number, delta: number): void {
    if (!this.inputManager || !this.viewApplier) return;

    const viewport = {
      width: this.scale?.width || DESIGN_WIDTH_PX,
      height: this.scale?.height || DESIGN_HEIGHT_PX,
    };

    const interaction = {
      hoveredCardId:
        this.inputManager.hoveredCardVisual?.playingCard.id ?? null,
      isStockBackgroundHovered: this.inputManager.isStockBackgroundHovered,
      drag: this.inputManager.drag,
      snapAll: this.inputManager.snapAll,
    };

    const state = buildBoardViewState(this.gameModel, interaction, viewport);
    this.viewApplier.apply(state, delta);

    if (this.inputManager.snapAll) {
      this.inputManager.snapAll = false;
    }
  }
}
