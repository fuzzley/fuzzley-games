import { GameObjects } from "phaser";
import type { SceneRun } from "@fz/phaser/testing";
import type { BoardScene } from "@/engine/render/phaser/scene/board_scene";

/** A point on a board's canvas, in the canvas's own pixels. */
export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

/** Returns a card's sprite on a board. */
export function cardSpriteOf(
  board: BoardScene,
  cardId: string,
): GameObjects.Sprite {
  const sprite = board.cardSprite(cardId);
  if (!sprite) throw new Error(`No sprite for ${cardId}`);
  return sprite;
}

/** Returns the middle of a sprite, in the canvas's pixels. */
export function middleOf(sprite: GameObjects.Sprite): CanvasPoint {
  const bounds = sprite.getBounds();
  return { x: bounds.centerX, y: bounds.centerY };
}

/** Returns whether a board draws any highlight border. */
export function anyBorderDrawn(board: BoardScene): boolean {
  // The renderer's borders are the only graphics on a board.
  return board.children.list.some(
    (object) => object instanceof GameObjects.Graphics && object.visible,
  );
}

/**
 * Sends a mouse event at a point in the canvas's pixels, which a browser
 * gives in CSS pixels.
 */
function mouse(
  run: SceneRun<BoardScene>,
  type: "down" | "move" | "up",
  { x, y }: CanvasPoint,
): void {
  const ratio = run.game.scale.displayScale;
  run.pointer(type, x / ratio.x, y / ratio.y);
}

/** Moves the mouse to a point on a board. */
export function hoverAt(run: SceneRun<BoardScene>, point: CanvasPoint): void {
  mouse(run, "move", point);
}

/** Presses the middle of a sprite with the mouse, and lets go. */
export function click(
  run: SceneRun<BoardScene>,
  sprite: GameObjects.Sprite,
): void {
  const middle = middleOf(sprite);
  mouse(run, "down", middle);
  mouse(run, "up", middle);
}

/** Presses a sprite twice with the mouse, in quick succession. */
export function doubleClick(
  run: SceneRun<BoardScene>,
  sprite: GameObjects.Sprite,
): void {
  click(run, sprite);
  click(run, sprite);
}

/**
 * Presses a sprite with the mouse at a point on it, its middle unless said
 * otherwise, and holds it, which picks a draggable one up.
 */
export function pickUp(
  run: SceneRun<BoardScene>,
  sprite: GameObjects.Sprite,
  by: CanvasPoint = middleOf(sprite),
): void {
  mouse(run, "down", by);
}

/**
 * Picks a sprite up by its middle, moves it so its top left corner lies at a
 * point, and lets go.
 */
export function dragTo(
  run: SceneRun<BoardScene>,
  sprite: GameObjects.Sprite,
  to: CanvasPoint,
): void {
  const by = middleOf(sprite);
  const held = { x: to.x + by.x - sprite.x, y: to.y + by.y - sprite.y };
  pickUp(run, sprite, by);
  mouse(run, "move", held);
  mouse(run, "up", held);
}
