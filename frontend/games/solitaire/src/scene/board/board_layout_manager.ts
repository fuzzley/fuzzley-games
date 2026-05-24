import type { BoardScene } from "./board_scene";

export class BoardLayoutManager {
    constructor(private readonly boardScene: BoardScene) {}

    createInitialLayout() {
        // A standard Klondike layout uses a 7-column layout.
        // Columns 0 to 6 are horizontally aligned.
        const cardWidth = 221;
        const cardHeight = 313;

        // Visual design: defining layout offsets and margins
        const paddingX = 40;
        const paddingY = 40;
        const gapX = 30; // space between adjacent columns
        const gapY = 40; // space between the top row and the bottom (tableau) row

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
}