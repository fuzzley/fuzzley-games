import * as Phaser from "phaser";
import { BoardScene } from "../board_scene";
import { BoardViewState, HighlightView } from "./board_view_state";
import { PileType } from "@/game/model/card/card_pile";

/** Time constant (ms) for frame-rate-independent card position easing. */
const POSITION_TAU_MS = 90;

/** Render depth of the hover-highlight graphics (above all cards/drags). */
const HIGHLIGHT_DEPTH = 2000;

/** Distance (px) within which an easing card snaps exactly to target. */
const POSITION_SETTLE_THRESHOLD_PX = 0.5;

/** Pre-scale stroke width of the highlight border. */
const HIGHLIGHT_LINE_THICKNESS = 9;

/** Pre-scale corner radius of the highlight border. */
const HIGHLIGHT_CORNER_RADIUS = 12;

/** Highlight border color. */
const HIGHLIGHT_COLOR = 0xebef9b;

/** Highlight border opacity. */
const HIGHLIGHT_ALPHA = 0.9;

/**
 * Responsible for applying the board view state to the Phaser scene.
 * Coordinates rendering updates for all visual elements including card sprites,
 * pile backgrounds, highlights, and interactive states.
 */
export class BoardViewApplier {
  private readonly highlightGraphics: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: BoardScene) {
    this.highlightGraphics = scene.add.graphics();
    this.highlightGraphics.setDepth(HIGHLIGHT_DEPTH);
  }

  /**
   * Applies the desired view state onto Phaser sprites, syncing positions,
   * scales, depths, frames, cursors, and drawing highlights.
   *
   * @param viewState The target board view state to render.
   * @param deltaMs Elapsed time since the last frame in milliseconds.
   */
  public apply(viewState: BoardViewState, deltaMs: number): void {
    // Frame-rate independent interpolation constant
    const interpolationFactor =
      deltaMs > 0 ? 1 - Math.exp(-deltaMs / POSITION_TAU_MS) : 1;

    for (const backgroundView of viewState.backgrounds) {
      let sprite: Phaser.GameObjects.Sprite | undefined;
      if (backgroundView.pileType === PileType.STOCK) {
        sprite = this.scene.stockPile.sprite;
      } else if (backgroundView.pileType === PileType.FOUNDATION) {
        const pileIndex = backgroundView.pileIndex ?? 0;
        sprite = this.scene.foundationPiles[pileIndex]?.sprite;
      } else if (backgroundView.pileType === PileType.TABLEAU) {
        const pileIndex = backgroundView.pileIndex ?? 0;
        sprite = this.scene.tableauPiles[pileIndex]?.sprite;
      }

      if (sprite && sprite.active) {
        sprite.setPosition(backgroundView.x, backgroundView.y);
        sprite.setScale(backgroundView.scale);
        sprite.setDepth(backgroundView.depth);
        if (
          backgroundView.cursor &&
          sprite.input &&
          sprite.input.cursor !== backgroundView.cursor
        ) {
          sprite.input.cursor = backgroundView.cursor;
        }
      }
    }

    for (const cardView of viewState.cards) {
      const visual = this.scene.cardVisualsMap.get(cardView.cardId);
      const sprite = visual?.sprite;
      if (sprite && sprite.active) {
        if (cardView.snap || deltaMs <= 0) {
          sprite.setPosition(cardView.x, cardView.y);
        } else {
          sprite.x += (cardView.x - sprite.x) * interpolationFactor;
          sprite.y += (cardView.y - sprite.y) * interpolationFactor;
          if (
            Math.abs(sprite.x - cardView.x) < POSITION_SETTLE_THRESHOLD_PX &&
            Math.abs(sprite.y - cardView.y) < POSITION_SETTLE_THRESHOLD_PX
          ) {
            sprite.setPosition(cardView.x, cardView.y);
          }
        }
        sprite.setScale(cardView.scale);
        sprite.setDepth(cardView.depth);
        if (sprite.frame.name !== cardView.frame) {
          sprite.setFrame(cardView.frame);
          sprite.setOrigin(0, 0);
        }
        if (sprite.input && sprite.input.cursor !== cardView.cursor) {
          sprite.input.cursor = cardView.cursor;
        }
        if (sprite.getData("draggable") !== cardView.draggable) {
          this.scene.input.setDraggable(sprite, cardView.draggable);
          sprite.setData("draggable", cardView.draggable);
        }
      }
    }

    this.drawHighlight(viewState.highlight);
  }

  private drawHighlight(highlight: HighlightView | null): void {
    this.highlightGraphics.clear();
    if (!highlight) {
      return;
    }

    const thickness = HIGHLIGHT_LINE_THICKNESS * highlight.scale;
    const radius = HIGHLIGHT_CORNER_RADIUS * highlight.scale;
    this.highlightGraphics.lineStyle(
      thickness,
      HIGHLIGHT_COLOR,
      HIGHLIGHT_ALPHA,
    );

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
