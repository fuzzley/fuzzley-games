import type { EventLogView } from "@fz/core/event_log";
import { recordOf } from "@fz/core/records";
import type { Insets } from "@fz/phaser/insets";
import { framePixels } from "@fz/phaser/layout";
import { outlineRoundRect } from "@fz/phaser/shapes";
import {
  type SceneRun,
  commandsOf,
  colorsOf,
  imagesIn,
  objectsIn,
  runKeyedScene,
  watchUploads,
} from "@fz/phaser/testing";
import { drawnIn, frameNamed, viewport } from "@fz/phaser/testing/pure";
import { type GameObjects, Textures } from "phaser";
import {
  BRICK_KIND_IDS,
  type BrickKindId,
  brickKind,
} from "../rules/catalog/bricks";
import { COLUMNS, MOST_DEPTH } from "../rules/tuning";
import { type Brick, type Wall, thirdsOf } from "../rules/wall/wall";
import { ART_PALETTE } from "../testing/art_frames";
import { marginInsets } from "../testing/canvases";
import { FLIGHT_FIXTURES } from "../testing/flight_fixtures";
import { wallFrom } from "../testing/wall_picture";
import { type BrickLook, brickLayers } from "../view/art/art";
import { atlasFrames } from "../view/art/atlas_frames";
import { FRAME_NAMES } from "../view/art/frames";
import { type WallPalette, wallPalette } from "../view/colors/palette";
import { SOUNDS } from "../view/effects/effects";
import {
  FRAME_CSS_PX,
  type FieldMetrics,
  type FieldShape,
  bandPixels,
  fieldMetrics,
  fieldShape,
  lintelPixels,
  toCanvas,
} from "../view/field/field_metrics";
import type { LoggedBeat, LoggedEvent, RoundView } from "../view/round_play";
import type { FieldCommand } from "../view/steering/controls";
import { STRAIGHT_UP, type Steer } from "../view/steering/steering";
import { ATLAS, MOST_BAKED_UNIT, bakedScaleOf } from "./atlas";
import { FIELD_FRAMES, fieldFrames } from "./field_art";
import { DANGER_LINE, JUMP_LINE, MOST_COUNTED } from "./painters/field_painter";
import { MOST_LAYERS, cutOver } from "./painters/wall_painter";
import {
  PICTURE_FRAMES,
  PICTURE_LAYERS,
  type Pictures,
  pictureFrames,
} from "./pictures";
import spritemap from "./sounds/sounds.json";
import {
  type WallScene,
  type WallSceneOptions,
  makeWallScene,
} from "./wall_scene";

/** The light palette the specs draw in, the art's specs'. */
const LIGHT = ART_PALETTE;

/** A dark palette, its roles each a color no other role takes. */
const DARK = wallPalette(
  {
    field: "#1c2329",
    fieldLine: "#3a444d",
    fieldText: "#eceff1",
    fieldMuted: "#9aa5ae",
    page: "#11161a",
    accent: "#e0b13a",
    danger: "#f47c74",
    warning: "#f39a4b",
  },
  "dark",
);

/** The margin the board keeps around the field, a compact screen's, which the frame lies in. */
const INSETS = marginInsets(12);

/** The canvas the specs run on, in CSS pixels, unless one says otherwise. */
const CANVAS = { width: 400, height: 400 } as const;

/** A round whose plain shot wears a tough brick on a wall 11 deep, its lowest row in row 5. */
const PLAIN = FLIGHT_FIXTURES.plain;

/** A round whose zap leaves the lower two-thirds clear, so the wall jumps three rows. */
const ZAP = FLIGHT_FIXTURES.zap;

/** A log of no events, as the scene reads none yet. */
const NO_EVENTS: EventLogView<LoggedEvent> = {
  latest: 0,
  forEachSince: () => undefined,
};

/** An empty log of beats, for a view that has reached none. */
const NO_BEATS: EventLogView<LoggedBeat> = {
  latest: 0,
  forEachSince: () => undefined,
};

/** Returns the round as the view draws it, no fuzzball in the air and no event or beat reached, its wall eased down as far as given, coming down the rows given. */
function viewOf(wall: Wall, wallDrop = 1, rowsDown = 0): RoundView {
  return {
    balls: [],
    wall,
    wallDrop,
    rowsDown,
    events: NO_EVENTS,
    beats: NO_BEATS,
  };
}

/** Returns the shape the shell works out for a canvas of some CSS pixels, inside the board's margin. */
function shapeAt(width: number, height: number): FieldShape {
  return fieldShape(viewport(width, height, 1, INSETS));
}

/** Returns where the field lies on a canvas of some CSS pixels, in the shape the shell works out for it. */
function metricsAt(
  width: number = CANVAS.width,
  height: number = CANVAS.height,
): FieldMetrics {
  return fieldMetrics(
    viewport(width, height, 1, INSETS),
    shapeAt(width, height),
  );
}

/** Plays the shell's part, keeping what the scene tells it. */
class FakeShell implements WallSceneOptions {
  round: RoundView = viewOf(PLAIN.start.wall);
  colors: WallPalette = LIGHT;
  fieldShape: FieldShape = shapeAt(CANVAS.width, CANVAS.height);
  welcomesMotion = true;
  wantsSound = true;
  /** The chrome the board declares over the canvas, the margin it keeps around the field. */
  chrome: Insets = INSETS;
  /** The shape the shell works out as it ticks, as it does between rounds, or null. */
  shapeAsked: FieldShape | null = null;
  readonly ticks: number[] = [];
  /** The steering handed over with each tick. */
  readonly steers: Readonly<Steer>[] = [];
  readonly layouts: FieldMetrics[] = [];
  readonly commands: FieldCommand[] = [];
  /** What the scene handed over at each bake of the atlas to picture the kinds with, the last bake's last. */
  readonly bakes: (() => Pictures)[] = [];

  readonly tick = (deltaMs: number, steer: Readonly<Steer>): void => {
    this.ticks.push(deltaMs);
    this.steers.push(steer);
    if (this.shapeAsked) this.fieldShape = this.shapeAsked;
  };
  readonly view = (): RoundView => this.round;
  readonly guide = (): null => null;
  readonly palette = (): WallPalette => this.colors;
  readonly shape = (): FieldShape => this.fieldShape;
  readonly motion = (): boolean => this.welcomesMotion;
  readonly sound = (): boolean => this.wantsSound;
  readonly onLayout = (metrics: FieldMetrics): void => {
    this.layouts.push(metrics);
  };
  readonly command = (command: FieldCommand): void => {
    this.commands.push(command);
  };
  readonly onPictures = (pictures: () => Pictures): void => {
    this.bakes.push(pictures);
  };

  /** Asks the scene for the pictures of the atlas as last baked, as How to play does as it opens. */
  askPictures(): Pictures {
    const pictures = this.bakes.at(-1);
    if (!pictures) throw new Error("No bake yet.");
    return pictures();
  }

  /** Shows a wall standing still. */
  showWall(wall: Wall): void {
    this.round = viewOf(wall);
  }

  /** Shows the wall that comes down the rows given, a step's one unless told, eased down as far as given. */
  bringDown(wall: Wall, wallDrop: number, rowsDown = 1): void {
    this.round = viewOf(wall, wallDrop, rowsDown);
  }
}

/** Sets a shell up for a player who prefers less motion. */
function stillness(shell: FakeShell): void {
  shell.welcomesMotion = false;
}

interface Board {
  readonly shell: FakeShell;
  readonly run: SceneRun<WallScene>;
  readonly scene: WallScene;
}

/**
 * Runs the scene for a shell, on a canvas of some CSS pixels, its first
 * frame drawn, till the case that runs it finishes.
 */
async function startBoard(
  setUp: (shell: FakeShell) => void = () => undefined,
  canvas: { readonly width: number; readonly height: number } = CANVAS,
): Promise<Board> {
  const shell = new FakeShell();
  shell.fieldShape = shapeAt(canvas.width, canvas.height);
  setUp(shell);
  const make = makeWallScene(shell);
  const { run } = await runKeyedScene(
    (surroundings) => make({ ...surroundings, insets: () => shell.chrome }),
    canvas,
  );
  run.advance(16);
  return { shell, run, scene: run.scene };
}

/** Resizes the canvas, the shell working the shape out for it as it does between rounds, and draws a frame. */
function resizeTo(board: Board, width: number, height: number): void {
  board.run.game.scale.resize(width, height);
  board.shell.fieldShape = shapeAt(width, height);
  board.run.advance(16);
}

/** Returns the images stacked in a field row and column, from the bottom of the stack up. */
function stackAt(
  scene: WallScene,
  row: number,
  column: number,
): readonly GameObjects.Image[] {
  const first = (row * COLUMNS + column) * MOST_LAYERS;
  return scene.wall.images.slice(first, first + MOST_LAYERS);
}

/** Returns the frames shown in a field row and column, from the bottom of the stack up. */
function framesAt(scene: WallScene, row: number, column: number): string[] {
  return stackAt(scene, row, column)
    .filter((image) => image.visible)
    .map((image) => image.frame.name);
}

/** Returns where the images in a field row and column stand. */
function placeAt(
  scene: WallScene,
  row: number,
  column: number,
): { x: number; y: number } {
  const [image] = stackAt(scene, row, column);
  return { x: image?.x ?? Number.NaN, y: image?.y ?? Number.NaN };
}

/** Returns the brick at a wall cell, failing where there is none. */
function brickAt(wall: Wall, cell: number): Brick {
  const brick = wall.bricks[cell];
  if (!brick) throw new Error(`No brick at ${String(cell)}.`);
  return brick;
}

/** Returns the rectangles a `Graphics` fills in a color, as drawn. */
function rectsIn(
  graphics: GameObjects.Graphics,
  color: number,
): { x: number; y: number; width: number; height: number }[] {
  let filling: number | null = null;
  return commandsOf(graphics).flatMap((command) => {
    if (command.kind === "fillStyle") filling = command.color;
    if (command.kind !== "fillRect" || filling !== color) return [];
    const { x, y, width, height } = command;
    return [{ x, y, width, height }];
  });
}

/** Returns how many of a set of images show. */
function showing(images: readonly GameObjects.Image[]): number {
  return images.filter((image) => image.visible).length;
}

/** Returns the field column and row of each warning frame shown, from the floor. */
function framedIn(scene: WallScene): (readonly [number, number])[] {
  return scene.wall.warnings.flatMap((warning, at) =>
    warning.visible ? [[at % COLUMNS, Math.floor(at / COLUMNS)] as const] : [],
  );
}

/** Returns each object's place in the list it is drawn from, counted from the back. */
function placesInLayer(objects: readonly GameObjects.GameObject[]): number[] {
  return objects.map((object) => object.displayList.getIndex(object));
}

/** Returns where on the canvas a field row's foot runs, in the layout given. */
function rowFoot(metrics: FieldMetrics, row: number): number {
  return toCanvas(metrics, 0, row).y;
}

/** Returns every look a brick of each kind takes: each tint, as many hits whole as the catalog allows, and each count of them left. */
function everyLook(): BrickLook[] {
  return BRICK_KIND_IDS.flatMap((kind: BrickKindId) => {
    const { hits, mostHits } = brickKind(kind);
    const least = hits === "never" ? 0 : hits;
    return Array.from({ length: 8 }, (_, tint) => tint).flatMap((tint) =>
      Array.from(
        { length: mostHits - least + 1 },
        (_, more) => least + more,
      ).flatMap((full) =>
        Array.from({ length: Math.max(1, full) }, (_, taken) => ({
          kind,
          tint,
          full,
          hits: full - taken,
          plates: 0,
        })),
      ),
    );
  });
}

describe("WallScene", () => {
  describe("each frame", () => {
    it("hands the shell the time each frame took", async () => {
      const { shell, run } = await startBoard();

      run.advance(60, 20);

      expect(shell.ticks.slice(-3)).toEqual([20, 20, 20]);
    });

    it("hands the shell no steering yet: the aim straight up, no charge, nothing let fly", async () => {
      const { shell } = await startBoard();

      expect(shell.steers.at(-1)).toEqual({
        aim: STRAIGHT_UP,
        charge: 0,
        release: false,
        fast: false,
        keyed: false,
      });
    });

    it("says it is ready once it has drawn its first frame", async () => {
      const { run } = await startBoard();

      expect(run.ready).toBe(true);
    });
  });

  describe("the layout", () => {
    it("tells the shell where the field lies", async () => {
      const { shell } = await startBoard();

      expect(shell.layouts).toEqual([metricsAt()]);
    });

    it("lays the field out again when the canvas changes size", async () => {
      const board = await startBoard();

      resizeTo(board, 600, 500);

      expect(board.shell.layouts.at(-1)).toEqual(metricsAt(600, 500));
    });

    it("lays the field out again in a new shape", async () => {
      const { shell, run } = await startBoard();
      const deeper = { ...shell.fieldShape, depth: 12 };

      shell.fieldShape = deeper;
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(
        fieldMetrics(viewport(CANVAS.width, CANVAS.height, 1, INSETS), deeper),
      );
    });

    it("lays the field out again as the chrome over it changes, in the shape it has", async () => {
      const { shell, run } = await startBoard();
      const roomy = marginInsets(24);

      shell.chrome = roomy;
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(
        fieldMetrics(
          viewport(CANVAS.width, CANVAS.height, 1, roomy),
          shell.fieldShape,
        ),
      );
    });

    it("lays the field out again on a canvas resized mid-flight, in the shape it has, and paints it there", async () => {
      const { shell, run, scene } = await startBoard();
      const metrics = fieldMetrics(
        viewport(440, 400, 1, INSETS),
        shell.fieldShape,
      );

      run.game.scale.resize(440, 400);
      run.advance(16);

      expect({
        layout: shell.layouts.at(-1),
        cells: rectsIn(scene.field.ground, LIGHT.field),
      }).toEqual({
        layout: metrics,
        cells: [
          {
            x: metrics.x,
            y: metrics.y,
            width: metrics.width,
            height: metrics.height,
          },
        ],
      });
    });

    it("bakes the atlas again at a new pixel ratio, though the unit stays", async () => {
      const shape = { ...shapeAt(CANVAS.width, CANVAS.height), unit: 29 };
      const { shell, run } = await startBoard((each) => {
        each.fieldShape = shape;
      });
      const baked = shell.bakes.length;

      run.game.scale.displayScale.set(2, 2);
      shell.fieldShape = { ...shape, pixelRatio: 2 };
      run.advance(16);

      expect({
        unit: shell.layouts.at(-1)?.unit,
        ratio: shell.layouts.at(-1)?.pixelRatio,
        bakes: shell.bakes.length - baked,
      }).toEqual({ unit: 29, ratio: 2, bakes: 1 });
    });

    it("lays a field reshaped in the shell's tick out that frame", async () => {
      const { shell, run, scene } = await startBoard();
      const deeper = { ...shell.fieldShape, depth: 12 };
      shell.shapeAsked = deeper;

      run.advance(16);

      expect(framesAt(scene, 11, 0)).toEqual([
        ...brickLayers(brickAt(PLAIN.start.wall, 6 * COLUMNS)),
      ]);
    });

    it("lays the field out as it starts, on a canvas with no room yet too", async () => {
      const { shell } = await startBoard(undefined, { width: 20, height: 20 });

      expect(shell.layouts).toEqual([metricsAt(20, 20)]);
    });

    it("lays the field out once for a frame of no change", async () => {
      const { shell, run } = await startBoard();

      run.advance(48, 16);

      expect(shell.layouts).toHaveLength(1);
    });

    it("keeps its layout and its atlas while the canvas has no room inside its chrome", async () => {
      const board = await startBoard();
      const baked = board.shell.bakes.length;

      board.run.game.scale.resize(20, 20);
      board.run.advance(16);

      expect({
        layouts: board.shell.layouts,
        bakes: board.shell.bakes.length - baked,
      }).toEqual({ layouts: [metricsAt()], bakes: 0 });
    });

    it("lays the field out again once the canvas has room again", async () => {
      const board = await startBoard();
      board.run.game.scale.resize(20, 20);
      board.run.advance(16);

      resizeTo(board, 500, 500);

      expect(board.shell.layouts.at(-1)).toEqual(metricsAt(500, 500));
    });

    it("bakes the atlas again at a new unit", async () => {
      const board = await startBoard();

      resizeTo(board, 600, 600);

      expect(board.scene.textures.getFrame(ATLAS, "tile-0").width).toBe(
        metricsAt(600, 600).unit,
      );
    });

    it("has every image take up its frame anew at a new unit", async () => {
      const board = await startBoard();

      resizeTo(board, 600, 600);

      expect(
        imagesIn(board.scene)
          .filter(
            (image) =>
              image.width !== image.frame.width ||
              image.displayOriginX !== image.originX * image.frame.width,
          )
          .map((image) => image.frame.name),
      ).toEqual([]);
    });

    it("bakes once for a new unit and a new palette in the same frame", async () => {
      const board = await startBoard();
      const baked = board.shell.bakes.length;

      board.shell.colors = DARK;
      resizeTo(board, 600, 600);

      expect(board.shell.bakes.length - baked).toBe(1);
    });

    it("bakes the atlas at no more than its largest unit, and shows a larger one's frames scaled up", async () => {
      const board = await startBoard(undefined, { width: 1300, height: 1800 });
      const { unit } = metricsAt(1300, 1800);

      const [tile] = stackAt(board.scene, 5, 0);

      expect({
        unit: unit > MOST_BAKED_UNIT,
        baked: board.scene.textures.getFrame(ATLAS, "tile-0").width,
        shown: tile?.displayWidth,
      }).toEqual({ unit: true, baked: MOST_BAKED_UNIT, shown: unit });
    });

    it("shows the field's dots scaled up with the wall's frames", async () => {
      const { scene } = await startBoard(undefined, {
        width: 1300,
        height: 1800,
      });
      const scale = metricsAt(1300, 1800).unit / MOST_BAKED_UNIT;
      const [grid] = scene.field.gridDots;
      const [count] = scene.field.countDots;
      const edges = [grid, count].flatMap((dot) =>
        dot
          ? [
              dot.x - dot.displayWidth / 2,
              dot.x + dot.displayWidth / 2,
              dot.y - dot.displayHeight / 2,
              dot.y + dot.displayHeight / 2,
            ]
          : [],
      );

      // Baked at 128 px a unit, a grid dot is 7 px wide and a count's 18,
      // each shown scaled up to whole pixels, its edges on whole pixels.
      expect({
        scaledUp: scale > 1,
        sides: [grid?.displayWidth, count?.displayWidth],
        offPixel: edges.filter((edge) => !Number.isInteger(edge)),
      }).toEqual({
        scaledUp: true,
        sides: [Math.round(7 * scale), Math.round(18 * scale)],
        offPixel: [],
      });
    });

    it("bakes nothing again for a new unit past its largest", async () => {
      const board = await startBoard(undefined, { width: 1300, height: 1800 });
      const baked = board.shell.bakes.length;

      resizeTo(board, 1400, 1900);

      expect({
        unit: metricsAt(1400, 1900).unit > metricsAt(1300, 1800).unit,
        bakes: board.shell.bakes.length - baked,
      }).toEqual({ unit: true, bakes: 0 });
    });
  });

  describe("the atlas", () => {
    it("holds every frame of the view's art, and the scene's own", async () => {
      const { scene } = await startBoard();
      const art = atlasFrames(LIGHT, metricsAt());
      const names = [
        ...art,
        ...fieldFrames(LIGHT, metricsAt()),
        ...pictureFrames(art, metricsAt()),
      ].map((frame) => frame.name);

      const missing = names.filter(
        (name) => !scene.textures.get(ATLAS).has(name),
      );

      expect(missing).toEqual([]);
    });

    it("bakes the cracks' frames empty under 30 CSS pixels a unit, and shows them", async () => {
      const worn = wallFrom(["2........"], { lowestRow: 1 });
      const hit = { ...brickAt(worn, 0), hits: 1 };
      const wall = { ...worn, bricks: [hit, ...worn.bricks.slice(1)] };

      const { scene } = await startBoard(
        (shell) => {
          shell.showWall(wall);
        },
        { width: 300, height: 300 },
      );

      expect({
        drawn: frameNamed(atlasFrames(LIGHT, metricsAt(300, 300)), "cracks-1")
          .commands,
        cracks: atlasHas(scene, "cracks-1"),
        shown: framesAt(scene, 1, 0),
      }).toEqual({
        drawn: [],
        cracks: true,
        shown: [...brickLayers(hit)],
      });
    });

    it("draws the atlas again once a lost WebGL context is restored", async () => {
      const { run, scene } = await startBoard();
      const atlas = scene.textures.get(ATLAS).getSourceImage();
      const uploaded: HTMLCanvasElement[] = [];
      await run.loseContext();
      watchUploads(scene, (canvas) => {
        uploaded.push(canvas);
      });

      await run.restoreContext();

      expect(uploaded).toContain(atlas);
    });
  });

  describe("the field", () => {
    it("is painted in the palette", async () => {
      const { scene } = await startBoard();

      expect(colorsOf(scene.field.ground)).toEqual(
        expect.arrayContaining([LIGHT.field, LIGHT.band, LIGHT.line]),
      );
    });

    it("is painted again in a new palette", async () => {
      const { shell, run, scene } = await startBoard();

      shell.colors = DARK;
      run.advance(16);

      expect(colorsOf(scene.field.ground)).toEqual(
        expect.arrayContaining([DARK.field, DARK.band, DARK.line]),
      );
    });

    it("fills its cells, the floor's band under them and the lintel over them", async () => {
      const { shell, scene } = await startBoard();
      const { x, y, width, height, unit } = metricsAt();
      const band = bandPixels(shell.fieldShape, unit);
      const lintel = lintelPixels(shell.fieldShape, unit);

      expect({
        cells: rectsIn(scene.field.ground, LIGHT.field),
        bands: rectsIn(scene.field.ground, LIGHT.band),
      }).toEqual({
        cells: [{ x, y, width, height }],
        bands: [
          { x, y: y + height, width, height: band },
          { x, y: y - lintel, width, height: lintel },
        ],
      });
    });

    it("frames them in the margin, and draws the ceiling along the lintel's foot", async () => {
      const { shell, scene } = await startBoard();
      const { x, y, width, height, unit } = metricsAt();
      const frame = framePixels(FRAME_CSS_PX, 1);
      const top = y - lintelPixels(shell.fieldShape, unit);
      const bottom = y + height + bandPixels(shell.fieldShape, unit);

      expect(rectsIn(scene.field.ground, LIGHT.line)).toEqual([
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

    it("puts a dot at each corner its cells share", async () => {
      const { shell, scene } = await startBoard();
      const { x, y, unit } = metricsAt();
      const dots = scene.field.gridDots;

      expect({
        shown: showing(dots),
        first: { x: dots[0]?.x, y: dots[0]?.y, frame: dots[0]?.frame.name },
        last: { x: dots.at(-1)?.x, y: dots.at(-1)?.y },
      }).toEqual({
        shown: (COLUMNS - 1) * (shell.fieldShape.depth - 1),
        first: { x: x + unit, y: y + unit, frame: FIELD_FRAMES.gridDot },
        last: { x: x + 8 * unit, y: y + (MOST_DEPTH - 1) * unit },
      });
    });

    it("shows more dots in a deeper field", async () => {
      const board = await startBoard();

      resizeTo(board, 300, 700);

      expect(showing(board.scene.field.gridDots)).toBe(
        (COLUMNS - 1) * (shapeAt(300, 700).depth - 1),
      );
    });

    it("holds a dot for every corner of the deepest field, made once", async () => {
      const { scene } = await startBoard();

      expect(scene.field.gridDots).toHaveLength(
        (COLUMNS - 1) * (MOST_DEPTH - 1),
      );
    });
  });

  describe("the lines", () => {
    it("draw the jump line's dashes under the top third, in the jump line's color", async () => {
      const { shell, scene } = await startBoard();
      const metrics = metricsAt();
      const { jumpLine } = thirdsOf(shell.fieldShape.depth);
      // At 31 px a unit, the art's 2.4 and 14 of a cell of 40.
      const thick = 2;

      const dashes = rectsIn(scene.field.lines, LIGHT.jumpLine);

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
      const { scene } = await startBoard();
      const metrics = metricsAt();
      // At 31 px a unit, the art's 2 and 8 of a cell of 40.
      const thick = 2;

      const dashes = rectsIn(scene.field.lines, LIGHT.dangerLine);

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

    it("draw the jump line under the top third of a field reshaped deeper", async () => {
      const board = await startBoard();
      const metrics = metricsAt(300, 700);
      const { jumpLine } = thirdsOf(shapeAt(300, 700).depth);

      resizeTo(board, 300, 700);

      const dashes = rectsIn(board.scene.field.lines, LIGHT.jumpLine);
      expect(
        new Set(dashes.map(({ y, height }) => y + Math.floor(height / 2))),
      ).toEqual(new Set([rowFoot(metrics, jumpLine)]));
    });

    it("draw the lines across a field laid out anew as across one the scene started on", async () => {
      const board = await startBoard();
      const started = await startBoard(undefined, { width: 300, height: 700 });
      const lines = (scene: WallScene): unknown => ({
        jump: rectsIn(scene.field.lines, LIGHT.jumpLine),
        danger: rectsIn(scene.field.lines, LIGHT.dangerLine),
      });

      resizeTo(board, 300, 700);

      expect(lines(board.scene)).toEqual(lines(started.scene));
    });

    it("round each dash's ends to the nearest pixel, and thicken each line by its own width", async () => {
      const { scene } = await startBoard(undefined, {
        width: 550,
        height: 550,
      });
      const metrics = metricsAt(550, 550);
      const [jump] = rectsIn(scene.field.lines, LIGHT.jumpLine);
      const [danger] = rectsIn(scene.field.lines, LIGHT.dangerLine);

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
      const { shell, run, scene } = await startBoard();

      shell.colors = DARK;
      run.advance(16);

      expect(colorsOf(scene.field.lines)).toEqual([
        DARK.jumpLine,
        DARK.dangerLine,
      ]);
    });

    it("count the bricks the level needs under the jump line, a dot each from its end, once nine or fewer are left", async () => {
      const { shell, scene } = await startBoard();
      const metrics = metricsAt();
      const { jumpLine } = thirdsOf(shell.fieldShape.depth);
      const end = metrics.x + metrics.width - JUMP_LINE.gap * metrics.unit;
      const [first, second] = scene.field.countDots;

      // The plain round's wall has a brick and a tough brick under the line.
      // At 31 px a unit, a dot is 4 px wide and 0.24 of a unit, 7.44 px,
      // from the next, each moved to stand on whole pixels.
      expect({
        end,
        shown: showing(scene.field.countDots),
        first: { x: first?.x, y: first?.y, frame: first?.frame.name },
        second: second?.x,
      }).toEqual({
        end: 332.8,
        shown: 2,
        first: {
          x: 329,
          y: rowFoot(metrics, jumpLine),
          frame: FIELD_FRAMES.countDot,
        },
        second: 322,
      });
    });

    it("group the count's dots in threes, further apart than the dots of a group", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["oooo.oooo", "o........"], { lowestRow: 1 }));
      });

      const xs = scene.field.countDots.map((dot) => dot.x);

      // At 31 px a unit, 7.44 px apart in a group and 11.16 between groups,
      // each dot on whole pixels.
      expect(xs.slice(1).map((x, at) => (xs[at] ?? 0) - x)).toEqual([
        7, 8, 11, 7, 8, 11, 7, 8,
      ]);
    });

    it("stand the field's dots on whole pixels, so each stays as sharp as it is baked", async () => {
      const { shell, scene } = await startBoard(undefined, {
        width: 600,
        height: 600,
      });
      const dots = [...scene.field.gridDots, ...scene.field.countDots].filter(
        (dot) => dot.visible,
      );
      const offPixel = dots.filter(
        (dot) =>
          !Number.isInteger(dot.x - dot.displayWidth / 2) ||
          !Number.isInteger(dot.y - dot.displayHeight / 2),
      );

      // At 47 px a unit, a grid dot 3 px wide about a corner, or a count's
      // dot 7 px wide about the jump line, would stand half a pixel off; and
      // the plain round counts two bricks.
      expect({
        sides: [
          scene.field.gridDots[0]?.displayWidth,
          scene.field.countDots[0]?.displayWidth,
        ],
        shown: dots.length,
        offPixel,
      }).toEqual({
        sides: [3, 7],
        shown: (COLUMNS - 1) * (shell.fieldShape.depth - 1) + 2,
        offPixel: [],
      });
    });

    // At 31 px a unit, the line's 16 dashes end at 77, 94, … 316 and 333,
    // and a count's dashes stop half a pitch, 3.72 px, short of its last dot.
    it.each([
      [1, 15],
      [4, 14],
      [9, 11],
    ])(
      "stop the jump line short of a count of %i, leaving off whole dashes where they stood, %i of them kept",
      async (left, kept) => {
        const { shell, run, scene } = await startBoard((each) => {
          each.showWall(wallFrom(["ooooooooo", "o........"], { lowestRow: 1 }));
        });
        const uncounted = rectsIn(scene.field.lines, LIGHT.jumpLine);

        shell.showWall(
          wallFrom(["o".repeat(left).padEnd(COLUMNS, ".")], { lowestRow: 1 }),
        );
        run.advance(16);

        const dots = scene.field.countDots.filter((dot) => dot.visible);
        const reach = Math.min(
          ...dots.map((dot) => dot.x - dot.displayWidth / 2),
        );
        const dashes = rectsIn(scene.field.lines, LIGHT.jumpLine);
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

    it("count again as the wall under the line changes", async () => {
      const { shell, run, scene } = await startBoard();

      shell.showWall(wallFrom(["o.o.o.o.o"], { lowestRow: 1 }));
      run.advance(16);

      expect(showing(scene.field.countDots)).toBe(5);
    });

    it("count no brick the level doesn't need", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["#o#o#####"], { lowestRow: 1 }));
      });

      expect(showing(scene.field.countDots)).toBe(2);
    });

    it("count no brick over the jump line", async () => {
      const { shell, scene } = await startBoard((each) => {
        each.showWall(
          wallFrom(["ooooooooo", "o........"], {
            lowestRow: thirdsOf(each.fieldShape.depth).jumpLine - 1,
          }),
        );
      });

      expect({
        depth: shell.fieldShape.depth,
        shown: showing(scene.field.countDots),
      }).toEqual({ depth: 11, shown: 1 });
    });

    it("count as many as nine", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["oooo.oooo", "o........"], { lowestRow: 1 }));
      });

      expect(showing(scene.field.countDots)).toBe(9);
    });

    it("show no count while more than nine are left, the dashes running on to the end", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["ooooooooo", "o........"], { lowestRow: 1 }));
      });
      const metrics = metricsAt();
      const last = rectsIn(scene.field.lines, LIGHT.jumpLine).at(-1);

      expect({
        shown: showing(scene.field.countDots),
        to:
          (last?.x ?? 0) + (last?.width ?? 0) >
          metrics.x +
            metrics.width -
            (JUMP_LINE.gap + JUMP_LINE.dash) * metrics.unit,
      }).toEqual({ shown: 0, to: true });
    });

    it("show no count once none is left", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["#########"], { lowestRow: 1 }));
      });

      expect(showing(scene.field.countDots)).toBe(0);
    });

    it("hold a dot for the most bricks counted, made once", async () => {
      const { scene } = await startBoard();

      expect(scene.field.countDots).toHaveLength(MOST_COUNTED);
    });
  });

  describe("the wall", () => {
    it("shows each brick in its cell, its frames stacked from the bottom up", async () => {
      const { scene } = await startBoard();
      const wall = PLAIN.start.wall;

      expect({
        brick: framesAt(scene, 5, 0),
        tough: framesAt(scene, 5, 8),
        gap: framesAt(scene, 5, 1),
        place: placeAt(scene, 5, 8),
      }).toEqual({
        brick: [...brickLayers(brickAt(wall, 0))],
        tough: [...brickLayers(brickAt(wall, 8))],
        gap: [],
        place: toCanvas(metricsAt(), 8.5, 5.5),
      });
    });

    it("hides the rows waiting over the ceiling", async () => {
      const { scene } = await startBoard();

      // The plain round's wall stands from row 5 to row 12, two rows over
      // the ceiling of a field 11 deep.
      expect(
        Array.from({ length: MOST_DEPTH - 11 }, (_, above) =>
          stackAt(scene, 11 + above, 0),
        )
          .flat()
          .filter((image) => image.visible),
      ).toEqual([]);
    });

    it("shows a brick's frames anew as it takes a hit", async () => {
      const { shell, run, scene } = await startBoard();
      const next = PLAIN.round.next.wall;

      shell.showWall(next);
      run.advance(16);

      expect(framesAt(scene, 4, 8)).toEqual([...brickLayers(brickAt(next, 8))]);
    });

    it("hides a brick once it breaks", async () => {
      const { shell, run, scene } = await startBoard();
      const wall = PLAIN.start.wall;

      shell.showWall({
        ...wall,
        bricks: [null, ...wall.bricks.slice(1)],
      });
      run.advance(16);

      expect(framesAt(scene, 5, 0)).toEqual([]);
    });

    it("holds a stack of images for every cell of the deepest field, made once", async () => {
      const { scene } = await startBoard();

      expect(scene.wall.images).toHaveLength(
        MOST_DEPTH * COLUMNS * MOST_LAYERS,
      );
    });

    it("stacks deep enough for every look a brick takes", () => {
      const deepest = Math.max(
        ...everyLook().map((look) => brickLayers(look).length),
      );

      expect(deepest).toBe(MOST_LAYERS);
    });

    it("stands where the wall came down at once, before it eases", async () => {
      const { shell, run, scene } = await startBoard();

      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      // The tough brick ends in row 4, from row 5.
      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 5.5));
    });

    it("eases down as the view goes through the wall's step", async () => {
      const { shell, run, scene } = await startBoard();
      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      shell.bringDown(PLAIN.round.next.wall, 0.5);
      run.advance(16);

      const end = toCanvas(metricsAt(), 8.5, 4.5);
      expect(placeAt(scene, 4, 8)).toEqual({
        x: end.x,
        y: end.y - Math.round(0.5 * metricsAt().unit),
      });
    });

    it("comes to rest where the view's step ends, and stays", async () => {
      const { shell, run, scene } = await startBoard();
      shell.bringDown(PLAIN.round.next.wall, 0.5);
      run.advance(16);
      shell.bringDown(PLAIN.round.next.wall, 1);
      run.advance(16);

      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 4.5));
    });

    it("eases a jump down its rows", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(ZAP.start.wall);
      });
      const unit = metricsAt().unit;
      shell.bringDown(ZAP.round.next.wall, 0, ZAP.round.outcome.rowsDown);
      run.advance(16);

      shell.bringDown(ZAP.round.next.wall, 0.5, ZAP.round.outcome.rowsDown);
      run.advance(16);

      // The steel at wall cell 2 ends in row 2, from row 5.
      expect(placeAt(scene, 2, 2).y).toBe(
        toCanvas(metricsAt(), 2.5, 2.5).y - Math.round(1.5 * unit),
      );
    });

    it("stands the wall it starts on where it is, however far the view says it has come down", async () => {
      const { scene } = await startBoard((shell) => {
        shell.bringDown(PLAIN.start.wall, 0);
      });

      expect(placeAt(scene, 5, 8)).toEqual(toCanvas(metricsAt(), 8.5, 5.5));
    });

    it("takes a step the view has gone past the end of as ended", async () => {
      const { shell, run, scene } = await startBoard();

      shell.bringDown(PLAIN.round.next.wall, 1.5);
      run.advance(16);

      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 4.5));
    });

    it("takes a step the view hasn't begun as not begun", async () => {
      const { shell, run, scene } = await startBoard();

      shell.bringDown(PLAIN.round.next.wall, -0.5);
      run.advance(16);

      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 5.5));
    });

    it("cuts the rows coming in from over the ceiling off along it", async () => {
      const { shell, run, scene } = await startBoard();

      shell.bringDown(PLAIN.round.next.wall, 0.5);
      run.advance(16);

      // Wall row 6 comes from row 11, over the ceiling, into row 10.
      const [tile] = stackAt(scene, 10, 0);
      expect({ visible: tile?.visible, cropped: tile?.isCropped }).toEqual({
        visible: true,
        cropped: true,
      });
    });

    it("cuts as much off a row's frames as lies over the ceiling", async () => {
      const { shell, run, scene } = await startBoard();
      const [tile] = stackAt(scene, 10, 0);
      if (!tile) throw new Error("No image.");
      // Phaser keeps the crop where its typings don't show it.
      const crop = vi.spyOn(tile, "setCrop");
      const { unit } = metricsAt();
      const cut = Math.round(0.5 * unit);

      shell.bringDown(PLAIN.round.next.wall, 0.5);
      run.advance(16);

      expect(crop).toHaveBeenLastCalledWith(0, cut, unit, unit - cut);
    });

    it("cuts a frame shown scaled up by its own pixels", async () => {
      const { shell, run, scene } = await startBoard(undefined, {
        width: 1300,
        height: 1800,
      });
      const [tile] = stackAt(scene, 10, 0);
      if (!tile) throw new Error("No image.");
      const crop = vi.spyOn(tile, "setCrop");
      const { unit } = metricsAt(1300, 1800);
      const cut = Math.round(0.5 * unit) / (unit / MOST_BAKED_UNIT);

      shell.bringDown(PLAIN.round.next.wall, 0.5);
      run.advance(16);

      expect(crop).toHaveBeenLastCalledWith(
        0,
        cut,
        MOST_BAKED_UNIT,
        MOST_BAKED_UNIT - cut,
      );
    });

    it("shows none of a row still wholly over the ceiling", async () => {
      const { shell, run, scene } = await startBoard();

      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      expect(framesAt(scene, 10, 0)).toEqual([]);
    });

    it("cuts nothing off a row once it is in", async () => {
      const { shell, run, scene } = await startBoard();
      shell.bringDown(PLAIN.round.next.wall, 0.5);
      run.advance(16);

      shell.bringDown(PLAIN.round.next.wall, 1);
      run.advance(16);

      const [tile] = stackAt(scene, 10, 0);
      expect({ visible: tile?.visible, cropped: tile?.isCropped }).toEqual({
        visible: true,
        cropped: false,
      });
    });

    it("comes down at once once the player turns motion off", async () => {
      const { shell, run, scene } = await startBoard();
      stillness(shell);

      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 4.5));
    });

    it("comes down at once where the player prefers less motion", async () => {
      const { shell, run, scene } = await startBoard(stillness);

      shell.bringDown(PLAIN.round.next.wall, 0);
      run.advance(16);

      expect(placeAt(scene, 4, 8)).toEqual(toCanvas(metricsAt(), 8.5, 4.5));
    });

    it("stands a wall that rises where it is at once, as a new level's may", async () => {
      const { shell, run, scene } = await startBoard();
      const risen = { ...PLAIN.start.wall, lowestRow: 7 };

      shell.bringDown(risen, 0);
      run.advance(16);

      expect(placeAt(scene, 7, 8)).toEqual(toCanvas(metricsAt(), 8.5, 7.5));
    });

    it("shows the wall where a new layout puts it", async () => {
      const board = await startBoard();

      resizeTo(board, 600, 500);

      expect(placeAt(board.scene, 5, 8)).toEqual(
        toCanvas(metricsAt(600, 500), 8.5, 5.5),
      );
    });

    it("shows the rows a deeper field brings in", async () => {
      const { shell, run, scene } = await startBoard();

      shell.fieldShape = { ...shell.fieldShape, depth: 12 };
      run.advance(16);

      expect(framesAt(scene, 11, 0)).toEqual([
        ...brickLayers(brickAt(PLAIN.start.wall, 6 * COLUMNS)),
      ]);
    });
  });

  describe("the danger", () => {
    /** A wall whose row over the floor's holds bricks the level needs in columns 0, 2 and 4, and steel. */
    const ENDANGERING = wallFrom(["o#o.o.#.."], { lowestRow: 1 });

    it("frames each brick the level needs in the row over the floor's, and no other", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(ENDANGERING);
      });
      const first = scene.wall.warnings[COLUMNS];

      expect({
        framed: framedIn(scene),
        frame: first?.frame.name,
        place: { x: first?.x, y: first?.y },
      }).toEqual({
        framed: [
          [0, 1],
          [2, 1],
          [4, 1],
        ],
        frame: FIELD_FRAMES.warning,
        place: toCanvas(metricsAt(), 0.5, 1.5),
      });
    });

    it("frames none while only bricks the level doesn't need stand there", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["ooo......", "###......"], { lowestRow: 1 }));
      });

      expect(framedIn(scene)).toEqual([]);
    });

    it("frames none while the wall stands higher", async () => {
      const { scene } = await startBoard();

      expect(framedIn(scene)).toEqual([]);
    });

    it("unframes a brick broken there", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(ENDANGERING);
      });

      shell.showWall(wallFrom(["..o.o.#.."], { lowestRow: 1 }));
      run.advance(16);

      expect(framedIn(scene)).toEqual([
        [2, 1],
        [4, 1],
      ]);
    });

    it("brings the frames down with the wall as it eases", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(wallFrom(["o#o.o.#.."], { lowestRow: 2 }));
      });

      shell.bringDown(ENDANGERING, 0.5);
      run.advance(16);

      // Halfway down a row of 31 px, 15.5 rounded.
      expect(scene.wall.warnings[COLUMNS]?.y).toBe(
        toCanvas(metricsAt(), 0.5, 1.5).y - 16,
      );
    });

    it("keeps the frames on the bricks, and the line lit, through the step that loses the level", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(ENDANGERING);
      });

      shell.bringDown(wallFrom(["o#o.o.#.."], { lowestRow: 0 }), 0.5);
      run.advance(16);

      // Halfway down from the row over the floor's to the floor's.
      expect({
        framed: framedIn(scene),
        y: scene.wall.warnings[0]?.y,
        lit: rectsIn(scene.field.lines, LIGHT.dangerLine).length,
      }).toEqual({
        framed: [
          [0, 0],
          [2, 0],
          [4, 0],
        ],
        y: toCanvas(metricsAt(), 0.5, 0.5).y - 16,
        lit: 1,
      });
    });

    it("shows the frames over every brick's stack", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(ENDANGERING);
      });

      const [lastStack] = placesInLayer(scene.wall.images.slice(-1));
      const firstFrame = Math.min(...placesInLayer(scene.wall.warnings));

      expect(firstFrame).toBeGreaterThan(lastStack ?? Infinity);
    });

    it("brightens the danger line, solid and twice as thick, while one stands in the row over the floor's", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(ENDANGERING);
      });
      const metrics = metricsAt();

      // At 31 px a unit, twice the dashes' 2 px.
      expect(rectsIn(scene.field.lines, LIGHT.dangerLine)).toEqual([
        {
          x: metrics.x,
          y: rowFoot(metrics, 1) - 2,
          width: metrics.width,
          height: 4,
        },
      ]);
    });

    it("brightens the danger line as the wall comes down into the row over the floor's, its count unchanged", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(wallFrom(["o#o.o.#.."], { lowestRow: 2 }));
      });

      shell.bringDown(ENDANGERING, 0);
      run.advance(16);

      expect(rectsIn(scene.field.lines, LIGHT.dangerLine)).toHaveLength(1);
    });

    it("brightens the danger line for a brick in the last column alone", async () => {
      const { scene } = await startBoard((shell) => {
        shell.showWall(wallFrom(["........o"], { lowestRow: 1 }));
      });

      expect(rectsIn(scene.field.lines, LIGHT.dangerLine)).toHaveLength(1);
    });

    it("shows the frames scaled up with the wall's frames past the atlas's largest unit", async () => {
      const { scene } = await startBoard(
        (shell) => {
          shell.showWall(ENDANGERING);
        },
        { width: 1300, height: 1800 },
      );

      expect(scene.wall.warnings.at(-1)?.scale).toBe(
        metricsAt(1300, 1800).unit / MOST_BAKED_UNIT,
      );
    });

    it("dims the danger line again once none stands there", async () => {
      const { shell, run, scene } = await startBoard((each) => {
        each.showWall(ENDANGERING);
      });

      shell.showWall(wallFrom(["o#o.o.#.."], { lowestRow: 2 }));
      run.advance(16);

      expect(
        rectsIn(scene.field.lines, LIGHT.dangerLine).length,
      ).toBeGreaterThan(5);
    });
  });

  describe("the keys", () => {
    it("ask the run to pause and go on", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Escape", "Escape");
      run.key("keydown", "Enter", "Enter");
      run.advance(16);

      expect(shell.commands).toEqual<FieldCommand[]>(["pause", "go"]);
    });

    it.each<[string, string, FieldCommand]>([
      ["KeyP", "p", "toggle"],
      ["KeyX", "x", "skip"],
      ["KeyR", "r", "read"],
      ["NumpadEnter", "Enter", "go"],
    ])("ask what %s asks of the game", async (code, key, command) => {
      const { shell, run } = await startBoard();

      run.key("keydown", code, key);
      run.advance(16);

      expect(shell.commands).toEqual([command]);
    });

    it("ask nothing again as a key held repeats", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Escape", "Escape");
      run.key("keydown", "Escape", "Escape", { repeat: true });
      run.advance(16);

      expect(shell.commands).toEqual(["pause"]);
    });

    it("leave the browser its shortcuts", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Enter", "Enter", { ctrlKey: true });
      run.advance(16);

      expect(shell.commands).toEqual([]);
    });

    it("ask nothing of a key the game doesn't use", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Tab", "Tab");
      run.advance(16);

      expect(shell.commands).toEqual([]);
    });
  });

  describe("the pictures", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("are none of them encoded as the atlas is baked", async () => {
      const encode = vi.spyOn(Textures.TextureManager.prototype, "getBase64");
      const { shell, run } = await startBoard();
      shell.colors = DARK;

      run.advance(16);

      expect(encode).not.toHaveBeenCalled();
    });

    it("hand over the atlas's picture of each kind of brick, one a kind, as the shell asks for them", async () => {
      const { shell, scene } = await startBoard();
      const baked = recordOf(BRICK_KIND_IDS, (kind) =>
        scene.textures.getBase64(ATLAS, PICTURE_FRAMES.bricks[kind]),
      );

      const pictures = shell.askPictures();

      expect(pictures).toEqual({ bricks: baked });
    });

    it.each<[BrickKindId, number]>([
      ["brick", 1],
      ["tough", 2],
      ["steel", 0],
      ["rowZapper", 1],
      ["columnZapper", 1],
    ])("picture a whole %s, of %i hits, in the first tint", (kind, hits) => {
      expect(PICTURE_LAYERS[kind]).toEqual(
        brickLayers({ kind, tint: 0, hits, full: hits, plates: 0 }),
      );
    });

    it("are kept until the atlas is baked again", async () => {
      const { shell, run } = await startBoard();
      const asked = shell.askPictures();
      run.advance(16);

      const again = shell.askPictures();

      expect(again).toBe(asked);
    });

    it("are encoded anew once the atlas is baked again, as in a new palette", async () => {
      const { shell, run } = await startBoard();
      const asked = shell.askPictures();
      shell.colors = DARK;
      run.advance(16);

      const again = shell.askPictures();

      expect(again).not.toBe(asked);
    });
  });

  describe("the sounds", () => {
    it("are the view's, in the sprite's order", () => {
      expect(Object.keys(spritemap.spritemap)).toEqual(SOUNDS);
    });

    it("can be heard while the player wants them", async () => {
      const { scene } = await startBoard();

      expect(scene.sound.mute).toBe(false);
    });

    it("are muted while the player wants none", async () => {
      const { shell, run, scene } = await startBoard();

      shell.wantsSound = false;
      run.advance(16);

      expect(scene.sound.mute).toBe(true);
    });

    it("leave the field drawn where they can't be loaded", async () => {
      const { scene } = await startBoard();

      expect({
        loaded: scene.sounds.loaded,
        shown: framesAt(scene, 5, 0).length,
      }).toEqual({ loaded: false, shown: 1 });
    });
  });

  describe("drawing", () => {
    it("makes no game object after the first frame, through a step, a new layout and a new palette", async () => {
      const board = await startBoard();
      const first = objectsIn(board.scene);

      board.shell.bringDown(PLAIN.round.next.wall, 0.5);
      board.shell.colors = DARK;
      resizeTo(board, 600, 500);
      board.shell.bringDown(PLAIN.round.next.wall, 1);
      board.run.advance(16);

      expect(objectsIn(board.scene)).toBe(first);
    });
  });

  describe("once it ends", () => {
    it("calls the shell no more, and turns no key into a command", async () => {
      const { shell, run, scene } = await startBoard();
      const calls = (): number =>
        shell.ticks.length + shell.layouts.length + shell.bakes.length;

      run.game.scene.stop(scene.key);
      const before = calls();
      run.advance(48);
      run.key("keydown", "Escape", "Escape");
      run.advance(16);

      expect({ calls: calls() - before, commands: shell.commands }).toEqual({
        calls: 0,
        commands: [],
      });
    });
  });
});

describe("bakedScaleOf", () => {
  it("bakes at a field's unit and pixel ratio", () => {
    expect(bakedScaleOf({ unit: 62, pixelRatio: 2 })).toEqual({
      unit: 62,
      pixelRatio: 2,
    });
  });

  it("bakes at no more than the largest unit, at the field's pixel ratio", () => {
    expect(bakedScaleOf({ unit: 291, pixelRatio: 3 })).toEqual({
      unit: MOST_BAKED_UNIT,
      pixelRatio: 3,
    });
  });
});

describe("cutOver", () => {
  it("cuts nothing off a cell under the ceiling", () => {
    expect(cutOver(110, 100, 30)).toBe(0);
  });

  it("cuts off the part of a cell over the ceiling", () => {
    expect(cutOver(88, 100, 30)).toBe(12);
  });

  it("cuts a whole cell off once it is wholly over the ceiling", () => {
    expect(cutOver(40, 100, 30)).toBe(30);
  });
});

describe("fieldFrames", () => {
  /** The scale of a unit of 40 CSS pixels at a pixel to one, the art's mock of a phone's. */
  const PHONE = { unit: 40, pixelRatio: 1 } as const;

  it("draws the grid's dot in the field's line, as wide as the art's", () => {
    const dot = frameNamed(fieldFrames(LIGHT, PHONE), FIELD_FRAMES.gridDot);

    expect({
      side: [dot.width, dot.height],
      drawn: drawnIn(dot, "circle", LIGHT.line),
    }).toEqual({
      side: [2, 2],
      drawn: [{ kind: "circle", x: 1, y: 1, radius: 1, color: LIGHT.line }],
    });
  });

  it("draws the count's dot in the jump line's color, wider than the grid's", () => {
    const dot = frameNamed(fieldFrames(LIGHT, PHONE), FIELD_FRAMES.countDot);

    expect({
      side: [dot.width, dot.height],
      drawn: drawnIn(dot, "circle", LIGHT.jumpLine),
    }).toEqual({
      side: [6, 6],
      drawn: [{ kind: "circle", x: 3, y: 3, radius: 3, color: LIGHT.jumpLine }],
    });
  });

  it("draws each dot a CSS pixel wide at least", () => {
    const frames = fieldFrames(LIGHT, { unit: 1, pixelRatio: 1 });

    expect(
      [FIELD_FRAMES.gridDot, FIELD_FRAMES.countDot].map(
        (name) => frameNamed(frames, name).width,
      ),
    ).toEqual([1, 1]);
  });

  it("draws the warning frame a cell wide: a band of the danger line's color in from its edge, and a seam of the field's inside it", () => {
    const frame = frameNamed(fieldFrames(LIGHT, PHONE), FIELD_FRAMES.warning);

    // At 40 px a unit, a band of 3.2 px is 3, a seam of 1.2 is 1, and the
    // corners 0.18 of the cell round at its edge, less as each is further in.
    expect(frame).toEqual({
      name: FIELD_FRAMES.warning,
      width: 40,
      height: 40,
      commands: [
        outlineRoundRect(
          { x: 1.5, y: 1.5, width: 37, height: 37 },
          0.18 * 40 - 1.5,
          {
            color: LIGHT.dangerLine,
            width: 3,
          },
        ),
        outlineRoundRect(
          { x: 3.5, y: 3.5, width: 33, height: 33 },
          0.18 * 40 - 3.5,
          {
            color: LIGHT.field,
            width: 1,
          },
        ),
      ],
    });
  });

  it("draws the warning frame's band and seam a CSS pixel wide at least", () => {
    const frame = frameNamed(
      fieldFrames(LIGHT, { unit: 4, pixelRatio: 1 }),
      FIELD_FRAMES.warning,
    );

    // At 4 px a unit, a band of 0.32 px and a seam of 0.12 are 1 each.
    expect(frame.commands).toEqual([
      outlineRoundRect({ x: 0.5, y: 0.5, width: 3, height: 3 }, 0.22, {
        color: LIGHT.dangerLine,
        width: 1,
      }),
      outlineRoundRect({ x: 1.5, y: 1.5, width: 1, height: 1 }, 0, {
        color: LIGHT.field,
        width: 1,
      }),
    ]);
  });

  it("names no frame the art names", () => {
    const names = fieldFrames(LIGHT, metricsAt()).map(({ name }) => name);

    expect(
      names.filter((name) => (FRAME_NAMES as readonly string[]).includes(name)),
    ).toEqual([]);
  });
});

describe("pictureFrames", () => {
  /** The scale of a unit of 40 CSS pixels at a pixel to one, the art's mock of a phone's. */
  const PHONE = { unit: 40, pixelRatio: 1 } as const;

  it("draws a whole brick of each kind in a cell, its layers one over another from the bottom up", () => {
    const art = atlasFrames(LIGHT, PHONE);

    const tough = frameNamed(
      pictureFrames(art, PHONE),
      PICTURE_FRAMES.bricks.tough,
    );

    expect({ ...tough, many: PICTURE_LAYERS.tough.length }).toEqual({
      name: PICTURE_FRAMES.bricks.tough,
      width: 40,
      height: 40,
      commands: PICTURE_LAYERS.tough.flatMap(
        (layer) => frameNamed(art, layer).commands,
      ),
      many: 2,
    });
  });

  it("draws one for each kind", () => {
    const names = pictureFrames(atlasFrames(LIGHT, PHONE), PHONE).map(
      ({ name }) => name,
    );

    expect(names).toEqual(Object.values(PICTURE_FRAMES.bricks));
  });

  it("names no frame the art or the field names", () => {
    const named = [
      ...FRAME_NAMES,
      ...fieldFrames(LIGHT, PHONE).map(({ name }) => name),
    ];

    expect(
      Object.values(PICTURE_FRAMES.bricks).filter((name) =>
        named.includes(name),
      ),
    ).toEqual([]);
  });
});

/** Returns whether the atlas holds a frame of a name. */
function atlasHas(scene: WallScene, name: string): boolean {
  return scene.textures.get(ATLAS).has(name);
}
