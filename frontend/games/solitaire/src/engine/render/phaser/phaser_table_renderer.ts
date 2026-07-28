import * as Phaser from "phaser";
import { Point } from "@/engine/core/common/point";
import { PhaserSprites } from "./phaser_sprites";
import { TableRenderer } from "../view/table_renderer";
import { TableViewState, HighlightView } from "../view/table_view_state";
import { HIGHLIGHT_ANCHOR_SETTLE_TOLERANCE } from "../layout/board_geometry";

/** Time constant (ms) for frame-rate-independent card position easing. */
const POSITION_TAU_MS = 90;

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
 * A pooled highlight border, paired with the shape currently stroked into it.
 *
 * The path is drawn in the object's own space and the object is moved, so
 * following a card costs a `setPosition` rather than a path rebuild every
 * frame. The key records what was drawn so it is only redrawn when the size or
 * the open edge actually changes.
 */
interface HighlightBorder {
  graphics: Phaser.GameObjects.Graphics;
  shapeKey: string | null;
  /** The depth currently set, so the display list is only re-sorted on change. */
  depth: number | null;
}

/**
 * The Phaser backend for {@link TableRenderer}.
 *
 * Reconciles a view state onto Phaser sprites — positions, scales, depths,
 * frames, cursors, draggability — and draws the highlight borders. Card
 * positions are eased rather than set, so a sprite converges on its target over
 * several frames instead of jumping there.
 */
export class PhaserTableRenderer implements TableRenderer {
  /** Highlight borders, created on demand and reused across frames. */
  private readonly highlightBorders: HighlightBorder[] = [];

  /**
   * How far each card still had to travel at the end of the last applied frame,
   * keyed by card id. Cards that reached their target are absent.
   */
  private travelDistances = new Map<string, number>();

  constructor(private readonly sprites: PhaserSprites) {}

  /**
   * Whether any of the given cards had still not reached its target when the
   * last frame was applied.
   *
   * The applier owns the easing, so it is the only thing that can tell a card
   * that has arrived from one still on its way. The scene asks so it can retire
   * a flight once the moved stack has landed.
   *
   * @param cardIds The card ids to test.
   */
  public areCardsTravelling(cardIds: readonly string[]): boolean {
    return cardIds.some((cardId) => this.travelDistances.has(cardId));
  }

  /**
   * Applies the desired view state onto Phaser sprites, syncing positions,
   * scales, depths, frames, cursors, and drawing highlights.
   *
   * @param viewState The target board view state to render.
   * @param deltaMs Elapsed time since the last frame in milliseconds.
   */
  public apply(viewState: TableViewState, deltaMs: number): void {
    // Frame-rate independent interpolation constant
    const interpolationFactor =
      deltaMs > 0 ? 1 - Math.exp(-deltaMs / POSITION_TAU_MS) : 1;

    for (const backgroundView of viewState.backgrounds) {
      const sprite = this.sprites.pileBackgroundSprite(backgroundView.pileId);

      if (sprite?.active) {
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

    // How far each still-easing card has left to travel, so a border can tell a
    // card settling into place from one crossing the board.
    const travelDistances = new Map<string, number>();

    for (const cardView of viewState.cards) {
      const sprite = this.sprites.cardSprite(cardView.cardId);
      if (sprite?.active) {
        if (cardView.snap || deltaMs <= 0) {
          sprite.setPosition(cardView.x, cardView.y);
        } else {
          sprite.x += (cardView.x - sprite.x) * interpolationFactor;
          sprite.y += (cardView.y - sprite.y) * interpolationFactor;
          const remainingX = Math.abs(sprite.x - cardView.x);
          const remainingY = Math.abs(sprite.y - cardView.y);
          if (
            remainingX < POSITION_SETTLE_THRESHOLD_PX &&
            remainingY < POSITION_SETTLE_THRESHOLD_PX
          ) {
            sprite.setPosition(cardView.x, cardView.y);
          } else {
            travelDistances.set(
              cardView.cardId,
              Math.max(remainingX, remainingY),
            );
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
          this.sprites.setDraggable(sprite, cardView.draggable);
          sprite.setData("draggable", cardView.draggable);
        }
      }
    }

    this.travelDistances = travelDistances;
    this.drawHighlights(viewState.highlights, travelDistances);
  }

  /**
   * Positions one border per highlight, reusing the pooled objects and hiding
   * whichever are left over from a busier frame.
   */
  private drawHighlights(
    highlights: HighlightView[],
    travelDistances: ReadonlyMap<string, number>,
  ): void {
    let borderIndex = 0;

    for (const highlight of highlights) {
      const position = this.resolveHighlightPosition(
        highlight,
        travelDistances,
      );
      if (!position) continue;

      const border = this.highlightBorder(borderIndex++);
      this.shapeHighlightBorder(border, highlight);
      if (border.depth !== highlight.depth) {
        border.graphics.setDepth(highlight.depth);
        border.depth = highlight.depth;
      }
      border.graphics.setPosition(position.x, position.y);
      border.graphics.setVisible(true);
    }

    for (
      let index = borderIndex;
      index < this.highlightBorders.length;
      index++
    ) {
      this.highlightBorders[index].graphics.setVisible(false);
    }
  }

  /**
   * Resolves where a highlight's border belongs this frame, or null when it
   * should not be drawn at all.
   *
   * A card anchor reads the sprite's live position rather than the layout's
   * target, so the border rides the same easing as the card and can never lead
   * or lag it. A card still crossing the board is skipped: it is on its way out
   * from under the pointer that highlighted it. One merely settling the last few
   * pixels into its slot keeps its border, so stepping the pointer down a column
   * does not blank it while the fan reshuffles.
   */
  private resolveHighlightPosition(
    highlight: HighlightView,
    travelDistances: ReadonlyMap<string, number>,
  ): Point | null {
    if (highlight.anchor.kind === "point") {
      return { x: highlight.anchor.x, y: highlight.anchor.y };
    }

    const cardId = highlight.anchor.cardId;
    const settleTolerance = HIGHLIGHT_ANCHOR_SETTLE_TOLERANCE * highlight.scale;
    if ((travelDistances.get(cardId) ?? 0) > settleTolerance) {
      return null;
    }

    const sprite = this.sprites.cardSprite(cardId);
    if (!sprite?.active) {
      return null;
    }

    return { x: sprite.x, y: sprite.y };
  }

  /** Returns the pooled border at the given index, creating it on first use. */
  private highlightBorder(index: number): HighlightBorder {
    let border = this.highlightBorders[index];
    if (!border) {
      border = {
        graphics: this.sprites.addGraphics(),
        shapeKey: null,
        depth: null,
      };
      this.highlightBorders[index] = border;
    }
    return border;
  }

  /**
   * Strokes the border's path, in its own space so the object can be moved
   * rather than redrawn, and only when the shape has actually changed.
   */
  private shapeHighlightBorder(
    border: HighlightBorder,
    highlight: HighlightView,
  ): void {
    const shapeKey = `${highlight.width}:${highlight.height}:${highlight.scale}:${highlight.openBottom}`;
    if (border.shapeKey === shapeKey) {
      return;
    }
    border.shapeKey = shapeKey;

    const graphics = border.graphics;
    const radius = HIGHLIGHT_CORNER_RADIUS * highlight.scale;

    graphics.clear();
    graphics.lineStyle(
      HIGHLIGHT_LINE_THICKNESS * highlight.scale,
      HIGHLIGHT_COLOR,
      HIGHLIGHT_ALPHA,
    );

    if (!highlight.openBottom) {
      graphics.strokeRoundedRect(
        0,
        0,
        highlight.width,
        highlight.height,
        radius,
      );
    } else {
      strokeOpenBottomRoundedRect(
        graphics,
        highlight.width,
        highlight.height,
        radius,
      );
    }
  }
}

/**
 * Strokes a rounded rectangle at the origin with its bottom edge left open, so
 * the border never draws a line across a card stacked on top.
 */
function strokeOpenBottomRoundedRect(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  cornerRadius: number,
): void {
  const radius = Math.max(0, Math.min(cornerRadius, height, width / 2));

  graphics.beginPath();
  graphics.moveTo(0, height);
  graphics.lineTo(0, radius);
  graphics.arc(radius, radius, radius, Math.PI, Math.PI * 1.5);
  graphics.lineTo(width - radius, 0);
  graphics.arc(width - radius, radius, radius, Math.PI * 1.5, Math.PI * 2);
  graphics.lineTo(width, height);
  graphics.strokePath();
}
