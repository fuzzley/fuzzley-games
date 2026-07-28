import { GameObjects, Scene, Scenes } from "phaser";

import { playingCardInstanceId } from "@/engine/core/card/playing_card";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { SolitaireGame } from "@/games/klondike/solitaire_game";
import { PhaserCardFactory } from "./phaser_card_factory";
import { BoardInputManager } from "./board_input_manager";
import { PhaserTableRenderer } from "./phaser_table_renderer";
import { PhaserSprites } from "./phaser_sprites";
import {
  TableInteractionState,
  TableViewState,
  Viewport,
} from "../view/table_view_state";
import { designSize } from "../layout/table_layout";
import { KLONDIKE_LAYOUT } from "@/games/klondike/klondike_layout";

/**
 * Produces the desired appearance of a board for one frame.
 *
 * The seam between the Phaser adapter and whatever game it is drawing: the
 * scene knows how to put sprites where a view state says, and nothing about
 * how that view state was decided.
 */
export type BuildTableViewState = (
  game: SolitaireGame,
  interaction: TableInteractionState,
  viewport: Viewport,
) => TableViewState;

/**
 * Handles rendering the fSolitaire game board using Phaser, reacting to
 * events emitted by the logical rules engine.
 */
export class BoardScene extends Scene implements PhaserSprites {
  /** Transparency (alpha) level for pile background placeholders. */
  public static readonly PILE_BACKGROUND_ALPHA = 0.5;

  /** The logical solitaire game rules and state engine. */
  public readonly gameModel: SolitaireGame;

  /** Card sprites, keyed by the card id the model gave them. */
  private readonly cardSprites = new Map<string, GameObjects.Sprite>();

  /**
   * Pile background placeholder sprites, keyed by pile id. Piles drawn without
   * a placeholder (the waste, which fans over bare table) are simply absent.
   */
  private readonly pileBackgrounds = new Map<string, GameObjects.Sprite>();

  /** Input handling manager for drag-and-drop and interaction. */
  private inputManager!: BoardInputManager;

  /** Factory for creating Phaser sprites. */
  private visualFactory!: PhaserCardFactory;

  /** Applier to commit calculated view states onto sprites and graphics. */
  private viewApplier!: PhaserTableRenderer;

  /** Produces the desired appearance of the board for one frame. */
  private readonly buildViewState: BuildTableViewState;

  /**
   * Constructs the board scene.
   *
   * @param gameModel The game model to render.
   * @param buildViewState Produces the desired appearance of the board for one
   *   frame. Handed in rather than imported: what a board looks like is a
   *   property of the game being played, and the Phaser adapter sits below the
   *   tier that knows about games.
   */
  constructor(gameModel: SolitaireGame, buildViewState: BuildTableViewState) {
    super("board-scene");

    this.gameModel = gameModel;
    this.buildViewState = buildViewState;
  }

  /**
   * Instantiates the sprites for the already-dealt model, registers model event
   * listeners, and draws the initial layout.
   *
   * Deliberately does not deal: the model arrives ready to play (see
   * {@link getGameModel}), so a scene restart re-renders the game in progress
   * instead of silently throwing it away.
   */
  create() {
    this.inputManager = new BoardInputManager(this);
    this.viewApplier = new PhaserTableRenderer(this);
    this.visualFactory = new PhaserCardFactory(
      this,
      () => this.gameModel.settings.cardBackStyle,
    );

    this.createPileBackgroundSprites();
    this.createCardSprites();
    this.setupEventListeners();

    // Apply the table background color and follow future changes (e.g. theme
    // switches from the Angular UI) through the shared model. Released on
    // shutdown: create() runs again on every scene restart, and without this
    // each restart would leave another live subscription holding the old scene.
    const backgroundSubscription =
      this.gameModel.settings.backgroundColor$.subscribe((color) => {
        this.cameras?.main?.setBackgroundColor(color);
      });
    this.events.once(Scenes.Events.SHUTDOWN, () => {
      backgroundSubscription.unsubscribe();
    });

    this.inputManager.snapAll = true;

    this.scale.on("resize", () => {
      this.inputManager.snapAll = true;
    });

    this.inputManager.registerDragListeners();

    // Hit test every frame rather than only when the pointer itself moves.
    // Cards move under a stationary pointer all the time — a stock draw slides
    // the card out from under it — and without polling Phaser never re-runs the
    // test, so the hover would stay attached to a card that has left.
    this.input.setPollAlways();
  }

  /** Registers listeners on the game model to update graphics dynamically. */
  private setupEventListeners() {
    this.gameModel.on("game-reset", () => {
      this.inputManager.resetInteraction();
    });
  }

  /** Instantiates and registers a sprite for every playing card in the game. */
  private createCardSprites(): void {
    for (const cardId of ALL_PLAYING_CARD_IDS) {
      const id = playingCardInstanceId(cardId);
      if (!this.gameModel.getCardById(id)) {
        throw new Error(`Card model not found for: ${id}`);
      }

      const sprite = this.visualFactory.createCardSprite();
      this.cardSprites.set(id, sprite);

      sprite.setData("cardId", id);
      this.inputManager.registerCardListeners(sprite, id);
    }
  }

  /**
   * Instantiates and registers the background sprites for the stock, foundation
   * and tableau piles.
   */
  private createPileBackgroundSprites(): void {
    const alpha = BoardScene.PILE_BACKGROUND_ALPHA;

    const stockSprite = this.visualFactory.createStockBackground(alpha);
    this.inputManager.registerStockBackgroundListeners(stockSprite);
    this.pileBackgrounds.set(this.gameModel.stock.id, stockSprite);

    for (const foundation of this.gameModel.foundations) {
      this.pileBackgrounds.set(
        foundation.id,
        this.visualFactory.createFoundationBackground(alpha),
      );
    }

    for (const tableau of this.gameModel.tableaus) {
      this.pileBackgrounds.set(
        tableau.id,
        this.visualFactory.createTableauBackground(alpha),
      );
    }
  }

  // --- PhaserSprites ---

  /** @inheritDoc */
  public cardSprite(cardId: string): GameObjects.Sprite | undefined {
    return this.cardSprites.get(cardId);
  }

  /** @inheritDoc */
  public pileBackgroundSprite(pileId: string): GameObjects.Sprite | undefined {
    return this.pileBackgrounds.get(pileId);
  }

  /** @inheritDoc */
  public addGraphics(): GameObjects.Graphics {
    return this.add.graphics();
  }

  /** @inheritDoc */
  public setDraggable(sprite: GameObjects.Sprite, draggable: boolean): void {
    this.input.setDraggable(sprite, draggable);
  }

  /** Every registered card id, for callers that walk the whole board. */
  public get cardIds(): Iterable<string> {
    return this.cardSprites.keys();
  }

  /**
   * Device pixels per CSS pixel for the canvas, taken from the scale manager so
   * layout uses exactly the ratio Phaser converts pointer coordinates by.
   */
  public get pixelRatio(): number {
    const displayScale = this.scale?.displayScale?.x;
    return displayScale && Number.isFinite(displayScale) ? displayScale : 1;
  }

  /**
   * The drawable area the board lays itself out within, falling back to the
   * design size before the scale manager has sized the canvas.
   */
  public get viewport(): Viewport {
    const design = designSize(KLONDIKE_LAYOUT);
    return {
      width: this.scale?.width || design.width,
      height: this.scale?.height || design.height,
      pixelRatio: this.pixelRatio,
    };
  }

  /**
   * Phaser scene update lifecycle hook. Automatically invoked every frame to compute and
   * apply the desired board view state.
   */
  override update(_timeMs: number, deltaMs: number): void {
    if (!this.inputManager || !this.viewApplier) return;

    const state = this.buildViewState(
      this.gameModel,
      this.inputManager.interaction,
      this.viewport,
    );
    this.viewApplier.apply(state, deltaMs);

    // A flying stack is lifted above the board for as long as it is crossing
    // it. Only the applier eases the sprites, so it is the one that knows when
    // they have arrived and the stack can settle into its pile's own order.
    const flight = this.inputManager.flight;
    if (flight && !this.viewApplier.areCardsTravelling(flight.cardIds)) {
      this.inputManager.endFlight();
    }

    if (this.inputManager.snapAll) {
      this.inputManager.snapAll = false;
    }
  }
}
