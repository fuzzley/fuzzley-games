import type { BoardScene, PileVisual } from "../board_scene";
import {
  CARD_WIDTH_PX,
  CARD_HEIGHT_PX,
  DESIGN_WIDTH_PX,
  DESIGN_HEIGHT_PX,
  LAYOUT_PADDING_X,
  LAYOUT_PADDING_Y,
  LAYOUT_GAP_X,
  LAYOUT_GAP_Y,
} from "./board_layout_constants";

/**
 * Manages the screen layout positions for all card piles in fSolitaire,
 * and handles positioning the Phaser card sprites to match their logical state coordinates.
 */
export class BoardLayoutManager {
  /**
   * Constructs the layout manager for a specific board scene.
   *
   * @param boardScene The board scene instance to layout.
   */
  constructor(private readonly boardScene: BoardScene) {}

  /**
   * Calculates the scale factor to fit the layout on the screen.
   */
  getScaleFactor(): number {
    if (!this.boardScene.scale) {
      return 1.0;
    }
    const screenWidth = this.boardScene.scale.width || DESIGN_WIDTH_PX;
    const screenHeight = this.boardScene.scale.height || DESIGN_HEIGHT_PX;

    const scaleX = screenWidth / DESIGN_WIDTH_PX;
    const scaleY = screenHeight / DESIGN_HEIGHT_PX;
    let scale = Math.min(scaleX, scaleY);
    if (scale > 1.0) scale = 1.0;
    if (scale <= 0) scale = 1.0;
    return scale;
  }

  /**
   * Calculates and sets the screen layout positions for each pile container
   * (Stock, Waste, Foundations, Tableaus) based on config margins and spacing.
   */
  createInitialLayout() {
    // A standard Klondike layout uses a 7-column layout.
    // Columns 0 to 6 are horizontally aligned.
    const scale = this.getScaleFactor();
    const cardWidth = CARD_WIDTH_PX * scale;
    const cardHeight = CARD_HEIGHT_PX * scale;

    // Visual design: defining layout offsets and margins
    const gapX = LAYOUT_GAP_X * scale;
    const gapY = LAYOUT_GAP_Y * scale;

    // Center the board layout horizontally
    const totalLayoutWidth = 7 * cardWidth + 6 * gapX;
    const screenWidth = this.boardScene.scale
      ? this.boardScene.scale.width
      : DESIGN_WIDTH_PX;
    const paddingX = Math.max(
      LAYOUT_PADDING_X * scale,
      (screenWidth - totalLayoutWidth) / 2,
    );
    const paddingY = LAYOUT_PADDING_Y * scale;

    // Helper to calculate X coordinate for any given column index (0-indexed)
    const getColumnX = (colIndex: number): number => {
      return paddingX + colIndex * (cardWidth + gapX);
    };

    const topRowY = paddingY;
    const bottomRowY = paddingY + cardHeight + gapY;

    // 1. Stock Pile (Column 0, Top Row)
    this.boardScene.stockPile.position = { x: getColumnX(0), y: topRowY };

    // 2. Waste Pile (Column 1, Top Row)
    this.boardScene.wastePile.position = { x: getColumnX(1), y: topRowY };

    // 3. Foundation Piles (Columns 3, 4, 5, 6, Top Row)
    // Leaving column 2 as empty space/gap
    for (let i = 0; i < this.boardScene.foundationPiles.length; i++) {
      this.boardScene.foundationPiles[i].position = {
        x: getColumnX(3 + i),
        y: topRowY,
      };
    }

    // 4. Tableau Piles (Columns 0 to 6, Bottom Row)
    for (let i = 0; i < this.boardScene.tableauPiles.length; i++) {
      this.boardScene.tableauPiles[i].position = {
        x: getColumnX(i),
        y: bottomRowY,
      };
    }
  }

  /**
   * Runs the relative layout algorithms for all piles and repositions all Phaser
   * card sprites on screen to their absolute layout coordinates.
   */
  updateVisualLayout() {
    this.computePileLayouts();
    this.alignAllCardSprites();
    if (typeof this.boardScene.updateHighlightBorder === "function") {
      this.boardScene.updateHighlightBorder();
    }
  }

  /**
   * Triggers the relative card layout calculations for all stock, waste, foundation, and tableau piles.
   */
  private computePileLayouts(): void {
    this.boardScene.stockPile.layoutPile();
    this.boardScene.wastePile.layoutPile();
    for (const pile of this.boardScene.foundationPiles) {
      pile.layoutPile();
    }
    for (const pile of this.boardScene.tableauPiles) {
      pile.layoutPile();
    }
  }

  /**
   * Aligns all card sprites to their absolute layout coordinates.
   */
  private alignAllCardSprites(): void {
    this.syncPileSprites(this.boardScene.stockPile);
    this.syncPileSprites(this.boardScene.wastePile);
    for (const pile of this.boardScene.foundationPiles) {
      this.syncPileSprites(pile);
    }
    for (const pile of this.boardScene.tableauPiles) {
      this.syncPileSprites(pile);
    }
  }

  /**
   * Synchronizes the absolute screen positions of card sprites inside a given pile visual representation.
   *
   * @param pileVisual The visual wrapper of the pile whose card sprites are to be updated.
   */
  private syncPileSprites(pileVisual: PileVisual): void {
    const scale = this.getScaleFactor();
    const pileX = pileVisual.position.x;
    const pileY = pileVisual.position.y;
    let depth = 0;
    if (pileVisual.sprite) {
      pileVisual.sprite.setOrigin(0, 0);
      pileVisual.sprite.setPosition(pileX, pileY);
      pileVisual.sprite.setScale(scale);
      pileVisual.sprite.setDepth(depth++);
    }
    for (const cardVisual of pileVisual.playingCardVisuals) {
      const absX = pileX + cardVisual.position.x * scale;
      const absY = pileY + cardVisual.position.y * scale;
      if (cardVisual.sprite) {
        cardVisual.sprite.setOrigin(0, 0);
        cardVisual.sprite.setPosition(absX, absY);
        cardVisual.sprite.setScale(scale);
        cardVisual.sprite.setDepth(depth++);
      }
    }
  }
}
