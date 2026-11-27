import { SWELL } from "@fz/core/motion";
import type { HostedScene } from "@fz/phaser/host";
import type { PixelRect } from "@fz/phaser/layout";
import { dynamicTexture } from "@fz/phaser/scene";
import {
  type BakeCommand,
  type SceneRun,
  recordBakes,
  runBareScene,
  stampsIn,
} from "@fz/phaser/testing";
import type { GameObjects } from "phaser";
import { COLUMNS, MOST_DEPTH } from "../rules/field";
import { cellAt } from "../rules/grid";
import { wallFrom } from "../rules/level_picture";
import type { Brick, Wall } from "../rules/wall";
import {
  DARK_MADE_UP,
  LIGHT_MADE_UP,
  MADE_UP_MOST_LAYERS,
  madeUpField,
  madeUpFrames,
  madeUpLayers,
} from "../testing/made_up/field";
import {
  MADE_UP_LEGEND,
  MADE_UP_RULES,
  type MadeUpKind,
} from "../testing/made_up/wall";
import { type Place, toCanvas } from "../view/field_metrics";
import type { WallPalette } from "../view/palette";
import { SWELL_MS } from "../view/timing";
import { MOST_BAKED_UNIT, WallAtlas } from "./atlas";
import type { PaintContext, WallView } from "./painter";
import {
  MOST_SWELLING,
  WALL_BAKE,
  type WallArt,
  WallPainter,
} from "./wall_painter";

/** How the made-up bricks are drawn. */
const ART: WallArt<MadeUpKind> = {
  layersOf: madeUpLayers,
  mostLayers: MADE_UP_MOST_LAYERS,
  warning: "warning",
};

/** Returns a wall made up for the specs, from a picture, its lowest row in a field row. */
function wallOf(
  picture: readonly string[],
  lowestRow: number,
): Wall<MadeUpKind> {
  return wallFrom(picture, MADE_UP_LEGEND, { lowestRow });
}

/**
 * A wall standing from field row 5 to row 12, two rows over the ceiling of
 * a field 11 deep: at wall cell 0 a brick of a hit, at wall cell 8 one of
 * three, three frames stacked.
 */
const STANDING = wallOf(
  [
    "1.......1",
    "1.......1",
    "1.......m",
    "2.......1",
    "1.......2",
    "1.......1",
    "11.....11",
    "1.......3",
  ],
  5,
);

/** {@link STANDING} come down a row, its brick at wall cell 8 worn to two hits. */
const STEPPED: Wall<MadeUpKind> = {
  ...STANDING,
  bricks: STANDING.bricks.map((brick, cell) =>
    cell === 8 && brick ? { ...brick, hits: 2 } : brick,
  ),
  lowestRow: 4,
};

/** A wall whose row over the floor's holds bricks the level needs in columns 0, 2 and 4, and moss, which it doesn't. */
const ENDANGERING = wallOf(["1m1.1.m.."], 1);

/** Describes a wall painted in a scene, the context it was drawn from and what its bake was handed. */
interface Painted {
  readonly run: SceneRun<HostedScene>;
  readonly painter: WallPainter<MadeUpKind>;
  readonly layer: GameObjects.Layer;
  readonly atlas: WallAtlas<WallPalette>;
  readonly context: PaintContext<WallView<MadeUpKind>>;
  /** Returns what the wall's bake was handed from the start. */
  readonly baked: () => BakeCommand[];
}

/**
 * Paints a wall on a canvas of some CSS pixels, standing still unless the
 * view says it has eased down less far, in the light palette, in a scene
 * running till the test finishes, its bake recorded from the start.
 */
async function paintWall(
  wall: Wall<MadeUpKind> = STANDING,
  width = 400,
  height = 400,
  wallDrop = 1,
): Promise<Painted> {
  const run = await runBareScene();
  onTestFinished(() => {
    run.destroy();
  });
  const { scene } = run;
  const { shape, metrics } = madeUpField(width, height);
  const atlas = new WallAtlas(scene, madeUpFrames, LIGHT_MADE_UP, metrics);
  // The painter takes up the texture there under its key.
  const bakes = recordBakes(dynamicTexture(scene, WALL_BAKE));
  const baked = (): BakeCommand[] => bakes(WALL_BAKE);
  const layer = scene.add.layer();
  const painter = new WallPainter(scene, layer, ART, MADE_UP_RULES);
  const context = {
    view: { wall, wallDrop },
    shape,
    metrics,
    baked: atlas.scale,
    palette: atlas.palette,
    now: 0,
    motion: true,
  };
  painter.draw(context);
  return { run, painter, layer, atlas, context, baked };
}

/** Hands over a wall eased down as far as given, and draws a frame 16 ms on. */
function bringDown(
  painted: Painted,
  wall: Wall<MadeUpKind>,
  wallDrop: number,
): void {
  painted.context.view = { wall, wallDrop };
  drawOn(painted, 16);
}

/** Draws a frame some milliseconds on. */
function drawOn(painted: Painted, ms: number): void {
  painted.context.now += ms;
  painted.painter.draw(painted.context);
}

/** Lays the wall out again on a canvas of some CSS pixels, the atlas baked for it, and draws it. */
function layOut(painted: Painted, width: number, height: number): void {
  const { shape, metrics } = madeUpField(width, height);
  const { atlas, context } = painted;
  atlas.bakeFor(context.palette, metrics);
  context.shape = shape;
  context.metrics = metrics;
  context.baked = atlas.scale;
  painted.painter.draw(context);
}

/** Returns the brick at a wall cell, failing where there is none. */
function brickAt(wall: Wall<MadeUpKind>, cell: number): Brick<MadeUpKind> {
  const brick = wall.bricks[cell];
  if (!brick) throw new Error(`No brick at ${String(cell)}.`);
  return brick;
}

/** Returns the frames a brick at a wall cell shows. */
function layersOf(wall: Wall<MadeUpKind>, cell: number): string[] {
  return [...madeUpLayers(brickAt(wall, cell))];
}

/** Returns whether a clear's rectangle, or the whole bake where it names none, covers a place. */
function covers(rect: PixelRect | null, { x, y }: Place): boolean {
  return (
    rect === null ||
    (x >= rect.x &&
      x < rect.x + rect.width &&
      y >= rect.y &&
      y < rect.y + rect.height)
  );
}

/**
 * Returns the frames the wall's bake shows in a field row and column, from
 * the bottom of the stack up, as the commands it rendered since it was
 * made stamped and cleared them.
 */
function framesAt(painted: Painted, row: number, column: number): string[] {
  const { image } = painted.painter;
  const unit = image.width / COLUMNS;
  const depth = image.height / unit;
  const middle = { x: (column + 0.5) * unit, y: (depth - row - 0.5) * unit };
  let drawn: string[] = [];
  let shown: string[] = [];
  for (const command of painted.baked()) {
    if (command.kind === "render") shown = [...drawn];
    if (command.kind === "clear" && covers(command.rect, middle)) drawn = [];
    if (
      command.kind === "stamp" &&
      command.x === middle.x &&
      command.y === middle.y
    ) {
      drawn.push(command.frame);
    }
  }
  return shown;
}

/** Returns where the middle of a field row and column's cell shows on the canvas, as the wall's bake is shown. */
function placeAt(painted: Painted, row: number, column: number): Place {
  const { image } = painted.painter;
  const unit = image.width / COLUMNS;
  const depth = image.height / unit;
  return {
    x: image.x + (column + 0.5) * unit,
    y: image.y + (depth - row - 0.5) * unit,
  };
}

/** Returns where the middle of a field row and column's cell lies on the canvas, the wall at rest. */
function cellMiddle(painted: Painted, row: number, column: number): Place {
  return toCanvas(painted.context.metrics, column + 0.5, row + 0.5);
}

/** Returns how many frames a wall's bricks stack in a field of a depth, each of which a bake stamped whole stamps. */
function wallStamps(wall: Wall<MadeUpKind>, depth: number): number {
  let frames = 0;
  for (let row = 0; row < depth; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const brick = wall.bricks[cellAt(wall, column, row)];
      if (brick) frames += madeUpLayers(brick).length;
    }
  }
  return frames;
}

/** Returns the images of the swell over a field row and column that show, from the bottom of its stack up: none where no brick swells there. */
function swellAt(
  painted: Painted,
  row: number,
  column: number,
): GameObjects.Image[] {
  const swelling = painted.painter.swellings.find(
    ({ cell }) => cell === row * COLUMNS + column,
  );
  return swelling?.images.filter((image) => image.visible) ?? [];
}

/** Returns how many swells show. */
function swellsShowing(painted: Painted): number {
  return painted.painter.swellings.filter(({ images }) =>
    images.some((image) => image.visible),
  ).length;
}

/** Returns the field column and row of each warning frame shown, from the floor. */
function framedIn(painted: Painted): (readonly [number, number])[] {
  return painted.painter.warnings.flatMap((warning, at) =>
    warning.visible ? [[at % COLUMNS, Math.floor(at / COLUMNS)] as const] : [],
  );
}

/** Returns a number rounded to nine places, past which its arithmetic may stray. */
function rounded(value: number): number {
  return Math.round(value * 1e9) / 1e9;
}

describe("WallPainter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("the wall standing still", () => {
    it("shows each brick in its cell, its frames stacked from the bottom up", async () => {
      const painted = await paintWall();

      expect({
        brick: framesAt(painted, 5, 0),
        stacked: framesAt(painted, 5, 8),
        gap: framesAt(painted, 5, 1),
        place: placeAt(painted, 5, 8),
      }).toEqual({
        brick: layersOf(STANDING, 0),
        stacked: layersOf(STANDING, 8),
        gap: [],
        place: cellMiddle(painted, 5, 8),
      });
    });

    it("stamps each brick about its cell's middle on its bake, shown at the cells' top left", async () => {
      const painted = await paintWall();
      const { x, y, unit } = painted.context.metrics;

      // The brick at wall cell 8 stands in field row 5, column 8, of 11
      // rows.
      const stacked = stampsIn(painted.baked()).filter(
        (stamp) => stamp.x === 8.5 * unit && stamp.y === 5.5 * unit,
      );

      expect({
        image: { x: painted.painter.image.x, y: painted.painter.image.y },
        stacked,
      }).toEqual({
        image: { x, y },
        stacked: layersOf(STANDING, 8).map((frame) => ({
          kind: "stamp",
          frame,
          x: 8.5 * unit,
          y: 5.5 * unit,
          scale: 1,
        })),
      });
    });

    it("hides the rows waiting over the ceiling, its bake as deep as the field", async () => {
      const painted = await paintWall();

      expect({
        over: Array.from({ length: MOST_DEPTH - 11 }, (_, above) =>
          framesAt(painted, 11 + above, 0),
        ).flat(),
        height: painted.painter.image.height,
      }).toEqual({ over: [], height: 11 * painted.context.metrics.unit });
    });

    it("shows a brick's frames anew as it takes a hit", async () => {
      const painted = await paintWall();
      const worn = {
        ...STANDING,
        bricks: STANDING.bricks.map((brick, cell) =>
          cell === 8 && brick ? { ...brick, hits: 1 } : brick,
        ),
      };

      bringDown(painted, worn, 1);

      expect(framesAt(painted, 5, 8)).toEqual(layersOf(worn, 8));
    });

    it("stamps only the cell whose brick changed, cleared first", async () => {
      const painted = await paintWall();
      const from = painted.baked().length;
      const { unit } = painted.context.metrics;
      const bricks = [...STANDING.bricks];
      const hit = { ...brickAt(STANDING, 8), hits: 2 };
      bricks[8] = hit;

      bringDown(painted, { ...STANDING, bricks }, 1);

      expect(painted.baked().slice(from)).toEqual([
        {
          kind: "clear",
          rect: { x: 8 * unit, y: 5 * unit, width: unit, height: unit },
        },
        ...madeUpLayers(hit).map((frame) => ({
          kind: "stamp",
          frame,
          x: 8.5 * unit,
          y: 5.5 * unit,
          scale: 1,
        })),
        { kind: "render" },
      ]);
    });

    it("stamps nothing again in a frame where nothing changed", async () => {
      const painted = await paintWall();
      const from = painted.baked().length;

      drawOn(painted, 16);

      expect(painted.baked().slice(from)).toEqual([]);
    });

    it("stamps the whole wall afresh in a new palette", async () => {
      const painted = await paintWall();
      const from = painted.baked().length;
      const { atlas, context } = painted;
      atlas.bakeFor(DARK_MADE_UP, context.metrics);
      context.palette = atlas.palette;
      context.baked = atlas.scale;

      drawOn(painted, 16);

      const baked = painted.baked().slice(from);
      expect({ first: baked[0], stamps: stampsIn(baked).length }).toEqual({
        first: { kind: "clear", rect: null },
        stamps: wallStamps(STANDING, 11),
      });
    });

    it("stamps the whole wall afresh once a lost context is restored, and nothing again the frame after", async () => {
      const painted = await paintWall();
      const from = painted.baked().length;
      await painted.run.loseContext();
      await painted.run.restoreContext();

      drawOn(painted, 16);
      const restored = painted.baked().length;
      drawOn(painted, 16);

      const baked = painted.baked().slice(from);
      expect({
        first: baked[0],
        stamps: stampsIn(baked).length,
        after: painted.baked().length - restored,
      }).toEqual({
        first: { kind: "clear", rect: null },
        stamps: wallStamps(STANDING, 11),
        after: 0,
      });
    });

    it("stamps the whole wall afresh at a unit past the atlas's largest, scaled up to it", async () => {
      const painted = await paintWall(STANDING, 1300, 1800);
      const from = painted.baked().length;

      layOut(painted, 1400, 1900);

      const stamps = stampsIn(painted.baked().slice(from));
      expect({
        stamps: stamps.length,
        scales: [...new Set(stamps.map(({ scale }) => scale))],
      }).toEqual({
        stamps: wallStamps(STANDING, madeUpField(1400, 1900).shape.depth),
        scales: [madeUpField(1400, 1900).metrics.unit / MOST_BAKED_UNIT],
      });
    });

    it("hides a brick once it breaks", async () => {
      const painted = await paintWall();

      bringDown(
        painted,
        { ...STANDING, bricks: [null, ...STANDING.bricks.slice(1)] },
        1,
      );

      expect(framesAt(painted, 5, 0)).toEqual([]);
    });

    it("shows the wall standing still in one image, and makes a stack of images for each brick that may swell at once", async () => {
      const { painter, layer } = await paintWall();

      expect({
        image: painter.image.texture.key,
        swells: painter.swellings.map(({ images }) => images.length),
        layered: layer.list.includes(painter.image),
      }).toEqual({
        image: WALL_BAKE,
        swells: Array.from({ length: MOST_SWELLING }, () => ART.mostLayers),
        layered: true,
      });
    });

    it("shows the wall where a new layout puts it", async () => {
      const painted = await paintWall();

      layOut(painted, 600, 500);

      expect(placeAt(painted, 5, 8)).toEqual(
        toCanvas(madeUpField(600, 500).metrics, 8.5, 5.5),
      );
    });

    it("shows the rows a deeper field brings in", async () => {
      const painted = await paintWall();
      const before = framesAt(painted, 11, 0);

      layOut(painted, 300, 700);

      expect({
        deeper: painted.context.shape.depth > 12,
        before,
        after: framesAt(painted, 11, 0),
      }).toEqual({
        deeper: true,
        before: [],
        after: layersOf(STANDING, 6 * COLUMNS),
      });
    });

    it("hands back the wall it last drew", async () => {
      const painted = await paintWall();

      bringDown(painted, STEPPED, 0);

      expect(painted.painter.drawnWall()).toBe(STEPPED);
    });
  });

  describe("the wall coming down", () => {
    it("stands where the wall came down at once, before it eases", async () => {
      const painted = await paintWall();

      bringDown(painted, STEPPED, 0);

      // The brick at wall cell 8 ends in row 4, from row 5.
      expect(placeAt(painted, 4, 8)).toEqual(cellMiddle(painted, 5, 8));
    });

    it("eases down as the view goes through the wall's step", async () => {
      const painted = await paintWall();
      bringDown(painted, STEPPED, 0);

      bringDown(painted, STEPPED, 0.5);

      const end = cellMiddle(painted, 4, 8);
      expect(placeAt(painted, 4, 8)).toEqual({
        x: end.x,
        y: end.y - Math.round(0.5 * painted.context.metrics.unit),
      });
    });

    it("comes to rest where the view's step ends, and stays", async () => {
      const painted = await paintWall();
      bringDown(painted, STEPPED, 0.5);
      bringDown(painted, STEPPED, 1);

      bringDown(painted, STEPPED, 0);

      expect(placeAt(painted, 4, 8)).toEqual(cellMiddle(painted, 4, 8));
    });

    it("eases a jump down its rows", async () => {
      const painted = await paintWall();
      const jumped = { ...STANDING, lowestRow: 2 };
      bringDown(painted, jumped, 0);

      bringDown(painted, jumped, 0.5);

      // Halfway down three rows, 46.5 px at 31 px a unit, rounded.
      expect(placeAt(painted, 2, 8).y).toBe(
        cellMiddle(painted, 2, 8).y -
          Math.round(1.5 * painted.context.metrics.unit),
      );
    });

    it("stands the wall it starts on where it is, however far the view says it has come down", async () => {
      const painted = await paintWall(STANDING, 400, 400, 0);

      expect(placeAt(painted, 5, 8)).toEqual(cellMiddle(painted, 5, 8));
    });

    it("takes a step the view has gone past the end of as ended", async () => {
      const painted = await paintWall();

      bringDown(painted, STEPPED, 1.5);

      expect(placeAt(painted, 4, 8)).toEqual(cellMiddle(painted, 4, 8));
    });

    it("takes a step the view hasn't begun as not begun", async () => {
      const painted = await paintWall();

      bringDown(painted, STEPPED, -0.5);

      expect(placeAt(painted, 4, 8)).toEqual(cellMiddle(painted, 5, 8));
    });

    it("cuts as much off its bake's top as lies over the ceiling, as the rows come in", async () => {
      const painted = await paintWall();
      // Phaser keeps the crop where its typings don't show it.
      const crop = vi.spyOn(painted.painter.image, "setCrop");
      const { width, height, unit } = painted.context.metrics;
      const cut = Math.round(0.5 * unit);

      // Wall row 6 comes from row 11, over the ceiling, into row 10.
      bringDown(painted, STEPPED, 0.5);

      expect(crop).toHaveBeenLastCalledWith(0, cut, width, height - cut);
    });

    it("shows none of a row still wholly over the ceiling", async () => {
      const painted = await paintWall();
      const crop = vi.spyOn(painted.painter.image, "setCrop");
      const { width, height, unit } = painted.context.metrics;

      bringDown(painted, STEPPED, 0);

      expect(crop).toHaveBeenLastCalledWith(0, unit, width, height - unit);
    });

    it("cuts nothing off once the wall is in", async () => {
      const painted = await paintWall();
      bringDown(painted, STEPPED, 0.5);

      bringDown(painted, STEPPED, 1);

      expect(painted.painter.image.isCropped).toBe(false);
    });

    it("comes down at once where the player prefers less motion", async () => {
      const painted = await paintWall();
      painted.context.motion = false;

      bringDown(painted, STEPPED, 0);

      expect(placeAt(painted, 4, 8)).toEqual(cellMiddle(painted, 4, 8));
    });

    it("stands a wall that rises where it is at once, as a new level's may", async () => {
      const painted = await paintWall();

      bringDown(painted, { ...STANDING, lowestRow: 7 }, 0);

      expect(placeAt(painted, 7, 8)).toEqual(cellMiddle(painted, 7, 8));
    });
  });

  describe("the danger", () => {
    it("frames each brick the level needs in the row over the floor's, and no other", async () => {
      const painted = await paintWall(ENDANGERING);
      const first = painted.painter.warnings[COLUMNS];

      expect({
        framed: framedIn(painted),
        frame: first?.frame.name,
        place: { x: first?.x, y: first?.y },
      }).toEqual({
        framed: [
          [0, 1],
          [2, 1],
          [4, 1],
        ],
        frame: ART.warning,
        place: cellMiddle(painted, 1, 0),
      });
    });

    it("frames none while only bricks the level doesn't need stand there", async () => {
      const painted = await paintWall(wallOf(["111......", "mmm......"], 1));

      expect(framedIn(painted)).toEqual([]);
    });

    it("frames none while the wall stands higher", async () => {
      const painted = await paintWall();

      expect(framedIn(painted)).toEqual([]);
    });

    it("unframes a brick broken there", async () => {
      const painted = await paintWall(ENDANGERING);

      bringDown(painted, wallOf(["..1.1.m.."], 1), 1);

      expect(framedIn(painted)).toEqual([
        [2, 1],
        [4, 1],
      ]);
    });

    it("brings the frames down with the wall as it eases", async () => {
      const painted = await paintWall(wallOf(["1m1.1.m.."], 2));

      bringDown(painted, ENDANGERING, 0.5);

      // Halfway down a row, 15.5 px at 31 px a unit, rounded.
      expect(painted.painter.warnings[COLUMNS]?.y).toBe(
        cellMiddle(painted, 1, 0).y -
          Math.round(0.5 * painted.context.metrics.unit),
      );
    });

    it("keeps the frames on the bricks through the step that loses the level", async () => {
      const painted = await paintWall(ENDANGERING);

      bringDown(painted, wallOf(["1m1.1.m.."], 0), 0.5);

      // Halfway down from the row over the floor's to the floor's.
      expect({
        framed: framedIn(painted),
        y: painted.painter.warnings[0]?.y,
      }).toEqual({
        framed: [
          [0, 0],
          [2, 0],
          [4, 0],
        ],
        y:
          cellMiddle(painted, 0, 0).y -
          Math.round(0.5 * painted.context.metrics.unit),
      });
    });

    it("shows the frames over the wall and every swell", async () => {
      const { painter, layer } = await paintWall(ENDANGERING);
      const swells = painter.swellings.flatMap(({ images }) => images);

      const under = Math.max(
        ...[painter.image, ...swells].map((image) => layer.getIndex(image)),
      );
      const firstFrame = Math.min(
        ...painter.warnings.map((warning) => layer.getIndex(warning)),
      );

      expect(firstFrame).toBeGreaterThan(under);
    });

    it("shows the frames scaled up with the wall's frames past the atlas's largest unit", async () => {
      const painted = await paintWall(ENDANGERING, 1300, 1800);

      expect(painted.painter.warnings.at(-1)?.scale).toBe(
        madeUpField(1300, 1800).metrics.unit / MOST_BAKED_UNIT,
      );
    });
  });

  describe("a swell", () => {
    it("swells a struck brick, and settles it back", async () => {
      const painted = await paintWall();
      painted.painter.swell(STANDING, 8, 16);
      drawOn(painted, 16);
      const swollen = swellAt(painted, 5, 8)[0]?.scale ?? 0;

      drawOn(painted, SWELL_MS);

      expect({
        swollen: rounded(swollen),
        settled: swellAt(painted, 5, 8),
      }).toEqual({ swollen: rounded(1 + SWELL), settled: [] });
    });

    it("swells a struck brick over its cell, cleared from the bake while it swells, and stamped back once it settles", async () => {
      const painted = await paintWall();
      painted.painter.swell(STANDING, 8, 16);
      drawOn(painted, 16);
      const [bottom] = swellAt(painted, 5, 8);
      const swelling = {
        baked: framesAt(painted, 5, 8),
        swells: swellAt(painted, 5, 8).map((image) => image.frame.name),
        place: { x: bottom?.x, y: bottom?.y },
      };

      drawOn(painted, SWELL_MS);

      expect({ swelling, settled: framesAt(painted, 5, 8) }).toEqual({
        swelling: {
          baked: [],
          swells: layersOf(STANDING, 8),
          place: cellMiddle(painted, 5, 8),
        },
        settled: layersOf(STANDING, 8),
      });
    });

    it("swells as many bricks at once as it has places, the next struck taking the place of the first", async () => {
      const wall = wallOf(["111111111", "111111111"], 5);
      const painted = await paintWall(wall);

      // Wall cells 0 to 16 stand in field rows 5 and 6.
      for (let cell = 0; cell <= MOST_SWELLING; cell++) {
        painted.painter.swell(wall, cell, 16);
      }
      drawOn(painted, 16);

      expect({
        first: swellAt(painted, 5, 0),
        last: swellAt(painted, 6, 7).length,
        swelling: swellsShowing(painted),
      }).toEqual({ first: [], last: 1, swelling: MOST_SWELLING });
    });

    it("stamps the first swell's brick back in the bake as a brick struck past the places in a later frame takes its place", async () => {
      const wall = wallOf(["111111111", "111111111"], 5);
      const painted = await paintWall(wall);
      for (let cell = 0; cell < MOST_SWELLING; cell++) {
        painted.painter.swell(wall, cell, 16);
      }
      drawOn(painted, 16);

      painted.painter.swell(wall, MOST_SWELLING, 32);
      drawOn(painted, 16);

      expect({
        first: framesAt(painted, 5, 0),
        last: framesAt(painted, 6, 7),
      }).toEqual({ first: layersOf(wall, 0), last: [] });
    });

    it("swells a brick struck as the wall eases down where the brick shows", async () => {
      const painted = await paintWall();
      bringDown(painted, STEPPED, 0);
      painted.context.view = { wall: STEPPED, wallDrop: 0.5 };

      // The brick at wall cell 8 stands in field row 4, from row 5.
      painted.painter.swell(STEPPED, 8, painted.context.now + 16);
      drawOn(painted, 16);

      expect(swellAt(painted, 4, 8)[0]?.y).toBe(placeAt(painted, 4, 8).y);
    });

    it("swells a brick struck again afresh, in the place it swells in", async () => {
      const painted = await paintWall();
      painted.painter.swell(STANDING, 8, 16);
      drawOn(painted, 16);
      drawOn(painted, SWELL_MS / 2);

      painted.painter.swell(STANDING, 8, painted.context.now + 16);
      drawOn(painted, 16);

      expect({
        scale: rounded(swellAt(painted, 5, 8)[0]?.scale ?? 0),
        places: painted.painter.swellings.filter(
          ({ cell }) => cell === 5 * COLUMNS + 8,
        ).length,
      }).toEqual({ scale: rounded(1 + SWELL), places: 1 });
    });

    it("lets a swell go as the wall that comes down is handed over, rather than swell the brick come into its row", async () => {
      const rows = ["111111112", "111111111"];
      const painted = await paintWall(wallOf(rows, 5));
      painted.painter.swell(painted.context.view.wall, 8, 16);
      drawOn(painted, 16);
      const swollen = swellAt(painted, 5, 8).length > 0;
      // Wall cell 17, of the row over cell 8's, comes into field row 5.
      const down = wallOf(rows, 4);

      bringDown(painted, down, 0);

      expect({
        swollen,
        after: swellsShowing(painted),
        baked: framesAt(painted, 5, 8),
      }).toEqual({ swollen: true, after: 0, baked: layersOf(down, 17) });
    });

    it.each([
      ["under the floor", -1],
      ["over the deepest field's ceiling", MOST_DEPTH],
    ])("swells no brick %s", async (_, lowestRow) => {
      const painted = await paintWall(wallOf(["111111111"], lowestRow));

      painted.painter.swell(painted.context.view.wall, 0, 16);
      drawOn(painted, 16);

      expect(swellsShowing(painted)).toBe(0);
    });
  });
});
