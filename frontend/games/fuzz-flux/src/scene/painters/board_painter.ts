import { itemAt } from "@fz/core/records";
import { dynamicTexture, onContextRestored } from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import type { GameObjects, Scene, Textures } from "phaser";
import type { DustLayers } from "../../rules/catalog/elements";
import { MOST_SQUARES } from "../../rules/levels/level_rules";
import { FRAMES } from "../../view/art/frame_names";
import { type BoardMetrics, FALLING_IN_MARGIN } from "../../view/board/metrics";
import type { BoardPalette } from "../../view/colors/palette";
import type { GridShown } from "../../view/run_state";
import type { Timeline } from "../../view/timeline/timeline";
import { ATLAS } from "../atlas";
import {
  PAST_CANVAS,
  type PaintContext,
  type Painter,
  shownScale,
} from "./painter";

/** The key of the texture the board's squares are stamped on, each well and the dust on it. */
export const SQUARES_BAKE = "fuzz-flux-squares";

/**
 * Draws the board's squares as the play the board draws lays them out: a
 * well for each square, none for a gap, where the page shows through; the
 * dust on each as it stands at the frame's moment, each layer swept off as
 * the timeline says; and the rim, the page round the board, over a piece
 * still falling in from past its edge. The wells and the dust are stamped
 * on one texture, the bake, which one image shows, and stamped again only
 * where the dust on a square changes, and whole as the board, its layout,
 * its palette or the atlas changes, and after a lost context.
 */
export class BoardPainter implements Painter {
  /** The bake's image, at the board's top left corner. */
  readonly squares: GameObjects.Image;
  /** The page round the board. */
  readonly rim: GameObjects.Graphics;
  /** The texture the wells and the dust are stamped on. */
  private readonly bake: Textures.DynamicTexture;
  /** How many layers of dust each square holds at the frame's moment, written each frame. */
  private readonly layers: DustLayers[] =
    Array<DustLayers>(MOST_SQUARES).fill(0);
  /** How many layers of dust the bake shows on each square, so a frame stamps a square again only as its dust changes. */
  private readonly shown: DustLayers[] =
    Array<DustLayers>(MOST_SQUARES).fill(0);
  /** How a frame is stamped on the bake, at the board's square, as it was baked for another. */
  private readonly stamping = { scale: 1 };
  /** What the bake was last stamped for, by identity, or null before it first was. */
  private stampedFor: {
    grid: GridShown;
    metrics: BoardMetrics;
    baked: ArtScale;
    palette: BoardPalette;
  } | null = null;
  /** Whether a lost context took the bake's stamps since they were last stamped. */
  private lost = false;
  /** The page's color and the board's metrics the rim was last drawn in, or null before it first was. */
  private rimFor: { page: number; metrics: BoardMetrics } | null = null;

  /** Makes the board's images in its layers: the bake's, and the rim. */
  constructor(
    scene: Scene,
    layers: {
      readonly squares: GameObjects.Layer;
      readonly rim: GameObjects.Layer;
    },
  ) {
    this.bake = dynamicTexture(scene, SQUARES_BAKE);
    this.squares = scene.add.image(0, 0, SQUARES_BAKE).setOrigin(0, 0);
    layers.squares.add(this.squares);
    this.rim = scene.add.graphics();
    layers.rim.add(this.rim);
    onContextRestored(scene, () => {
      this.lost = true;
    });
  }

  /** Draws the squares, their dust and the rim for the frame. */
  draw(context: Readonly<PaintContext>): void {
    const { play, metrics, baked, palette } = context;
    const stampedFor = this.stampedFor;
    this.stamping.scale = shownScale(context);
    this.dust(play.grid, play.timeline, context.clock.playedMs);
    if (
      stampedFor?.grid !== play.grid ||
      stampedFor.metrics !== metrics ||
      stampedFor.baked !== baked ||
      stampedFor.palette !== palette ||
      this.lost
    ) {
      this.layOut(metrics);
      this.stampWhole(play.grid, metrics);
      this.stampedFor = { grid: play.grid, metrics, baked, palette };
    } else {
      this.stampDusted(play.grid, metrics);
    }
    const rimFor = this.rimFor;
    if (rimFor?.page !== palette.page || rimFor.metrics !== metrics) {
      this.drawRim(palette.page, metrics);
      this.rimFor = { page: palette.page, metrics };
    }
  }

  /** Sizes the bake to the board, and shows it at the board's top left corner. */
  private layOut(metrics: BoardMetrics): void {
    this.bake.setSize(metrics.width, metrics.height, false);
    // The image takes up its frame again, so it keeps no size the bake had.
    this.squares.setFrame(this.squares.frame.name);
    this.squares.setPosition(metrics.x, metrics.y);
  }

  /** Clears the bake whole, stamps every square of a board on it, and renders it. */
  private stampWhole(grid: GridShown, metrics: BoardMetrics): void {
    this.bake.clear();
    for (let square = 0; square < MOST_SQUARES; square++) {
      this.shown[square] = itemAt(this.layers, square);
      this.stampSquare(grid, metrics, square);
    }
    this.bake.render();
    this.lost = false;
  }

  /** Stamps again each square whose dust is not what the bake shows, clearing it first, and renders the bake where it stamped any. */
  private stampDusted(grid: GridShown, metrics: BoardMetrics): void {
    const { bake, layers, shown } = this;
    const { square: side } = metrics;
    let stamped = false;
    for (let square = 0; square < MOST_SQUARES; square++) {
      const held = itemAt(layers, square);
      if (held === itemAt(shown, square)) continue;
      shown[square] = held;
      bake.clear(
        (square % grid.width) * side,
        Math.floor(square / grid.width) * side,
        side,
        side,
      );
      this.stampSquare(grid, metrics, square);
      stamped = true;
    }
    if (stamped) bake.render();
  }

  /** Stamps a square of a board on the bake: its well, none on a gap or past its squares, and the dust the bake shows on it. */
  private stampSquare(
    grid: GridShown,
    metrics: BoardMetrics,
    square: number,
  ): void {
    if (
      square >= grid.width * grid.height ||
      (grid.squares[square] ?? null) === null
    ) {
      return;
    }
    const { bake, stamping } = this;
    const x = ((square % grid.width) + 0.5) * metrics.square;
    const y = (Math.floor(square / grid.width) + 0.5) * metrics.square;
    bake.stamp(ATLAS, FRAMES.square, x, y, stamping);
    const layers = itemAt(this.shown, square);
    if (layers !== 0) bake.stamp(ATLAS, FRAMES.dust(layers), x, y, stamping);
  }

  /** Writes the dust each square of a board holds at a moment of a timeline played on it: as it held it, each layer swept off since, and none past its squares. */
  private dust(grid: GridShown, timeline: Timeline, atMs: number): void {
    const { layers } = this;
    const count = Math.min(MOST_SQUARES, grid.width * grid.height);
    for (let square = 0; square < MOST_SQUARES; square++) {
      layers[square] = square < count ? (grid.squares[square]?.dust ?? 0) : 0;
    }
    const changes = timeline.dust;
    for (let index = 0; index < changes.length; index++) {
      const change = itemAt(changes, index);
      if (change.atMs > atMs) break;
      layers[change.at.y * grid.width + change.at.x] = change.layers;
    }
  }

  /** Draws the page round the board, but for the margin a piece falling in shows over. */
  private drawRim(page: number, metrics: BoardMetrics): void {
    const margin = Math.round(FALLING_IN_MARGIN * metrics.square);
    const left = metrics.x - margin;
    const top = metrics.y - margin;
    const right = metrics.x + metrics.width + margin;
    const bottom = metrics.y + metrics.height + margin;
    this.rim
      .clear()
      .fillStyle(page)
      .fillRect(-PAST_CANVAS, -PAST_CANVAS, 2 * PAST_CANVAS, top + PAST_CANVAS)
      .fillRect(-PAST_CANVAS, bottom, 2 * PAST_CANVAS, PAST_CANVAS)
      .fillRect(-PAST_CANVAS, top, left + PAST_CANVAS, bottom - top)
      .fillRect(right, top, PAST_CANVAS, bottom - top);
  }
}
