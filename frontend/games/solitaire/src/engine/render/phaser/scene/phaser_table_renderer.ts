import * as Phaser from "phaser";
import { GameObjects } from "phaser";
import { Point } from "../../layout/geometry";
import { cardSpriteScale } from "../../deck/card_art_scale";
import { PhaserSprites } from "./phaser_sprites";
import { TableRenderer } from "../../view/table_renderer";
import {
  CardView,
  HighlightView,
  PileBackgroundView,
  TableViewState,
} from "../../view/table_view_state";

/**
 * Gives a sprite the cursor its view asks for, skipping the costly assignment
 * if it already has it, and returns whether it changed.
 */
function syncCursor(sprite: GameObjects.Sprite, cursor: string): boolean {
  if (!sprite.input || sprite.input.cursor === cursor) {
    return false;
  }
  sprite.input.cursor = cursor;
  return true;
}

/**
 * Eases a card towards where it belongs and returns how far it still has to
 * go, or null once it has arrived.
 *
 * @param interpolationFactor The fraction of the remaining distance to cover.
 * @param outright Whether to place it exactly rather than ease.
 */
function moveCard(
  sprite: GameObjects.Sprite,
  cardView: CardView,
  interpolationFactor: number,
  outright: boolean,
): number | null {
  if (outright) {
    sprite.setPosition(cardView.x, cardView.y);
    return null;
  }

  sprite.x += (cardView.x - sprite.x) * interpolationFactor;
  sprite.y += (cardView.y - sprite.y) * interpolationFactor;

  const remainingX = Math.abs(sprite.x - cardView.x);
  const remainingY = Math.abs(sprite.y - cardView.y);
  if (
    remainingX < POSITION_SETTLE_THRESHOLD_PX &&
    remainingY < POSITION_SETTLE_THRESHOLD_PX
  ) {
    sprite.setPosition(cardView.x, cardView.y);
    return null;
  }

  return Math.max(remainingX, remainingY);
}

/** Time constant (ms) for frame-rate-independent card position easing. */
const POSITION_TAU_MS = 90;

/** Distance (px) within which an easing card snaps exactly to target. */
const POSITION_SETTLE_THRESHOLD_PX = 0.5;

/**
 * How far below its card a shadow is drawn: under the card casting it, but
 * over the card beneath, which it falls on, since card depths are whole.
 */
const SHADOW_DEPTH_BELOW_CARD = 0.5;

/** Pre-scale stroke width of the highlight border. */
const HIGHLIGHT_LINE_THICKNESS = 9;

/** Pre-scale corner radius of the highlight border. */
const HIGHLIGHT_CORNER_RADIUS = 12;

/** Highlight border color. */
const HIGHLIGHT_COLOR = 0xebef9b;

/** Highlight border opacity. */
const HIGHLIGHT_ALPHA = 0.9;

/**
 * How far a card may still be from its slot while a highlight border stays on
 * it, in design units.
 *
 * About one hover expansion, so the border follows a card nudged by a
 * neighbour's hover but waits for one crossing the board to land.
 */
export const HIGHLIGHT_ANCHOR_SETTLE_TOLERANCE = 15;

/**
 * Pairs a pooled highlight border with the shape and depth last set on it, so
 * neither is redone unless it changes.
 */
interface HighlightBorder {
  graphics: Phaser.GameObjects.Graphics;
  shapeKey: string | null;
  /** The depth currently set, so the display list is only re-sorted on change. */
  depth: number | null;
}

/**
 * Implements {@link TableRenderer} with Phaser sprites, easing cards towards
 * their targets and drawing highlight borders.
 */
export class PhaserTableRenderer implements TableRenderer {
  /** Highlight borders, created on demand and reused across frames. */
  private readonly highlightBorders: HighlightBorder[] = [];

  /**
   * How far each card still had to travel after the last frame, for the cards
   * that had not arrived.
   */
  private travelDistances = new Map<string, number>();

  /**
   * The sprite scale last worked out, and what from, kept because every sprite
   * in a frame shares it and working it out anew would allocate for each.
   */
  private lastSpriteScale: {
    readonly layoutScale: number;
    readonly artScale: number;
    readonly x: number;
    readonly y: number;
  } = { layoutScale: Number.NaN, artScale: Number.NaN, x: 1, y: 1 };

  constructor(private readonly sprites: PhaserSprites) {}

  /**
   * Returns whether any of the given cards had not yet reached its target when
   * the last frame was applied.
   */
  public areCardsTravelling(cardIds: readonly string[]): boolean {
    return cardIds.some((cardId) => this.travelDistances.has(cardId));
  }

  /** Eases every sprite towards a view state and draws its highlights. */
  public apply(viewState: TableViewState, deltaMs: number): void {
    const interpolationFactor =
      deltaMs > 0 ? 1 - Math.exp(-deltaMs / POSITION_TAU_MS) : 1;

    for (const backgroundView of viewState.backgrounds) {
      this.applyBackground(backgroundView);
    }

    const travelDistances = new Map<string, number>();

    for (const cardView of viewState.cards) {
      const sprite = this.sprites.cardSprite(cardView.cardId);
      if (!sprite?.active) continue;

      const remaining = moveCard(
        sprite,
        cardView,
        interpolationFactor,
        cardView.snap || deltaMs <= 0,
      );
      if (remaining !== null) {
        travelDistances.set(cardView.cardId, remaining);
      }

      this.syncAppearance(sprite, cardView);
      this.placeShadow(sprite, cardView);
    }

    this.travelDistances = travelDistances;
    this.drawHighlights(viewState.highlights, travelDistances);
  }

  /**
   * Puts one placeholder where its view says, with the artwork and cursor it
   * asks for.
   */
  private applyBackground(backgroundView: PileBackgroundView): void {
    const sprite = this.sprites.pileBackgroundSprite(backgroundView.pileId);
    if (!sprite?.active) return;

    if (sprite.frame.name !== backgroundView.frame) {
      sprite.setFrame(backgroundView.frame);
      sprite.setOrigin(0, 0);
    }
    sprite.setPosition(backgroundView.x, backgroundView.y);
    this.scaleToLayout(sprite, backgroundView.scale);
    sprite.setDepth(backgroundView.depth);
    if (backgroundView.cursor && syncCursor(sprite, backgroundView.cursor)) {
      // A slot can stop being pressable under a pointer that has not moved,
      // as Montana's marker does on its last redeal.
      this.sprites.showPileBackgroundCursor(backgroundView.pileId);
    }
  }

  /**
   * Brings a card's scale, depth, frame, cursor and draggability into line with
   * its view.
   */
  private syncAppearance(sprite: GameObjects.Sprite, cardView: CardView): void {
    this.scaleToLayout(sprite, cardView.scale);
    sprite.setDepth(cardView.depth);

    if (sprite.frame.name !== cardView.frame) {
      sprite.setFrame(cardView.frame);
      sprite.setOrigin(0, 0);
    }

    syncCursor(sprite, cardView.cursor);

    if (sprite.getData("draggable") !== cardView.draggable) {
      this.sprites.setDraggable(sprite, cardView.draggable);
      sprite.setData("draggable", cardView.draggable);
    }
  }

  /** Puts a card's shadow under the card, wherever it has eased to. */
  private placeShadow(card: GameObjects.Sprite, cardView: CardView): void {
    const shadow = this.sprites.cardShadowSprite(cardView.cardId);
    if (!shadow?.active) return;

    shadow.setPosition(card.x, card.y);
    this.scaleToLayout(shadow, cardView.scale);
    shadow.setDepth(cardView.depth - SHADOW_DEPTH_BELOW_CARD);
  }

  /**
   * Scales a sprite drawn from the atlas, or the shadow baked from it, to a
   * layout scale.
   */
  private scaleToLayout(sprite: GameObjects.Sprite, layoutScale: number): void {
    const artScale = this.sprites.cardArtScale;
    const last = this.lastSpriteScale;
    if (last.layoutScale !== layoutScale || last.artScale !== artScale) {
      this.lastSpriteScale = {
        layoutScale,
        artScale,
        ...cardSpriteScale(layoutScale, artScale),
      };
    }
    sprite.setScale(this.lastSpriteScale.x, this.lastSpriteScale.y);
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
      this.highlightBorders[index]?.graphics.setVisible(false);
    }
  }

  /**
   * Returns where a highlight's border belongs this frame, or null if the card
   * it follows is still crossing the board.
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
