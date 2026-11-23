import { RADIUS } from "@fz/brick-wall/rules/field";
import { cellAt } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { ATLAS, bakedScaleOf } from "@fz/brick-wall/scene/atlas";
import { WALL_BAKE } from "@fz/brick-wall/scene/wall_painter";
import {
  type BakeCommand,
  recordBakes,
  stampsIn,
} from "@fz/brick-wall/testing/bakes";
import { marginInsets } from "@fz/brick-wall/testing/canvases";
import {
  type PointerAiming,
  type PointerRelease,
  STRAIGHT_UP,
} from "@fz/brick-wall/view/aim_settings";
import { type AimFrame, aimToward } from "@fz/brick-wall/view/aiming";
import {
  type FieldMetrics,
  type FieldShape,
  frameBounds,
  fieldMetrics,
  fieldShape,
  toCanvas,
} from "@fz/brick-wall/view/field_metrics";
import type { EventLogView } from "@fz/core/event_log";
import type { Insets } from "@fz/phaser/insets";
import { type SceneRun, colorsOf, runKeyedScene } from "@fz/phaser/testing";
import { viewport } from "@fz/phaser/testing/pure";
import { Core, GameObjects, Textures } from "phaser";
import type { Wall } from "../rules/catalog/kinds";
import { WALL_LEGEND } from "../rules/levels/legend";
import { FLIGHT_RULES, type FlightRules } from "../rules/tuning";
import { ART_PALETTE, ART_ROLES, billionths } from "../testing/art_frames";
import { FLIGHT_FIXTURES } from "../testing/flight_fixtures";
import { atlasFrames, brickLayers } from "../view/art/atlas_frames";
import { FIELD_FRAMES, fieldFrames } from "../view/art/field_frames";
import { FRAMES, FURS } from "../view/art/frames";
import { eyesAt } from "../view/art/fuzzball_art";
import {
  PILL_FRAMES,
  digitAcross,
  pillFrames,
  pillPlace,
} from "../view/art/pill_art";
import { type WallPalette, wallPalette } from "../view/colors/palette";
import { bandSprings } from "../view/field/springs";
import type {
  BallView,
  LoggedBeat,
  LoggedEvent,
  RoundView,
} from "../view/run_state";
import type { FieldCommand } from "../view/steering/controls";
import {
  type RickashayScene,
  type RickashaySceneOptions,
  makeRickashayScene,
} from "./rickashay_scene";

/** The light palette the specs draw in, the art's specs'. */
const LIGHT = ART_PALETTE;

/** A dark palette, the art's roles but for its field and its text, swapped. */
const DARK = wallPalette(
  {
    ...ART_ROLES,
    field: "#1c2329",
    fieldText: "#eceff1",
  },
  "dark",
);

/** The margin the board keeps around the field, a compact screen's, which the frame lies in. */
const INSETS = marginInsets(12);

/** The canvas the specs run on, in CSS pixels, unless one says otherwise. */
const CANVAS = { width: 400, height: 400 } as const;

/** A round whose plain shot wears a tough brick on a wall 11 deep, its lowest row in row 5. */
const PLAIN = FLIGHT_FIXTURES.plain;

/** A log of no events, as the scene reads none yet. */
const NO_EVENTS: EventLogView<LoggedEvent> = {
  latest: 0,
  forEachSince: () => undefined,
};

/** A log of no beats, as the scene reads none yet. */
const NO_BEATS: EventLogView<LoggedBeat> = {
  latest: 0,
  forEachSince: () => undefined,
};

/** Returns a fuzzball waiting on the floor at an x, or as given. */
function ballAt(x: number, changes: Partial<BallView> = {}): BallView {
  return {
    x,
    y: RADIUS,
    dx: 0,
    dy: 0,
    rally: 0,
    fur: 0,
    hot: false,
    home: false,
    ...changes,
  };
}

/** Returns the round as the view draws it, its fuzzball waiting in the middle of the floor and its wall standing still, unless given. */
function viewOf(wall: Wall, changes: Partial<RoundView> = {}): RoundView {
  return {
    ball: ballAt(4.5),
    wall,
    wallDrop: 1,
    rowsDown: 0,
    held: 0,
    holdsLeft: FLIGHT_RULES.hatchHolds,
    boltsDrawn: 0,
    events: NO_EVENTS,
    beats: NO_BEATS,
    ...changes,
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
class FakeShell implements RickashaySceneOptions {
  round: RoundView = viewOf(PLAIN.start.wall);
  aimingSet: PointerAiming = "pointAndHold";
  releaseSet: PointerRelease = "onLetGo";
  colors: WallPalette = LIGHT;
  fieldShape: FieldShape = shapeAt(CANVAS.width, CANVAS.height);
  flightRules: FlightRules = FLIGHT_RULES;
  welcomesMotion = true;
  /** The chrome the board declares over the canvas, the margin it keeps around the field. */
  chrome: Insets = INSETS;
  readonly ticks: number[] = [];
  /** The aim handed over with each tick. */
  readonly aims: Readonly<AimFrame>[] = [];
  readonly layouts: FieldMetrics[] = [];
  readonly commands: FieldCommand[] = [];

  readonly tick = (deltaMs: number, aim: Readonly<AimFrame>): void => {
    this.ticks.push(deltaMs);
    // The steering hands the same record each frame, so a copy is kept.
    this.aims.push({ ...aim });
  };
  readonly view = (): RoundView => this.round;
  readonly pointerAiming = (): PointerAiming => this.aimingSet;
  readonly pointerRelease = (): PointerRelease => this.releaseSet;
  readonly palette = (): WallPalette => this.colors;
  readonly shape = (): FieldShape => this.fieldShape;
  readonly rules = (): FlightRules => this.flightRules;
  readonly motion = (): boolean => this.welcomesMotion;
  readonly onLayout = (metrics: FieldMetrics): void => {
    this.layouts.push(metrics);
  };
  readonly command = (command: FieldCommand): void => {
    this.commands.push(command);
  };

  /** Shows the round with some of what the view draws changed. */
  show(changes: Partial<RoundView>): void {
    this.round = { ...this.round, ...changes };
  }

  /** Returns the aim the shell was last handed. */
  lastAim(): Readonly<AimFrame> | undefined {
    return this.aims.at(-1);
  }
}

interface Board {
  readonly shell: FakeShell;
  readonly run: SceneRun<RickashayScene>;
  readonly scene: RickashayScene;
}

/** Reads, in order, what a bake of a key was handed since the board started. */
let bakedFromStart: (key: string) => BakeCommand[] = () => [];

/**
 * Runs the scene for a shell, on a canvas of some CSS pixels, its first
 * frame drawn, till the case that runs it finishes.
 */
async function startBoard(
  setUp: (shell: FakeShell) => void = () => undefined,
  canvas: { readonly width: number; readonly height: number } = CANVAS,
): Promise<Board> {
  // What the wall's bake shows is read from what it was handed from the
  // start, as a headless game draws no pixels.
  bakedFromStart = recordBakes(Textures.DynamicTexture.prototype);
  const shell = new FakeShell();
  shell.fieldShape = shapeAt(canvas.width, canvas.height);
  setUp(shell);
  const make = makeRickashayScene(shell);
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

/** Returns the frames the wall's bake was last stamped with in a field row and column, from the bottom of its stack up. */
function framesAt(
  metrics: FieldMetrics,
  depth: number,
  row: number,
  column: number,
): string[] {
  const { unit } = metrics;
  const x = column * unit + unit / 2;
  const y = (depth - 1 - row) * unit + unit / 2;
  const stamps = stampsIn(bakedFromStart(WALL_BAKE)).filter(
    (stamp) => stamp.x === x && stamp.y === y,
  );
  return stamps.map((stamp) => stamp.frame);
}

/** Returns the frames the brick standing in a field row and column of a wall shows, as the art draws it, or none. */
function layersAt(wall: Wall, row: number, column: number): readonly string[] {
  const brick = wall.bricks[cellAt(wall, column, row)];
  return brick ? brickLayers(brick) : [];
}

/** Returns where an object stands among those of the layer it is in, back to front. */
function placeAmong(object: GameObjects.GameObject): number {
  return object.displayList?.getIndex(object) ?? -1;
}

/** Returns where the layer an object is in stands among the scene's layers, back to front. */
function layerPlaceOf(
  scene: RickashayScene,
  object: GameObjects.GameObject,
): number {
  const layer = object.displayList;
  return layer instanceof GameObjects.Layer
    ? scene.children.getIndex(layer)
    : -1;
}

/** Returns where each image of a set shows, which it shows, and its frame. */
function shownOf(
  images: readonly GameObjects.Image[],
): { frame: string; x: number; y: number }[] {
  return images
    .filter((image) => image.visible)
    .map((image) => ({ frame: image.frame.name, x: image.x, y: image.y }));
}

/** Returns a place on the canvas to a billionth of a pixel, so two worked out in another order match. */
function placeInBillionths({ x, y }: { x: number; y: number }): {
  x: number;
  y: number;
} {
  return { x: billionths(x), y: billionths(y) };
}

/** Returns the square each spring of a set fills, its foot's middle on the square's, on the canvas. */
function squaresOf(
  springs: readonly GameObjects.Image[],
): { left: number; top: number; size: number }[] {
  return springs.map((spring) => ({
    left: spring.x - spring.displayWidth / 2,
    top: spring.y - spring.displayHeight,
    size: spring.displayWidth,
  }));
}

describe("RickashayScene", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("each frame", () => {
    it("hands the shell the time each frame took", async () => {
      const { shell, run } = await startBoard();

      run.advance(60, 20);

      expect(shell.ticks.slice(-3)).toEqual([20, 20, 20]);
    });

    it("hands the shell the aim straight up, nothing let fly, before the player aims", async () => {
      const { shell } = await startBoard();

      expect(shell.lastAim()).toEqual({
        aim: STRAIGHT_UP,
        release: false,
        keyed: false,
        touch: false,
        touchX: 0,
        touchY: 0,
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
      const deeper = fieldShape(viewport(400, 400, 1, INSETS), 14);

      shell.fieldShape = deeper;
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(
        fieldMetrics(viewport(400, 400, 1, INSETS), deeper),
      );
    });

    it("lays the field out again as the chrome over it changes", async () => {
      const { shell, run } = await startBoard();

      shell.chrome = marginInsets(40);
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(
        fieldMetrics(viewport(400, 400, 1, marginInsets(40)), shell.fieldShape),
      );
    });

    it("lays the field out once for a frame of no change", async () => {
      const { shell, run } = await startBoard();

      run.advance(48);

      expect(shell.layouts).toHaveLength(1);
    });

    it("keeps its layout while the canvas has no room inside its chrome", async () => {
      const { shell, run } = await startBoard();

      shell.chrome = marginInsets(300);
      run.advance(16);

      expect(shell.layouts).toEqual([metricsAt()]);
    });

    it("frames the camera on the field's frame, so nothing drawn shows past it", async () => {
      const { scene, shell } = await startBoard();
      const frame = frameBounds(metricsAt(), shell.fieldShape);
      const camera = scene.cameras.main;

      expect({
        x: camera.x,
        y: camera.y,
        width: camera.width,
        height: camera.height,
      }).toEqual(frame);
    });
  });

  describe("the atlas", () => {
    it("holds every frame of the art, the field's own and the rally's pill's", async () => {
      const { scene } = await startBoard();
      const atlas = scene.textures.get(ATLAS);
      const metrics = metricsAt();

      expect(
        [
          ...atlasFrames(LIGHT, metrics),
          ...fieldFrames(LIGHT, metrics),
          ...pillFrames(LIGHT, metrics),
        ].filter((frame) => !atlas.has(frame.name)),
      ).toEqual([]);
    });

    it("holds the floor bounces' springs, unlit and lit", async () => {
      const { scene } = await startBoard();
      const atlas = scene.textures.get(ATLAS);

      expect([atlas.has(FRAMES.bounceOff), atlas.has(FRAMES.bounceOn)]).toEqual(
        [true, true],
      );
    });

    it("bakes again in a new palette, the field painted in it", async () => {
      const { shell, run, scene } = await startBoard();

      shell.colors = DARK;
      run.advance(16);

      expect(colorsOf(scene.field.rim)).toContain(DARK.band);
    });
  });

  describe("the springs", () => {
    it("stand a spring for each floor bounce a fuzzball holds, where the view lays them out in the floor's band", async () => {
      const { scene, shell } = await startBoard();
      const { size, corners } = bandSprings(
        metricsAt(),
        shell.fieldShape,
        FLIGHT_RULES,
      );

      expect(squaresOf(scene.springs.springs)).toEqual(
        corners.map(({ x, y }) => ({ left: x, top: y, size })),
      );
    });

    it("leave every spring unlit while the fuzzball holds no floor bounce", async () => {
      const { scene } = await startBoard();

      expect(shownOf(scene.springs.springs).map((one) => one.frame)).toEqual([
        FRAMES.bounceOff,
        FRAMES.bounceOff,
        FRAMES.bounceOff,
      ]);
    });

    it("light as many springs from the left as the fuzzball holds floor bounces", async () => {
      const { scene, shell, run } = await startBoard();

      shell.show({ held: 2 });
      run.advance(16);

      expect(shownOf(scene.springs.springs).map((one) => one.frame)).toEqual([
        FRAMES.bounceOn,
        FRAMES.bounceOn,
        FRAMES.bounceOff,
      ]);
    });

    it("put a spring out as its floor bounce is spent", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.show({ held: 2 });
      });

      shell.show({ held: 1 });
      run.advance(16);

      expect(shownOf(scene.springs.springs).map((one) => one.frame)).toEqual([
        FRAMES.bounceOn,
        FRAMES.bounceOff,
        FRAMES.bounceOff,
      ]);
    });

    it("stand as many springs as rules retuned say a fuzzball holds, made as they are retuned, and hide those past fewer", async () => {
      const { scene, shell, run } = await startBoard();
      shell.flightRules = { ...FLIGHT_RULES, mostBounces: 5 };
      run.advance(16);
      const five = shownOf(scene.springs.springs).length;

      shell.flightRules = { ...FLIGHT_RULES, mostBounces: 2 };
      run.advance(16);

      expect({
        made: scene.springs.springs.length,
        five,
        two: shownOf(scene.springs.springs).length,
      }).toEqual({ made: 5, five: 5, two: 2 });
    });

    it("follow the band as the canvas changes size, to its new places and size", async () => {
      const board = await startBoard();

      resizeTo(board, 600, 500);

      const { size, corners } = bandSprings(
        metricsAt(600, 500),
        board.shell.fieldShape,
        FLIGHT_RULES,
      );
      expect(squaresOf(board.scene.springs.springs)).toEqual(
        corners.map(({ x, y }) => ({ left: x, top: y, size })),
      );
    });

    it("hide every spring where the floor's band is too thin to hold one", async () => {
      const { scene } = await startBoard(undefined, {
        width: 100,
        height: 100,
      });

      expect(shownOf(scene.springs.springs)).toEqual([]);
    });
  });

  describe("the wall", () => {
    it("stamps each brick's frames in its cell of the wall's bake, from the bottom of its stack up", async () => {
      const { shell } = await startBoard();
      const metrics = metricsAt();
      const { depth } = shell.fieldShape;

      expect({
        brick: framesAt(metrics, depth, 5, 0),
        tough: framesAt(metrics, depth, 5, 8),
      }).toEqual({
        brick: layersAt(PLAIN.start.wall, 5, 0),
        tough: layersAt(PLAIN.start.wall, 5, 8),
      });
    });

    it("stamps a tough brick's tile and its pips", async () => {
      const { shell } = await startBoard();

      expect(
        framesAt(metricsAt(), shell.fieldShape.depth, 5, 8).slice(1),
      ).toEqual([FRAMES.pips(2)]);
    });

    it("stamps nothing for a brick whose kind's art isn't drawn yet", async () => {
      const wall = wallFrom(["o..=....."], WALL_LEGEND, { lowestRow: 3 });
      const { shell } = await startBoard((each) => {
        each.round = viewOf(wall);
      });
      const metrics = metricsAt();
      const { depth } = shell.fieldShape;

      expect({
        brick: framesAt(metrics, depth, 3, 0).length,
        hatch: framesAt(metrics, depth, 3, 3),
      }).toEqual({ brick: 1, hatch: [] });
    });

    it("frames each brick the level needs one step from losing it in the field's warning frame", async () => {
      const wall = wallFrom(["o..#....."], WALL_LEGEND, { lowestRow: 0 });
      const { scene } = await startBoard((each) => {
        each.round = viewOf(wall);
      });

      expect(
        scene.wall.warnings
          .filter((warning) => warning.visible)
          .map((warning) => warning.frame.name),
      ).toEqual([FIELD_FRAMES.warning]);
    });
  });

  describe("the fuzzball", () => {
    it("draws the fuzzball waiting at its middle, scaled as the field is laid out, its fur as it grew", async () => {
      const { scene } = await startBoard((each) => {
        each.show({ ball: ballAt(2) });
      });
      const metrics = metricsAt();
      const at = toCanvas(metrics, 2, RADIUS);

      expect({
        frame: scene.balls.body.frame.name,
        x: scene.balls.body.x,
        y: scene.balls.body.y,
        scale: scene.balls.body.scale,
      }).toEqual({
        frame: FRAMES.fuzzball(0),
        x: at.x,
        y: at.y,
        scale: metrics.unit / bakedScaleOf(metrics).unit,
      });
    });

    it.each(FURS)(
      "draws its fur lifted as the view has it, %i",
      async (fur) => {
        const { scene, shell, run } = await startBoard();

        shell.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, fur }) });
        run.advance(16);

        expect(scene.balls.body.frame.name).toBe(FRAMES.fuzzball(fur));
      },
    );

    it("draws a hot shot red-hot under its crown of flame", async () => {
      const { scene } = await startBoard((each) => {
        each.show({ ball: ballAt(2, { hot: true }) });
      });

      expect(scene.balls.body.frame.name).toBe(FRAMES.hotShot);
    });

    it("draws its eyes over it, looking the way it flies", async () => {
      const { scene, shell, run } = await startBoard();
      const ball = ballAt(3, { y: 4, dx: -1, dy: 2 });

      shell.show({ ball });
      run.advance(16);

      const place = eyesAt(ball, { x: 0, y: 0 });
      const at = toCanvas(metricsAt(), place.x, place.y);
      expect({
        frame: scene.balls.eyes.frame.name,
        x: scene.balls.eyes.x,
        y: scene.balls.eyes.y,
      }).toEqual({ frame: FRAMES.eyes, x: at.x, y: at.y });
    });

    it("half shuts its eyes as it drops home", async () => {
      const { scene, shell, run } = await startBoard();

      shell.show({ ball: ballAt(3, { y: 4, home: true }) });
      run.advance(16);

      expect(scene.balls.eyes.frame.name).toBe(FRAMES.yawn);
    });

    it("draws its eyes over its body", async () => {
      const { scene } = await startBoard();
      const { body, eyes } = scene.balls;

      expect({
        together: eyes.displayList === body.displayList,
        over: placeAmong(eyes) > placeAmong(body),
      }).toEqual({ together: true, over: true });
    });
  });

  describe("the rally's pill", () => {
    it("hides while the fuzzball has struck nothing", async () => {
      const { scene } = await startBoard();

      expect(shownOf([scene.pill.pill, ...scene.pill.digits])).toEqual([]);
    });

    it("writes the rally beside the fuzzball in a pill as wide as its digits, where the view places it", async () => {
      const { scene, shell, run } = await startBoard();
      const ball = ballAt(3, { y: 4, dx: 1, dy: 1, rally: 15 });

      shell.show({ ball });
      run.advance(16);

      const metrics = metricsAt();
      const middle = pillPlace(ball, shell.fieldShape.depth, { x: 0, y: 0 });
      const at = (across: number): { x: number; y: number } =>
        placeInBillionths(toCanvas(metrics, middle.x + across, middle.y));
      expect(
        shownOf([scene.pill.pill, ...scene.pill.digits]).map(
          ({ frame, ...place }) => ({ frame, ...placeInBillionths(place) }),
        ),
      ).toEqual([
        { frame: PILL_FRAMES.pill(2), ...at(0) },
        { frame: PILL_FRAMES.digit(1), ...at(digitAcross(2, 0)) },
        { frame: PILL_FRAMES.digit(5), ...at(digitAcross(2, 1)) },
      ]);
    });

    it("writes a rally that takes more digits in a wider pill as it climbs", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 99 }) });
      });

      shell.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 100 }) });
      run.advance(16);

      expect(
        shownOf([scene.pill.pill, ...scene.pill.digits]).map(
          (one) => one.frame,
        ),
      ).toEqual([
        PILL_FRAMES.pill(3),
        PILL_FRAMES.digit(1),
        PILL_FRAMES.digit(0),
        PILL_FRAMES.digit(0),
      ]);
    });

    it("follows the fuzzball as it flies", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 3 }) });
      });
      const before = scene.pill.pill.x;

      shell.show({ ball: ballAt(4, { y: 5, dx: 1, dy: 1, rally: 3 }) });
      run.advance(16);

      expect(scene.pill.pill.x - before).toBe(metricsAt().unit);
    });

    it("hides as the fuzzball lands and waits", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 12 }) });
      });

      shell.show({ ball: ballAt(5) });
      run.advance(16);

      expect(shownOf([scene.pill.pill, ...scene.pill.digits])).toEqual([]);
    });

    it("draws over the fuzzball, so the fuzzball never covers its number", async () => {
      const { scene } = await startBoard();

      expect(layerPlaceOf(scene, scene.pill.pill)).toBeGreaterThan(
        layerPlaceOf(scene, scene.balls.body),
      );
    });
  });

  describe("the keys", () => {
    it.each<[string, string, FieldCommand]>([
      ["KeyF", "f", "fast"],
      ["KeyX", "x", "skip"],
      ["KeyG", "g", "readGuide"],
      ["KeyR", "r", "readRows"],
      ["Escape", "Escape", "pause"],
    ])("ask what %s asks of the game", async (code, key, command) => {
      const { shell, run } = await startBoard();

      run.key("keydown", code, key);
      run.advance(16);

      expect(shell.commands).toEqual([command]);
    });

    it("ask nothing again as a key held repeats", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "KeyF", "f");
      run.key("keydown", "KeyF", "f", { repeat: true });
      run.advance(16);

      expect(shell.commands).toEqual(["fast"]);
    });

    it("leave the browser its shortcuts", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "KeyF", "f", { ctrlKey: true });
      run.advance(16);

      expect(shell.commands).toEqual([]);
    });

    it("turn the aim as an arrow key is pressed, and ask nothing of the game", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "ArrowLeft", "ArrowLeft");
      run.advance(16);

      expect({
        turned: shell.lastAim()?.aim !== STRAIGHT_UP,
        keyed: shell.aims.some((aim) => aim.keyed),
        commands: shell.commands,
      }).toEqual({ turned: true, keyed: true, commands: [] });
    });

    it("let the shot fly at Space", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Space", " ");
      run.advance(16);

      expect(shell.aims.some((aim) => aim.release)).toBe(true);
    });
  });

  describe("the pointer", () => {
    it("aims a pointing mouse from where the fuzzball waits", async () => {
      const { shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(2) });
      });
      const at = toCanvas(metricsAt(), 6, 6);

      run.pointer("move", at.x, at.y);
      run.advance(16);

      expect(shell.lastAim()?.aim).toBe(aimToward(4, 6 - RADIUS));
    });

    it("keeps aiming from where the fuzzball last waited while it flies", async () => {
      const { shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(2) });
      });
      shell.show({ ball: ballAt(7, { y: 3, dx: 1, dy: 1 }) });
      run.advance(16);

      const at = toCanvas(metricsAt(), 6, 6);
      run.pointer("move", at.x, at.y);
      run.advance(16);

      expect(shell.lastAim()?.aim).toBe(aimToward(4, 6 - RADIUS));
    });

    it("keeps aiming from where the fuzzball last waited while it drops home", async () => {
      const { shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(2) });
      });
      shell.show({ ball: ballAt(7, { y: 3, home: true }) });
      run.advance(16);

      const at = toCanvas(metricsAt(), 6, 6);
      run.pointer("move", at.x, at.y);
      run.advance(16);

      expect(shell.lastAim()?.aim).toBe(aimToward(4, 6 - RADIUS));
    });

    it("aims a pointer on the field as a new layout lays it out", async () => {
      const board = await startBoard((each) => {
        each.show({ ball: ballAt(2) });
      });
      resizeTo(board, 600, 500);

      const at = toCanvas(metricsAt(600, 500), 6, 6);
      board.run.pointer("move", at.x, at.y);
      board.run.advance(16);

      expect(board.shell.lastAim()?.aim).toBe(aimToward(4, 6 - RADIUS));
    });

    it("lets the shot fly as a mouse's press is let go", async () => {
      const { shell, run } = await startBoard();
      const at = toCanvas(metricsAt(), 4.5, 6);
      run.pointer("down", at.x, at.y);
      run.advance(16);

      run.pointer("up", at.x, at.y);
      run.advance(16);

      expect(shell.lastAim()?.release).toBe(true);
    });

    it("lets the shot fly as a mouse's press is let go past the canvas", async () => {
      const { shell, run } = await startBoard();
      const at = toCanvas(metricsAt(), 4.5, 6);
      run.pointer("down", at.x, at.y);
      run.advance(16);

      run.pointer("up", at.x, at.y, { on: document.body });
      run.advance(16);

      expect(shell.lastAim()?.release).toBe(true);
    });

    it("leaves the aim where it is as a press is let go, where the settings let the shot fly only by the bar's Release", async () => {
      const { shell, run } = await startBoard();
      shell.releaseSet = "byButton";
      run.advance(16);
      const at = toCanvas(metricsAt(), 4.5, 6);
      run.pointer("down", at.x, at.y);
      run.advance(16);

      run.pointer("up", at.x, at.y);
      run.advance(16);

      expect(shell.aims.some((aim) => aim.release)).toBe(false);
    });

    it("hands the steering how the mouse and fingers aim as the settings change", async () => {
      const { shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(2) });
      });
      shell.aimingSet = "pullBack";
      run.advance(16);

      const at = toCanvas(metricsAt(), 6, 6);
      run.pointer("move", at.x, at.y);
      run.advance(16);

      expect(shell.lastAim()?.aim).toBe(STRAIGHT_UP);
    });

    it("turns the aim an aim each turn of the wheel", async () => {
      const { shell, run } = await startBoard();
      const at = toCanvas(metricsAt(), 4.5, 6);

      run.wheel(100, at.x, at.y);
      run.advance(16);

      expect(shell.lastAim()?.aim).toBe(STRAIGHT_UP - 1);
    });

    it("calls the press off as the player looks away", async () => {
      const { shell, run } = await startBoard();
      const at = toCanvas(metricsAt(), 4.5, 6);
      run.pointer("down", at.x, at.y);
      run.advance(16);

      run.game.events.emit(Core.Events.BLUR);
      run.advance(16);
      run.pointer("up", at.x, at.y);
      run.advance(16);

      expect(shell.aims.some((aim) => aim.release)).toBe(false);
    });
  });
});
