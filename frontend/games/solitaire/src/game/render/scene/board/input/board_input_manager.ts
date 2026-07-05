import * as Phaser from "phaser";
import type { BoardScene, PileVisual } from "../board_scene";
import type { PlayingCardVisual } from "@/game/render/visual/card/playing_card_visual";
import { TableauPileVisual } from "@/game/render/visual/pile/tableau_pile_visual";
import { type CardPile, PileType } from "@/game/model/card/card_pile";
import type { PlayingCard } from "@/game/model/card/playing_card";
import {
  CARD_WIDTH_PX,
  CARD_HEIGHT_PX,
} from "../layout/board_layout_constants";

/**
 * Coordinates and handles drag-and-drop state, overlaps, and mouse pointer events
 * for card sprites and empty pile placeholder sprites.
 */
export class BoardInputManager {
  /** Base depth applied to a dragged stack so it renders above resting cards. */
  private static readonly DRAG_BASE_DEPTH = 1000;

  /** The stack of card visuals currently being dragged. */
  public draggedStack: PlayingCardVisual[] = [];

  /** The offsets of the dragged cards relative to the main dragged card sprite. */
  public draggedStackOffsets: { x: number; y: number }[] = [];

  /** The currently hovered card visual wrapper. */
  public hoveredCardVisual: PlayingCardVisual | null = null;

  /** Whether the stock pile background sprite is currently hovered. */
  public isStockBackgroundHovered = false;

  /** The timestamp of the last click on a card. */
  private lastClickTime = 0;

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
      this.boardScene.updateHighlightBorder();
    });

    sprite.on("pointerout", () => {
      if (this.hoveredCardVisual === visual) {
        this.hoveredCardVisual = null;
        this.boardScene.updateHighlightBorder();
      }
    });

    sprite.on("pointerdown", () => this.handleCardPointerDown(visual));
  }

  /**
   * Handles a pointerdown on a card sprite: resolves the containing pile, then
   * dispatches to the double-click auto-move or stock-draw behavior.
   */
  private handleCardPointerDown(visual: PlayingCardVisual): void {
    const cardId = visual.playingCard.id;
    const pile = this.boardScene.gameModel.getPileContainingCard(cardId);
    if (!pile) {
      throw new Error(`Card ${cardId} is not in a pile`);
    }

    // Only tableau/waste cards participate in double-click auto-moves.
    if (pile.type === PileType.TABLEAU || pile.type === PileType.WASTE) {
      if (this.isDoubleClick(cardId)) {
        this.tryAutoMoveCard(cardId, pile);
      }
      return;
    }

    this.lastClickTime = 0;
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
    const currentTime = Date.now();
    const doubleClick =
      this.lastClickedCardId === cardId &&
      currentTime - this.lastClickTime < 350;

    this.lastClickTime = currentTime;
    this.lastClickedCardId = cardId;

    return doubleClick;
  }

  /**
   * Attempts to auto-move a card to a valid destination, trying foundations
   * first (higher priority) and then tableau piles other than the source pile.
   *
   * @returns True if the card was moved, false otherwise.
   */
  private tryAutoMoveCard(
    cardId: string,
    sourcePile: CardPile<PlayingCard>,
  ): boolean {
    // Try foundations first (higher priority)
    for (const foundation of this.boardScene.gameModel.foundations) {
      if (this.boardScene.gameModel.moveCardToPile(cardId, foundation.id)) {
        return true;
      }
    }
    // Fall back to tableau piles, skipping the card's current pile
    for (const tableau of this.boardScene.gameModel.tableaus) {
      if (tableau.id === sourcePile.id) continue;
      if (this.boardScene.gameModel.moveCardToPile(cardId, tableau.id)) {
        return true;
      }
    }
    return false;
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
      this.boardScene.updateHighlightBorder();
    });

    stockSprite.on("pointerout", () => {
      this.isStockBackgroundHovered = false;
      this.boardScene.updateHighlightBorder();
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

    const pileVisual = this.boardScene.getPileVisualById(sourcePile.id);
    if (!pileVisual) return;

    const index = pileVisual.playingCardVisuals.indexOf(visual);
    if (index === -1) return;

    // Get the stack of cards from the dragged card up to the top card
    this.draggedStack = pileVisual.playingCardVisuals.slice(index);

    // Calculate offsets relative to the main dragged card's current position.
    // A card visual without a sprite stacks on the primary card (offset 0).
    this.draggedStackOffsets = this.draggedStack.map((cardVis) => ({
      x: (cardVis.sprite?.x ?? gameObject.x) - gameObject.x,
      y: (cardVis.sprite?.y ?? gameObject.y) - gameObject.y,
    }));

    // Bring the dragged cards to the top depth layer and adjust shadows for lift effect
    this.draggedStack.forEach((cardVis, idx) => {
      cardVis.sprite?.setDepth(BoardInputManager.DRAG_BASE_DEPTH + idx);
    });

    // Remove any active highlights immediately when starting to drag
    this.boardScene.updateHighlightBorder();
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
    if (this.draggedStack.length === 0) return;

    // Move the primary dragged card
    gameObject.setPosition(dragX, dragY);

    // Move other cards in the stack relative to the primary card
    for (let i = 1; i < this.draggedStack.length; i++) {
      const offset = this.draggedStackOffsets[i];
      this.draggedStack[i].sprite?.setPosition(
        dragX + offset.x,
        dragY + offset.y,
      );
    }
  }

  /**
   * Handles Phaser dragend event.
   */
  private onDragEnd(
    pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.Sprite,
  ): void {
    if (this.draggedStack.length === 0) return;

    const visual = gameObject.getData("cardVisual") as PlayingCardVisual;

    // Clear drag tracking state first so that layout/highlight updates can accurately reflect that we are no longer dragging.
    this.draggedStack = [];
    this.draggedStackOffsets = [];

    if (!visual) {
      this.boardScene.getLayoutManager().updateVisualLayout();
      return;
    }

    // Determine overlap with piles to find potential target pile
    const cardRect = new Phaser.Geom.Rectangle(
      gameObject.x,
      gameObject.y,
      gameObject.displayWidth,
      gameObject.displayHeight,
    );

    const scale = this.boardScene.getLayoutManager().getScaleFactor();
    const width = CARD_WIDTH_PX * scale;

    let targetPileVisual: PileVisual | null = null;
    let maxOverlapArea = 0;

    const potentialPiles = [
      ...this.boardScene.foundationPiles,
      ...this.boardScene.tableauPiles,
    ];

    for (const pileVisual of potentialPiles) {
      const x = pileVisual.position.x;
      const y = pileVisual.position.y;
      let height = CARD_HEIGHT_PX * scale;

      // For tableau piles, calculate dynamic height based on stacked cards
      if (
        pileVisual instanceof TableauPileVisual &&
        pileVisual.playingCardVisuals.length > 0
      ) {
        const lastCard =
          pileVisual.playingCardVisuals[
            pileVisual.playingCardVisuals.length - 1
          ];
        height = lastCard.position.y * scale + CARD_HEIGHT_PX * scale;
      }

      const pileRect = new Phaser.Geom.Rectangle(x, y, width, height);
      const intersection = new Phaser.Geom.Rectangle();
      Phaser.Geom.Rectangle.Intersection(pileRect, cardRect, intersection);

      const overlapArea =
        intersection.width > 0 && intersection.height > 0
          ? intersection.width * intersection.height
          : 0;

      if (overlapArea > maxOverlapArea) {
        maxOverlapArea = overlapArea;
        targetPileVisual = pileVisual;
      }
    }

    let moved = false;
    if (targetPileVisual) {
      moved = this.boardScene.gameModel.moveCardToPile(
        visual.playingCard.id,
        targetPileVisual.value.id,
      );
    }

    if (!moved) {
      // Snap cards back to their layout positions if move was invalid or not dropped on a pile
      this.boardScene.getLayoutManager().updateVisualLayout();
    }
  }
}
