import type { Cameras } from "phaser";
import type { PaintContext, Painter } from "./painter";

/**
 * Shakes the board as the play's timeline has it at the frame's moment,
 * by moving the camera, so all it draws shakes whole together, by whole
 * device pixels, so the board stays sharp, and the one place the camera's
 * scroll is written.
 */
export class BoardShake implements Painter {
  /** How far the camera is scrolled across, in device pixels. */
  private x = 0;
  /** How far the camera is scrolled down, in device pixels. */
  private y = 0;

  constructor(private readonly camera: Cameras.Scene2D.Camera) {}

  /** Moves the camera as far as the board is shaken at the frame's moment, where that moved. */
  draw({ frame, pixelRatio }: Readonly<PaintContext>): void {
    const x = -Math.round(frame.board.shake.x * pixelRatio);
    const y = -Math.round(frame.board.shake.y * pixelRatio);
    if (x === this.x && y === this.y) return;
    this.x = x;
    this.y = y;
    this.camera.setScroll(x, y);
  }
}
