import { itemAt } from "@fz/core/records";
import type { GameObjects, Scene } from "phaser";
import type { DustLayers } from "../../rules/catalog/elements";
import { MOST_SQUARES } from "../../rules/levels/level_rules";
import { FRAMES } from "../../view/art/frame_names";
import { type BoardMetrics, FALLING_IN_MARGIN } from "../../view/board/metrics";
import type { GridShown } from "../../view/run_state";
import type { Timeline } from "../../view/timeline/timeline";
import { ATLAS } from "../atlas";
import {
  type PaintContext,
  type Painter,
  acrossOf,
  downOf,
  shownScale,
} from "./painter";

/** How far past the canvas the rim reaches, in device pixels, so a shaken board shows no edge of it. */
const RIM_REACH = 1 << 16;

/**
 * Draws the board's squares as the play the board draws lays them out: a
 * well for each square, none for a gap, where the page shows through; the
 * dust on each as it stands at the frame's moment, each layer swept off as
 * the timeline says; and the rim, the page round the board, over a piece
 * still falling in from past its edge. Each well and each dust is an image
 * made once, a square each.
 */
export class BoardPainter implements Painter {
  /** A well for each square, in reading order. */
  readonly wells: readonly GameObjects.Image[];
  /** The dust for each square, in reading order. */
  readonly dusts: readonly GameObjects.Image[];
  /** The page round the board. */
  readonly rim: GameObjects.Graphics;
  /** How many layers of dust each square holds at the frame's moment, written each frame. */
  private readonly layers: DustLayers[] =
    Array<DustLayers>(MOST_SQUARES).fill(0);
  /** How many layers each square's dust image shows, so a frame sets only those that change. */
  private readonly shown: DustLayers[] =
    Array<DustLayers>(MOST_SQUARES).fill(0);
  /** What the squares were last laid out for, by identity, or null before they first were. */
  private laidOut: {
    grid: GridShown;
    metrics: BoardMetrics;
    scale: number;
  } | null = null;
  /** The page's color and the board's metrics the rim was last drawn in, or null before it first was. */
  private rimFor: { page: number; metrics: BoardMetrics } | null = null;

  /** Makes the board's images in its layers: the wells, the dust, and the rim. */
  constructor(
    scene: Scene,
    layers: {
      readonly squares: GameObjects.Layer;
      readonly dust: GameObjects.Layer;
      readonly rim: GameObjects.Layer;
    },
  ) {
    this.wells = squareImages(scene, layers.squares, FRAMES.square);
    this.dusts = squareImages(scene, layers.dust, FRAMES.dust(1));
    this.rim = scene.add.graphics();
    layers.rim.add(this.rim);
  }

  /** Draws the squares, their dust and the rim for the frame. */
  draw(context: Readonly<PaintContext>): void {
    const { play, metrics, palette } = context;
    const scale = shownScale(context);
    const laidOut = this.laidOut;
    if (
      laidOut?.grid !== play.grid ||
      laidOut.metrics !== metrics ||
      laidOut.scale !== scale
    ) {
      this.layOut(play.grid, metrics, scale);
      this.laidOut = { grid: play.grid, metrics, scale };
    }
    this.dust(play.grid, play.timeline, context.clock.playedMs);
    const rimFor = this.rimFor;
    if (rimFor?.page !== palette.page || rimFor.metrics !== metrics) {
      this.drawRim(palette.page, metrics);
      this.rimFor = { page: palette.page, metrics };
    }
  }

  /** Puts a well and its dust on each square of a board, and hides those past its squares and on its gaps. */
  private layOut(grid: GridShown, metrics: BoardMetrics, scale: number): void {
    for (let square = 0; square < MOST_SQUARES; square++) {
      const well = itemAt(this.wells, square);
      const dust = itemAt(this.dusts, square);
      const shown =
        square < grid.width * grid.height &&
        (grid.squares[square] ?? null) !== null;
      const x = acrossOf(metrics, square % grid.width);
      const y = downOf(metrics, Math.floor(square / grid.width));
      well.setPosition(x, y).setScale(scale).setVisible(shown);
      dust.setPosition(x, y).setScale(scale);
    }
  }

  /** Shows the dust each square of a board holds at a moment of a timeline played on it: as it held it, each layer swept off since. */
  private dust(grid: GridShown, timeline: Timeline, atMs: number): void {
    const { layers } = this;
    const count = Math.min(MOST_SQUARES, grid.width * grid.height);
    for (let square = 0; square < count; square++) {
      layers[square] = grid.squares[square]?.dust ?? 0;
    }
    const changes = timeline.dust;
    for (let index = 0; index < changes.length; index++) {
      const change = itemAt(changes, index);
      if (change.atMs > atMs) break;
      layers[change.at.y * grid.width + change.at.x] = change.layers;
    }
    const { shown } = this;
    for (let square = 0; square < MOST_SQUARES; square++) {
      const held = square < count ? itemAt(layers, square) : 0;
      if (held === itemAt(shown, square)) continue;
      shown[square] = held;
      const dust = itemAt(this.dusts, square);
      if (held === 0) {
        dust.setVisible(false);
      } else {
        dust.setFrame(FRAMES.dust(held)).setVisible(true);
      }
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
      .fillRect(-RIM_REACH, -RIM_REACH, 2 * RIM_REACH, top + RIM_REACH)
      .fillRect(-RIM_REACH, bottom, 2 * RIM_REACH, RIM_REACH)
      .fillRect(-RIM_REACH, top, left + RIM_REACH, bottom - top)
      .fillRect(right, top, RIM_REACH, bottom - top);
  }
}

/** Returns an image for each square a board may have, of a frame of the atlas, hidden, in a layer. */
function squareImages(
  scene: Scene,
  layer: GameObjects.Layer,
  frame: string,
): readonly GameObjects.Image[] {
  const images = Array.from({ length: MOST_SQUARES }, () =>
    scene.add.image(0, 0, ATLAS, frame).setVisible(false),
  );
  layer.add(images);
  return images;
}
