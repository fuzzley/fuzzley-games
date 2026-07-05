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
      this.drawHighlight(sprite);
    }
  }

  /**
   * Draws the border shape around the target sprite.
   */
  private drawHighlight(sprite: Phaser.GameObjects.Sprite): void {
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
    this.graphics.strokeRoundedRect(sprite.x, sprite.y, width, height, radius);
  }
}
