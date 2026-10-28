import type { GameObjects, Scene } from "phaser";
import type { BoardMetrics } from "../view/board_metrics";
import type { SnakePalette } from "../view/palette";

/** Draws the board: its checkered squares, and the wall around them. */
export class BoardPainter {
  /** The squares, as one shape, every other one washed. */
  readonly grid: GameObjects.Grid;
  /** The wall around the board. */
  readonly wall: GameObjects.Graphics;

  constructor(scene: Scene, layer: GameObjects.Layer) {
    // No gap between the squares, which Phaser 4 leaves by default.
    this.grid = scene.add.grid(0, 0, 1, 1, 1, 1).setOrigin(0).setCellPadding(0);
    this.wall = scene.add.graphics();
    layer.add([this.grid, this.wall]);
  }

  /** Lays the board out where the metrics put it, in the palette. */
  layout(metrics: BoardMetrics, palette: SnakePalette): void {
    this.grid.setPosition(metrics.x, metrics.y);
    this.grid.width = metrics.side;
    this.grid.height = metrics.side;
    this.grid.cellWidth = metrics.square;
    this.grid.cellHeight = metrics.square;
    this.paint(metrics, palette);
  }

  /** Paints the board in a palette. */
  paint(metrics: BoardMetrics, palette: SnakePalette): void {
    this.grid.setFillStyle(palette.board);
    this.grid.setAltFillStyle(palette.checker);
    const { x, y, side, wall } = metrics;
    this.wall.clear();
    this.wall.lineStyle(wall, palette.wall);
    this.wall.strokeRect(x - wall / 2, y - wall / 2, side + wall, side + wall);
  }
}
