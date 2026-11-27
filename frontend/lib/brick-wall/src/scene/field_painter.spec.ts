import type { HostedScene } from "@fz/phaser/host";
import { framePixels } from "@fz/phaser/layout";
import type { PixelRect } from "@fz/phaser/layout";
import { dynamicTexture } from "@fz/phaser/scene";
import {
  type BakeCommand,
  type SceneRun,
  colorsOf,
  commandsOf,
  drawsIn,
  fillsIn,
  recordBakes,
  runBareScene,
  stampsIn,
} from "@fz/phaser/testing";
import type { GameObjects } from "phaser";
import { COLUMNS } from "../rules/field";
import { wallFrom } from "../rules/level_picture";
import { type Wall, thirdsOf } from "../rules/wall";
import {
  DARK_MADE_UP,
  LIGHT_MADE_UP,
  MADE_UP_SQUARES,
  madeUpField,
  madeUpFrames,
} from "../testing/made_up/field";
import {
  MADE_UP_LEGEND,
  MADE_UP_RULES,
  type MadeUpKind,
} from "../testing/made_up/wall";
import {
  FRAME_CSS_PX,
  type FieldMetrics,
  bandPixels,
  frameBounds,
  lintelPixels,
  toCanvas,
} from "../view/field_metrics";
import type { WallPalette } from "../view/palette";
import { ATLAS, MOST_BAKED_UNIT, WallAtlas } from "./atlas";
import {
  DANGER_LINE,
  FIELD_BAKE,
  type FieldArt,
  type FieldLayers,
  FieldPainter,
  JUMP_LINE,
  LINE_BAKES,
  MOST_COUNTED,
  bandBounds,
} from "./field_painter";
import type { PaintContext, WallView } from "./painter";

/** The made-up frames the field shows, and how wide the count's dot is drawn. */
const ART: FieldArt = {
  gridDot: "grid-dot",
  countDot: "count-dot",
  countDotWidth: MADE_UP_SQUARES["count-dot"].units,
};

/** Returns a wall made up for the specs, from a picture, its lowest row in a field row. */
function wallOf(
  picture: readonly string[],
  lowestRow: number,
): Wall<MadeUpKind> {
  return wallFrom(picture, MADE_UP_LEGEND, { lowestRow });
}

/** A wall with two bricks the level needs under the jump line of a field 11 deep, in row 5. */
const TWO_UNDER = wallOf(["1.......2"], 5);

/** A wall whose row over the floor's holds bricks the level needs in columns 0, 2 and 4, and moss, which it doesn't. */
const ENDANGERING = wallOf(["1m1.1.m.."], 1);

/** Describes a field painted in a scene, the context it was drawn from and what its bake and its strips were handed. */
interface Painted {
  readonly run: SceneRun<HostedScene>;
  readonly painter: FieldPainter<MadeUpKind>;
  readonly layers: FieldLayers;
  readonly atlas: WallAtlas<WallPalette>;
  readonly context: PaintContext<WallView<MadeUpKind>>;
  /** Returns what the field's bake was handed from the start. */
  readonly baked: () => BakeCommand[];
  /** Returns what each line's strip was handed from the start. */
  readonly stripsBaked: () => Record<keyof typeof LINE_BAKES, BakeCommand[]>;
}

/**
 * Paints a wall's field on a canvas of some CSS pixels, in the light
 * palette, in a scene running till the test finishes, its bake recorded
 * from the start.
 */
async function paintField(
  wall: Wall<MadeUpKind> = TWO_UNDER,
  width = 400,
  height = 400,
): Promise<Painted> {
  const run = await runBareScene();
  onTestFinished(() => {
    run.destroy();
  });
  const { scene } = run;
  const { shape, metrics } = madeUpField(width, height);
  const atlas = new WallAtlas(scene, madeUpFrames, LIGHT_MADE_UP, metrics);
  // The painter takes up the textures there under their keys.
  const bakes = recordBakes(dynamicTexture(scene, FIELD_BAKE));
  const baked = (): BakeCommand[] => bakes(FIELD_BAKE);
  const jumpBakes = recordBakes(dynamicTexture(scene, LINE_BAKES.jump));
  const dangerBakes = recordBakes(dynamicTexture(scene, LINE_BAKES.danger));
  const stripsBaked = (): Record<keyof typeof LINE_BAKES, BakeCommand[]> => ({
    jump: jumpBakes(LINE_BAKES.jump),
    danger: dangerBakes(LINE_BAKES.danger),
  });
  const layers = {
    field: scene.add.layer(),
    lines: scene.add.layer(),
    count: scene.add.layer(),
    rim: scene.add.layer(),
  };
  const painter = new FieldPainter(scene, layers, ART, MADE_UP_RULES);
  const context = {
    view: { wall, wallDrop: 1 },
    shape,
    metrics,
    baked: atlas.scale,
    palette: atlas.palette,
    now: 0,
    motion: true,
  };
  painter.draw(context);
  return { run, painter, layers, atlas, context, baked, stripsBaked };
}

/** Lays the field out again on a canvas of some CSS pixels, the atlas baked for it, and draws it. */
function layOut(painted: Painted, width: number, height: number): void {
  const { shape, metrics } = madeUpField(width, height);
  const { atlas, context } = painted;
  atlas.bakeFor(context.palette, metrics);
  context.shape = shape;
  context.metrics = metrics;
  context.baked = atlas.scale;
  painted.painter.draw(context);
}

/** Shows a wall standing still, and draws it. */
function showWall(painted: Painted, wall: Wall<MadeUpKind>): void {
  painted.context.view = { wall, wallDrop: 1 };
  painted.painter.draw(painted.context);
}

/** Bakes the atlas in a palette, and draws the field in it. */
function paintIn(painted: Painted, palette: WallPalette): void {
  const { atlas, context } = painted;
  atlas.bakeFor(palette, context.metrics);
  context.palette = atlas.palette;
  context.baked = atlas.scale;
  painted.painter.draw(context);
}

/** Returns the rectangles a `Graphics` fills in a color, as drawn. */
function rectsIn(graphics: GameObjects.Graphics, color: number): PixelRect[] {
  let filling: number | null = null;
  return commandsOf(graphics).flatMap((command) => {
    if (command.kind === "fillStyle") filling = command.color;
    if (command.kind !== "fillRect" || filling !== color) return [];
    const { x, y, width, height } = command;
    return [{ x, y, width, height }];
  });
}

/** Returns where on the canvas a field row's foot runs, in a layout. */
function rowFoot(metrics: FieldMetrics, row: number): number {
  return toCanvas(metrics, 0, row).y;
}

/** Returns how many of a set of images show. */
function showing(images: readonly GameObjects.Image[]): number {
  return images.filter((image) => image.visible).length;
}

/** Returns where an image's top left lies on the canvas, and how large it shows. */
function rectOf(image: GameObjects.Image): PixelRect {
  return {
    x: image.x,
    y: image.y,
    width: image.displayWidth,
    height: image.displayHeight,
  };
}

describe("bandBounds", () => {
  it("bounds the floor's band under the cells, as thick as the shape has it", () => {
    const { shape, metrics } = madeUpField(400, 400);
    const { x, y, width, height, unit } = metrics;

    expect(bandBounds(metrics, shape)).toEqual({
      x,
      y: y + height,
      width,
      height: bandPixels(shape, unit),
    });
  });

  it.each([
    [400, 400],
    [300, 700],
    [700, 300],
  ])(
    "lies inside the frame on a canvas %i by %i, with room at its right end for three squares as tall as it",
    (width, height) => {
      const { shape, metrics } = madeUpField(width, height);
      const band = bandBounds(metrics, shape);
      const outer = frameBounds(metrics, shape);
      const frame = framePixels(FRAME_CSS_PX, 1);

      expect({
        left: band.x >= outer.x + frame,
        right: band.x + band.width <= outer.x + outer.width - frame,
        foot: band.y + band.height <= outer.y + outer.height - frame,
        room: 3 * band.height <= band.width,
      }).toEqual({ left: true, right: true, foot: true, room: true });
    },
  );
});

describe("FieldPainter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("the ground and the rim", () => {
    it("are painted in the palette", async () => {
      const { painter, baked } = await paintField();

      expect({
        ground: fillsIn(baked()).map(({ color }) => color),
        rim: colorsOf(painter.rim),
      }).toEqual({
        ground: [LIGHT_MADE_UP.field, LIGHT_MADE_UP.band],
        rim: [LIGHT_MADE_UP.band, LIGHT_MADE_UP.line],
      });
    });

    it("are painted again in a new palette", async () => {
      const painted = await paintField();
      const from = painted.baked().length;

      paintIn(painted, DARK_MADE_UP);

      expect({
        ground: fillsIn(painted.baked().slice(from)).map(({ color }) => color),
        rim: colorsOf(painted.painter.rim),
      }).toEqual({
        ground: [DARK_MADE_UP.field, DARK_MADE_UP.band],
        rim: [DARK_MADE_UP.band, DARK_MADE_UP.line],
      });
    });

    it("fill the cells and the floor's band under them on the bake, shown at the cells' top left, and the lintel over them", async () => {
      const { painter, baked, context } = await paintField();
      const { x, y, width, height, unit } = context.metrics;
      const band = bandPixels(context.shape, unit);
      const lintel = lintelPixels(context.shape, unit);

      expect({
        ground: rectOf(painter.ground),
        baked: baked().filter(({ kind }) => kind !== "stamp"),
        lintel: rectsIn(painter.rim, LIGHT_MADE_UP.band),
      }).toEqual({
        ground: { x, y, width, height: height + band },
        baked: [
          { kind: "clear", rect: null },
          {
            kind: "fill",
            color: LIGHT_MADE_UP.field,
            rect: { x: 0, y: 0, width, height },
          },
          {
            kind: "fill",
            color: LIGHT_MADE_UP.band,
            rect: { x: 0, y: height, width, height: band },
          },
          { kind: "render" },
        ],
        lintel: [{ x, y: y - lintel, width, height: lintel }],
      });
    });

    it("paint the band where bandBounds() bounds it, which a game draws into", async () => {
      const { painter, baked, context } = await paintField();
      const [, band] = fillsIn(baked());
      const rect = band?.rect ?? { x: 0, y: 0, width: 0, height: 0 };

      expect({
        ...rect,
        x: painter.ground.x + rect.x,
        y: painter.ground.y + rect.y,
      }).toEqual(bandBounds(context.metrics, context.shape));
    });

    it("frame the field in the margin, and draw the ceiling along the lintel's foot", async () => {
      const { painter, context } = await paintField();
      const { x, y, width, height, unit } = context.metrics;
      const frame = framePixels(FRAME_CSS_PX, 1);
      const top = y - lintelPixels(context.shape, unit);
      const bottom = y + height + bandPixels(context.shape, unit);

      expect(rectsIn(painter.rim, LIGHT_MADE_UP.line)).toEqual([
        { x, y: y - frame, width, height: frame },
        {
          x: x - frame,
          y: top - frame,
          width: width + 2 * frame,
          height: frame,
        },
        { x: x - frame, y: bottom, width: width + 2 * frame, height: frame },
        { x: x - frame, y: top, width: frame, height: bottom - top },
        { x: x + width, y: top, width: frame, height: bottom - top },
      ]);
    });

    it("stamp a dot at each corner the cells share", async () => {
      const { run, baked, context } = await paintField();
      const { unit } = context.metrics;
      const dots = stampsIn(baked());
      const side = run.scene.textures.getFrame(ATLAS, ART.gridDot).width;
      const middleOf = (dot: (typeof dots)[number] | undefined) => ({
        x: (dot?.x ?? Number.NaN) + side / 2,
        y: (dot?.y ?? Number.NaN) + side / 2,
      });

      // At this unit a grid dot is as wide as it is baked, and an even
      // number of pixels, so its middle lies on the corner.
      expect({
        stamped: dots.length,
        frames: [...new Set(dots.map(({ frame }) => frame))],
        scales: [...new Set(dots.map(({ scale }) => scale))],
        first: middleOf(dots[0]),
        last: middleOf(dots.at(-1)),
      }).toEqual({
        stamped: (COLUMNS - 1) * (context.shape.depth - 1),
        frames: [ART.gridDot],
        scales: [1],
        first: { x: unit, y: unit },
        last: { x: 8 * unit, y: (context.shape.depth - 1) * unit },
      });
    });

    it("stamp more dots in a deeper field", async () => {
      const painted = await paintField();
      const from = painted.baked().length;

      layOut(painted, 300, 700);

      expect(stampsIn(painted.baked().slice(from))).toHaveLength(
        (COLUMNS - 1) * (madeUpField(300, 700).shape.depth - 1),
      );
    });

    it("stand the grid's dots on whole pixels, scaled to whole pixels past the atlas's largest unit", async () => {
      const { run, baked, context } = await paintField(TWO_UNDER, 1300, 1800);
      const scale = context.metrics.unit / MOST_BAKED_UNIT;
      const side = run.scene.textures.getFrame(ATLAS, ART.gridDot).width;
      const grid = stampsIn(baked());

      expect({
        scaledUp: scale > 1,
        sides: [...new Set(grid.map((dot) => dot.scale * side))],
        offPixel: grid.filter(
          ({ x, y }) => !Number.isInteger(x) || !Number.isInteger(y),
        ),
      }).toEqual({
        scaledUp: true,
        sides: [Math.round(side * scale)],
        offPixel: [],
      });
    });

    it("bake the cells, the band and the dots again once a lost context is restored", async () => {
      const painted = await paintField();
      await painted.run.loseContext();
      await painted.run.restoreContext();
      const from = painted.baked().length;

      painted.painter.draw(painted.context);

      expect({
        fills: fillsIn(painted.baked().slice(from)).map(({ color }) => color),
        dots: stampsIn(painted.baked().slice(from)).length,
      }).toEqual({
        fills: [LIGHT_MADE_UP.field, LIGHT_MADE_UP.band],
        dots: (COLUMNS - 1) * (11 - 1),
      });
    });

    it("bake nothing again the frame after they bake for a restored context", async () => {
      const painted = await paintField();
      await painted.run.loseContext();
      await painted.run.restoreContext();
      painted.painter.draw(painted.context);
      const from = painted.baked().length;

      painted.painter.draw(painted.context);

      expect(painted.baked().slice(from)).toEqual([]);
    });

    it("bake and draw nothing again in a frame where nothing changed", async () => {
      const painted = await paintField();
      const rim = commandsOf(painted.painter.rim).length;
      const from = painted.baked().length;

      painted.painter.draw({ ...painted.context, now: 16 });

      expect({
        baked: painted.baked().slice(from),
        rim: commandsOf(painted.painter.rim).length,
      }).toEqual({ baked: [], rim });
    });

    it("are drawn each in its layer: the ground under the wall, the rim over everything", async () => {
      const { painter, layers } = await paintField();

      expect({
        field: layers.field.list.includes(painter.ground),
        rim: layers.rim.list.includes(painter.rim),
      }).toEqual({ field: true, rim: true });
    });
  });

  describe("the lines", () => {
    it("draw the jump line's dashes under the top third, in the jump line's color", async () => {
      const { painter, context } = await paintField();
      const { metrics } = context;
      const { jumpLine } = thirdsOf(context.shape.depth);
      // At 31 px a unit, the art's 2.4 and 14 of a cell of 40.
      const thick = 2;

      const dashes = rectsIn(painter.lines, LIGHT_MADE_UP.jumpLine);

      expect({
        many: dashes.length > 5,
        rows: new Set(dashes.map(({ y, height }) => `${y} ${height}`)),
        from: (dashes[0]?.x ?? 0) - metrics.x,
        dash: dashes[0]?.width,
      }).toEqual({
        many: true,
        rows: new Set([
          `${rowFoot(metrics, jumpLine) - Math.floor(thick / 2)} ${thick}`,
        ]),
        // A gap of 6.2 px in from the left wall.
        from: 6,
        dash: 11,
      });
    });

    it("draw the danger line's dashes along the top of the floor's row, in the danger color", async () => {
      const { painter, context } = await paintField();
      const { metrics } = context;
      // At 31 px a unit, the art's 2 and 8 of a cell of 40.
      const thick = 2;

      const dashes = rectsIn(painter.lines, LIGHT_MADE_UP.dangerLine);

      expect({
        many: dashes.length > 5,
        rows: new Set(dashes.map(({ y, height }) => `${y} ${height}`)),
        dash: dashes[0]?.width,
        to:
          (dashes.at(-1)?.x ?? 0) + (dashes.at(-1)?.width ?? 0) <=
          metrics.x + metrics.width - DANGER_LINE.gap * metrics.unit + 1,
      }).toEqual({
        many: true,
        rows: new Set([
          `${rowFoot(metrics, 1) - Math.floor(thick / 2)} ${thick}`,
        ]),
        dash: 6,
        to: true,
      });
    });

    it("draw the jump line under the top third of a field laid out deeper", async () => {
      const painted = await paintField();
      const { shape, metrics } = madeUpField(300, 700);
      const { jumpLine } = thirdsOf(shape.depth);

      layOut(painted, 300, 700);

      const dashes = rectsIn(painted.painter.lines, LIGHT_MADE_UP.jumpLine);
      expect(
        new Set(dashes.map(({ y, height }) => y + Math.floor(height / 2))),
      ).toEqual(new Set([rowFoot(metrics, jumpLine)]));
    });

    it("draw the lines across a field laid out anew as across one painted there from the start", async () => {
      const painted = await paintField();
      const started = await paintField(TWO_UNDER, 300, 700);
      const lines = ({ painter }: Painted): unknown => ({
        jump: rectsIn(painter.lines, LIGHT_MADE_UP.jumpLine),
        danger: rectsIn(painter.lines, LIGHT_MADE_UP.dangerLine),
      });

      layOut(painted, 300, 700);

      expect(lines(painted)).toEqual(lines(started));
    });

    it("round each dash's ends to the nearest pixel, and thicken each line by its own width", async () => {
      const { painter, context } = await paintField(TWO_UNDER, 550, 550);
      const { metrics } = context;
      const [jump] = rectsIn(painter.lines, LIGHT_MADE_UP.jumpLine);
      const [danger] = rectsIn(painter.lines, LIGHT_MADE_UP.dangerLine);

      // At 43 px a unit, the jump line's first dash runs from 8.6 px in to
      // 23.65 and is 2.58 thick; the danger line's from 8.6 to 17.2, 2.15
      // thick.
      expect({
        unit: metrics.unit,
        jump: [(jump?.x ?? 0) - metrics.x, jump?.width, jump?.height],
        danger: [(danger?.x ?? 0) - metrics.x, danger?.width, danger?.height],
      }).toEqual({ unit: 43, jump: [9, 15, 3], danger: [9, 8, 2] });
    });

    it("are painted again in a new palette", async () => {
      const painted = await paintField();

      paintIn(painted, DARK_MADE_UP);

      expect(colorsOf(painted.painter.lines)).toEqual([
        DARK_MADE_UP.jumpLine,
        DARK_MADE_UP.dangerLine,
      ]);
    });

    it("brighten the danger line, solid and twice as thick, while a brick the level needs stands in the row over the floor's", async () => {
      const { painter, context } = await paintField(ENDANGERING);
      const { metrics } = context;

      // At 31 px a unit, twice the dashes' 2 px.
      expect(rectsIn(painter.lines, LIGHT_MADE_UP.dangerLine)).toEqual([
        {
          x: metrics.x,
          y: rowFoot(metrics, 1) - 2,
          width: metrics.width,
          height: 4,
        },
      ]);
    });

    it("brighten the danger line as the wall comes into the row over the floor's, its count unchanged", async () => {
      const painted = await paintField(wallOf(["1m1.1.m.."], 2));

      showWall(painted, ENDANGERING);

      expect(
        rectsIn(painted.painter.lines, LIGHT_MADE_UP.dangerLine),
      ).toHaveLength(1);
    });

    it("brighten the danger line for a brick in the last column alone", async () => {
      const { painter } = await paintField(wallOf(["........1"], 1));

      expect(rectsIn(painter.lines, LIGHT_MADE_UP.dangerLine)).toHaveLength(1);
    });

    it("leave the danger line dashed while only bricks the level doesn't need stand in the row over the floor's", async () => {
      const { painter } = await paintField(wallOf(["mmm......"], 1));

      expect(
        rectsIn(painter.lines, LIGHT_MADE_UP.dangerLine).length,
      ).toBeGreaterThan(5);
    });

    it("dim the danger line again once none stands there", async () => {
      const painted = await paintField(ENDANGERING);

      showWall(painted, wallOf(["1m1.1.m.."], 2));

      expect(
        rectsIn(painted.painter.lines, LIGHT_MADE_UP.dangerLine).length,
      ).toBeGreaterThan(5);
    });
  });

  describe("the strips", () => {
    it("show the lines in their layer, each across the cells from its thickness over it to as far under, the lines' shapes never shown themselves", async () => {
      const { painter, context, layers, run } = await paintField();
      const { metrics } = context;
      const { jumpLine } = thirdsOf(context.shape.depth);
      const { list } = layers.lines;
      // At 31 px a unit, the jump line's 2.4 and the danger line's 2 of a
      // cell of 40.
      const thick = 2;

      expect({
        layer: [
          list.indexOf(painter.strips.jump),
          list.indexOf(painter.strips.danger),
          list.length,
        ],
        listed: run.scene.children.exists(painter.lines),
        jump: rectOf(painter.strips.jump),
        danger: rectOf(painter.strips.danger),
      }).toEqual({
        layer: [0, 1, 2],
        listed: false,
        jump: {
          x: metrics.x,
          y: rowFoot(metrics, jumpLine) - thick,
          width: metrics.width,
          height: 2 * thick,
        },
        danger: {
          x: metrics.x,
          y: rowFoot(metrics, 1) - thick,
          width: metrics.width,
          height: 2 * thick,
        },
      });
    });

    it("stand and size each strip across a field laid out anew as across one painted there from the start, each image as big as its strip", async () => {
      const painted = await paintField();
      const started = await paintField(TWO_UNDER, 300, 700);
      const strips = ({ painter }: Painted): unknown => ({
        jump: rectOf(painter.strips.jump),
        danger: rectOf(painter.strips.danger),
      });

      layOut(painted, 300, 700);

      // An image's size is its own, kept from its frame as it last took it.
      const { jump } = painted.painter.strips;
      expect({
        strips: strips(painted),
        size: { width: jump.width, height: jump.height },
      }).toEqual({
        strips: strips(started),
        size: { width: jump.displayWidth, height: jump.displayHeight },
      });
    });

    it("clear each strip, draw the lines' shapes on it as far up and to the left as it stands, and render it", async () => {
      const { painter, stripsBaked } = await paintField();
      const { jump, danger } = painter.strips;

      expect(stripsBaked()).toEqual({
        jump: [
          { kind: "clear", rect: null },
          { kind: "draw", drawn: painter.lines, x: -jump.x, y: -jump.y },
          { kind: "render" },
        ],
        danger: [
          { kind: "clear", rect: null },
          { kind: "draw", drawn: painter.lines, x: -danger.x, y: -danger.y },
          { kind: "render" },
        ],
      });
    });

    it("draw the lines again as the danger line brightens", async () => {
      const painted = await paintField(wallOf(["1m1.1.m.."], 2));

      showWall(painted, ENDANGERING);

      expect({
        jump: drawsIn(painted.stripsBaked().jump).length,
        danger: drawsIn(painted.stripsBaked().danger).length,
      }).toEqual({ jump: 2, danger: 2 });
    });

    it("draw nothing again for a wall that leaves the lines as they were", async () => {
      const painted = await paintField();

      showWall(painted, wallOf(["1.......2"], 5));

      expect({
        jump: drawsIn(painted.stripsBaked().jump).length,
        danger: drawsIn(painted.stripsBaked().danger).length,
      }).toEqual({ jump: 1, danger: 1 });
    });

    it("leave the lines' shapes destroyed as the scene ends", async () => {
      const { painter, run } = await paintField();

      run.scene.scene.stop();
      run.advance(20);

      expect(painter.lines.scene).toBeUndefined();
    });

    it("draw the lines again once a lost context is restored, and the frame after it nothing", async () => {
      const painted = await paintField();
      await painted.run.loseContext();
      await painted.run.restoreContext();

      painted.painter.draw(painted.context);
      const restored = painted.stripsBaked();
      painted.painter.draw(painted.context);

      expect({
        restored: [
          drawsIn(restored.jump).length,
          drawsIn(restored.danger).length,
        ],
        after: [
          drawsIn(painted.stripsBaked().jump).length,
          drawsIn(painted.stripsBaked().danger).length,
        ],
      }).toEqual({ restored: [2, 2], after: [2, 2] });
    });
  });

  describe("the count", () => {
    it("counts the bricks the level needs under the jump line, a dot each from its end, once nine or fewer are left", async () => {
      const { painter, context, layers } = await paintField();
      const { metrics } = context;
      const { jumpLine } = thirdsOf(context.shape.depth);
      const end = metrics.x + metrics.width - JUMP_LINE.gap * metrics.unit;
      const [first, second] = painter.countDots;

      // At 31 px a unit, a dot is 4 px wide and 0.24 of a unit, 7.44 px,
      // from the next, each moved to stand on whole pixels.
      expect({
        end,
        shown: showing(painter.countDots),
        first: { x: first?.x, y: first?.y, frame: first?.frame.name },
        second: second?.x,
        layer: painter.countDots.every((dot) =>
          layers.count.list.includes(dot),
        ),
      }).toEqual({
        end: 332.8,
        shown: 2,
        first: { x: 329, y: rowFoot(metrics, jumpLine), frame: ART.countDot },
        second: 322,
        layer: true,
      });
    });

    it("groups the count's dots in threes, further apart than the dots of a group", async () => {
      const { painter } = await paintField(
        wallOf(["1111.1111", "1........"], 1),
      );

      const xs = painter.countDots.map((dot) => dot.x);

      // At 31 px a unit, 7.44 px apart in a group and 11.16 between groups,
      // each dot on whole pixels.
      expect(xs.slice(1).map((x, at) => (xs[at] ?? 0) - x)).toEqual([
        7, 8, 11, 7, 8, 11, 7, 8,
      ]);
    });

    it("stands the count's dots on whole pixels, so each stays as sharp as it is baked", async () => {
      const { painter } = await paintField(TWO_UNDER, 600, 600);
      const counts = painter.countDots.filter((dot) => dot.visible);

      // At 47 px a unit, a count's dot 7 px wide about the jump line would
      // stand half a pixel off.
      expect({
        side: counts[0]?.displayWidth,
        counted: counts.length,
        offPixel: counts.filter(
          (dot) =>
            !Number.isInteger(dot.x - dot.displayWidth / 2) ||
            !Number.isInteger(dot.y - dot.displayHeight / 2),
        ),
      }).toEqual({ side: 7, counted: 2, offPixel: [] });
    });

    it("shows the count's dots scaled up to whole pixels past the atlas's largest unit", async () => {
      const { painter, context } = await paintField(TWO_UNDER, 1300, 1800);
      const scale = context.metrics.unit / MOST_BAKED_UNIT;
      const [count] = painter.countDots;

      // Baked at 128 px a unit, a count's dot is 18 px wide.
      expect({
        side: count?.displayWidth,
        edges: [
          (count?.x ?? 0) - (count?.displayWidth ?? 0) / 2,
          (count?.y ?? 0) - (count?.displayHeight ?? 0) / 2,
        ].every((edge) => Number.isInteger(edge)),
      }).toEqual({ side: Math.round(18 * scale), edges: true });
    });

    // At 31 px a unit, the line's 16 dashes end at 77, 94, … 316 and 333,
    // and a count's dashes stop half a pitch, 3.72 px, short of its last dot.
    it.each([
      [1, 15],
      [4, 14],
      [9, 11],
    ])(
      "stops the jump line short of a count of %i, leaving off whole dashes where they stood, %i of them kept",
      async (left, kept) => {
        const painted = await paintField(wallOf(["111111111", "1........"], 1));
        const uncounted = rectsIn(
          painted.painter.lines,
          LIGHT_MADE_UP.jumpLine,
        );

        showWall(painted, wallOf(["1".repeat(left).padEnd(COLUMNS, ".")], 1));

        const dots = painted.painter.countDots.filter((dot) => dot.visible);
        const reach = Math.min(
          ...dots.map((dot) => dot.x - dot.displayWidth / 2),
        );
        const dashes = rectsIn(painted.painter.lines, LIGHT_MADE_UP.jumpLine);
        expect({
          shown: dots.length,
          short: Math.max(...dashes.map(({ x, width }) => x + width)) < reach,
          kept: dashes,
        }).toEqual({
          shown: left,
          short: true,
          kept: uncounted.slice(0, kept),
        });
      },
    );

    it("counts again as the wall under the line changes", async () => {
      const painted = await paintField();

      showWall(painted, wallOf(["1.1.1.1.1"], 1));

      expect(showing(painted.painter.countDots)).toBe(5);
    });

    it("counts no brick the level doesn't need", async () => {
      const { painter } = await paintField(wallOf(["m1m1mmmmm"], 1));

      expect(showing(painter.countDots)).toBe(2);
    });

    it("counts no brick over the jump line", async () => {
      const { painter } = await paintField(
        wallOf(["111111111", "1........"], thirdsOf(11).jumpLine - 1),
      );

      expect(showing(painter.countDots)).toBe(1);
    });

    it("counts as many as nine", async () => {
      const { painter } = await paintField(
        wallOf(["1111.1111", "1........"], 1),
      );

      expect(showing(painter.countDots)).toBe(9);
    });

    it("shows no count while more than nine are left, the dashes running on to the end", async () => {
      const { painter, context } = await paintField(
        wallOf(["111111111", "1........"], 1),
      );
      const { metrics } = context;
      const last = rectsIn(painter.lines, LIGHT_MADE_UP.jumpLine).at(-1);

      expect({
        shown: showing(painter.countDots),
        to:
          (last?.x ?? 0) + (last?.width ?? 0) >
          metrics.x +
            metrics.width -
            (JUMP_LINE.gap + JUMP_LINE.dash) * metrics.unit,
      }).toEqual({ shown: 0, to: true });
    });

    it("shows no count once none is left", async () => {
      const { painter } = await paintField(wallOf(["mmmmmmmmm"], 1));

      expect(showing(painter.countDots)).toBe(0);
    });

    it("holds a dot for the most bricks counted, made once", async () => {
      const { painter } = await paintField();

      expect(painter.countDots).toHaveLength(MOST_COUNTED);
    });
  });

  describe("crowdsCount", () => {
    it("says a dot crowds the count nearer a dot of it than its groups stand apart", async () => {
      const { painter, context } = await paintField();
      // The first dot of the count, the last along the line, has no other
      // past it.
      const [dot] = painter.countDots;
      // At 31 px a unit, 0.36 of a unit between groups' middles less the
      // count's dot of 0.14, 6.82 px, from a dot of 4 to another of 4.
      const reach = 4 + 0.22 * context.metrics.unit;

      expect([
        painter.crowdsCount((dot?.x ?? 0) + reach - 0.5, dot?.y ?? 0, 4),
        painter.crowdsCount((dot?.x ?? 0) + reach + 0.5, dot?.y ?? 0, 4),
      ]).toEqual([true, false]);
    });

    it("says no dot crowds a dot of the count that doesn't show", async () => {
      const { painter } = await paintField(wallOf(["mmmmmmmmm"], 1));
      const [dot] = painter.countDots;

      expect(painter.crowdsCount(dot?.x ?? 0, dot?.y ?? 0, 4)).toBe(false);
    });
  });
});
