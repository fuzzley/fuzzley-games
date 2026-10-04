import { GameObjects, Renderer, Scene, Scenes } from "phaser";

import { BoardDeckLoader } from "./board_deck_loader";
import { PhaserCardFactory } from "./phaser_card_factory";
import { BoardInputManager } from "./board_input_manager";
import { PhaserTableRenderer } from "./phaser_table_renderer";
import { PhaserSprites } from "./phaser_sprites";
import { DragController, StackFromCard } from "../input/drag_controller";
import { IntentHandler } from "../input/table_intents";
import {
  DragInteraction,
  Insets,
  NO_INSETS,
  PileBackgroundSpec,
  PileGeometry,
  TableInteractionState,
  TableViewState,
  Viewport,
} from "../view/table_view_state";
import {
  TableLayoutSpec,
  TableMetrics,
  designSize,
} from "../layout/table_layout";
import { CardArtScale, cardArtScaleFor } from "../layout/card_metrics";
import { Subscribe } from "@/engine/core/common/event_emitter";
import { CardDeckStatus, TablePresentation } from "../presentation";
import {
  CardAtlas,
  cardAtlasTextureKey,
  chooseCardAtlas,
  loadCardAtlas,
  residentCardAtlases,
  sameCardAtlas,
} from "./card_deck_atlas";

/** Produces the desired appearance of a board for one frame. */
export type BuildTableViewState = (
  interaction: TableInteractionState,
  viewport: Viewport,
) => TableViewState;

/** Resolves the pile a drag would land on. */
export type ResolveDropTarget = (
  drag: DragInteraction,
  viewport: Viewport,
) => PileGeometry | null;

/** Gives a board scene everything it needs from the game it draws. */
export interface BoardSceneOptions {
  /** The id of every card that needs a sprite. */
  readonly cardIds: readonly string[];
  /** The placeholder drawn beneath each pile that has one. */
  readonly backgrounds: readonly PileBackgroundSpec[];
  /** The board's roomy grid, for sizing before the canvas has been measured. */
  readonly layout: TableLayoutSpec;
  /** Measures the board on whichever grid a viewport calls for. */
  readonly measure: (viewport: Viewport) => TableMetrics;
  /** Produces the desired appearance of the board for one frame. */
  readonly buildViewState: BuildTableViewState;
  /** Resolves the pile a drag would land on. */
  readonly resolveDropTarget: ResolveDropTarget;
  /** Carries out what a press or a drop means in this game. */
  readonly handleIntent: IntentHandler;
  /** The cards that travel with the one being dragged. */
  readonly stackFromCard: StackFromCard;
  /**
   * How the player has asked the table to look: the card back, read when a
   * sprite is made; the deck, which the scene boots on if it is loaded and
   * loads first if no deck is; and the table colour. The scene reports back
   * which deck it is drawing.
   */
  readonly presentation: TablePresentation;
  /** Follows new deals, so stale interaction state does not survive one. */
  readonly onReset: Subscribe<void>;
  /**
   * Follows the cards each action relocates, so each is lifted clear of the
   * board while it crosses it.
   */
  readonly onCardsRelocated: Subscribe<readonly string[]>;
  /** Called once the scene has made its sprites and drawn its first frame. */
  readonly onReady?: () => void;
  /**
   * Returns how far in from each edge of the canvas whatever the shell lays
   * over it reaches, such as its header, in CSS pixels; none when omitted.
   */
  readonly insets?: () => Insets;
}

/** Draws a game's board with Phaser and turns pointer input into intents. */
export class BoardScene extends Scene implements PhaserSprites {
  /** Transparency (alpha) level for pile background placeholders. */
  public static readonly PILE_BACKGROUND_ALPHA = 0.5;

  /** How many boards have been built, which numbers each one's key. */
  private static boardsBuilt = 0;

  /**
   * The key the scene is registered under, which no other board shares.
   *
   * Unique because a board is swapped into a running game, and Phaser throws on
   * a key already in use, which an add queued ahead of a remove would hit.
   */
  public readonly key: string;

  /** Everything this scene was told about the game it draws. */
  private readonly options: BoardSceneOptions;

  /** Card sprites, keyed by the card id the model gave them. */
  private readonly cardSprites = new Map<string, GameObjects.Sprite>();

  /** The shadow each card casts, keyed by the card id the model gave them. */
  private readonly cardShadows = new Map<string, GameObjects.Sprite>();

  /** Placeholder sprites, keyed by pile id, for the piles that have one. */
  private readonly pileBackgrounds = new Map<string, GameObjects.Sprite>();

  /** The loader for the deck the board is drawn from. */
  private deckLoader!: BoardDeckLoader;

  /** What the pointer is doing to the table, which each frame is drawn from. */
  private controller!: DragController;

  /** The bridge from Phaser's pointer events to the drag controller. */
  private inputManager!: BoardInputManager;

  /** Factory for creating Phaser sprites. */
  private visualFactory!: PhaserCardFactory;

  /** Applies each frame's view state to the sprites. */
  private viewApplier!: PhaserTableRenderer;

  /** Creates a scene that draws the game `options` describes. */
  constructor(options: BoardSceneOptions) {
    const key = `board-scene-${++BoardScene.boardsBuilt}`;
    super(key);

    this.key = key;
    this.options = options;
  }

  /** Loads the deck the player chose, unless a deck is loaded to boot on. */
  preload() {
    if (this.bootAtlas() === null) {
      loadCardAtlas(this.load, this.wantedAtlas());
    }
  }

  /** Returns the chosen deck at the density the board's size calls for. */
  private wantedAtlas(): CardAtlas {
    return {
      deckId: this.options.presentation.cardDeckId(),
      artScale: this.wantedArtScale(),
    };
  }

  /**
   * Returns the atlas to draw the board from at first: the chosen deck if it is
   * loaded dense enough, or else any atlas that is loaded, preferring the
   * chosen deck, which the board leaves as soon as the one it wants arrives.
   */
  private bootAtlas(): CardAtlas | null {
    const wanted = this.wantedAtlas();
    const resident = residentCardAtlases(this.textures);
    const chosen = chooseCardAtlas(wanted.deckId, wanted.artScale, resident);
    return (
      resident.find((atlas) => sameCardAtlas(atlas, chosen)) ??
      resident.find((atlas) => atlas.deckId === wanted.deckId) ??
      resident[0] ??
      null
    );
  }

  /**
   * Returns the density the board's current size calls for, measured as the
   * view is, so the cards are never drawn larger than their artwork.
   */
  public wantedArtScale(): CardArtScale {
    return cardArtScaleFor(this.options.measure(this.viewport).scale);
  }

  /**
   * Makes the sprites for the already-dealt game and starts following it.
   *
   * It does not deal, so a scene restart redraws the game in progress rather
   * than throwing it away.
   */
  create() {
    this.createCollaborators();
    this.createPileBackgroundSprites();
    this.createCardSprites();
    this.followTheModel();
    this.redrawShadowAfterContextLoss();
    this.wireInput();

    this.events.once(Scenes.Events.POST_UPDATE, () => {
      this.options.onReady?.();
    });
  }

  /** Creates the objects that do the scene's work. */
  private createCollaborators(): void {
    this.deckLoader = new BoardDeckLoader(
      this,
      // The chosen deck, even if its load failed, so the board still reports
      // a deck when there is none to draw.
      this.bootAtlas() ?? this.wantedAtlas(),
    );
    this.controller = new DragController(
      this.options.handleIntent,
      this.options.stackFromCard,
    );
    this.inputManager = new BoardInputManager(
      {
        input: this.input,
        // The same resolver the view builder previews with, so the card lands
        // on the pile the border promised it would.
        dropTargetFor: (drag) =>
          this.options.resolveDropTarget(drag, this.viewport)?.pileId ?? null,
      },
      this.controller,
    );
    this.viewApplier = new PhaserTableRenderer(this);
    this.visualFactory = new PhaserCardFactory(
      this,
      () => this.options.presentation.cardBackKey(),
      () => cardAtlasTextureKey(this.deckLoader.atlas),
      () => this.deckLoader.atlas.artScale,
    );
  }

  /**
   * Runs `release` once, when the scene shuts down or is destroyed, whichever
   * comes first.
   *
   * Both, because Phaser destroys a running scene without shutting it down
   * first, whether the scene is removed or the whole game is destroyed.
   */
  private whenSceneEnds(release: () => void): void {
    const end = () => {
      this.events.off(Scenes.Events.SHUTDOWN, end);
      this.events.off(Scenes.Events.DESTROY, end);
      release();
    };
    this.events.once(Scenes.Events.SHUTDOWN, end);
    this.events.once(Scenes.Events.DESTROY, end);
  }

  /**
   * Follows everything the model publishes until the scene ends, since `create`
   * subscribes again on every restart.
   */
  private followTheModel(): void {
    const stopFollowing = [
      this.options.presentation.onBackgroundColor((color) => {
        this.cameras?.main?.setBackgroundColor(color);
      }),
      this.options.onReset(() => {
        this.controller.reset();
      }),
      this.options.onCardsRelocated((cardIds) => {
        this.controller.beginFlight(cardIds);
      }),
      this.options.presentation.onCardDeck((deckId) => {
        this.deckLoader.use(deckId);
      }),
    ];

    this.whenSceneEnds(() => {
      for (const stop of stopFollowing) stop();
    });
  }

  /**
   * Redraws the card shadow whenever a lost WebGL context is restored, since
   * Phaser restores loaded textures but not one drawn at runtime.
   */
  private redrawShadowAfterContextLoss(): void {
    const redraw = () => this.visualFactory.bakeCardShadow();
    this.renderer.on(Renderer.Events.RESTORE_WEBGL, redraw);
    this.whenSceneEnds(() => {
      this.renderer.off(Renderer.Events.RESTORE_WEBGL, redraw);
    });
  }

  /**
   * Registers the pointer listeners, and on a resize snaps cards into place and
   * fetches denser artwork if the cards have outgrown it.
   */
  private wireInput(): void {
    this.controller.snapAll = true;
    const onResize = () => {
      this.controller.snapAll = true;
      this.deckLoader.refit();
    };
    // The scale manager belongs to the game, which outlives the scene.
    this.scale.on("resize", onResize);
    this.whenSceneEnds(() => {
      this.scale.off("resize", onResize);
    });

    this.inputManager.registerDragListeners();

    // Hit test every frame, because cards move under a pointer that stays
    // still.
    this.input.setPollAlways();
  }

  /** Returns every card and placeholder sprite drawn from the deck texture. */
  public texturedSprites(): Iterable<GameObjects.Sprite> {
    return [...this.cardSprites.values(), ...this.pileBackgrounds.values()];
  }

  /**
   * Instantiates and registers a sprite for every playing card in the game,
   * and one for the shadow it casts.
   */
  private createCardSprites(): void {
    this.visualFactory.bakeCardShadow();

    for (const id of this.options.cardIds) {
      this.cardShadows.set(id, this.visualFactory.createCardShadow());
      const sprite = this.visualFactory.createCardSprite();
      this.cardSprites.set(id, sprite);

      sprite.setData("cardId", id);
      this.inputManager.registerCardListeners(sprite, id);
    }
  }

  /** Creates a placeholder sprite for every pile that has one. */
  private createPileBackgroundSprites(): void {
    const alpha = BoardScene.PILE_BACKGROUND_ALPHA;

    for (const { pileId, frame, actionable } of this.options.backgrounds) {
      const sprite = this.visualFactory.createPileBackground(
        frame,
        alpha,
        actionable,
      );
      this.pileBackgrounds.set(pileId, sprite);
      if (actionable) {
        this.inputManager.registerPileBackgroundListeners(sprite, pileId);
      }
    }
  }

  /** Says how the deck the player asked for is getting on. */
  public reportCardDeckStatus(status: CardDeckStatus): void {
    this.options.presentation.reportCardDeckStatus(status);
  }

  /** Redraws the shadow at the density the cards are now drawn at. */
  public artScaleChanged(): void {
    this.visualFactory.bakeCardShadow();
    for (const shadow of this.cardShadows.values()) {
      this.visualFactory.fitCardShadow(shadow);
    }
  }

  // --- PhaserSprites ---

  /** @inheritDoc */
  public get cardArtScale(): CardArtScale {
    return this.deckLoader.atlas.artScale;
  }

  /** @inheritDoc */
  public cardSprite(cardId: string): GameObjects.Sprite | undefined {
    return this.cardSprites.get(cardId);
  }

  /** @inheritDoc */
  public cardShadowSprite(cardId: string): GameObjects.Sprite | undefined {
    return this.cardShadows.get(cardId);
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

  /** @inheritDoc */
  public showPileBackgroundCursor(pileId: string): void {
    const sprite = this.pileBackgrounds.get(pileId);
    if (sprite?.input && this.controller.hoveredBackgroundPileId === pileId) {
      this.input.setCursor(sprite.input);
    }
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
    const pixelRatio = this.pixelRatio;
    const insets = this.options.insets?.() ?? NO_INSETS;
    return {
      width:
        this.scale?.width ||
        design.width + (insets.left + insets.right) * pixelRatio,
      height:
        this.scale?.height ||
        design.height + (insets.top + insets.bottom) * pixelRatio,
      pixelRatio,
      insets,
    };
  }

  /** Applies this frame's view state, then lands every flight that arrived. */
  override update(_timeMs: number, deltaMs: number): void {
    if (!this.controller || !this.viewApplier) return;

    const state = this.options.buildViewState(
      this.controller.interaction,
      this.viewport,
    );
    this.viewApplier.apply(state, deltaMs);

    // A copy, since landing a flight removes it from the list.
    for (const flight of [...this.controller.flights]) {
      if (!this.viewApplier.areCardsTravelling(flight.cardIds)) {
        this.controller.endFlight(flight);
      }
    }

    this.controller.snapAll = false;
  }
}
