import { COLUMNS, RADIUS } from "@fz/brick-wall/rules/field";
import { cellAt, columnOf, fieldRowOf } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { positionAt } from "@fz/brick-wall/rules/track";
import { ATLAS, bakedScaleOf } from "@fz/brick-wall/scene/atlas";
import { MOST_FLASHES, MOST_RINGS } from "@fz/brick-wall/scene/effects";
import { MOST_STRUCK } from "@fz/brick-wall/scene/guide";
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
import { TINT } from "@fz/brick-wall/view/inks";
import { RING_MS } from "@fz/brick-wall/view/timing";
import { EventLog, type EventLogView } from "@fz/core/event_log";
import type { Insets } from "@fz/phaser/insets";
import {
  type SceneRun,
  cacheSounds,
  colorsOf,
  objectsIn,
  runKeyedScene,
} from "@fz/phaser/testing";
import { viewport } from "@fz/phaser/testing/pure";
import { Core, GameObjects, Sound, Textures } from "phaser";
import type { MockInstance } from "vitest";
import type { Brick, Wall } from "../rules/catalog/kinds";
import type { FlightEvent } from "../rules/flight/events";
import { WALL_LEGEND } from "../rules/levels/legend";
import { FLIGHT_RULES, type FlightRules } from "../rules/tuning";
import { ART_PALETTE, ART_ROLES, billionths } from "../testing/art_frames";
import {
  FLIGHT_FIXTURES,
  type FlightFixture,
} from "../testing/flight_fixtures";
import { brickLayers, wallAtlasFrames } from "../view/art/atlas_frames";
import { FIELD_FRAMES } from "../view/art/field_frames";
import { GUIDE_FRAMES } from "../view/art/guide_frames";
import { FRAMES, FURS } from "../view/art/frames";
import { eyesAt } from "../view/art/fuzzball_art";
import { lockTint } from "../view/art/lock_tint";
import { EFFECT_FRAMES } from "../view/art/effect_frames";
import { RALLY_FRAMES, RALLY_PLACE, digitAcross } from "../view/art/rally_art";
import { brickColor } from "../view/colors/brick_colors";
import { type WallPalette, wallPalette } from "../view/colors/palette";
import { type Cue, type Flourish, QUIET } from "../view/effects/effects";
import { SOUNDS, type SoundName } from "../view/effects/sounds";
import {
  KICK_MS,
  PORTAL_MS,
  RAMP_FLASH_MS,
  SPARK_MS,
  STREAK,
} from "../view/effects/timing";
import {
  type GuideFlight,
  MOST_GUIDE_DOTS,
  MOST_GUIDE_RINGS,
  wallGuideOf,
} from "../view/field/guide";
import { bandSprings } from "../view/field/springs";
import type {
  BallView,
  Beat,
  LoggedBeat,
  LoggedEvent,
  RoundView,
} from "../view/run_state";
import { FLIGHT_PACE } from "../view/play/pace";
import { RoundPlay } from "../view/play/round_play";
import type { FieldCommand } from "../view/steering/controls";
import {
  type RickashayScene,
  type RickashaySceneOptions,
  SOUNDS_KEY,
  makeRickashayScene,
} from "./rickashay_scene";
import {
  MOST_PUFFS,
  MOST_SPARKS,
  MOST_SWIRLS,
} from "./painters/effects_painter";
import { PICTURE_FRAMES, type Pictures } from "./pictures";
import spritemap from "./sounds/sounds.json";

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
  /** The flight the guide shows, or null where none shows. */
  guideFlight: GuideFlight | null = null;
  welcomesMotion = true;
  wantsSound = true;
  /** The level's play, once a case aims a fixture's round, whose view is drawn in place of {@link round} and which each tick plays on. */
  play: RoundPlay | null = null;
  /** The chrome the board declares over the canvas, the margin it keeps around the field. */
  chrome: Insets = INSETS;
  readonly ticks: number[] = [];
  /** The aim handed over with each tick. */
  readonly aims: Readonly<AimFrame>[] = [];
  readonly layouts: FieldMetrics[] = [];
  readonly commands: FieldCommand[] = [];
  /** Runs in the first tick alone, before the play plays on, as a shell's does whose first tick reaches a flight's moments, a shot let fly as the scene starts. */
  inFirstTick: () => void = () => undefined;

  readonly tick = (deltaMs: number, aim: Readonly<AimFrame>): void => {
    this.inFirstTick();
    this.inFirstTick = () => undefined;
    this.ticks.push(deltaMs);
    // The steering hands the same record each frame, so a copy is kept.
    this.aims.push({ ...aim });
    this.play?.advance(deltaMs, {
      pace: FLIGHT_PACE,
      speed: "normal",
      fast: false,
      motion: this.welcomesMotion,
      paused: false,
    });
  };
  readonly view = (): RoundView => this.play?.view ?? this.round;
  readonly pointerAiming = (): PointerAiming => this.aimingSet;
  readonly pointerRelease = (): PointerRelease => this.releaseSet;
  readonly palette = (): WallPalette => this.colors;
  readonly shape = (): FieldShape => this.fieldShape;
  readonly rules = (): FlightRules => this.flightRules;
  readonly guide = (): GuideFlight | null => this.guideFlight;
  readonly motion = (): boolean => this.welcomesMotion;
  readonly sound = (): boolean => this.wantsSound;
  readonly onLayout = (metrics: FieldMetrics): void => {
    this.layouts.push(metrics);
  };
  readonly command = (command: FieldCommand): void => {
    this.commands.push(command);
  };
  /** The pictures of the kinds the atlas handed over at each bake. */
  readonly pictures: (() => Pictures)[] = [];
  readonly onPictures = (pictures: () => Pictures): void => {
    this.pictures.push(pictures);
  };

  /** Aims a fixture's round, played from then on as the game plays it. */
  aim(fixture: FlightFixture): RoundPlay {
    this.play = new RoundPlay(fixture.start, this.flightRules);
    return this.play;
  }

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

/** Returns a wall with the brick in a wall cell gone, as a brick broken leaves it. */
function withoutBrick(wall: Wall, cell: number): Wall {
  return {
    ...wall,
    bricks: wall.bricks.map((brick, at) => (at === cell ? null : brick)),
  };
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

/** Returns the first of a pool, which a scene makes whole as it starts. */
function firstOf<T>(pool: readonly T[]): T {
  const [first] = pool;
  if (first === undefined) throw new RangeError("An empty pool");
  return first;
}

/** Returns the brick a wall cell of a wall holds, which a case needs there. */
function brickIn(wall: Wall, cell: number): Brick {
  const brick = wall.bricks[cell];
  if (!brick) throw new RangeError(`No brick in cell ${cell}`);
  return brick;
}

/**
 * Returns a flight as the rules cast the guide of its shot: stopped in the
 * air `guidePast` past its `guideTurns`th turn, as rules set them, its
 * events to there, or whole where it lands first.
 *
 * It stands in for the rules' own `guideOf()`, which another package
 * builds, and gives way to it once that lands.
 */
function castOf(
  flight: GuideFlight,
  { guideTurns, guidePast }: FlightRules = FLIGHT_RULES,
): GuideFlight {
  const { track, events } = flight;
  const last = events.filter(({ kind }) => kind === "turn")[guideTurns - 1];
  const end = last && positionAt(track, last.at + guidePast);
  if (!last || !end) return flight;
  return {
    track: {
      ...track,
      waypoints: [...track.waypoints.filter(({ at }) => at < end.at), end],
    },
    events: events.filter(({ at, kind }) => at <= end.at && kind !== "land"),
  };
}

/** Returns a log of a flight's events as the view keeps one, empty. */
function eventLog(): EventLog<LoggedEvent> {
  return new EventLog<LoggedEvent>(16, () => ({
    serial: 0,
    event: { kind: "land", at: 0, x: 0 },
    effects: QUIET,
  }));
}

/** Writes an event to a log, calling for some flourishes and no sound. */
function logEvent(
  log: EventLog<LoggedEvent>,
  event: FlightEvent,
  ...flourishes: Flourish[]
): void {
  const record = log.next();
  record.event = event;
  record.effects = { flourishes, sounds: [] };
}

/** Writes an event to a log, calling for some sounds and no flourish. */
function logSounds(
  log: EventLog<LoggedEvent>,
  event: FlightEvent,
  ...sounds: Cue[]
): void {
  const record = log.next();
  record.event = event;
  record.effects = { flourishes: [], sounds };
}

/** Returns a log of a round's beats as the view keeps one, empty. */
function beatLog(): EventLog<LoggedBeat> {
  return new EventLog<LoggedBeat>(16, () => ({ serial: 0, beat: "release" }));
}

/** Writes a beat to a log. */
function logBeat(log: EventLog<LoggedBeat>, beat: Beat): void {
  log.next().beat = beat;
}

/** Returns a turn of a flight at a place, off the floor or as given. */
function turnAt(
  x: number,
  y: number,
  off: "floor" | "brick" = "floor",
): FlightEvent {
  return { kind: "turn", at: 1, x, y, dx: 1, dy: 1, off, cells: [] };
}

/** Returns the images of a pool of bursts that show, where each does. */
function burstsShown(
  bursts: readonly { readonly image: GameObjects.Image }[],
): { x: number; y: number }[] {
  return bursts
    .filter(({ image }) => image.visible)
    .map(({ image }) => ({ x: image.x, y: image.y }));
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

/** The rally mark the fixtures' rounds are released toward, past every hand-made flight's rally. */
const RALLY_MARK = 20;

/** Returns the most of some times, in order, that start within some milliseconds of one another: the most of a pool that show at once, each for that long. */
function mostAtOnce(times: readonly number[], ms: number): number {
  return Math.max(
    0,
    ...times.map(
      (time, at) =>
        times.filter((other, before) => before <= at && time - other < ms)
          .length,
    ),
  );
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
    it("holds every frame the art draws for the field", async () => {
      const { scene } = await startBoard();
      const atlas = scene.textures.get(ATLAS);

      expect(
        wallAtlasFrames(LIGHT, metricsAt()).filter(
          (frame) => !atlas.has(frame.name),
        ),
      ).toEqual([]);
    });

    it("holds the floor bounces' springs, unlit and lit", async () => {
      const { scene } = await startBoard();
      const atlas = scene.textures.get(ATLAS);

      expect([atlas.has(FRAMES.bounceOff), atlas.has(FRAMES.bounceOn)]).toEqual(
        [true, true],
      );
    });

    it("holds a picture of each drawn kind of brick", async () => {
      const { scene } = await startBoard();
      const atlas = scene.textures.get(ATLAS);

      expect(
        Object.values(PICTURE_FRAMES.bricks).filter(
          (frame) => !atlas.has(frame),
        ),
      ).toEqual([]);
    });

    it("hands the shell the kinds' pictures as it bakes, and again as it bakes in a new palette", async () => {
      const { shell, run } = await startBoard();
      const handed = shell.pictures.length;

      shell.colors = DARK;
      run.advance(16);

      expect([handed, shell.pictures.length]).toEqual([1, 2]);
    });

    it("pictures each drawn kind, once asked, as a PNG's data: URL", async () => {
      const { shell } = await startBoard();

      const pictures = shell.pictures[0]?.();

      expect(
        Object.values(pictures?.bricks ?? {}).map((picture) =>
          picture.startsWith("data:image/png"),
        ),
      ).toEqual(Object.values(PICTURE_FRAMES.bricks).map(() => true));
    });

    it("pictures a floor bounce's spring, unlit and lit, once asked, each a PNG's data: URL", async () => {
      const { shell } = await startBoard();

      const springs = shell.pictures[0]?.().springs;

      expect([springs?.off, springs?.on]).toEqual([
        expect.stringMatching(/^data:image\/png/),
        expect.stringMatching(/^data:image\/png/),
      ]);
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

    // A lock of 3 bolts, 2 of them drawn back, as the view writes its look.
    it("stamps a lock's tile and its slots, its bolts by the look the view gives it", async () => {
      const wall = wallFrom(["o..z....."], WALL_LEGEND, { lowestRow: 3 });
      const bricks = wall.bricks.map((brick) =>
        brick?.kind === "lock"
          ? { ...brick, tint: lockTint(brick.tint, 2) }
          : brick,
      );
      const { shell } = await startBoard((each) => {
        each.round = viewOf({ ...wall, bricks });
      });

      expect(framesAt(metricsAt(), shell.fieldShape.depth, 3, 3)).toEqual([
        FRAMES.tile(TINT.violet),
        FRAMES.lock("3-1"),
      ]);
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

  describe("the rally", () => {
    /** Returns where each digit of a rally of some digits stands on the canvas, about the rally's middle, on whole pixels. */
    function digitsAt(
      length: 1 | 2 | 3 | 4,
      metrics: FieldMetrics = metricsAt(),
    ): { x: number; y: number }[] {
      return Array.from({ length }, (_, at) => {
        const { x, y } = toCanvas(
          metrics,
          RALLY_PLACE.x + digitAcross(length, at),
          RALLY_PLACE.y,
        );
        return { x: Math.round(x), y: Math.round(y) };
      });
    }

    it("hides while the fuzzball has struck nothing", async () => {
      const { scene } = await startBoard();

      expect(shownOf(scene.rally.digits)).toEqual([]);
    });

    it("writes the rally under the danger line, where the view places it, a digit's room apart, on whole pixels", async () => {
      const { scene, shell, run } = await startBoard();

      shell.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 15 }) });
      run.advance(16);

      const [tens, ones] = digitsAt(2);
      expect(shownOf(scene.rally.digits)).toEqual([
        { frame: RALLY_FRAMES.digit(1), ...tens },
        { frame: RALLY_FRAMES.digit(5), ...ones },
      ]);
    });

    it("writes a rally that takes more digits about the same middle as it climbs", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 99 }) });
      });

      shell.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 100 }) });
      run.advance(16);

      const [hundreds, tens, ones] = digitsAt(3);
      expect(shownOf(scene.rally.digits)).toEqual([
        { frame: RALLY_FRAMES.digit(1), ...hundreds },
        { frame: RALLY_FRAMES.digit(0), ...tens },
        { frame: RALLY_FRAMES.digit(0), ...ones },
      ]);
    });

    it("stays where it stands as the fuzzball flies on and strikes again", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 3 }) });
      });

      shell.show({ ball: ballAt(7, { y: 8, dx: -1, dy: 1, rally: 4 }) });
      run.advance(16);

      expect(shownOf(scene.rally.digits)).toEqual([
        { frame: RALLY_FRAMES.digit(4), ...digitsAt(1)[0] },
      ]);
    });

    it("hides as the fuzzball lands and waits", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 12 }) });
      });

      shell.show({ ball: ballAt(5) });
      run.advance(16);

      expect(shownOf(scene.rally.digits)).toEqual([]);
    });

    it("moves with the field as the canvas changes size in flight, its shape kept till the round ends", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 7 }) });
      });

      run.game.scale.resize(600, 500);
      run.advance(16);

      const metrics = fieldMetrics(
        viewport(600, 500, 1, INSETS),
        shell.fieldShape,
      );
      expect(shownOf(scene.rally.digits)).toEqual([
        { frame: RALLY_FRAMES.digit(7), ...digitsAt(1, metrics)[0] },
      ]);
    });

    it("shows at the palette's strength, again as the palette changes", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 21 }) });
      });
      const strengths = (): number[] =>
        scene.rally.digits
          .filter((digit) => digit.visible)
          .map((digit) => digit.alpha);
      const light = strengths();

      shell.colors = DARK;
      run.advance(16);

      expect({ light, dark: strengths() }).toEqual({
        light: [LIGHT.rally.alpha, LIGHT.rally.alpha],
        dark: [DARK.rally.alpha, DARK.rally.alpha],
      });
    });

    it("scales its digits up from the atlas where the field's unit is past the most it bakes at", async () => {
      const canvas = { width: 1600, height: 2400 };
      const { scene, shell, run } = await startBoard(undefined, canvas);
      const metrics = metricsAt(canvas.width, canvas.height);

      shell.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 2 }) });
      run.advance(16);

      expect({
        past: metrics.unit > bakedScaleOf(metrics).unit,
        scale: scene.rally.digits[0]?.scale,
      }).toEqual({
        past: true,
        scale: metrics.unit / bakedScaleOf(metrics).unit,
      });
    });

    it("draws over the field and under the springs, the wall, the guide and the fuzzball, so all that plays passes over it", async () => {
      const { scene } = await startBoard();
      const rally = layerPlaceOf(scene, firstOf(scene.rally.digits));

      expect({
        overField: rally > layerPlaceOf(scene, scene.field.ground),
        underSprings:
          rally < layerPlaceOf(scene, firstOf(scene.springs.springs)),
        underWall: rally < layerPlaceOf(scene, scene.wall.image),
        underGuide: rally < layerPlaceOf(scene, firstOf(scene.guide.dots)),
        underFuzzball: rally < layerPlaceOf(scene, scene.balls.body),
      }).toEqual({
        overField: true,
        underSprings: true,
        underWall: true,
        underGuide: true,
        underFuzzball: true,
      });
    });
  });

  describe("the guide", () => {
    /** The plain round's flight, which turns twice, strikes a tough brick and lands, as the guide of its shot. */
    const GUIDE = castOf(PLAIN.round.flight);

    /** The hot shot's flight, which turns five times, as the guide of its shot casts it, stopped past its third turn. */
    const FADING = castOf(FLIGHT_FIXTURES.hot.round.flight);

    it("shows nothing while no guide shows", async () => {
      const { scene } = await startBoard();

      expect(
        shownOf([
          ...scene.guide.dots,
          ...scene.guide.rings,
          ...scene.guide.marks,
        ]),
      ).toEqual([]);
    });

    it("lays a dot about each of the guide's places, on whole pixels, as strongly as each shows, fading past its last turn", async () => {
      const { scene, shell, run } = await startBoard();
      const metrics = metricsAt();
      const { dots } = wallGuideOf(FADING, FLIGHT_RULES);

      shell.guideFlight = FADING;
      run.advance(16);

      expect(
        scene.guide.dots.slice(0, dots.length).map((dot) => ({
          x: Math.round(dot.x),
          y: Math.round(dot.y),
          alpha: dot.alpha,
        })),
      ).toEqual(
        dots.map(({ x, y, alpha }) => {
          const place = toCanvas(metrics, x, y);
          return {
            x: Math.round(place.x),
            y: Math.round(place.y),
            alpha: alpha ?? 1,
          };
        }),
      );
    });

    it("hides the dots past the guide's last", async () => {
      const { scene, shell, run } = await startBoard();
      const { dots } = wallGuideOf(GUIDE, FLIGHT_RULES);

      shell.guideFlight = GUIDE;
      run.advance(16);

      expect(shownOf(scene.guide.dots.slice(dots.length))).toEqual([]);
    });

    it("rings each of its turns", async () => {
      const { scene, shell, run } = await startBoard();
      const metrics = metricsAt();
      const { turns } = wallGuideOf(GUIDE, FLIGHT_RULES);

      shell.guideFlight = GUIDE;
      run.advance(16);

      expect(shownOf(scene.guide.rings)).toEqual(
        turns.map(({ x, y }) => ({
          frame: FRAMES.guideRing,
          ...toCanvas(metrics, x, y),
        })),
      );
    });

    it("marks each brick the shot strikes, about its cell's middle", async () => {
      const { scene, shell, run } = await startBoard();
      const metrics = metricsAt();
      const { wall } = PLAIN.start;
      const { struck } = wallGuideOf(GUIDE, FLIGHT_RULES);

      shell.guideFlight = GUIDE;
      run.advance(16);

      expect(shownOf(scene.guide.marks)).toEqual(
        struck.map((cell) => ({
          frame: GUIDE_FRAMES.struck,
          ...toCanvas(
            metrics,
            columnOf(cell) + 0.5,
            fieldRowOf(wall, cell) + 0.5,
          ),
        })),
      );
    });

    it("follows the guide as it is cast again", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.guideFlight = GUIDE;
      });
      shell.guideFlight = FADING;
      run.advance(16);

      expect(shownOf(scene.guide.rings)).toHaveLength(
        wallGuideOf(FADING, FLIGHT_RULES).turns.length,
      );
    });

    it("draws the guide again as the rules are retuned, and it is cast again by them", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.guideFlight = FADING;
      });
      const retuned = { ...FLIGHT_RULES, guidePast: 3 };
      const recast = castOf(FLIGHT_FIXTURES.hot.round.flight, retuned);
      const { dots } = wallGuideOf(recast, retuned);

      shell.flightRules = retuned;
      shell.guideFlight = recast;
      run.advance(16);

      expect(
        scene.guide.dots.slice(0, dots.length).map((dot) => dot.alpha),
      ).toEqual(dots.map(({ alpha }) => alpha ?? 1));
    });

    it("hides as the guide goes, as it does once the shot flies", async () => {
      const { scene, shell, run } = await startBoard((each) => {
        each.guideFlight = GUIDE;
      });

      shell.guideFlight = null;
      run.advance(16);

      expect(
        shownOf([
          ...scene.guide.dots,
          ...scene.guide.rings,
          ...scene.guide.marks,
        ]),
      ).toEqual([]);
    });

    it("lies over the wall's lines and under the jump line's count and the fuzzball", async () => {
      const { scene } = await startBoard();
      const guide = layerPlaceOf(scene, firstOf(scene.guide.dots));

      expect({
        overLines: guide > layerPlaceOf(scene, scene.field.strips.jump),
        underCount: guide < layerPlaceOf(scene, firstOf(scene.field.countDots)),
        underFuzzball: guide < layerPlaceOf(scene, scene.balls.body),
      }).toEqual({ overLines: true, underCount: true, underFuzzball: true });
    });
  });

  describe("the flourishes", () => {
    /** The plain round's tough brick, in field row 5 and column 8, as a wall cell. */
    const TOUGH = 8;

    /** Runs the scene with the view's logs of events and beats, which the specs write to. */
    async function startPlaying(
      setUp: (shell: FakeShell) => void = () => undefined,
    ): Promise<
      Board & {
        events: EventLog<LoggedEvent>;
        beats: EventLog<LoggedBeat>;
      }
    > {
      const events = eventLog();
      const beats = beatLog();
      const board = await startBoard((shell) => {
        shell.show({ events, beats });
        setUp(shell);
      });
      return { ...board, events, beats };
    }

    /** The ramp round's wall, with a ramp in field row 5 and column 4. */
    const RAMPS = FLIGHT_FIXTURES.ramp.start.wall;

    /** Logs the fuzzball turning off the ramp round's ramp, which flashes. */
    function logRampFlash(events: EventLog<LoggedEvent>): void {
      logEvent(events, turnAt(3.75, 4.75, "brick"), {
        kind: "flash",
        cell: cellAt(RAMPS, 4, 5),
      });
    }

    /** Logs the fuzzball turning off the tough brick's plated face, which throws a spark. */
    function logSpark(events: EventLog<LoggedEvent>): void {
      logEvent(events, turnAt(6.25, 4.75, "brick"));
      logEvent(
        events,
        { kind: "shielded", at: 1, cell: TOUGH, by: "plate" },
        { kind: "spark", cell: TOUGH },
      );
    }

    /** Logs the fuzzball passing from a portal in the corner cell to its twin in the tough brick's, each of which swirls. */
    function logTeleport(events: EventLog<LoggedEvent>): void {
      logEvent(
        events,
        { kind: "teleport", at: 1, from: 0, to: 8 },
        { kind: "draw-in", cell: 0 },
        { kind: "let-out", cell: TOUGH },
      );
    }

    /** Logs the fuzzball turning off the floor and spending the floor bounce it held, which kicks its spring. */
    function logKick(events: EventLog<LoggedEvent>): void {
      logEvent(events, turnAt(2, RADIUS));
      logEvent(
        events,
        { kind: "bounce-spent", at: 1, held: 0 },
        { kind: "kick" },
      );
    }

    it("swells a struck brick that holds, in its cell", async () => {
      const { scene, events, run } = await startPlaying();

      logEvent(
        events,
        { kind: "strike", at: 1, cell: TOUGH, took: 1, broke: false, rally: 1 },
        { kind: "swell", cell: TOUGH },
      );
      run.advance(16);

      expect(scene.wall.swellings.map(({ cell }) => cell)).toContain(
        5 * COLUMNS + 8,
      );
    });

    it("bursts a broken brick into shards of its color", async () => {
      const { scene, events, run } = await startPlaying();
      const brick = brickIn(PLAIN.start.wall, TOUGH);
      const tints = new Set<number>();

      logEvent(
        events,
        { kind: "strike", at: 1, cell: TOUGH, took: 2, broke: true, rally: 1 },
        { kind: "shards", cell: TOUGH },
      );
      run.advance(16);

      scene.effects.shards.forEachAlive((shard) => tints.add(shard.tint), null);
      expect([...tints]).toEqual([brickColor(brick, LIGHT)]);
    });

    it("flashes a ramp along its long face, across its cell", async () => {
      const { scene, events, run } = await startPlaying((shell) => {
        shell.show({ wall: RAMPS });
      });

      logRampFlash(events);
      run.advance(16);

      const shown = scene.effects.ramps.flashes.all.filter(
        ({ strip }) => strip.visible,
      );
      expect(
        shown.map(({ strip }) => ({
          x: strip.x,
          y: strip.y,
          angle: billionths(strip.rotation),
          color: strip.fillColor,
        })),
      ).toEqual([
        {
          ...toCanvas(metricsAt(), 4.5, 5.5),
          angle: billionths(Math.PI / 4),
          color: LIGHT.spark,
        },
      ]);
    });

    it("throws a spark from where a shielding face turned the fuzzball", async () => {
      const { scene, events, run } = await startPlaying();

      logSpark(events);
      run.advance(16);

      expect(burstsShown(scene.effects.sparks.all)).toEqual([
        toCanvas(metricsAt(), 6.25, 4.75),
      ]);
    });

    it("swirls a portal as it draws the fuzzball in, and its twin as it lets it out", async () => {
      const { scene, events, run } = await startPlaying();
      const metrics = metricsAt();

      logTeleport(events);
      run.advance(16);

      expect(burstsShown(scene.effects.swirls.all)).toEqual([
        toCanvas(metrics, 0.5, 5.5),
        toCanvas(metrics, 8.5, 5.5),
      ]);
    });

    it("shrinks the swirl drawing the fuzzball in from its widest, and spreads its twin's from nothing", async () => {
      const { scene, events, run } = await startPlaying();
      const metrics = metricsAt();

      logTeleport(events);
      run.advance(16);

      expect(
        scene.effects.swirls.all.slice(0, 2).map(({ image }) => image.scaleX),
      ).toEqual([metrics.unit / bakedScaleOf(metrics).unit, 0]);
    });

    it("spreads a ring from the fuzzball as its fur lifts", async () => {
      const { scene, shell, events, run } = await startPlaying();
      shell.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 1, rally: 10 }) });

      logEvent(
        events,
        {
          kind: "strike",
          at: 1,
          cell: TOUGH,
          took: 1,
          broke: false,
          rally: 10,
        },
        { kind: "ring" },
      );
      run.advance(16);

      expect(burstsShown(scene.effects.rings.all)).toEqual([
        toCanvas(metricsAt(), 3, 4),
      ]);
    });

    it("kicks the spent floor bounce's spring, squashing it on its foot, and puffs where the fuzzball turned off the floor", async () => {
      const { scene, shell, events, run } = await startPlaying((each) => {
        each.show({ held: 1 });
      });
      const spring = firstOf(scene.springs.springs);
      const height = spring.displayHeight;
      shell.show({ held: 0 });

      logKick(events);
      run.advance(16);

      expect({
        squashed: spring.displayHeight < height,
        puffs: burstsShown(scene.effects.puffs.all),
      }).toEqual({ squashed: true, puffs: [toCanvas(metricsAt(), 2, RADIUS)] });
    });

    it("stands the kicked spring back at its height once its kick is over", async () => {
      const { scene, events, run } = await startPlaying((each) => {
        each.show({ held: 1 });
      });
      const spring = firstOf(scene.springs.springs);
      const height = spring.displayHeight;

      logKick(events);
      run.advance(16);
      run.advance(400);

      expect(spring.displayHeight).toBe(height);
    });

    it("streaks the fuzzball dashing home from its last strike, behind it, the way it flies", async () => {
      const { scene, shell, events, run } = await startPlaying();
      const ball = ballAt(3, { y: 4, dx: 0, dy: 2 });
      shell.show({ ball });

      logEvent(
        events,
        { kind: "strike", at: 1, cell: TOUGH, took: 1, broke: false, rally: 1 },
        { kind: "streak" },
      );
      run.advance(16);

      const { streak } = scene.balls;
      expect({
        shows: streak.visible,
        frame: streak.frame.name,
        ...placeInBillionths(streak),
        angle: billionths(streak.rotation),
      }).toEqual({
        shows: true,
        frame: EFFECT_FRAMES.streak,
        ...placeInBillionths(toCanvas(metricsAt(), 3, 4 - STREAK / 2)),
        angle: billionths(-Math.PI / 2),
      });
    });

    it("streaks a hot shot in its own color", async () => {
      const { scene, shell, events, run } = await startPlaying();
      shell.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 2, hot: true }) });

      logEvent(
        events,
        { kind: "strike", at: 1, cell: TOUGH, took: 1, broke: false, rally: 1 },
        { kind: "streak" },
      );
      run.advance(16);

      expect(scene.balls.streak.frame.name).toBe(EFFECT_FRAMES.hotStreak);
    });

    it("ends the streak as the fuzzball lands", async () => {
      const { scene, shell, events, run } = await startPlaying((each) => {
        each.show({ ball: ballAt(3, { y: 4, dx: 1, dy: 2 }) });
      });
      logEvent(
        events,
        { kind: "strike", at: 1, cell: TOUGH, took: 1, broke: false, rally: 1 },
        { kind: "streak" },
      );
      run.advance(16);

      shell.show({ ball: ballAt(5) });
      run.advance(16);

      expect(scene.balls.streak.visible).toBe(false);
    });

    it.each<[string, Wall, (events: EventLog<LoggedEvent>) => void, number]>([
      ["a ramp's flash", RAMPS, logRampFlash, RAMP_FLASH_MS],
      ["a spark", PLAIN.start.wall, logSpark, SPARK_MS],
      ["a portal's swirls", PLAIN.start.wall, logTeleport, PORTAL_MS],
      ["a floor bounce's puff", PLAIN.start.wall, logKick, KICK_MS],
    ])("ends %s once its own time is over", async (_, wall, log, ms) => {
      const { scene, events, run } = await startPlaying((shell) => {
        shell.show({ wall });
      });

      log(events);
      run.advance(ms + 32, 16);

      expect({
        bursts: burstsShown([
          ...scene.effects.sparks.all,
          ...scene.effects.swirls.all,
          ...scene.effects.puffs.all,
        ]),
        ramps: scene.effects.ramps.flashes.all.filter(
          ({ strip }) => strip.visible,
        ),
      }).toEqual({ bursts: [], ramps: [] });
    });

    it("flashes the jump line and flares the waiting fuzzball into a hot shot as the wall jumps", async () => {
      const { scene, beats, run } = await startPlaying();
      run.advance(16);
      const scale = scene.balls.body.scaleX;

      logBeat(beats, "jump");
      run.advance(16);

      expect({
        flash: scene.effects.flash.visible,
        flared: scene.balls.body.scaleX < scale,
      }).toEqual({ flash: true, flared: true });
    });

    it("shakes the field as a level is lost", async () => {
      const { scene, beats, run } = await startPlaying();
      const camera = scene.cameras.main;
      const rest = { x: camera.x, y: camera.y };

      logBeat(beats, "lost");
      run.advance(16);
      run.advance(16);

      expect({ x: camera.x, y: camera.y }).not.toEqual(rest);
    });

    it("plays nothing for a hatch's dip, the hatches' swing or a lock's slide, as the painter moves no brick it bakes", async () => {
      const { scene, events, run } = await startPlaying();

      logEvent(
        events,
        { kind: "hold", at: 1, cell: TOUGH, left: 2 },
        {
          kind: "dip",
          cell: TOUGH,
        },
      );
      logEvent(events, { kind: "hatches-open", at: 1 }, { kind: "swing" });
      logEvent(events, { kind: "bolt", at: 1, drawn: 1 }, { kind: "slide" });
      run.advance(16);

      expect({
        bursts: burstsShown([
          ...scene.effects.sparks.all,
          ...scene.effects.swirls.all,
          ...scene.effects.puffs.all,
          ...scene.effects.rings.all,
        ]),
        swelling: scene.wall.swellings.filter(({ cell }) => cell >= 0),
        shards: scene.effects.shards.getAliveParticleCount(),
        ramps: scene.effects.ramps.flashes.all.filter(
          ({ strip }) => strip.visible,
        ),
      }).toEqual({ bursts: [], swelling: [], shards: 0, ramps: [] });
    });

    it("plays no flourish where motion isn't welcome", async () => {
      const { scene, events, run } = await startPlaying((each) => {
        each.welcomesMotion = false;
      });

      logEvent(
        events,
        { kind: "strike", at: 1, cell: TOUGH, took: 2, broke: true, rally: 1 },
        { kind: "shards", cell: TOUGH },
      );
      run.advance(16);

      expect(scene.effects.shards.getAliveParticleCount()).toBe(0);
    });

    it("swirls a portal it draws the fuzzball into in its first frame, before it has drawn a wall, where the wall the frame began on stands it", async () => {
      const events = eventLog();

      const { scene } = await startBoard((shell) => {
        shell.show({ events });
        shell.inFirstTick = () => {
          logTeleport(events);
        };
      });

      const metrics = metricsAt();
      expect(burstsShown(scene.effects.swirls.all)).toEqual([
        toCanvas(metrics, 0.5, 5.5),
        toCanvas(metrics, 8.5, 5.5),
      ]);
    });

    it("bursts a brick broken in its first frame, before it has drawn a wall, into shards of its color, though the view's wall has lost it", async () => {
      const events = eventLog();
      const brick = brickIn(PLAIN.start.wall, TOUGH);
      const tints = new Set<number>();

      const { scene } = await startBoard((shell) => {
        shell.show({ events });
        shell.inFirstTick = () => {
          logEvent(
            events,
            {
              kind: "strike",
              at: 1,
              cell: TOUGH,
              took: 2,
              broke: true,
              rally: 1,
            },
            { kind: "shards", cell: TOUGH },
          );
          shell.show({ wall: withoutBrick(PLAIN.start.wall, TOUGH) });
        };
      });

      scene.effects.shards.forEachAlive((shard) => tints.add(shard.tint), null);
      expect([...tints]).toEqual([brickColor(brick, LIGHT)]);
    });

    it("flashes a ramp of a wall the shell showed since the last frame, as a level begun afresh between frames shows one", async () => {
      const { scene, events, run, shell } = await startPlaying();

      shell.show({ wall: RAMPS });
      logRampFlash(events);
      run.advance(16);

      expect(
        scene.effects.ramps.flashes.all.filter(({ strip }) => strip.visible),
      ).toHaveLength(1);
    });

    it("bursts no shards of a brick broken before the frame began, as a bug report's round flown on to its moment between frames leaves it", async () => {
      const { scene, events, run, shell } = await startPlaying();

      shell.show({ wall: withoutBrick(PLAIN.start.wall, TOUGH) });
      logEvent(
        events,
        { kind: "strike", at: 1, cell: TOUGH, took: 2, broke: true, rally: 1 },
        { kind: "shards", cell: TOUGH },
      );
      run.advance(16);

      expect(scene.effects.shards.getAliveParticleCount()).toBe(0);
    });

    it("flashes no ramp sunk as the wall came down to the floor, as a bug report's round flown to its end between frames leaves it", async () => {
      const { scene, events, run, shell } = await startPlaying((each) => {
        each.show({ wall: RAMPS });
      });
      const sunk: Wall = {
        ...withoutBrick(RAMPS, cellAt(RAMPS, 4, 5)),
        lowestRow: RAMPS.lowestRow - 5,
      };

      shell.show({ wall: sunk });
      logRampFlash(events);
      run.advance(16);

      expect(
        scene.effects.ramps.flashes.all.filter(({ strip }) => strip.visible),
      ).toHaveLength(0);
    });

    it("leaves unplayed what the view's log held before the scene met it", async () => {
      const events = eventLog();
      logEvent(
        events,
        { kind: "strike", at: 1, cell: TOUGH, took: 2, broke: true, rally: 1 },
        { kind: "shards", cell: TOUGH },
      );
      const { scene, run } = await startBoard((shell) => {
        shell.show({ events });
      });

      run.advance(16);

      expect(scene.effects.shards.getAliveParticleCount()).toBe(0);
    });
  });

  describe("the sounds", () => {
    /** A strike of the plain round's tough brick. */
    const STRIKE: FlightEvent = {
      kind: "strike",
      at: 1,
      cell: 8,
      took: 1,
      broke: false,
      rally: 1,
    };

    /** Runs the scene with the view's logs of events and beats, and spies on the sounds it plays from the next frame. */
    async function startHearing(
      setUp: (shell: FakeShell) => void = () => undefined,
    ): Promise<
      Board & {
        events: EventLog<LoggedEvent>;
        beats: EventLog<LoggedBeat>;
        played: MockInstance<(name: SoundName, detune: number) => void>;
      }
    > {
      const events = eventLog();
      const beats = beatLog();
      const board = await startBoard((shell) => {
        shell.show({ events, beats });
        setUp(shell);
      });
      const played = vi.spyOn(board.scene.sounds, "playRisen");
      return { ...board, events, beats, played };
    }

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
      const { run, scene } = await startBoard();

      expect({ loaded: scene.sounds.loaded, ready: run.ready }).toEqual({
        loaded: false,
        ready: true,
      });
    });

    it("play each sound the frame's events call for once, at the most it rose, in the sprite's order", async () => {
      const { events, run, played } = await startHearing();

      logSounds(events, STRIKE, { sound: "strike", detune: 500 });
      logSounds(events, STRIKE, { sound: "strike", detune: 300 });
      logSounds(events, turnAt(0.5, 3), { sound: "knock", detune: 0 });
      run.advance(16);

      expect(played.mock.calls).toEqual([
        ["knock", 0],
        ["strike", 500],
      ]);
    });

    it("reach the sprite, each risen as it calls for", async () => {
      const { scene, events, run } = await startHearing();
      cacheSounds(scene, SOUNDS_KEY);
      const play = vi.spyOn(Sound.NoAudioSound.prototype, "play");

      logSounds(events, STRIKE, { sound: "strike", detune: 300 });
      run.advance(16);

      expect(play.mock.calls).toEqual([["strike", { detune: 300 }]]);
    });

    it("play each sound a beat calls for", async () => {
      const { beats, run, played } = await startHearing();

      logBeat(beats, "cleared");
      logBeat(beats, "release");
      run.advance(16);

      expect(played.mock.calls).toEqual([
        ["release", 0],
        ["chime", 0],
      ]);
    });

    it("play where motion isn't welcome", async () => {
      const { events, beats, run, played } = await startHearing((each) => {
        each.welcomesMotion = false;
      });

      logSounds(events, turnAt(0.5, 3), { sound: "knock", detune: 0 });
      logBeat(beats, "lost");
      run.advance(16);

      expect(played.mock.calls).toEqual([
        ["knock", 0],
        ["lost", 0],
      ]);
    });

    it("play once each, not again in the frames after", async () => {
      const { beats, run, played } = await startHearing();

      logBeat(beats, "step");
      run.advance(48, 16);

      expect(played.mock.calls).toEqual([["step", 0]]);
    });

    it("leave unplayed what the view's logs held before the scene met them", async () => {
      const events = eventLog();
      logSounds(events, STRIKE, { sound: "strike", detune: 0 });
      const { run, scene } = await startBoard((shell) => {
        shell.show({ events });
      });
      const played = vi.spyOn(scene.sounds, "playRisen");

      run.advance(16);

      expect(played).not.toHaveBeenCalled();
    });
  });

  describe("drawing", () => {
    it("holds as many of each pool as may show at once", async () => {
      const { scene } = await startBoard();

      expect({
        sparks: scene.effects.sparks.all.length,
        swirls: scene.effects.swirls.all.length,
        puffs: scene.effects.puffs.all.length,
        dots: scene.guide.dots.length,
        rings: scene.guide.rings.length,
        marks: scene.guide.marks.length,
        springs: scene.springs.springs.length,
      }).toEqual({
        sparks: MOST_SPARKS,
        swirls: MOST_SWIRLS,
        puffs: MOST_PUFFS,
        dots: MOST_GUIDE_DOTS,
        rings: MOST_GUIDE_RINGS,
        marks: MOST_STRUCK,
        springs: FLIGHT_RULES.mostBounces,
      });
    });

    it("makes no game object after the first frame, through a new palette, the guide cast and retuned, and a new layout", async () => {
      const board = await startBoard();
      const first = objectsIn(board.scene);

      board.shell.colors = DARK;
      board.shell.guideFlight = castOf(PLAIN.round.flight);
      board.run.advance(16);
      board.shell.flightRules = { ...FLIGHT_RULES, guideTurns: 1 };
      resizeTo(board, 600, 500);

      expect(objectsIn(board.scene)).toBe(first);
    });

    it.each(Object.entries(FLIGHT_FIXTURES))(
      "makes no game object, and starts no more of a flourish within its time than its pool holds, through the %s round's flight, its wall coming down and its rest",
      async (_, fixture) => {
        const { shell, run, scene } = await startBoard();
        const play = shell.aim(fixture);
        run.advance(16);
        const { effects } = scene;
        const before = objectsIn(scene);
        const shards = effects.shards.getParticleCount();
        const sparks = vi.spyOn(effects, "spark");
        const swirls = vi.spyOn(effects, "swirl");
        const puffs = vi.spyOn(effects, "puff");
        const ramps = vi.spyOn(effects, "flashRamp");
        const rings = vi.spyOn(effects, "ring");

        play.release(fixture.round, RALLY_MARK);
        run.advance(600 * 16, 16);

        expect({
          objects: objectsIn(scene),
          shards: effects.shards.getParticleCount(),
          phase: play.phase,
          rested: play.view.wall,
          sparks:
            mostAtOnce(
              sparks.mock.calls.map(([, , now]) => now),
              SPARK_MS,
            ) <= MOST_SPARKS,
          swirls:
            mostAtOnce(
              swirls.mock.calls.map(([, , , now]) => now),
              PORTAL_MS,
            ) <= MOST_SWIRLS,
          puffs:
            mostAtOnce(
              puffs.mock.calls.map(([, , now]) => now),
              KICK_MS,
            ) <= MOST_PUFFS,
          ramps:
            mostAtOnce(
              ramps.mock.calls.map(([, , now]) => now),
              RAMP_FLASH_MS,
            ) <= MOST_FLASHES,
          rings:
            mostAtOnce(
              rings.mock.calls.map(([, , now]) => now),
              RING_MS,
            ) <= MOST_RINGS,
        }).toEqual({
          objects: before,
          shards,
          phase: "settling",
          rested: fixture.round.next.wall,
          sparks: true,
          swirls: true,
          puffs: true,
          ramps: true,
          rings: true,
        });
      },
    );

    it("bursts a brick the round's flight breaks into shards of its color, as the play hands on its next copy of the wall", async () => {
      const { shell, run, scene } = await startBoard();
      const fixture = FLIGHT_FIXTURES.jumped;
      const play = shell.aim(fixture);
      run.advance(16);
      const brick = brickIn(
        fixture.start.wall,
        cellAt(fixture.start.wall, 8, 5),
      );
      const shatter = vi.spyOn(scene.effects, "shatter");

      play.release(fixture.round, RALLY_MARK);
      run.advance(600 * 16, 16);

      expect(shatter.mock.calls.map(([, , color]) => color)).toEqual([
        brickColor(brick, LIGHT),
      ]);
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
