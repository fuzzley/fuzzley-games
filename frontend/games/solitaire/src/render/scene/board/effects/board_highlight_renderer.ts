import * as Phaser from "phaser";
import type { BoardScene } from "../board_scene";
import type { PlayingCardVisual } from "../../../visual/card/playing_card_visual";

/**
 * Handles rendering the thick, rounded, semi-transparent yellow highlight border
 * around interactive cards or empty stock background on hover.
 */
export class BoardHighlightRenderer {
  /** Graphics object for drawing the highlight border. */
  public graphics: Phaser.GameObjects.Graphics;

  /**
   * Constructs the highlight renderer.
   *
   * @param boardScene The parent board scene.
   */
  constructor(private readonly boardScene: BoardScene) {
    this.graphics = boardScene.add.graphics();
    this.graphics.setDepth(2000);
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

    const thickness = 9 * scale;
    const radius = 12 * scale;
    this.graphics.lineStyle(thickness, 0xebef9b, 0.9);
    this.graphics.strokeRoundedRect(sprite.x, sprite.y, width, height, radius);
  }
}
