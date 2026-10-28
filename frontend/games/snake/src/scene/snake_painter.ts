import type { GameObjects, Scene } from "phaser";
import { BOARD_SIZE } from "../rules/arena";
import type { BoardMetrics } from "../view/board_metrics";
import type { SnakeFrame } from "../view/frame";
import { type SnakePalette, fadeTo } from "../view/palette";
import { SnakeShapes, snakeShapes } from "../view/snake_shapes";

/**
 * Draws the snake into one `Graphics`, cleared and drawn again each frame:
 * lines between its bends, and circles to round each bend and end, since
 * Phaser joins thick lines with a plain corner.
 */
export class SnakePainter {
  readonly graphics: GameObjects.Graphics;
  private readonly shapes = new SnakeShapes(BOARD_SIZE * BOARD_SIZE);

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.graphics = scene.add.graphics();
    layer.add(this.graphics);
  }

  /**
   * Draws the snake of a frame, faded toward the board as far as `fade` says
   * after a crash.
   */
  draw(
    frame: SnakeFrame,
    metrics: BoardMetrics,
    palette: SnakePalette,
    fade: number,
  ): void {
    const graphics = this.graphics;
    graphics.clear();
    const shapes = snakeShapes(frame, metrics, this.shapes);
    if (shapes.count === 0) return;
    const body = fadeTo(palette.snake, palette.faded, fade);
    const radius = shapes.width / 2;
    graphics.lineStyle(shapes.width, body);
    graphics.fillStyle(body);
    let x = shapes.xs[0] ?? 0;
    let y = shapes.ys[0] ?? 0;
    graphics.fillCircle(x, y, radius);
    for (let i = 1; i < shapes.count; i++) {
      const nextX = shapes.xs[i] ?? x;
      const nextY = shapes.ys[i] ?? y;
      graphics.lineBetween(x, y, nextX, nextY);
      graphics.fillCircle(nextX, nextY, radius);
      x = nextX;
      y = nextY;
    }
    const { head, eyes } = shapes;
    graphics.fillStyle(fadeTo(palette.head, palette.faded, fade));
    graphics.fillCircle(head.x, head.y, head.radius);
    graphics.fillStyle(palette.eye);
    graphics.fillCircle(eyes.x1, eyes.y1, eyes.radius);
    graphics.fillCircle(eyes.x2, eyes.y2, eyes.radius);
  }
}
