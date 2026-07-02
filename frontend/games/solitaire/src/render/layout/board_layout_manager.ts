import type { BoardScene, PileVisual } from "../scene/board_scene";
import {
  CARD_WIDTH_PX,
  CARD_HEIGHT_PX,
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
   * Calculates and sets the screen layout positions for each pile container
   * (Stock, Waste, Foundations, Tableaus) based on config margins and spacing.
   */
  createInitialLayout() {
    // A standard Klondike layout uses a 7-column layout.
    // Columns 0 to 6 are horizontally aligned.
    const cardWidth = CARD_WIDTH_PX;
    const cardHeight = CARD_HEIGHT_PX;

    // Visual design: defining layout offsets and margins
    const paddingX = LAYOUT_PADDING_X;
    const paddingY = LAYOUT_PADDING_Y;
    const gapX = LAYOUT_GAP_X; // space between adjacent columns
    const gapY = LAYOUT_GAP_Y; // space between the top row and the bottom (tableau) row

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
    // 1. Compute relative positions for cards inside each pile
    this.boardScene.stockPile.layoutPile();
    this.boardScene.wastePile.layoutPile();
    for (const pile of this.boardScene.foundationPiles) {
      pile.layoutPile();
    }
    for (const pile of this.boardScene.tableauPiles) {
      pile.layoutPile();
    }

    // Helper to place card sprites at their absolute screen coordinates
    const syncPileSprites = (pileVisual: PileVisual) => {
      const pileX = pileVisual.position.x;
      const pileY = pileVisual.position.y;
      for (const cardVisual of pileVisual.playingCardVisuals) {
        const absX = pileX + cardVisual.position.x;
        const absY = pileY + cardVisual.position.y;
        if (cardVisual.sprite) {
          cardVisual.sprite.setPosition(absX, absY);
        }
      }
    };

    // 2. Align card sprites
    syncPileSprites(this.boardScene.stockPile);
    syncPileSprites(this.boardScene.wastePile);
    this.boardScene.foundationPiles.forEach(syncPileSprites);
    this.boardScene.tableauPiles.forEach(syncPileSprites);
  }
}
