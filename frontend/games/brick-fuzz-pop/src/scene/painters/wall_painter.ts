import { shareDone } from "@fz/core/math";
import { onContextRestored } from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import type { GameObjects, Scene, Textures } from "phaser";
import { cellAt, columnOf, fieldRowOf } from "../../rules/grid";
import { COLUMNS, MOST_DEPTH } from "../../rules/tuning";
import { DANGER_ROW, dangerCells } from "../../rules/wall/lower";
import type { Wall } from "../../rules/wall/wall";
import { brickLayers } from "../../view/art/art";
import type { FrameName } from "../../view/art/frames";
import type { WallPalette } from "../../view/colors/palette";
import { swellScale } from "../../view/effects/flourish";
import { SWELL_MS } from "../../view/effects/timing";
import type { FieldMetrics } from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import { FIELD_FRAMES } from "../field_art";
import { dynamicTexture } from "./dynamic_texture";
import type { PaintContext, Painter } from "./painter";

/** The most frames a brick shows stacked in its cell: a tough brick's tile, pips and cracks. */
export const MOST_LAYERS = 3;

/** The key of the texture the wall standing still is stamped on, a brick's stack in each cell. */
export const WALL_BAKE = "wall-bake";

/**
 * The most struck bricks that swell at once, each over the bake; one
 * struck past them takes the place of the one that started swelling first,
 * or of the first in the pool of those struck in the same frame.
 */
export const MOST_SWELLING = 16;

/** The frames a cell shows where no brick stands. */
const NO_LAYERS: readonly FrameName[] = [];

/** The field cell of a swelling that shows none. */
const NO_CELL = -1;

/** Describes a struck brick swelling over the bake, its cell cleared from the bake while it plays. */
export interface Swelling {
  /** The field cell it swells in, row by row from the floor, or −1 while it shows none. */
  readonly cell: number;
  /** When it was struck, in the scene's time. */
  readonly at: number;
  /** Its stack of frames, from the bottom up. */
  readonly images: readonly GameObjects.Image[];
}

/** Describes a place a struck brick swells in, which the painter moves from swell to swell. */
interface SwellPlace extends Swelling {
  cell: number;
  at: number;
}

/**
 * Draws the wall: each brick standing still stamped in its cell of a
 * texture, the bake, which one image shows; a struck brick swelling and
 * settling over it, its cell cleared from the bake while it does; and the
 * warning frame over each brick the level needs at or under the row over
 * the floor's, one step from losing the level or losing it. Where the
 * player welcomes motion, it eases the wall down a row or a jump as the
 * view's `wallDrop` goes from 0 to 1 by moving the bake's image, the rows
 * coming in from over the ceiling cut off along it.
 *
 * The view hands over the wall that comes down at once, with `wallDrop` 0,
 * and keeps it at 1 while the wall stands still, so the wall eases from
 * the row it last stood still on to the one it now stands on; a wall that
 * rises, as a new level's may, stands where it is at once. It hands over
 * another wall each frame a brick changes.
 */
export class WallPainter implements Painter {
  /** Shows the bake, its top left at the cells'. */
  readonly image: GameObjects.Image;
  /** The struck bricks that may swell at once, each over the bake. */
  readonly swellings: readonly Swelling[];
  /** The places the struck bricks swell in, which {@link swellings} shows. */
  private readonly places: readonly SwellPlace[];
  /** The warning frame over each cell of the floor's row and the row over it, made once, row by row from the floor, shown where a brick the level needs stands. */
  readonly warnings: readonly GameObjects.Image[];
  /** The texture the wall standing still is stamped on. */
  private readonly bake: Textures.DynamicTexture;
  /** The frames stamped in each field cell of the bake, row by row from the floor. */
  private readonly stamped: (readonly FrameName[])[];
  /** Whether the bake must be stamped whole though nothing was laid out anew: once a lost context is restored. */
  private lost = false;
  /** How a brick's frames are stamped on the bake: about its cell's middle, scaled as the layout has them, made once a layout. */
  private cellStamp = { scale: 1 };
  /** Whether a swell started or ended since the bake was last stamped. */
  private swellsChanged = false;
  /** The field row the wall's lowest row last stood still in, or null before the first frame. */
  private still: number | null = null;
  /** What the bake was last stamped for, and how far over its place the wall was last drawn, so a frame where none changed stamps nothing. */
  private readonly drawn: {
    wall: Wall | null;
    over: number;
    metrics: FieldMetrics | null;
    depth: number;
    baked: ArtScale | null;
    palette: WallPalette | null;
  } = {
    wall: null,
    over: 0,
    metrics: null,
    depth: 0,
    baked: null,
    palette: null,
  };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.bake = dynamicTexture(scene, WALL_BAKE);
    this.image = scene.add.image(0, 0, WALL_BAKE).setOrigin(0, 0);
    this.places = Array.from({ length: MOST_SWELLING }, () => ({
      cell: NO_CELL,
      at: Number.NEGATIVE_INFINITY,
      images: Array.from({ length: MOST_LAYERS }, () =>
        scene.add.image(0, 0, ATLAS).setVisible(false),
      ),
    }));
    this.swellings = this.places;
    this.warnings = Array.from({ length: (DANGER_ROW + 1) * COLUMNS }, () =>
      scene.add.image(0, 0, ATLAS, FIELD_FRAMES.warning).setVisible(false),
    );
    this.stamped = Array.from(
      { length: MOST_DEPTH * COLUMNS },
      () => NO_LAYERS,
    );
    layer.add([
      this.image,
      ...this.swellings.flatMap(({ images }) => images),
      ...this.warnings,
    ]);
    // The bake's stamps go with a lost context; the atlas is baked anew.
    onContextRestored(scene, () => {
      this.lost = true;
    });
  }

  /**
   * Returns the wall last drawn, or null before the first frame: where the
   * bricks show, and what they were, a brick the flight broke since the
   * last frame among them. The view writes over a wall it handed over only
   * two walls later, so the one drawn the frame before holds its bricks
   * through the next.
   */
  drawnWall(): Wall | null {
    return this.drawn.wall;
  }

  /**
   * Swells the brick struck in a wall cell, from a time, if it stands in the
   * field: afresh where it already swells, or in the place of the swell
   * that started first where every place is taken.
   */
  swell(wall: Wall, cell: number, now: number): void {
    const row = fieldRowOf(wall, cell);
    if (row < 0 || row >= MOST_DEPTH) return;
    const fieldCell = row * COLUMNS + columnOf(cell);
    const place =
      this.places.find((swelling) => swelling.cell === fieldCell) ??
      // A free place's swell started at −Infinity, first of all.
      this.places.reduce(startedFirst);
    if (place.cell !== fieldCell) this.swellsChanged = true;
    place.cell = fieldCell;
    place.at = now;
  }

  /** Draws the wall as the view has it, eased down where it comes down, stamping only what changed, and swells each brick struck. */
  draw({
    view,
    shape,
    metrics,
    baked,
    palette,
    motion,
    now,
  }: Readonly<PaintContext>): void {
    const { wall } = view;
    const done = motion ? Math.min(1, Math.max(0, view.wallDrop)) : 1;
    if (this.still === null || done === 1 || wall.lowestRow > this.still) {
      this.still = wall.lowestRow;
    }
    const over = Math.round(
      (this.still - wall.lowestRow) * (1 - done) * metrics.unit,
    );
    const scale = metrics.unit / baked.unit;
    const drawn = this.drawn;
    this.settleSwells(now);
    if (wall.lowestRow !== drawn.wall?.lowestRow) {
      // A brick swelling would swell another, as each field row now shows
      // another of the wall's.
      this.endSwells();
    }
    const laidOut =
      metrics !== drawn.metrics ||
      shape.depth !== drawn.depth ||
      baked !== drawn.baked ||
      palette !== drawn.palette;
    if (laidOut) this.cellStamp = { scale };
    if (laidOut || this.lost) {
      this.bake.setSize(metrics.width, metrics.height, false);
      // The image takes up its frame again, so it keeps no size the bake had.
      this.image.setFrame(this.image.frame.name);
      this.stampWhole(wall, metrics.unit, shape.depth);
    } else if (wall !== drawn.wall || this.swellsChanged) {
      this.stampChanged(wall, metrics.unit, shape.depth);
    }
    if (wall !== drawn.wall || laidOut || over !== drawn.over) {
      this.placeWarnings(metrics, shape.depth, over, scale);
      this.showBake(metrics, over);
    }
    if (wall !== drawn.wall) this.frameDanger(wall);
    drawn.wall = wall;
    drawn.metrics = metrics;
    drawn.depth = shape.depth;
    drawn.baked = baked;
    drawn.palette = palette;
    drawn.over = over;
    this.swellOn(wall, metrics, shape.depth, over, scale, now);
  }

  /** Clears the bake whole, stamps every field cell's stack on it, and renders it. */
  private stampWhole(wall: Wall, unit: number, depth: number): void {
    this.bake.clear();
    this.stamped.fill(NO_LAYERS);
    this.lost = false;
    this.stampCells(wall, unit, depth);
    this.bake.render();
  }

  /** Stamps each field cell whose stack is not the one the bake shows, and renders the bake where it stamped any. */
  private stampChanged(wall: Wall, unit: number, depth: number): void {
    if (this.stampCells(wall, unit, depth)) this.bake.render();
  }

  /**
   * Stamps each field cell whose stack is not the one the bake shows,
   * clearing it first, and returns whether it drew in any; a swelling
   * brick's cell shows none.
   */
  private stampCells(wall: Wall, unit: number, depth: number): boolean {
    const { bake, stamped, cellStamp } = this;
    let changed = false;
    for (let row = 0; row < depth; row++) {
      const top = (depth - 1 - row) * unit;
      for (let column = 0; column < COLUMNS; column++) {
        const cell = row * COLUMNS + column;
        const frames = this.isSwelling(cell)
          ? NO_LAYERS
          : layersAt(wall, row, column);
        const shown = stamped[cell] ?? NO_LAYERS;
        if (sameFrames(frames, shown)) continue;
        const left = column * unit;
        if (shown.length > 0) bake.clear(left, top, unit, unit);
        for (const frame of frames) {
          bake.stamp(ATLAS, frame, left + unit / 2, top + unit / 2, cellStamp);
        }
        stamped[cell] = frames;
        changed = true;
      }
    }
    this.swellsChanged = false;
    return changed;
  }

  /** Shows the bake at the cells' top left, the wall some device pixels over its place, cut off along the ceiling. */
  private showBake({ x, y }: FieldMetrics, over: number): void {
    const image = this.image;
    image.setPosition(x, y - over);
    if (over > 0) {
      const { width, height } = image.frame;
      image.setCrop(0, over, width, height - over);
    } else if (image.isCropped) {
      image.setCrop();
    }
  }

  /** Ends each swell over at a time, its cell stamped in the bake again. */
  private settleSwells(now: number): void {
    for (const swelling of this.places) {
      if (swelling.cell === NO_CELL) continue;
      if (shareDone(swelling.at, now, SWELL_MS) < 1) continue;
      this.release(swelling);
    }
  }

  /** Ends every swell, as the wall comes down and each field row shows another of the wall's. */
  private endSwells(): void {
    for (const swelling of this.places) {
      if (swelling.cell !== NO_CELL) this.release(swelling);
    }
  }

  /** Ends a swell, hiding it, and has its cell stamped again. */
  private release(swelling: SwellPlace): void {
    swelling.cell = NO_CELL;
    swelling.at = Number.NEGATIVE_INFINITY;
    this.hide(swelling);
    this.swellsChanged = true;
  }

  /** Hides a swell's images. */
  private hide({ images }: Swelling): void {
    for (const image of images) image.setVisible(false);
  }

  /** Returns whether a brick swells in a field cell. */
  private isSwelling(cell: number): boolean {
    for (const swelling of this.places) {
      if (swelling.cell === cell) return true;
    }
    return false;
  }

  /** Shows each swelling brick's stack over its cell, the wall some device pixels over its place, scaled as its swell has it at a time. */
  private swellOn(
    wall: Wall,
    { x, y, unit }: FieldMetrics,
    depth: number,
    over: number,
    scale: number,
    now: number,
  ): void {
    for (const swelling of this.places) {
      const { cell, images } = swelling;
      if (cell === NO_CELL) continue;
      const row = Math.floor(cell / COLUMNS);
      const column = cell % COLUMNS;
      const frames = layersAt(wall, row, column);
      const swollen = scale * swellScale(shareDone(swelling.at, now, SWELL_MS));
      const middleX = x + (column + 0.5) * unit;
      const middleY = y + (depth - 1 - row + 0.5) * unit - over;
      for (let layer = 0; layer < MOST_LAYERS; layer++) {
        const image = images[layer];
        if (!image) continue;
        const frame = frames[layer];
        if (frame === undefined) {
          image.setVisible(false);
          continue;
        }
        if (image.frame.name !== frame) image.setFrame(frame);
        image.setPosition(middleX, middleY).setScale(swollen).setVisible(true);
      }
    }
  }

  /** Places the warning frames over their cells, the wall some device pixels over its place. */
  private placeWarnings(
    { x, y, unit }: FieldMetrics,
    depth: number,
    over: number,
    scale: number,
  ): void {
    // The rows the frames stand in never stand over the ceiling, even
    // eased down a jump, so they are never cut.
    let spot = 0;
    for (const warning of this.warnings) {
      const row = Math.floor(spot / COLUMNS);
      const column = spot % COLUMNS;
      warning
        .setPosition(
          x + (column + 0.5) * unit,
          y + (depth - 1 - row + 0.5) * unit - over,
        )
        .setScale(scale);
      spot++;
    }
  }

  /** Shows the warning frame over each brick a wall's level needs at or under the row over the floor's, and hides the rest. */
  private frameDanger(wall: Wall): void {
    for (const warning of this.warnings) warning.setVisible(false);
    for (const cell of dangerCells(wall)) {
      const row = fieldRowOf(wall, cell);
      if (row >= 0) {
        this.warnings[row * COLUMNS + columnOf(cell)]?.setVisible(true);
      }
    }
  }
}

/** Returns whichever of two swells started first, the first of them where they started at once. */
function startedFirst<T extends Swelling>(first: T, second: T): T {
  return second.at < first.at ? second : first;
}

/** Returns whether two stacks of frames are the same, frame for frame. */
function sameFrames(a: readonly FrameName[], b: readonly FrameName[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let at = 0; at < a.length; at++) {
    if (a[at] !== b[at]) return false;
  }
  return true;
}

/**
 * Returns the frames a brick shows in a field row and column of a wall, or
 * none where no brick stands there, as in a row under the wall or over it,
 * past either end of its bricks.
 */
function layersAt(
  wall: Wall,
  row: number,
  column: number,
): readonly FrameName[] {
  const brick = wall.bricks[cellAt(wall, column, row)];
  return brick ? brickLayers(brick) : NO_LAYERS;
}
