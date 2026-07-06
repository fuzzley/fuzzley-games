import * as Phaser from "phaser";
import type { BoardScene } from "../board_scene";
import type { PlayingCardVisual } from "@/game/render/visual/card/playing_card_visual";

/**
 * Handles rendering the thick, rounded, semi-transparent yellow highlight border
 * around interactive cards or empty stock background on hover.
 */
export class BoardHighlightRenderer {
  /** Depth placing the highlight above the cards (drag depth is 1000+). */
  private static readonly HIGHLIGHT_DEPTH = 2000;
  /** Highlight border color. */
  private static readonly BORDER_COLOR = 0xebef9b;
  /** Highlight border opacity. */
  private static readonly BORDER_OPACITY = 0.9;
  /** Unscaled highlight border thickness in pixels. */
  private static readonly BORDER_THICKNESS_PX = 9;
  /** Unscaled highlight corner radius in pixels. */
  private static readonly BORDER_RADIUS_PX = 12;

  /** Graphics object for drawing the highlight border. */
  public graphics: Phaser.GameObjects.Graphics;

  /**
   * Constructs the highlight renderer.
   *
   * @param boardScene The parent board scene.
   */
  constructor(private readonly boardScene: BoardScene) {
    this.graphics = boardScene.add.graphics();
    this.graphics.setDepth(BoardHighlightRenderer.HIGHLIGHT_DEPTH);
  }

  /**
   * Redraws the highlight border based on the current hover and drag state.
   *
   * @param hoveredCardVisual The currently hovered card visual wrapper.
   * @param isStockBackgroundHovered Whether the stock background sprite is hovered.
   * @param isDragging Whether any card stack is currently being dragged.
   */
  public update(
    hoveredCardVisual: PlayingCardVisual | null,
    isStockBackgroundHovered: boolean,
    isDragging: boolean,
  ): void {
    if (!this.graphics) {
      return;
    }
    this.graphics.clear();

    if (isDragging) {
      return;
    }

    const gameModel = this.boardScene.gameModel;
    const stockEmpty = gameModel.stock.getCards().length === 0;

    if (isStockBackgroundHovered && stockEmpty) {
      const sprite = this.boardScene.stockPile.sprite;
      if (sprite && sprite.active) {
        this.drawHighlight(sprite);
      }
      return;
    }

    if (!hoveredCardVisual) {
      return;
    }

    const card = hoveredCardVisual.playingCard;
    if (!gameModel.isCardInteractable(card)) {
      return;
    }

    const sprite = hoveredCardVisual.sprite;
    if (sprite && sprite.active) {
      this.drawHighlight(sprite, this.findCoveringSprite(hoveredCardVisual));
    }
  }

  /**
   * Finds the sprite of the card stacked directly on top of the hovered card in
   * the same pile, if any. Used to keep the highlight from overlapping cards
   * that fan over the lower portion of the hovered card (e.g. in a tableau).
   *
   * @param cardVisual The hovered card visual.
   * @returns The covering card's active sprite, or null if the card is the top
   *   of its pile (or the covering sprite is unavailable).
   */
  private findCoveringSprite(
    cardVisual: PlayingCardVisual,
  ): Phaser.GameObjects.Sprite | null {
    const pile = this.boardScene.gameModel.getPileContainingCard(
      cardVisual.playingCard.id,
    );
    if (!pile) {
      return null;
    }

    const pileVisual = this.boardScene.getPileVisualById(pile.id);
    if (!pileVisual) {
      return null;
    }

    const cards = pileVisual.playingCardVisuals;
    const index = cards.indexOf(cardVisual);
    if (index === -1 || index >= cards.length - 1) {
      return null;
    }

    const coveringSprite = cards[index + 1].sprite;
    return coveringSprite && coveringSprite.active ? coveringSprite : null;
  }

  /**
   * Draws the border shape around the target sprite. When a card is stacked on
   * top, the sides still run the full height of the card (overlapping the
   * covering card's edges), but the bottom edge is left open so the border never
   * draws a line across the card stacked on top.
   *
   * @param sprite The hovered card sprite to outline.
   * @param coveringSprite The sprite fanned on top of it, or null if none.
   */
  private drawHighlight(
    sprite: Phaser.GameObjects.Sprite,
    coveringSprite: Phaser.GameObjects.Sprite | null = null,
  ): void {
    const scale = this.boardScene.getLayoutManager().getScaleFactor();
    const width = sprite.displayWidth;
    const height = sprite.displayHeight;

    const thickness = BoardHighlightRenderer.BORDER_THICKNESS_PX * scale;
    const radius = BoardHighlightRenderer.BORDER_RADIUS_PX * scale;
    this.graphics.lineStyle(
      thickness,
      BoardHighlightRenderer.BORDER_COLOR,
      BoardHighlightRenderer.BORDER_OPACITY,
    );

    // The top card of a pile has a visible bottom edge, so outline the full card.
    // A covered card's bottom edge is hidden under the card stacked on it, so
    // leave it open while keeping the full-height sides.
    if (!coveringSprite) {
      this.graphics.strokeRoundedRect(
        sprite.x,
        sprite.y,
        width,
        height,
        radius,
      );
      return;
    }

    this.strokeOpenBottomRoundedRect(sprite.x, sprite.y, width, height, radius);
  }

  /**
   * Strokes a rectangle with rounded top corners and an open (unstroked) bottom
   * edge. The top and both full-height sides are highlighted while the bottom,
   * which tucks under the covering card, is left open so the border never draws
   * a horizontal line across the card stacked on top.
   *
   * @param x The left edge of the card.
   * @param y The top edge of the card.
   * @param width The card width.
   * @param height The full card height.
   * @param cornerRadius The desired top corner radius.
   */
  private strokeOpenBottomRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    cornerRadius: number,
  ): void {
    const radius = Math.max(0, Math.min(cornerRadius, height, width / 2));
    const right = x + width;
    const bottom = y + height;

    this.graphics.beginPath();
    this.graphics.moveTo(x, bottom);
    this.graphics.lineTo(x, y + radius);
    // Top-left rounded corner.
    this.graphics.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    this.graphics.lineTo(right - radius, y);
    // Top-right rounded corner.
    this.graphics.arc(
      right - radius,
      y + radius,
      radius,
      Math.PI * 1.5,
      Math.PI * 2,
    );
    this.graphics.lineTo(right, bottom);
    this.graphics.strokePath();
  }
}
