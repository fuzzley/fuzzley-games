import { GameObjects, Scene, Scenes } from "phaser";

import { PhaserCardFactory } from "./phaser_card_factory";
import { BoardInputManager } from "./board_input_manager";
import { PhaserTableRenderer } from "./phaser_table_renderer";
import { PhaserSprites } from "./phaser_sprites";
import { StackFromCard } from "../input/drag_controller";
import { IntentHandler } from "../input/table_intents";
import {
  DragInteraction,
  PileGeometry,
  TableInteractionState,
  TableViewState,
  Viewport,
} from "../view/table_view_state";
import { TableLayoutSpec, designSize } from "../layout/table_layout";
import { TableView } from "@/engine/tableau/view/table_view";

/**
 * Produces the desired appearance of a board for one frame.
 *
 * The seam between the Phaser adapter and whatever game it is drawing: the
 * scene knows how to put sprites where a view state says, and nothing about
 * how that view state was decided.
 */
export type BuildTableViewState = (
  interaction: TableInteractionState,
  viewport: Viewport,
) => TableViewState;

/**
 * Resolves the pile a drag would land on.
 *
 * Handed in for the same reason as {@link BuildTableViewState}: where a card
 * may go is a property of the game, and the Phaser adapter sits below the tier
 * that knows about games.
 */
export type ResolveDropTarget = (
  drag: DragInteraction,
  viewport: Viewport,
) => PileGeometry | null;

/**
 * Subscribes to a value the board follows, returning a function that stops
 * following it.
 *
 * A plain callback rather than an observable because the render tier may not
 * name a reactive library: whatever the game publishes with, it adapts to this.
 */
export type Subscribe<T> = (listener: (value: T) => void) => () => void;

/** Everything a board scene needs from the game it is drawing. */
export interface BoardSceneOptions {
  /** The game to draw, read through its narrow view. */
  readonly game: TableView;
  /** The id of every card that needs a sprite. */
  readonly cardIds: readonly string[];
  /** The board's grid, for sizing before the canvas has been measured. */
  readonly layout: TableLayoutSpec;
  /** Produces the desired appearance of the board for one frame. */
  readonly buildViewState: BuildTableViewState;
  /** Resolves the pile a drag would land on. */
  readonly resolveDropTarget: ResolveDropTarget;
  /** Carries out what a press or a drop means in this game. */
  readonly handleIntent: IntentHandler;
  /** The cards that travel with the one being dragged. */
  readonly stackFromCard: StackFromCard;
  /** The artwork key for the back of a card, read when a sprite is made. */
  readonly cardBackKey: () => string;
  /** Follows the table colour. */
  readonly onBackgroundColor: Subscribe<string>;
  /** Follows new deals, so stale interaction state does not survive one. */
  readonly onReset: Subscribe<void>;
  /**
   * Follows the cards each action relocates, so every one of them is lifted
   * clear of the board while it crosses it.
   *
   * The model is asked rather than the gesture map, because the model is the
   * only thing that knows: a draw, a recycle, a dealt row and an undo all move
   * cards without any gesture having decided which.
   */
  readonly onCardsRelocated: Subscribe<readonly string[]>;
  /** Notifies when the board scene finishes initial sprite setup and is ready to render. */
  readonly onReady?: () => void;
}

/**
 * Handles rendering the fSolitaire game board using Phaser, reacting to
 * events emitted by the logical rules engine.
 */
export class BoardScene extends Scene implements PhaserSprites {
  /** Transparency (alpha) level for pile background placeholders. */
  public static readonly PILE_BACKGROUND_ALPHA = 0.5;

  /**
   * The game being drawn, read through its narrow view.
   *
   * Named `tableGame` rather than `game` because Phaser's Scene already has a
   * `game`, and that one is the Phaser.Game running the canvas.
   */
  public readonly tableGame: TableView;

  /** Everything this scene was told about the game it draws. */
  private readonly options: BoardSceneOptions;

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

  /**
   * Constructs the board scene.
   *
   * @param options Everything the scene needs from the game it draws. Handed in
   *   rather than imported: which cards exist, what a press means and where a
   *   drop lands are all properties of the game, and the Phaser adapter sits
   *   below the tier that knows about games.
   */
  constructor(options: BoardSceneOptions) {
    super("board-scene");

    this.options = options;
    this.tableGame = options.game;
  }

  /** Resolves the pile a drag would land on. */
  public get resolveDropTarget(): ResolveDropTarget {
    return this.options.resolveDropTarget;
  }

  /** Carries out what a press or a drop means in this game. */
  public get handleIntent(): IntentHandler {
    return this.options.handleIntent;
  }

  /** The cards that travel with the one being dragged. */
  public get stackFromCard(): StackFromCard {
    return this.options.stackFromCard;
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
    this.visualFactory = new PhaserCardFactory(this, this.options.cardBackKey);

    this.createPileBackgroundSprites();
    this.createCardSprites();

    // Apply the table background color and follow future changes (e.g. theme
    // switches from the Angular UI) through the shared model. Released on
    // shutdown: create() runs again on every scene restart, and without this
    // each restart would leave another live subscription holding the old scene.
    const stopFollowingColor = this.options.onBackgroundColor((color) => {
      this.cameras?.main?.setBackgroundColor(color);
    });
    const stopFollowingResets = this.options.onReset(() => {
      this.inputManager.resetInteraction();
    });
    const stopFollowingRelocations = this.options.onCardsRelocated(
      (cardIds) => {
        this.inputManager.beginFlight(cardIds);
      },
    );
    this.events.once(Scenes.Events.SHUTDOWN, () => {
      stopFollowingColor();
      stopFollowingResets();
      stopFollowingRelocations();
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

    this.options.onReady?.();
  }

  /** Instantiates and registers a sprite for every playing card in the game. */
  private createCardSprites(): void {
    for (const id of this.options.cardIds) {
      if (!this.tableGame.getCardById(id)) {
        throw new Error(`Card model not found for: ${id}`);
      }

      const sprite = this.visualFactory.createCardSprite();
      this.cardSprites.set(id, sprite);

      sprite.setData("cardId", id);
      this.inputManager.registerCardListeners(sprite, id);
    }
  }

  /**
   * Instantiates a background sprite for every pile whose zone declares one.
   *
   * Which piles have a placeholder, what it looks like, and whether pressing it
   * does anything are all read from the zones, so the scene creates the same
   * sprites for any game without knowing what the piles are for.
   */
  private createPileBackgroundSprites(): void {
    const alpha = BoardScene.PILE_BACKGROUND_ALPHA;

    for (const pile of this.tableGame.piles) {
      const zone = this.tableGame.zoneFor(pile.id);
      if (!zone?.backgroundKey) continue;

      const sprite = this.visualFactory.createPileBackground(
        zone.backgroundKey,
        alpha,
        zone.emptyIsActionable ?? false,
      );
      this.pileBackgrounds.set(pile.id, sprite);
      if (zone.emptyIsActionable) {
        this.inputManager.registerPileBackgroundListeners(sprite, pile.id);
      }
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
    const design = designSize(this.options.layout);
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

    const state = this.options.buildViewState(
      this.inputManager.interaction,
      this.viewport,
    );
    this.viewApplier.apply(state, deltaMs);

    // A flying stack is lifted above the board for as long as it is crossing
    // it. Only the applier eases the sprites, so it is the one that knows when
    // they have arrived and the stack can settle into its pile's own order.
    // Each flight is retired on its own: one landing says nothing about
    // another still on its way.
    for (const flight of [...this.inputManager.flights]) {
      if (!this.viewApplier.areCardsTravelling(flight.cardIds)) {
        this.inputManager.endFlight(flight);
      }
    }

    if (this.inputManager.snapAll) {
      this.inputManager.snapAll = false;
    }
  }
}
