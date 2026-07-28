import * as Phaser from "phaser";
import type { BoardScene } from "./board_scene";
import { CardPile } from "@/engine/core/card/card_pile";
import { KlondikeRole } from "@/games/klondike/klondike_zones";
import type { PlayingCard } from "@/engine/core/card/playing_card";
import {
  TableInteractionState,
  DragInteraction,
  FlightInteraction,
} from "../view/table_view_state";
import {
  measureKlondikeBoard,
  resolveDragTarget,
} from "@/games/klondike/klondike_board";

/**
 * The id of the card a sprite draws, as stamped on it when the scene created
 * it, or null for a sprite that is not a card.
 */
function cardIdOf(gameObject: Phaser.GameObjects.Sprite): string | null {
  const cardId: unknown = gameObject.getData("cardId");
  return typeof cardId === "string" ? cardId : null;
}

/**
 * Coordinates and handles drag-and-drop state, overlaps, and mouse pointer events
 * for card sprites and empty pile placeholder sprites.
 */
export class BoardInputManager {
  /** Maximum milliseconds between two clicks for them to count as a double-click. */
  private static readonly DOUBLE_CLICK_MS = 350;

  /** The id of the currently hovered card, or null when none is. */
  public hoveredCardId: string | null = null;

  /** Whether the stock pile background sprite is currently hovered. */
  public isStockBackgroundHovered = false;

  /** The transient drag interaction state. */
  public drag: DragInteraction | null = null;

  /** The stack still flying to the pile it was moved to, or null when none is. */
  private flightState: FlightInteraction | null = null;

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
    // Phaser's drag events carry the pointer as their first argument, which
    // none of these handlers need: the drag position comes from the event's own
    // dragX/dragY, already converted into game space.
    this.boardScene.input.on(
      "dragstart",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) =>
        this.onDragStart(gameObject),
    );
    this.boardScene.input.on(
      "drag",
      (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.Sprite,
        dragX: number,
        dragY: number,
      ) => this.onDrag(dragX, dragY),
    );
    this.boardScene.input.on(
      "dragend",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) =>
        this.onDragEnd(gameObject),
    );
  }

  /**
   * Registers event listeners on individual playing card sprites.
   *
   * @param sprite The card's sprite.
   * @param cardId The id of the card the sprite draws.
   */
  public registerCardListeners(
    sprite: Phaser.GameObjects.Sprite,
    cardId: string,
  ): void {
    sprite.on("pointerover", () => {
      this.hoveredCardId = cardId;
    });

    sprite.on("pointerout", () => {
      if (this.hoveredCardId === cardId) {
        this.hoveredCardId = null;
      }
    });

    sprite.on("pointerdown", () => this.handleCardPointerDown(cardId));
  }

  /**
   * Handles a pointerdown on a card sprite: resolves the containing pile, then
   * dispatches to the double-click auto-move or stock-draw behavior.
   */
  private handleCardPointerDown(cardId: string): void {
    const game = this.boardScene.gameModel;
    const pile = game.getPileContainingCard(cardId);
    if (!pile) {
      throw new Error(`Card ${cardId} is not in a pile`);
    }

    // Only tableau/waste cards participate in double-click auto-moves. Where the
    // card should land is a game rule, so delegate the decision to the model.
    if (
      pile.role === KlondikeRole.TABLEAU ||
      pile.role === KlondikeRole.WASTE
    ) {
      if (this.isDoubleClick(cardId)) {
        // Pressing a draggable card also begins a Phaser drag. A double-click
        // is a click gesture, not a drag, so cancel the pending drag before
        // auto-moving. Otherwise the trailing `dragend` re-runs the drop
        // resolver on the card's original position and can move the card
        // straight back — e.g. a King auto-moved to its foundation gets dropped
        // onto the now-empty tableau it just left, so it never appears to move.
        this.drag = null;
        // The stack the model is about to move, read before it moves so the
        // cards can be tracked across the board while their sprites catch up.
        const movingCardIds = this.stackFromCard(pile, cardId);
        if (game.autoMoveCard(cardId)) {
          this.beginFlight(movingCardIds);
        }
      }
      return;
    }

    this.lastClickTimeMs = 0;
    this.lastClickedCardId = null;

    if (pile.role === KlondikeRole.STOCK) {
      this.tryDrawFromStock(pile, cardId);
    }
  }

  /**
   * The ids of the given card and every card stacked on top of it, which is
   * the stack a move of that card takes with it.
   */
  private stackFromCard(pile: CardPile<PlayingCard>, cardId: string): string[] {
    const cards = pile.getCards();
    const cardIndex = cards.findIndex((card) => card.id === cardId);
    return cardIndex === -1
      ? []
      : cards.slice(cardIndex).map((card) => card.id);
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
  private tryDrawFromStock(pile: CardPile<PlayingCard>, cardId: string): void {
    if (pile.topCard?.id === cardId) {
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
      if (this.boardScene.gameModel.stock.isEmpty) {
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

  /** Picks up the card the drag started on, along with the stack above it. */
  private onDragStart(gameObject: Phaser.GameObjects.Sprite): void {
    const cardId = cardIdOf(gameObject);
    if (!cardId) return;

    const sourcePile = this.boardScene.gameModel.getPileContainingCard(cardId);
    if (!sourcePile) return;

    const cardIds = this.stackFromCard(sourcePile, cardId);
    if (cardIds.length === 0) return;

    this.drag = {
      cardIds,
      primary: { x: gameObject.x, y: gameObject.y },
    };
  }

  /** Follows the pointer with the stack in hand. */
  private onDrag(dragX: number, dragY: number): void {
    if (this.drag) {
      this.drag.primary = { x: dragX, y: dragY };
    }
  }

  /** Drops the stack in hand onto whichever pile it was released over. */
  private onDragEnd(gameObject: Phaser.GameObjects.Sprite): void {
    if (!this.drag) return;

    const cardId = cardIdOf(gameObject);
    const drag = this.drag;

    // Clear drag tracking state first so that layout/highlight updates can accurately reflect that we are no longer dragging.
    this.drag = null;

    if (!cardId) {
      return;
    }

    // The same resolver the view builder previews with, so the card lands on
    // the pile the border promised it would.
    const target = resolveDragTarget(
      this.boardScene.gameModel,
      drag,
      measureKlondikeBoard(this.boardScene.gameModel, this.boardScene.viewport),
    );

    if (!target) {
      return;
    }

    const moved = this.boardScene.gameModel.moveCardToPile(
      cardId,
      target.pileId,
    );
    if (moved) {
      // The stack is released wherever the pointer left it, so it still has the
      // board to cross to reach the pile that accepted it.
      this.beginFlight(drag.cardIds);
    }
  }

  /**
   * Lifts the given stack above the board until its sprites have caught up with
   * the pile the model has already moved them to.
   */
  private beginFlight(cardIds: string[]): void {
    this.flightState = cardIds.length > 0 ? { cardIds } : null;
  }

  /** The stack still crossing the board, or null when nothing is in flight. */
  public get flight(): FlightInteraction | null {
    return this.flightState;
  }

  /**
   * Lets the flying stack settle back onto the board. Called by the scene once
   * the sprites have reached the pile they were moved to.
   */
  public endFlight(): void {
    this.flightState = null;
  }

  /** Snapshot of the pointer-driven interaction state consumed by the view builder each frame. */
  public get interaction(): TableInteractionState {
    return {
      hoveredCardId: this.hoveredCardId,
      isStockBackgroundHovered: this.isStockBackgroundHovered,
      drag: this.drag,
      flight: this.flightState,
      snapAll: this.snapAll,
    };
  }

  /**
   * Clears all pointer interaction state and requests a one-frame snap. Called on
   * game reset so no stale hover, drag, or flight survives into the new deal.
   */
  public resetInteraction(): void {
    this.hoveredCardId = null;
    this.isStockBackgroundHovered = false;
    this.drag = null;
    this.flightState = null;
    this.snapAll = true;
  }
}
