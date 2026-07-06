import * as Phaser from "phaser";
import { BoardScene } from "../board_scene";
import { BoardViewState, HighlightView } from "./board_view_state";

/**
 * Responsible for applying the board view state to the Phaser scene.
 * Coordinates rendering updates for all visual elements including card sprites,
 * pile backgrounds, highlights, and interactive states.
 */
export class BoardViewApplier {
  private readonly highlightGraphics: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: BoardScene) {
    this.highlightGraphics = scene.add.graphics();
    this.highlightGraphics.setDepth(2000); // HIGHLIGHT_DEPTH
  }

  /**
   * Applies the desired view state onto Phaser sprites, syncing positions,
   * scales, depths, frames, cursors, and drawing highlights.
   *
   * @param vs The target board view state to render.
   * @param delta Elapsed time since the last frame in milliseconds.
   */
  public apply(vs: BoardViewState, delta: number): void {
    const POSITION_TAU_MS = 90;
    // Frame-rate independent interpolation constant
    const k = delta > 0 ? 1 - Math.exp(-delta / POSITION_TAU_MS) : 1;

    for (const bg of vs.backgrounds) {
      let s: Phaser.GameObjects.Sprite | undefined;
      if (bg.pileId === "stock") {
        s = this.scene.stockPile.sprite;
      } else if (bg.pileId.startsWith("foundation-")) {
        const idx = parseInt(bg.pileId.substring(11), 10);
        s = this.scene.foundationPiles[idx]?.sprite;
      } else if (bg.pileId.startsWith("tableau-")) {
        const idx = parseInt(bg.pileId.substring(8), 10);
        s = this.scene.tableauPiles[idx]?.sprite;
      }

      if (s && s.active) {
        s.setPosition(bg.x, bg.y);
        s.setScale(bg.scale);
        s.setDepth(bg.depth);
        s.setOrigin(0, 0);
        if (bg.cursor && s.input && s.input.cursor !== bg.cursor) {
          s.input.cursor = bg.cursor;
        }
      }
    }

    for (const cv of vs.cards) {
      const visual = this.scene.cardVisualsMap.get(cv.cardId);
      const s = visual?.sprite;
      if (s && s.active) {
        if (cv.snap || delta <= 0) {
          s.setPosition(cv.x, cv.y);
        } else {
          s.x += (cv.x - s.x) * k;
          s.y += (cv.y - s.y) * k;
          if (Math.abs(s.x - cv.x) < 0.5 && Math.abs(s.y - cv.y) < 0.5) {
            s.setPosition(cv.x, cv.y);
          }
        }
        s.setScale(cv.scale);
        s.setDepth(cv.depth);
        if (s.frame.name !== cv.frame) {
          s.setFrame(cv.frame);
          s.setOrigin(0, 0);
        }
        if (s.input && s.input.cursor !== cv.cursor) {
          s.input.cursor = cv.cursor;
        }
        this.scene.input.setDraggable(s, cv.draggable);
      }
    }

    this.drawHighlight(vs.highlight);
  }

  private drawHighlight(highlight: HighlightView | null): void {
    this.highlightGraphics.clear();
    if (!highlight) {
      return;
    }

    const thickness = 9 * highlight.scale;
    const radius = 12 * highlight.scale;
    this.highlightGraphics.lineStyle(thickness, 0xebef9b, 0.9);

    if (!highlight.openBottom) {
      this.highlightGraphics.strokeRoundedRect(
        highlight.x,
        highlight.y,
        highlight.width,
        highlight.height,
        radius,
      );
    } else {
      this.strokeOpenBottomRoundedRect(
        highlight.x,
        highlight.y,
        highlight.width,
        highlight.height,
        radius,
      );
    }
  }

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

    this.highlightGraphics.beginPath();
    this.highlightGraphics.moveTo(x, bottom);
    this.highlightGraphics.lineTo(x, y + radius);
    this.highlightGraphics.arc(
      x + radius,
      y + radius,
      radius,
      Math.PI,
      Math.PI * 1.5,
    );
    this.highlightGraphics.lineTo(right - radius, y);
    this.highlightGraphics.arc(
      right - radius,
      y + radius,
      radius,
      Math.PI * 1.5,
      Math.PI * 2,
    );
    this.highlightGraphics.lineTo(right, bottom);
    this.highlightGraphics.strokePath();
  }
}
