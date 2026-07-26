import * as Phaser from "phaser";
import type { BoardScene } from "../board_scene";
import type { PlayingCardVisual } from "@/game/render/visual/card/playing_card_visual";
import { CardPile, PileType } from "@/game/model/card/card_pile";
import type { PlayingCard } from "@/game/model/card/playing_card";
import {
  CARD_WIDTH_PX,
  CARD_HEIGHT_PX,
  DESIGN_WIDTH_PX,
  DESIGN_HEIGHT_PX,
} from "../layout/board_layout_constants";
import {
  BoardInteractionState,
  DragInteraction,
} from "../view/board_view_state";
import { resolveDropTarget } from "./drop_target_resolver";
import { computeDropGeometries, computeScale } from "../view/board_geometry";

/**
 * Coordinates and handles drag-and-drop state, overlaps, and mouse pointer events
 * for card sprites and empty pile placeholder sprites.
 */
export class BoardInputManager {
  /** Maximum milliseconds between two clicks for them to count as a double-click. */
  private static readonly DOUBLE_CLICK_MS = 350;

  /** The currently hovered card visual wrapper. */
  public hoveredCardVisual: PlayingCardVisual | null = null;

  /** Whether the stock pile background sprite is currently hovered. */
  public isStockBackgroundHovered = false;

  /** The transient drag interaction state. */
  public drag: DragInteraction | null = null;

  /** Flag to snap all cards immediately (e.g. on first load, resize, reset). */
  public snapAll = true;

  /** The timestamp of the last click on a card. */
  private lastClickTimeMs = 0;

  /** The ID of the last clicked card. */
  private lastClickedCardId: string | null = null;

  /**
   * Constructs the board input manager.
   *
   * @param boardScene The parent board scene.
   */
  constructor(private readonly boardScene: BoardScene) {}

  /**
   * Binds the global drag and drop event listeners to Phaser's input system.
   */
  public registerDragListeners(): void {
    this.boardScene.input.on(
      "dragstart",
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) =>
        this.onDragStart(pointer, gameObject),
    );
    this.boardScene.input.on(
      "drag",
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Sprite,
        dragX: number,
        dragY: number,
      ) => this.onDrag(pointer, gameObject, dragX, dragY),
    );
    this.boardScene.input.on(
      "dragend",
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) =>
        this.onDragEnd(pointer, gameObject),
    );
  }

  /**
   * Registers event listeners on individual playing card sprites.
   */
  public registerCardListeners(
    sprite: Phaser.GameObjects.Sprite,
    visual: PlayingCardVisual,
  ): void {
    sprite.on("pointerover", () => {
      this.hoveredCardVisual = visual;
    });

    sprite.on("pointerout", () => {
      if (this.hoveredCardVisual === visual) {
        this.hoveredCardVisual = null;
      }
    });

    sprite.on("pointerdown", () => this.handleCardPointerDown(visual));
  }

  /**
   * Handles a pointerdown on a card sprite: resolves the containing pile, then
   * dispatches to the double-click auto-move or stock-draw behavior.
   */
  private handleCardPointerDown(visual: PlayingCardVisual): void {
    const game = this.boardScene.gameModel;
    const cardId = visual.playingCard.id;
    const pile = game.getPileContainingCard(cardId);
    if (!pile) {
      throw new Error(`Card ${cardId} is not in a pile`);
    }

    // Only tableau/waste cards participate in double-click auto-moves. Where the
    // card should land is a game rule, so delegate the decision to the model.
    if (pile.type === PileType.TABLEAU || pile.type === PileType.WASTE) {
      if (this.isDoubleClick(cardId)) {
        // Pressing a draggable card also begins a Phaser drag. A double-click
        // is a click gesture, not a drag, so cancel the pending drag before
        // auto-moving. Otherwise the trailing `dragend` re-runs the drop
        // resolver on the card's original position and can move the card
        // straight back — e.g. a King auto-moved to its foundation gets dropped
        // onto the now-empty tableau it just left, so it never appears to move.
        this.drag = null;
        game.autoMoveCard(cardId);
      }
      return;
    }

    this.lastClickTimeMs = 0;
    this.lastClickedCardId = null;

    if (pile.type === PileType.STOCK) {
      this.tryDrawFromStock(pile, visual);
    }
  }

  /**
   * Records this click and reports whether it completes a double-click on the
   * same card within {@link BoardInputManager.DOUBLE_CLICK_MS}.
   */
  private isDoubleClick(cardId: string): boolean {
    const currentTimeMs = Date.now();
    const doubleClick =
      this.lastClickedCardId === cardId &&
      currentTimeMs - this.lastClickTimeMs < BoardInputManager.DOUBLE_CLICK_MS;

    this.lastClickTimeMs = currentTimeMs;
    this.lastClickedCardId = cardId;

    return doubleClick;
  }

  /**
   * Draws from the stock when the clicked card is the top stock card.
   */
  private tryDrawFromStock(
    pile: CardPile<PlayingCard>,
    visual: PlayingCardVisual,
  ): void {
    const cards = pile.getCards();
    if (cards.length > 0 && cards[cards.length - 1] === visual.playingCard) {
      this.boardScene.gameModel.drawCardsFromStock();
    }
  }

  /**
   * Registers event listeners on the stock pile background placeholder sprite.
   */
  public registerStockBackgroundListeners(
    stockSprite: Phaser.GameObjects.Sprite,
  ): void {
    stockSprite.on("pointerdown", () => {
      if (this.boardScene.gameModel.stock.getCards().length === 0) {
        this.boardScene.gameModel.drawCardsFromStock();
      }
    });

    stockSprite.on("pointerover", () => {
      this.isStockBackgroundHovered = true;
    });

    stockSprite.on("pointerout", () => {
      this.isStockBackgroundHovered = false;
    });
  }

  /**
   * Handles Phaser dragstart event.
   */
  private onDragStart(
    pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.Sprite,
  ): void {
    const visual = gameObject.getData("cardVisual") as PlayingCardVisual;
    if (!visual) return;

    const sourcePile = this.boardScene.gameModel.getPileContainingCard(
      visual.playingCard.id,
    );
    if (!sourcePile) return;

    const cards = sourcePile.getCards();
    const cardIndex = cards.findIndex(
      (card) => card.id === visual.playingCard.id,
    );
    if (cardIndex === -1) return;

    this.drag = {
      cardIds: cards.slice(cardIndex).map((card) => card.id),
      primary: { x: gameObject.x, y: gameObject.y },
    };
  }

  /**
   * Handles Phaser drag event.
   */
  private onDrag(
    pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.Sprite,
    dragX: number,
    dragY: number,
  ): void {
    if (this.drag) {
      this.drag.primary = { x: dragX, y: dragY };
    }
  }

  /**
   * Handles Phaser dragend event.
   */
  private onDragEnd(
    pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.Sprite,
  ): void {
    if (!this.drag) return;

    const visual = gameObject.getData("cardVisual") as PlayingCardVisual;

    const viewport = {
      width: this.boardScene.scale?.width || DESIGN_WIDTH_PX,
      height: this.boardScene.scale?.height || DESIGN_HEIGHT_PX,
      pixelRatio: this.boardScene.pixelRatio,
    };
    const scale = computeScale(viewport);
    const width = CARD_WIDTH_PX * scale;
    const height = CARD_HEIGHT_PX * scale;

    const dragRect = {
      x: this.drag.primary.x,
      y: this.drag.primary.y,
      width: gameObject.displayWidth || width,
      height: gameObject.displayHeight || height,
    };

    // Clear drag tracking state first so that layout/highlight updates can accurately reflect that we are no longer dragging.
    this.drag = null;

    if (!visual) {
      return;
    }

    const geometries = computeDropGeometries(
      this.boardScene.gameModel,
      viewport,
    );
    const targetPileId = resolveDropTarget(dragRect, geometries);

    if (targetPileId) {
      this.boardScene.gameModel.moveCardToPile(
        visual.playingCard.id,
        targetPileId,
      );
    }
  }

  /** Snapshot of the pointer-driven interaction state consumed by the view builder each frame. */
  public get interaction(): BoardInteractionState {
    return {
      hoveredCardId: this.hoveredCardVisual?.playingCard.id ?? null,
      isStockBackgroundHovered: this.isStockBackgroundHovered,
      drag: this.drag,
      snapAll: this.snapAll,
    };
  }

  /**
   * Clears all pointer interaction state and requests a one-frame snap. Called on
   * game reset so no stale hover or drag survives into the new deal.
   */
  public resetInteraction(): void {
    this.hoveredCardVisual = null;
    this.isStockBackgroundHovered = false;
    this.drag = null;
    this.snapAll = true;
  }
}
