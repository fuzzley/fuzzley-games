import { lerp } from "@fz/core/math";
import type { Turns } from "@fz/core/turns";
import { cssHex } from "@fz/phaser/color";
import { FUZZBALL_LOOK } from "@fz/phaser/fuzzball";
import { NO_INSETS } from "@fz/phaser/insets";
import { SpritePlayer } from "@fz/phaser/sound";
import { atlasFrameOf } from "@fz/phaser/scene";
import {
  type GraphicsCommand,
  type SceneRun,
  colorsOf,
  commandsOf,
  imagesIn,
  objectsIn,
  runKeyedScene,
  strokesOf,
} from "@fz/phaser/testing";
import { Core, type Game, GameObjects, Textures } from "phaser";
import { hitBrick } from "../rules/bricks/bricks";
import { catchCapsule } from "../rules/bricks/capsules";
import type { Place } from "../rules/levels/levels";
import type { Ball } from "../rules/paddle/balls";
import { reshapeField } from "../rules/field/field";
import { cellIndex, cellMiddleX, cellMiddleY } from "../rules/grid";
import { type Steer, paddleTopOf } from "../rules/paddle/paddle";
import { stepsIn } from "../rules/stepper";
import {
  BALL_RADIUS,
  BOLT_INSET,
  BRICKS_TOP,
  COLUMNS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  MAX_BALLS,
  NET_DEPTH,
  PADDLE_HEIGHT,
  PADDLE_TOP,
  ROWS,
  SLIDER_BEAT_MS,
  TALLEST_FIELD,
} from "../rules/tuning";
import {
  ballOf,
  brickAt,
  eventsOf,
  fieldFrom,
  playWithoutBall,
  stepTimes,
  throwBall,
} from "../testing/field_picture";
import {
  FRAMES,
  PICTURE_FRAMES,
  type Pictures,
  atlasFrames,
  ballFrame,
  ballGrid,
  capsuleFrame,
  facedBallFrame,
  tagFrame,
} from "../view/art/art";
import { brickColor, brickFrame, regrowingFrame } from "../view/art/brick_art";
import { PADDLE_FRAMES, hookCount, paddleShape } from "../view/art/paddle_art";
import type { FieldCommand } from "../view/steering/controls";
import {
  type FieldMetrics,
  fieldMetrics,
  toCanvasX,
  toCanvasY,
  toFieldX,
} from "../view/field/field_metrics";
import { SOUNDS } from "../view/effects/effects";
import {
  DEEPEST_SQUASH,
  DROP_IN_HEIGHT,
  dropInHeight,
  shardTint,
} from "../view/effects/flourish";
import { STREAK_STEPS } from "../view/effects/streak";
import { TAIL_GAP, TAIL_MOST } from "../view/effects/tail";
import type { FieldFrame } from "../view/field/frame";
import { type BricksPalette, bricksPalette } from "../view/colors/palette";
import { rimWidth } from "../view/field/rim";
import {
  PLACE_ART,
  fieldInks,
  placeTile,
  tileSide,
} from "../view/places/places";
import type { TouchSteering } from "../view/steering/steering";
import { TAG_SPACING, firstTagX, tagY } from "../view/field/tags";
import {
  DROP_IN_MS,
  FADE_MS,
  GLOW_AFTER_MS,
  GLOW_PULSE_MS,
  HOLD_MS,
  MEET_MS,
  POP_MS,
  REGROW_MS,
  RING_MS,
  SHARDS,
  SHARDS_MS,
  SLIDE_MS,
  STREAK_MS,
} from "../view/effects/timing";
import { ATLAS } from "./atlas";
import spritemap from "./sounds/sounds.json";
import {
  type BricksScene,
  type BricksSceneOptions,
  makeBricksScene,
} from "./bricks_scene";
import type { Burst } from "./painters/effects_painter";
import { PLACE_TEXTURE } from "./painters/place_painter";

const LIGHT = bricksPalette(
  {
    panel: "#f1f3f5",
    text: "#1b1f24",
    accent: "#2f7d4f",
    danger: "#c62828",
    warning: "#a84b06",
  },
  "light",
);

const DARK = bricksPalette(
  {
    panel: "#1c2329",
    text: "#eceff1",
    accent: "#e0b13a",
    danger: "#f47c74",
    warning: "#f39a4b",
  },
  "dark",
);

/** The field the scenes start on: a plain brick and a tough one, top left. */
const ROWS_DRAWN = ["o3"];

/** What the scene handed the shell on a frame. */
interface Tick {
  readonly deltaMs: number;
  readonly steer: Steer;
}

/** Plays the shell's part, keeping what the scene tells it. */
class FakeShell implements BricksSceneOptions {
  /** The field shown, which a spec may change as the rules would. */
  field = fieldFrom(ROWS_DRAWN);
  alpha = 0;
  colors: BricksPalette = LIGHT;
  welcomesMotion = true;
  steering: TouchSteering = "drag";
  wantsSound = true;
  chimesCalled = 0;
  fingerSpace = 0;
  /** The place the level's set is in. */
  whereabouts: Place = "playroom";
  /** The height the shell makes the field as it ticks, as the game does when the board asks, or null. */
  heightAsked: number | null = null;
  readonly ticks: Tick[] = [];
  readonly layouts: FieldMetrics[] = [];
  readonly commands: FieldCommand[] = [];
  /**
   * What the scene handed over at each bake of the atlas to picture How to
   * play's art with, a bake each, the last bake's last.
   */
  readonly bakes: (() => Pictures)[] = [];

  readonly tick = (deltaMs: number, steer: Readonly<Steer>): void => {
    this.ticks.push({ deltaMs, steer: { ...steer } });
    if (this.heightAsked !== null) reshapeField(this.field, this.heightAsked);
  };
  readonly frame = (): FieldFrame => ({
    field: this.field,
    alpha: this.alpha,
    events: this.field.events,
  });
  readonly palette = (): BricksPalette => this.colors;
  readonly motion = (): boolean => this.welcomesMotion;
  readonly touch = (): TouchSteering => this.steering;
  readonly sound = (): boolean => this.wantsSound;
  readonly chimes = (): number => this.chimesCalled;
  readonly fingerRoom = (): number => this.fingerSpace;
  readonly onLayout = (metrics: FieldMetrics): void => {
    this.layouts.push(metrics);
  };
  readonly command = (command: FieldCommand): void => {
    this.commands.push(command);
  };
  readonly onPictures = (pictures: () => Pictures): void => {
    this.bakes.push(pictures);
  };
  readonly place = (): Place => this.whereabouts;

  /**
   * Asks the scene for How to play's pictures of the atlas as last baked, as
   * the board does as How to play opens.
   */
  askPictures(): Pictures {
    const pictures = this.bakes.at(-1);
    if (!pictures) throw new Error("No bake yet.");
    return pictures();
  }

  /** Shows a new field, as a new level does. */
  showField(rows: readonly string[]): void {
    this.field = fieldFrom(rows);
  }

  /** Returns the steering handed over on the last frame. */
  lastSteer(): Steer {
    const tick = this.ticks.at(-1);
    if (!tick) throw new Error("No frame yet.");
    return tick.steer;
  }
}

/** Sets a shell up for a player who prefers less motion. */
function stillness(shell: FakeShell): void {
  shell.welcomesMotion = false;
}

interface Board {
  readonly shell: FakeShell;
  readonly run: SceneRun<BricksScene>;
  readonly scene: BricksScene;
  /** The element Phaser's keyboard listens on. */
  readonly keys: HTMLElement;
}

/**
 * Runs the scene for a shell, its first frame drawn, in a game readied first
 * as a spec asks, till the case that runs it finishes.
 */
async function startBoard(
  setUp: (shell: FakeShell) => void = () => undefined,
  prepare: (game: Game) => void = () => undefined,
): Promise<Board> {
  const shell = new FakeShell();
  setUp(shell);
  const { run, keys } = await runKeyedScene(makeBricksScene(shell), {
    prepare,
  });
  run.advance(16);
  return { shell, run, scene: run.scene, keys };
}

/** Returns what a spec reads of an image: whether it shows, its frame and its place. */
function placed(image: GameObjects.Image | undefined): object {
  return {
    visible: image?.visible,
    frame: image?.frame.name,
    x: image?.x,
    y: image?.y,
  };
}

/** Describes a shard alive, as a spec reads it. */
interface Shard {
  readonly x: number;
  readonly y: number;
  /** How fast it falls. */
  readonly fall: number;
  readonly tint: number;
  readonly alpha: number;
  /** How much of its time is done, from 0 to 1, as its tint was last set. */
  readonly done: number;
}

/** Returns each shard alive, the oldest first, as Phaser keeps them in no such order. */
function shardsOf(scene: BricksScene): readonly Shard[] {
  const shards: Shard[] = [];
  scene.effects.shards.forEachAlive(
    ({ x, y, velocityY, tint, alpha, lifeT }) => {
      shards.push({ x, y, fall: velocityY, tint, alpha, done: lifeT });
    },
    null,
  );
  return shards.sort((a, b) => b.done - a.done);
}

/** Returns where each shard alive is, left to right and top to bottom. */
function shardPlacesOf(scene: BricksScene): { x: number; y: number }[] {
  return shardsOf(scene)
    .map(({ x, y }) => ({ x, y }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
}

/** Returns the tint each shard should have, dimmed from its brick's color toward a field's. */
function dimmedTints(
  shards: readonly Shard[],
  color: number,
  field: number,
): readonly number[] {
  return shards.map(({ done }) => shardTint(color, field, done));
}

/**
 * Moves a ball from where it is across to a place, drawing it at each of a
 * number of frames along the way, a frame's time apart.
 */
function moveAcross(
  run: SceneRun<BricksScene>,
  ball: Ball,
  to: number,
  frames: number,
  frameMs: number,
): void {
  const from = ball.x;
  for (let frame = 1; frame <= frames; frame++) {
    ball.x = from + ((to - from) * frame) / frames;
    ball.lastX = ball.x;
    run.advance(frameMs, frameMs);
  }
}

/** Returns the frames of the lost balls' fades that show. */
function fadingFrames(scene: BricksScene): readonly string[] {
  return imagesOf(scene.effects.fades)
    .filter((fade) => fade.visible)
    .map((fade) => fade.frame.name);
}

/** Returns the dots of the first ball's tail that show, nearest first. */
function tailDotsOf(scene: BricksScene): GameObjects.Image[] {
  return (scene.tails.byBall[0]?.dots ?? []).filter((dot) => dot.visible);
}

/**
 * Starts a board whose first ball flies across the field from 2 to 14 at
 * height 20, half a unit a frame, the field in a streak so long.
 */
async function flyAcross(
  streak: number,
  setUp?: (shell: FakeShell) => void,
): Promise<Board> {
  const board = await startBoard(setUp);
  const ball = throwBall(board.shell.field, 2, 20, 90);
  board.shell.field.streak = streak;
  moveAcross(board.run, ball, 14, 24, 16);
  return board;
}

/** Returns every count the streak's painter writes: each step's, then the mark's. */
function countsOf(scene: BricksScene): GameObjects.Text[] {
  return [...scene.streak.counts.values(), scene.streak.markCount];
}

/** Returns the count of a streak's step, or of its mark, that shows, if one does. */
function countShown(scene: BricksScene): GameObjects.Text | undefined {
  return countsOf(scene).find((count) => count.visible);
}

/** Returns what sets a shell's field up with a mark, the streak its third star asks for. */
function markedAt(mark: number): (shell: FakeShell) => void {
  return (shell) => {
    shell.field = fieldFrom(ROWS_DRAWN, { mark });
  };
}

/**
 * Starts a board with a ball in flight at (6, 12) and the field's streak one
 * short of a length, then breaks the plain brick there, taking the streak to
 * it.
 */
async function stepTo(
  streak: number,
  setUp?: (shell: FakeShell) => void,
): Promise<Board> {
  const board = await startBoard(setUp);
  const { field } = board.shell;
  throwBall(field, 6, 12, 0);
  field.streak = streak - 1;
  hitBrick(field, brickAt(field, 0, 0), 6, 12);
  board.run.advance(16);
  return board;
}

/** Breaks both of the spec's field's bricks, the last as the streak's second, which clears its level as the rules do. */
function clearLevel(shell: FakeShell): void {
  hitBrick(shell.field, brickAt(shell.field, 0, 0), 1, BRICKS_TOP + 1);
  hitBrick(
    shell.field,
    brickAt(shell.field, 1, 0),
    3,
    BRICKS_TOP + 1,
    "breaks",
  );
}

/**
 * Starts a board and has a ball fall onto the paddle's middle, stepped by
 * the rules till they record its meeting, then draws the frame that plays
 * it.
 */
async function meetPaddle(setUp?: (shell: FakeShell) => void): Promise<Board> {
  const board = await startBoard(setUp);
  const { field } = board.shell;
  throwBall(field, field.paddle.x, PADDLE_TOP - 1, 180);
  stepTimes(field, 12);
  if (!eventsOf(field).includes("paddle")) {
    throw new Error("The ball never met the paddle.");
  }
  board.run.advance(16);
  return board;
}

/** The cell of the bumper {@link turnOffBumper} turns a ball off. */
const BUMPER = cellIndex(6, 5);

/**
 * Starts a board and has a ball rise into a bumper, stepped by the rules
 * till they record its turn, then draws the frame that plays it.
 */
async function turnOffBumper(): Promise<Board> {
  const board = await startBoard((shell) => {
    shell.showField(["o", "", "", "", "", "......O"]);
  });
  const { field } = board.shell;
  throwBall(field, cellMiddleX(BUMPER), 10, 0);
  stepTimes(field, 15);
  if (!eventsOf(field).includes("bumped")) {
    throw new Error("The ball never met the bumper.");
  }
  board.run.advance(16);
  return board;
}

/** Sets a shell's paddle up to catch the balls it meets. */
function catching(shell: FakeShell): void {
  shell.field.mode = "catch";
}

/**
 * Returns how far above its place on the field a cell's brick is drawn, in
 * field units, on the spec's canvas or a layout given.
 */
function heightAbove(
  scene: BricksScene,
  cell: number,
  metrics = metricsAt(),
): number {
  const y = scene.bricks.images[cell]?.y ?? NaN;
  return (toCanvasY(metrics, cellMiddleY(cell)) - y) / metrics.unit;
}

/** Returns how far left of its place a cell's brick is drawn, in field units. */
function leftOfPlace(scene: BricksScene, cell: number): number {
  const metrics = metricsAt();
  const x = scene.bricks.images[cell]?.x ?? NaN;
  return (toCanvasX(metrics, cellMiddleX(cell)) - x) / metrics.unit;
}

/**
 * Runs the scene on a slider, landed, and steps the field to its beat, at
 * which the slider steps a cell right; the scene has drawn no frame since.
 */
async function stepSlider(
  setUp: (shell: FakeShell) => void = () => undefined,
): Promise<Board> {
  const board = await startBoard((shell) => {
    setUp(shell);
    shell.showField([">"]);
  });
  board.run.advance(DROP_IN_MS);
  stepTimes(playWithoutBall(board.shell.field), stepsIn(SLIDER_BEAT_MS));
  return board;
}

/** Returns how far above its place, and how faded, each of the spec's two bricks is drawn. */
function landed(scene: BricksScene): object {
  const cells = [cellIndex(0, 0), cellIndex(1, 0)];
  return {
    heights: cells.map((cell) => heightAbove(scene, cell)),
    alphas: cells.map((cell) => scene.bricks.images[cell]?.alpha),
  };
}

/** Returns how an image is scaled, across and down. */
function scaleOf(image: GameObjects.Image | undefined): readonly number[] {
  return [image?.scaleX ?? NaN, image?.scaleY ?? NaN];
}

/** The scale of a ball as it meets the paddle, wider and flatter, across and down. */
const SQUASHED = [DEEPEST_SQUASH.across, DEEPEST_SQUASH.down];

/** Describes a path a graphics fills: its color, and the box it spans. */
interface FilledPath {
  readonly color: number;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Returns each path a graphics fills, in turn, in the color it is filled in and the box it spans. */
function filledPaths(graphics: GameObjects.Graphics): readonly FilledPath[] {
  const paths: FilledPath[] = [];
  let color = 0;
  let xs: number[] = [];
  let ys: number[] = [];
  for (const command of commandsOf(graphics)) {
    if (command.kind === "fillStyle") color = command.color;
    if (command.kind === "beginPath") [xs, ys] = [[], []];
    if (command.kind === "moveTo" || command.kind === "lineTo") {
      xs.push(command.x);
      ys.push(command.y);
    }
    if (command.kind === "arc") {
      xs.push(command.x - command.radius, command.x + command.radius);
      ys.push(command.y - command.radius, command.y + command.radius);
    }
    if (command.kind === "fillPath") {
      paths.push({
        color,
        left: Math.min(...xs),
        top: Math.min(...ys),
        right: Math.max(...xs),
        bottom: Math.max(...ys),
      });
    }
  }
  return paths;
}

/** Describes a path a graphics strokes: its color, and its points. */
interface StrokedPath {
  readonly color: number;
  readonly points: readonly { x: number; y: number }[];
}

/** Returns each path a graphics strokes, in turn, in its color and its points. */
function strokedPaths(graphics: GameObjects.Graphics): readonly StrokedPath[] {
  const paths: StrokedPath[] = [];
  let color = NaN;
  let points: { x: number; y: number }[] = [];
  for (const command of commandsOf(graphics)) {
    if (command.kind === "lineStyle") color = command.color;
    if (command.kind === "beginPath") points = [];
    if (command.kind === "moveTo" || command.kind === "lineTo") {
      points.push({ x: command.x, y: command.y });
    }
    if (command.kind === "strokePath") paths.push({ color, points });
  }
  return paths;
}

/** Returns the colors a graphics fills in, in turn. */
function fillsOf(graphics: GameObjects.Graphics): readonly number[] {
  return commandsOf(graphics).flatMap((command) =>
    command.kind === "fillStyle" ? [command.color] : [],
  );
}

/** Returns how many of a set of images show. */
function showing(images: readonly GameObjects.Image[]): number {
  return images.filter((image) => image.visible).length;
}

/** Returns the images of a flourish's records, as the effects painter plays them. */
function imagesOf(bursts: Turns<Burst>): GameObjects.Image[] {
  return bursts.all.map(({ image }) => image);
}

/**
 * Returns the field's layout on the spec's 400 × 400 canvas, at a pixel to
 * a pixel, with room for a finger under it as given.
 */
function metricsAt(width = 400, height = 400, fingerRoom = 0): FieldMetrics {
  return fieldMetrics(
    {
      width,
      height,
      pixelRatio: 1,
      insets: { ...NO_INSETS, bottom: fingerRoom },
    },
    FIELD_HEIGHT,
  );
}

/** Returns the layout of the tallest field on the spec's 400 × 400 canvas. */
function tallestMetrics(): FieldMetrics {
  return fieldMetrics(
    { width: 400, height: 400, pixelRatio: 1, insets: NO_INSETS },
    TALLEST_FIELD,
  );
}

describe("BricksScene", () => {
  describe("each frame", () => {
    it("hands the shell the time each frame took", async () => {
      const { shell, run } = await startBoard();

      run.advance(48, 16);

      expect(shell.ticks.slice(-3).map((tick) => tick.deltaMs)).toEqual([
        16, 16, 16,
      ]);
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
      const { shell, run } = await startBoard();

      run.game.scale.resize(600, 400);
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(metricsAt(600, 400));
    });

    it("lays the field out again as it is reshaped", async () => {
      const { shell, run } = await startBoard();

      reshapeField(shell.field, TALLEST_FIELD);
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(tallestMetrics());
    });

    it("draws a field reshaped in the shell's tick at its new layout that frame", async () => {
      const { shell, run, scene } = await startBoard();
      shell.heightAsked = TALLEST_FIELD;

      run.advance(16);

      expect(scene.paddle.body.y).toBe(
        toCanvasY(tallestMetrics(), paddleTopOf(TALLEST_FIELD)),
      );
    });

    it("leaves the room for a finger under the field the shell asks for", async () => {
      const { shell, run } = await startBoard();

      shell.fingerSpace = 64;
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(metricsAt(400, 400, 64));
    });

    it("bakes the atlas again at a new unit", async () => {
      const { run, scene } = await startBoard();

      run.game.scale.resize(600, 600);
      run.advance(16);

      expect(scene.textures.getFrame(ATLAS, "plain-0").width).toBe(
        2 * metricsAt(600, 600).unit,
      );
    });

    it("has every image take up its frame anew at a new unit, and the paddle's bar its new height", async () => {
      const { run, scene } = await startBoard();

      run.game.scale.resize(600, 600);
      run.advance(16);

      expect({
        stale: imagesIn(scene)
          .filter(
            (image) =>
              image.width !== image.frame.width ||
              image.displayOriginX !== image.originX * image.frame.width,
          )
          .map((image) => image.frame.name),
        paddle: scene.paddle.body.height,
      }).toEqual({
        stale: [],
        paddle: paddleShape(metricsAt(600, 600)).bar,
      });
    });

    it("bakes once for a new unit and a new palette in the same frame", async () => {
      const { shell, run } = await startBoard();
      const baked = shell.bakes.length;

      run.game.scale.resize(600, 600);
      shell.colors = DARK;
      run.advance(16);

      expect(shell.bakes.length - baked).toBe(1);
    });
  });

  describe("the atlas", () => {
    it("holds every frame of the view's art", async () => {
      const { scene } = await startBoard();
      const names = atlasFrames(LIGHT, metricsAt()).map((frame) => frame.name);

      const missing = names.filter(
        (name) => !scene.textures.get(ATLAS).has(name),
      );

      expect(missing).toEqual([]);
    });
  });

  describe("the field", () => {
    it("is painted in the palette, its wall around it", async () => {
      const { scene } = await startBoard();

      expect(colorsOf(scene.field.graphics)).toEqual(
        expect.arrayContaining([LIGHT.field, LIGHT.wall]),
      );
    });

    it("is painted again in a new palette", async () => {
      const { shell, run, scene } = await startBoard();

      shell.colors = DARK;
      run.advance(16);

      expect(colorsOf(scene.field.graphics)).toEqual(
        expect.arrayContaining([DARK.field, DARK.wall]),
      );
    });

    it("rims it on its left, its top and its right, wider than the wall, its lip showing at the foot of each side", async () => {
      const { scene } = await startBoard();
      const metrics = metricsAt();
      const rim = rimWidth(metrics);
      const [lip, wall] = filledPaths(scene.field.graphics);
      const box = {
        left: metrics.x - rim,
        top: metrics.y - rim,
        right: metrics.x + metrics.width + rim,
      };

      expect({ lip, wall, wider: rim > metrics.wall }).toEqual({
        lip: {
          ...box,
          color: LIGHT.fieldInks.rimLip,
          bottom: metrics.y + metrics.height,
        },
        wall: {
          ...box,
          color: LIGHT.wall,
          bottom: metrics.y + metrics.height - Math.round(0.35 * rim),
        },
        wider: true,
      });
    });

    it("washes the gutter under the paddle to the field's foot, in the danger color", async () => {
      const { shell, scene } = await startBoard();
      const metrics = metricsAt();
      const top = Math.round(
        toCanvasY(metrics, shell.field.paddle.top + PADDLE_HEIGHT + 0.45),
      );
      const commands = commandsOf(scene.field.graphics);
      const gutter = commands.findIndex(
        (command) =>
          command.kind === "fillStyle" &&
          command.color === LIGHT.fieldInks.gutter,
      );

      expect(commands[gutter + 1]).toEqual({
        kind: "fillRect",
        x: metrics.x,
        y: top,
        width: metrics.width,
        height: metrics.y + metrics.height - top,
      });
    });

    it("points a chevron down the gutter every two units across, in its own color", async () => {
      const { shell, scene } = await startBoard();
      const metrics = metricsAt();
      const top = Math.round(
        toCanvasY(metrics, shell.field.paddle.top + PADDLE_HEIGHT + 0.45),
      );
      const chevrons = strokedPaths(scene.field.graphics);
      const points = chevrons[0]?.points.map(({ x, y }) => ({
        x: Number(((x - metrics.x) / metrics.unit).toFixed(6)),
        y: Number(((y - top) / metrics.unit).toFixed(6)),
      }));

      expect({
        count: chevrons.length,
        colors: new Set(chevrons.map(({ color }) => color)),
        first: points,
      }).toEqual({
        count: FIELD_WIDTH / 2,
        colors: new Set([LIGHT.fieldInks.chevron]),
        first: [
          { x: 0.72, y: 0.38 },
          { x: 1, y: 0.62 },
          { x: 1.28, y: 0.38 },
        ],
      });
    });

    it("lays the rim, then the field over it, then the gutter over the field, then the net", async () => {
      const { shell, run, scene } = await startBoard();

      shell.field.net = true;
      run.advance(16);

      expect(fillsOf(scene.field.graphics)).toEqual([
        LIGHT.fieldInks.rimLip,
        LIGHT.wall,
        LIGHT.field,
        LIGHT.fieldInks.gutter,
        LIGHT.capsules.good,
      ]);
    });

    it("washes the gutter under the paddle of a taller field", async () => {
      const { shell, run, scene } = await startBoard();
      reshapeField(shell.field, TALLEST_FIELD);

      run.advance(16);

      const commands = commandsOf(scene.field.graphics);
      const gutter = commands.findIndex(
        (command) =>
          command.kind === "fillStyle" &&
          command.color === LIGHT.fieldInks.gutter,
      );
      expect(commands[gutter + 1]).toMatchObject({
        kind: "fillRect",
        y: Math.round(
          toCanvasY(
            tallestMetrics(),
            paddleTopOf(TALLEST_FIELD) + PADDLE_HEIGHT + 0.45,
          ),
        ),
      });
    });

    it("shows the net while there is one", async () => {
      const { shell, run, scene } = await startBoard();

      shell.field.net = true;
      run.advance(16);

      expect(colorsOf(scene.field.graphics)).toEqual(
        expect.arrayContaining([LIGHT.capsules.good]),
      );
    });

    it("draws the net under the paddle of a taller field", async () => {
      const { shell, run, scene } = await startBoard();
      reshapeField(shell.field, TALLEST_FIELD);
      shell.field.net = true;

      run.advance(16);

      // The net is the rectangle filled after its color is taken up.
      const commands = commandsOf(scene.field.graphics);
      const net = commands.findIndex(
        (command) =>
          command.kind === "fillStyle" && command.color === LIGHT.capsules.good,
      );
      expect(commands[net + 1]).toMatchObject({
        kind: "fillRect",
        y: Math.round(
          toCanvasY(tallestMetrics(), paddleTopOf(TALLEST_FIELD) + NET_DEPTH),
        ),
      });
    });
  });

  describe("the place", () => {
    /** Returns the commands of each `Graphics` the scene bakes into a texture from now on, until the test finishes. */
    function bakesFromNow(
      scene: BricksScene,
    ): readonly (readonly GraphicsCommand[])[] {
      const bakes: (readonly GraphicsCommand[])[] = [];
      const make = scene.make.graphics.bind(scene.make);
      const made = vi
        .spyOn(scene.make, "graphics")
        .mockImplementation((config, addToScene) => {
          const graphics = make(config, addToScene);
          const generate = graphics.generateTexture.bind(graphics);
          vi.spyOn(graphics, "generateTexture").mockImplementation(
            (key, width, height) => {
              bakes.push(commandsOf(graphics));
              return generate(key, width, height);
            },
          );
          return graphics;
        });
      onTestFinished(() => {
        made.mockRestore();
      });
      return bakes;
    }

    /** Returns the commands a place's tile is drawn in, for the field laid out so, in a palette. */
    function tileCommands(
      scene: BricksScene,
      place: Place,
      metrics: FieldMetrics,
      palette: BricksPalette,
    ): readonly GraphicsCommand[] {
      const graphics = scene.make.graphics({}, false);
      const tile = placeTile(place, metrics, fieldInks(palette));
      atlasFrameOf({ name: "tile", ...tile }).draw(graphics);
      const commands = commandsOf(graphics);
      graphics.destroy();
      return commands;
    }

    it("tiles the field with the tile of its set's place, from its top left corner", async () => {
      const { scene } = await startBoard();

      const { tiles } = scene.place;
      const { x, y, width, height } = metricsAt();
      expect({
        texture: tiles.texture.key,
        tile: [tiles.frame.width, tiles.frame.height],
        laid: [tiles.x, tiles.y, tiles.width, tiles.height],
        from: [tiles.tilePositionX, tiles.tilePositionY],
      }).toEqual({
        texture: PLACE_TEXTURE,
        tile: [tileSide(metricsAt()), tileSide(metricsAt())],
        laid: [x, y, width, height],
        from: [0, 0],
      });
    });

    it("washes its tile over the field as strongly as the place shows there, so the net under it only takes a tint", async () => {
      const { scene } = await startBoard();

      expect(scene.place.tiles.alpha).toBe(PLACE_ART.playroom.field);
    });

    it("lies over the field and under the bricks", async () => {
      const { scene } = await startBoard();

      const order = scene.children.list;
      const depth = (object: GameObjects.GameObject | undefined): number =>
        order.findIndex((layer) => layer === object?.displayList);
      expect([
        depth(scene.field.graphics),
        depth(scene.place.tiles),
        depth(scene.bricks.images[0]),
      ]).toEqual([0, 1, 2]);
    });

    it("bakes the tile of the place the level's set is in, in the palette's inks at full strength", async () => {
      const { shell, run, scene } = await startBoard();
      const bakes = bakesFromNow(scene);

      shell.whereabouts = "workshop";
      run.advance(16);

      expect(bakes).toEqual([
        tileCommands(scene, "workshop", metricsAt(), shell.colors),
      ]);
    });

    it("bakes the tile again, into a texture of its own, as the level's set is in another place", async () => {
      const { shell, run, scene } = await startBoard();
      const shown = scene.place.tiles.frame;

      shell.whereabouts = "workshop";
      run.advance(16);

      // A texture of its own, as Phaser's canvas renderer copies a tile
      // sprite's frame only when it is handed another.
      expect(scene.place.tiles.frame).not.toBe(shown);
    });

    it("bakes nothing for a new level in the same place", async () => {
      const { shell, run, scene } = await startBoard();
      const shown = scene.place.tiles.frame;

      shell.showField(["oo"]);
      run.advance(16);

      expect(scene.place.tiles.frame).toBe(shown);
    });

    it("bakes the tile again in a new palette", async () => {
      const { shell, run, scene } = await startBoard();
      const bakes = bakesFromNow(scene);

      shell.colors = DARK;
      run.advance(16);

      expect(bakes).toContainEqual(
        tileCommands(scene, "playroom", metricsAt(), DARK),
      );
    });

    it("bakes the tile again at a new unit, and tiles the field laid out anew", async () => {
      const { run, scene } = await startBoard();

      run.game.scale.resize(600, 600);
      run.advance(16);

      const { tiles } = scene.place;
      const { x, y, width, height, unit } = metricsAt(600, 600);
      expect({
        tile: tiles.frame.width,
        laid: [tiles.x, tiles.y, tiles.width, tiles.height],
      }).toEqual({
        tile: tileSide({ unit, pixelRatio: 1 }),
        laid: [x, y, width, height],
      });
    });

    it("tiles a field reshaped taller down to its floor, from the same corner", async () => {
      const { shell, run, scene } = await startBoard();

      reshapeField(shell.field, TALLEST_FIELD);
      run.advance(16);

      const { tiles } = scene.place;
      const { x, y, width, height } = tallestMetrics();
      expect([tiles.x, tiles.y, tiles.width, tiles.height]).toEqual([
        x,
        y,
        width,
        height,
      ]);
    });
  });

  describe("the bricks", () => {
    it("show each brick of the field, in its frame, in its cell", async () => {
      const { shell, scene } = await startBoard(stillness);
      const metrics = metricsAt();
      const tough = brickAt(shell.field, 1, 0);

      const image = scene.bricks.images[cellIndex(1, 0)];

      expect({
        shown: scene.bricks.images.filter((each) => each.visible).length,
        frame: image?.frame.name,
        x: image?.x,
        y: image?.y,
      }).toEqual({
        shown: 2,
        frame: brickFrame(tough),
        x: toCanvasX(metrics, 3),
        y: toCanvasY(metrics, BRICKS_TOP + 0.5),
      });
    });

    it("shows a brick's frame anew as it takes a hit", async () => {
      const { shell, run, scene } = await startBoard(stillness);
      const tough = brickAt(shell.field, 1, 0);

      hitBrick(shell.field, tough, 0, 0);
      run.advance(16);

      expect(scene.bricks.images[cellIndex(1, 0)]?.frame.name).toBe(
        brickFrame(tough),
      );
    });

    it("shows a broken regrowing brick's ring, filled as far as its time to grow back has come", async () => {
      const { shell, run, scene } = await startBoard((shell) => {
        stillness(shell);
        shell.field = fieldFrom(["+"]);
      });
      const brick = brickAt(shell.field, 0, 0);
      hitBrick(shell.field, brick, 0, 0);
      shell.field.steps = brick.regrowsAt - stepsIn(10_000) / 2;

      run.advance(16);

      expect(placed(scene.bricks.images[cellIndex(0, 0)])).toMatchObject({
        visible: true,
        frame: regrowingFrame(0.5),
      });
    });

    it("shows a cage holding the friend the field frees next", async () => {
      const { shell, run, scene } = await startBoard((shell) => {
        stillness(shell);
        shell.field = fieldFrom(["c"]);
      });
      const cage = brickAt(shell.field, 0, 0);

      shell.field.friendsFreed = 3;
      run.advance(16);

      expect(scene.bricks.images[cellIndex(0, 0)]?.frame.name).toBe(
        brickFrame(cage, shell.field),
      );
    });

    /** The cells of the gates `withGates()` lays. */
    const gates = [1, 3].map((column) => cellIndex(column, 0));

    /** Sets a shell up, still, on a field of a key and two gates, beside a plain brick that keeps the level in play once the key breaks. */
    function withGates(shell: FakeShell): void {
      stillness(shell);
      shell.field = fieldFrom(["k=.=", "o"]);
    }

    it("shows each gate shut while a key is left", async () => {
      const { shell, scene } = await startBoard(withGates);

      expect(
        gates.map((cell) => placed(scene.bricks.images[cell])),
      ).toMatchObject(
        gates.map(() => ({
          visible: true,
          frame: brickFrame(brickAt(shell.field, 1, 0)),
        })),
      );
    });

    it("hides every gate as the last key opens them", async () => {
      const { shell, run, scene } = await startBoard(withGates);

      hitBrick(shell.field, brickAt(shell.field, 0, 0), 0, 0);
      run.advance(16);

      expect(gates.map((cell) => scene.bricks.images[cell]?.visible)).toEqual([
        false,
        false,
      ]);
    });

    it("hides a brick once it breaks", async () => {
      const { shell, run, scene } = await startBoard(stillness);

      hitBrick(shell.field, brickAt(shell.field, 0, 0), 0, 0);
      run.advance(16);

      expect(scene.bricks.images[cellIndex(0, 0)]?.visible).toBe(false);
    });

    it("hold an image for every cell, made once", async () => {
      const { scene } = await startBoard();

      expect(scene.bricks.images).toHaveLength(COLUMNS * ROWS);
    });

    it("drop into place as a level starts", async () => {
      const { scene } = await startBoard();
      const image = scene.bricks.images[0];

      expect({
        above: (image?.y ?? 0) < toCanvasY(metricsAt(), BRICKS_TOP + 0.5),
        faded: (image?.alpha ?? 1) < 1,
      }).toEqual({ above: true, faded: true });
    });

    it("come to rest once they have dropped", async () => {
      const { run, scene } = await startBoard();

      run.advance(DROP_IN_MS + 64);

      expect(scene.bricks.images[0]).toMatchObject({
        y: toCanvasY(metricsAt(), BRICKS_TOP + 0.5),
        alpha: 1,
      });
    });

    it("drop a column in after the one to its left", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.showField(["o.....o.....o"]);
      });

      run.advance(DROP_IN_MS / 2);

      expect(
        [0, 6, 12].map((column) => heightAbove(scene, cellIndex(column, 0))),
      ).toEqual([0, expect.closeTo(dropInHeight(6, 0.5)), DROP_IN_HEIGHT]);
    });

    it("keep the last column falling till the drop-in ends", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.showField([".".repeat(COLUMNS - 1) + "o"]);
      });

      run.advance(DROP_IN_MS - 16);

      expect(heightAbove(scene, cellIndex(COLUMNS - 1, 0))).toBeGreaterThan(0);
    });

    it("land the last column as the drop-in ends", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.showField([".".repeat(COLUMNS - 1) + "o"]);
      });

      run.advance(DROP_IN_MS);

      expect(heightAbove(scene, cellIndex(COLUMNS - 1, 0))).toBe(0);
    });

    it.each([
      ["a launch", "Space", " "],
      ["a push of the paddle", "ArrowLeft", "ArrowLeft"],
      ["a key the game doesn't use", "KeyQ", "q"],
    ] as const)("land at once, whole, at %s", async (_, code, key) => {
      const { run, scene } = await startBoard();

      run.key("keydown", code, key);
      run.advance(16);

      expect(landed(scene)).toEqual({ heights: [0, 0], alphas: [1, 1] });
    });

    it.each([
      ["a shortcut, which is the browser's", { ctrlKey: true }, {}],
      ["a held key's repeat", {}, { repeat: true }],
    ] as const)("keep dropping in at %s", async (_, shortcut, repeat) => {
      const { run, scene } = await startBoard();

      run.key("keydown", "ArrowLeft", "ArrowLeft", {
        ...shortcut,
        ...repeat,
      });
      run.advance(16);

      expect(heightAbove(scene, 0)).toBeCloseTo(
        dropInHeight(0, 16 / DROP_IN_MS),
      );
    });

    it("keep dropping in on a new layout, and land at its places", async () => {
      const { run, scene } = await startBoard();
      const metrics = metricsAt(600, 400);
      run.advance(DROP_IN_MS / 4);

      run.game.scale.resize(600, 400);
      run.advance(16);
      const dropping = heightAbove(scene, 0, metrics);
      run.advance(DROP_IN_MS);

      expect({
        dropping,
        landed: placed(scene.bricks.images[0]),
      }).toEqual({
        dropping: expect.closeTo(
          dropInHeight(0, (DROP_IN_MS / 4 + 16) / DROP_IN_MS),
        ) as number,
        landed: expect.objectContaining({
          x: toCanvasX(metrics, 1),
          y: toCanvasY(metrics, BRICKS_TOP + 0.5),
        }) as object,
      });
    });

    it("stand at their places on a new layout", async () => {
      const { run, scene } = await startBoard(stillness);
      const metrics = metricsAt(600, 400);

      run.game.scale.resize(600, 400);
      run.advance(16);

      expect(scene.bricks.images[cellIndex(1, 0)]).toMatchObject({
        x: toCanvasX(metrics, 3),
        y: toCanvasY(metrics, BRICKS_TOP + 0.5),
      });
    });

    it("drop in again as a new level starts", async () => {
      const { shell, run, scene } = await startBoard();
      run.advance(DROP_IN_MS + 64);

      shell.showField(["oo"]);
      run.advance(16);

      expect(scene.bricks.images[0]?.alpha).toBeLessThan(1);
    });

    it("drop a new level's in from its start, though the last level's hit held as it cleared", async () => {
      const held = await startBoard();
      const unheld = await startBoard();
      clearLevel(held.shell);
      for (const { shell, run } of [held, unheld]) {
        run.advance(HOLD_MS + 200);
        shell.showField(ROWS_DRAWN);
        run.advance(16);
      }

      for (const { run } of [held, unheld]) run.advance(16);

      expect(heightAbove(held.scene, 0)).toBe(heightAbove(unheld.scene, 0));
    });

    it("show in place at once where the player prefers less motion", async () => {
      const { scene } = await startBoard(stillness);

      expect(scene.bricks.images[0]).toMatchObject({
        y: toCanvasY(metricsAt(), BRICKS_TOP + 0.5),
        alpha: 1,
      });
    });

    it("show a new level's in place at once once the player turns motion off, though the last level's still dropped in", async () => {
      const { shell, run, scene } = await startBoard();
      run.advance(DROP_IN_MS / 4);

      stillness(shell);
      shell.showField(ROWS_DRAWN);
      run.advance(16);

      expect(landed(scene)).toEqual({ heights: [0, 0], alphas: [1, 1] });
    });
  });

  describe("the paddle", () => {
    it("is drawn at its width, its middle at the paddle's, its top on the paddle's line and its caps' middles a cap's radius in from its ends", async () => {
      const { shell, scene } = await startBoard();
      const metrics = metricsAt();
      const { bar } = paddleShape(metrics);
      const paddle = shell.field.paddle;
      const x = toCanvasX(metrics, paddle.x);
      const top = toCanvasY(metrics, PADDLE_TOP);
      const width = Math.round(paddle.width * metrics.unit);

      expect({
        ends: scene.paddle.ends.map((end) => [end.x, end.y]),
        middle: scene.paddle.body.x,
        top: scene.paddle.body.y,
      }).toEqual({
        ends: [
          [x - width / 2 + bar / 2, top + bar / 2],
          [x + width / 2 - bar / 2, top + bar / 2],
        ],
        middle: x,
        top,
      });
    });

    it("lays its body over its caps' inner halves, its lip under its bar between the caps' middles, and its pad along its top", async () => {
      const { shell, scene } = await startBoard();
      const metrics = metricsAt();
      const { bar, lip, inner, pad } = paddleShape(metrics);
      const width = Math.round(shell.field.paddle.width * metrics.unit);
      const top = toCanvasY(metrics, PADDLE_TOP);
      const { body, lip: under, pad: over } = scene.paddle;

      expect({
        body: [body.displayWidth, body.displayHeight],
        lip: [under.displayWidth, under.displayHeight, under.y],
        pad: [over.displayWidth, over.displayHeight, over.y],
      }).toEqual({
        body: [width - 2 * inner, bar],
        lip: [width - bar, bar, top + lip],
        pad: [width - 2 * (inner + pad.inset), pad.height, top + pad.top],
      });
    });

    it("flips its right end, so its bolt lies toward its outer side", async () => {
      const { scene } = await startBoard();

      expect(scene.paddle.ends.map((end) => end.flipX)).toEqual([false, true]);
    });

    it("draws its lip, then its ends, its body and its pad over them, then its hooks and cannons, each from its frame", async () => {
      const { scene } = await startBoard();
      const { lip, ends, body, pad, hooks, cannons } = scene.paddle;
      const parts = [lip, ...ends, body, pad, ...hooks, ...cannons];

      expect({
        order: parts.map((part) => lip.displayList?.getIndex(part)),
        frames: [ends[0], hooks[0], cannons[0]].map(
          (image) => image?.frame.name,
        ),
      }).toEqual({
        order: parts.map((_, i) => i),
        frames: [PADDLE_FRAMES.end, PADDLE_FRAMES.hook, PADDLE_FRAMES.cannon],
      });
    });

    it("is drawn where a new layout puts it", async () => {
      const { shell, run, scene } = await startBoard();
      const metrics = metricsAt(600, 400);

      run.game.scale.resize(600, 400);
      run.advance(16);

      expect([scene.paddle.body.x, scene.paddle.body.y]).toEqual([
        toCanvasX(metrics, shell.field.paddle.x),
        toCanvasY(metrics, PADDLE_TOP),
      ]);
    });

    it("is drawn between its last place and its next", async () => {
      const { shell, run, scene } = await startBoard();
      const paddle = shell.field.paddle;
      paddle.lastX = 10;
      paddle.x = 12;

      shell.alpha = 0.25;
      run.advance(16);

      expect(scene.paddle.body.x).toBe(toCanvasX(metricsAt(), 10.5));
    });

    it.each([
      ["laser", true, false],
      ["catch", false, true],
      [null, false, false],
    ] as const)(
      "shows, in %s mode, the cannons: %s, and the hooks: %s",
      async (mode, cannons, hooks) => {
        const { shell, run, scene } = await startBoard();
        const metrics = metricsAt();
        const fit = hookCount(
          Math.round(shell.field.paddle.width * metrics.unit),
          paddleShape(metrics),
        );

        shell.field.mode = mode;
        run.advance(16);

        expect({
          cannons: scene.paddle.cannons.map((cannon) => cannon.visible),
          hooks: showing(scene.paddle.hooks),
        }).toEqual({ cannons: [cannons, cannons], hooks: hooks ? fit : 0 });
      },
    );

    it("stands a laser's cannons on its top, over its ends", async () => {
      const { shell, run, scene } = await startBoard();
      const metrics = metricsAt();
      const x = toCanvasX(metrics, shell.field.paddle.x);
      const inset =
        Math.round(shell.field.paddle.width * metrics.unit) / 2 -
        BOLT_INSET * metrics.unit;
      const top = toCanvasY(metrics, PADDLE_TOP);

      shell.field.mode = "laser";
      run.advance(16);

      expect(
        scene.paddle.cannons.map((cannon) => [cannon.x, cannon.y]),
      ).toEqual([
        [x - inset, top],
        [x + inset, top],
      ]);
    });

    it("stands a catching paddle's hooks on its top, a pitch apart about its middle", async () => {
      const { shell, run, scene } = await startBoard();
      const metrics = metricsAt();
      const shape = paddleShape(metrics);
      const x = toCanvasX(metrics, shell.field.paddle.x);
      const count = hookCount(
        Math.round(shell.field.paddle.width * metrics.unit),
        shape,
      );
      /** Rounds away what adding to the paddle's place leaves of a float's last digits. */
      const near = (offset: number): number => Number(offset.toFixed(6));

      shell.field.mode = "catch";
      run.advance(16);

      const shown = scene.paddle.hooks.filter((hook) => hook.visible);
      expect({
        offsets: shown.map((hook) => near(hook.x - x)),
        tops: new Set(shown.map((hook) => hook.y)),
      }).toEqual({
        offsets: Array.from({ length: count }, (_, i) =>
          near((i - (count - 1) / 2) * shape.hooks.pitch),
        ),
        tops: new Set([toCanvasY(metrics, PADDLE_TOP)]),
      });
    });

    it("stands more hooks along it as it widens", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.mode = "catch";
      run.advance(16);
      const before = showing(scene.paddle.hooks);

      shell.field.paddle.width = 6;
      run.advance(16);

      expect(showing(scene.paddle.hooks)).toBeGreaterThan(before);
    });

    it("keeps its ends round as it widens", async () => {
      const { shell, run, scene } = await startBoard();
      const widths = scene.paddle.ends.map((end) => end.displayWidth);
      const { inner } = paddleShape(metricsAt());

      shell.field.paddle.width = 6;
      run.advance(16);

      expect({
        ends: scene.paddle.ends.map((end) => end.displayWidth),
        body: scene.paddle.body.displayWidth,
      }).toEqual({
        ends: widths,
        body: Math.round(6 * metricsAt().unit) - 2 * inner,
      });
    });

    it("is painted in the palette, and anew in a new one", async () => {
      const { shell, run, scene } = await startBoard();
      const before = scene.paddle.body.fillColor;

      shell.colors = DARK;
      run.advance(16);

      expect({
        before,
        body: scene.paddle.body.fillColor,
        lip: scene.paddle.lip.fillColor,
        pad: scene.paddle.pad.fillColor,
      }).toEqual({
        before: LIGHT.paddle,
        body: DARK.paddle,
        lip: DARK.paddleInks.lip,
        pad: DARK.paddleInks.pad,
      });
    });
  });

  describe("the balls", () => {
    it("show the ball waiting on the paddle, in its kind's frame", async () => {
      const { scene } = await startBoard();

      const shown = scene.balls.images.filter((image) => image.visible);

      expect(shown.map((image) => image.frame.name)).toEqual([
        ballFrame("normal", 0),
      ]);
    });

    it("are drawn between their last place and their next", async () => {
      const { shell, run, scene } = await startBoard();
      const ball = throwBall(shell.field, 3, 20, 0);
      ball.x = 4;
      ball.y = 19;

      shell.alpha = 0.25;
      run.advance(16);

      expect(scene.balls.images[0]).toMatchObject({
        x: toCanvasX(metricsAt(), 3.25),
        y: toCanvasY(metricsAt(), 19.75),
      });
    });

    it("take the frame of the balls' kind", async () => {
      const { shell, run, scene } = await startBoard();

      shell.field.ballKind = "fire";
      run.advance(16);

      expect(scene.balls.images[0]?.frame.name).toBe(ballFrame("fire", 0));
    });

    it("lift a normal ball's fur as the streak climbs", async () => {
      const { shell, run, scene } = await startBoard();

      shell.field.streak = 20;
      run.advance(16);

      expect(scene.balls.images[0]?.frame.name).toBe(ballFrame("normal", 20));
    });

    it("draw a friend in its ink, its fur lifted by the streak as a normal ball's is", async () => {
      const { shell, run, scene } = await startBoard();
      throwBall(shell.field, 6, 20, 0, 1).ink = 2;

      shell.field.streak = 20;
      run.advance(16);

      expect(
        scene.balls.images.slice(0, 2).map((image) => image.frame.name),
      ).toEqual([ballFrame("normal", 20), ballFrame("normal", 20, 2)]);
    });

    it("stand a sight under a friend that seeks, as under the player's own ball", async () => {
      const { shell, run, scene } = await startBoard();
      const friend = throwBall(shell.field, 6, 20, 0, 1);
      friend.ink = 2;
      friend.seeks = true;

      run.advance(16);

      expect(placed(scene.balls.sights[1])).toEqual({
        visible: true,
        frame: FRAMES.sight,
        x: toCanvasX(metricsAt(), 6),
        y: toCanvasY(metricsAt(), 20),
      });
    });

    it("stand a sight under a ball that seeks, where it is drawn, and none under one that doesn't", async () => {
      const { shell, run, scene } = await startBoard();
      throwBall(shell.field, 3, 20, 0, 0).seeks = true;
      throwBall(shell.field, 6, 20, 0, 1);

      run.advance(16);

      expect(scene.balls.sights.slice(0, 2).map(placed)).toEqual([
        {
          visible: true,
          frame: FRAMES.sight,
          x: toCanvasX(metricsAt(), 3),
          y: toCanvasY(metricsAt(), 20),
        },
        expect.objectContaining({ visible: false }),
      ]);
    });

    it("stand a sight under every ball in flight while a Seeker is in play", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.seeking = true;
      throwBall(shell.field, 3, 20, 0, 0);
      throwBall(shell.field, 6, 20, 0, 1);

      run.advance(16);

      expect(
        scene.balls.sights.slice(0, 2).map((sight) => sight.visible),
      ).toEqual([true, true]);
    });

    it("stand no sight under a ball held on the paddle, though a Seeker is in play", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.seeking = true;

      run.advance(16);

      expect({
        ball: scene.balls.images[0]?.visible,
        sight: scene.balls.sights[0]?.visible,
      }).toEqual({ ball: true, sight: false });
    });

    it("hide a ball's sight with it once it is lost", async () => {
      const { shell, run, scene } = await startBoard();
      throwBall(shell.field, 3, 20, 0).seeks = true;
      run.advance(16);

      ballOf(shell.field).live = false;
      run.advance(16);

      expect(scene.balls.sights[0]?.visible).toBe(false);
    });

    it("lay each sight under the balls, and their eyes over them", async () => {
      const { scene } = await startBoard();
      const { sights, images, eyes } = scene.balls;
      const index = (image: GameObjects.Image | undefined): number =>
        image?.displayList?.getIndex(image) ?? NaN;

      expect([
        index(sights.at(-1)) < index(images[0]),
        index(images.at(-1)) < index(eyes[0]),
      ]).toEqual([true, true]);
    });

    it("hide a ball once it is lost", async () => {
      const { shell, run, scene } = await startBoard();

      ballOf(shell.field).live = false;
      run.advance(16);

      expect(scene.balls.images[0]?.visible).toBe(false);
    });

    it("look the way they go, their eyes moved off their middle toward it", async () => {
      const { shell, run, scene } = await startBoard();
      throwBall(shell.field, 3, 20, 90);

      run.advance(16);

      const by = ballGrid(metricsAt());
      expect(scene.balls.eyes[0]).toMatchObject({
        visible: true,
        frame: { name: FRAMES.eyes },
        x: toCanvasX(metricsAt(), 3) + FUZZBALL_LOOK.across * by,
        y: toCanvasY(metricsAt(), 20),
      });
    });

    it("hide a ball's eyes with it once it is lost", async () => {
      const { shell, run, scene } = await startBoard();

      ballOf(shell.field).live = false;
      run.advance(16);

      expect(scene.balls.eyes[0]?.visible).toBe(false);
    });
  });

  describe("the keys", () => {
    it("push the paddle while an arrow is held", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "ArrowLeft");
      run.advance(16);

      expect(shell.lastSteer().push).toBe(-1);
    });

    it("stop pushing once the arrow is let go", async () => {
      const { shell, run } = await startBoard();
      run.key("keydown", "ArrowLeft");
      run.advance(16);

      run.key("keyup", "ArrowLeft");
      run.advance(16);

      expect(shell.lastSteer().push).toBe(0);
    });

    it("are let go as the window loses the player", async () => {
      const { shell, run } = await startBoard();
      run.key("keydown", "ArrowRight");
      run.advance(16);

      run.game.events.emit(Core.Events.BLUR);
      run.advance(16);

      expect(shell.lastSteer().push).toBe(0);
    });

    it("are let go as the page hides", async () => {
      const { shell, run } = await startBoard();
      run.key("keydown", "ArrowRight");
      run.advance(16);

      run.game.events.emit(Core.Events.HIDDEN);
      run.advance(16);

      expect(shell.lastSteer().push).toBe(0);
    });

    it("stay held as the focus moves to a button over the field", async () => {
      const { shell, run, keys } = await startBoard();
      const resume = document.createElement("button");
      keys.append(resume);
      run.key("keydown", "ArrowRight");
      run.advance(16);

      keys.dispatchEvent(new FocusEvent("focusout", { relatedTarget: resume }));
      run.advance(16);

      expect(shell.lastSteer().push).toBe(1);
    });

    it("keep a key held that is let go and pressed again within a frame, whatever comes after", async () => {
      const { shell, run } = await startBoard();
      run.key("keydown", "ArrowLeft");
      run.advance(16);

      run.key("keyup", "ArrowLeft");
      run.key("keydown", "ArrowLeft");
      run.key("keydown", "KeyQ", "q");
      run.advance(16);

      expect(shell.lastSteer().push).toBe(-1);
    });

    it("are let go as the focus leaves the field", async () => {
      const { shell, run, keys } = await startBoard();
      run.key("keydown", "ArrowRight");
      run.advance(16);

      keys.dispatchEvent(new FocusEvent("focusout", { relatedTarget: null }));
      run.advance(16);

      expect(shell.lastSteer().push).toBe(0);
    });

    it("turn into the commands they ask for, each once, however many come in a frame", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Space", " ");
      run.key("keydown", "Escape");
      run.key("keydown", "KeyP", "p");
      run.key("keydown", "Enter");
      run.advance(16);

      expect(shell.commands).toEqual(["launch", "pause", "toggle", "go"]);
    });

    it.each([
      ["a held key's repeat", "Space", " ", { repeat: true }],
      ["a shortcut with Ctrl", "KeyP", "p", { ctrlKey: true }],
      ["a shortcut with Alt", "KeyP", "p", { altKey: true }],
      ["a shortcut with Meta", "KeyP", "p", { metaKey: true }],
      ["a key the game doesn't use", "KeyQ", "q", {}],
    ] as const)("ignore %s", async (_, code, key, modifiers) => {
      const { shell, run } = await startBoard();

      run.key("keydown", code, key, modifiers);
      run.advance(16);

      expect(shell.commands).toEqual([]);
    });
  });

  describe("the pointer", () => {
    it("launches as the mouse is pressed", async () => {
      const { shell, run } = await startBoard();

      run.pointer("down", 200, 300);
      run.pointer("up", 200, 300);

      expect(shell.commands).toEqual(["launch"]);
    });

    it.each([
      ["the middle button", 1],
      ["the right button", 2],
      ["the back button", 3],
      ["the forward button", 4],
    ] as const)("doesn't launch at a press of %s", async (_, button) => {
      const { shell, run } = await startBoard();

      run.pointer("down", 200, 300, { button });
      run.pointer("up", 200, 300, { button });

      expect(shell.commands).toEqual([]);
    });

    it("steers the paddle to where the mouse moves", async () => {
      const { shell, run } = await startBoard();

      run.pointer("move", 150, 300);
      run.advance(16);

      expect(shell.lastSteer().to).toBe(toFieldX(metricsAt(), 150));
    });

    it("steers through the field as laid out on the frame it moved in", async () => {
      const { shell, run } = await startBoard();

      run.pointer("move", 150, 300);
      run.game.scale.resize(600, 400);
      run.advance(16);

      expect(shell.lastSteer().to).toBe(toFieldX(metricsAt(600, 400), 150));
    });

    it("follows a finger where the player asks it to", async () => {
      const { shell, run } = await startBoard((each) => {
        each.steering = "follow";
      });

      run.touch("start", 200, 300);
      run.touch("move", 150, 300);
      run.advance(16);

      expect(shell.lastSteer().to).toBe(toFieldX(metricsAt(), 150));
    });

    it("launches at a tap", async () => {
      const { shell, run } = await startBoard();

      run.touch("start", 200, 300);
      run.touch("end", 200, 300);

      expect(shell.commands).toEqual(["launch"]);
    });

    it("doesn't launch at a touch the browser takes away", async () => {
      const { shell, run } = await startBoard();

      run.touch("start", 200, 300);
      run.touch("cancel", 200, 300);

      expect(shell.commands).toEqual([]);
    });

    it("launches at a tap after a touch the browser took away", async () => {
      const { shell, run } = await startBoard();
      run.touch("start", 200, 300);
      run.touch("move", 230, 300);
      run.touch("cancel", 230, 300);

      run.touch("start", 200, 300);
      run.touch("end", 200, 300);

      expect(shell.commands).toEqual(["launch"]);
    });

    it("drags the paddle as a finger moves", async () => {
      const { shell, run } = await startBoard();

      run.touch("start", 200, 300);
      run.touch("move", 226, 300);
      run.advance(16);

      expect(shell.lastSteer().by).toBe(26 / metricsAt().unit);
    });
  });

  describe("the capsules", () => {
    it("are drawn falling between their last place and their next, each in its frame", async () => {
      const { shell, run, scene } = await startBoard();
      Object.assign(shell.field.falling[0] ?? {}, {
        live: true,
        id: "slow",
        x: 5,
        y: 10,
        lastY: 9,
      });

      shell.alpha = 0.25;
      run.advance(16);

      expect(placed(scene.capsules.images[0])).toEqual({
        visible: true,
        frame: capsuleFrame("slow"),
        x: toCanvasX(metricsAt(), 5),
        y: toCanvasY(metricsAt(), 9.25),
      });
    });

    it("hide a capsule once it stops falling", async () => {
      const { shell, run, scene } = await startBoard();
      const falling = shell.field.falling[0];
      if (falling) falling.live = true;
      run.advance(16);

      if (falling) falling.live = false;
      run.advance(16);

      expect(showing(scene.capsules.images)).toBe(0);
    });
  });

  describe("the bolts", () => {
    it("are drawn rising between their last place and their next, hung from their tips", async () => {
      const { shell, run, scene } = await startBoard();
      Object.assign(shell.field.bolts[0] ?? {}, {
        live: true,
        x: 7,
        y: 20,
        lastY: 21,
      });

      shell.alpha = 0.5;
      run.advance(16);

      expect(scene.bolts.images[0]).toMatchObject({
        visible: true,
        originY: 0,
        x: toCanvasX(metricsAt(), 7),
        y: toCanvasY(metricsAt(), 20.5),
      });
    });

    it("hide those not rising", async () => {
      const { scene } = await startBoard();

      expect(showing(scene.bolts.images)).toBe(0);
    });
  });

  describe("the tags", () => {
    it("lie under the paddle of a taller field", async () => {
      const { shell, run, scene } = await startBoard();
      reshapeField(shell.field, TALLEST_FIELD);
      shell.field.effects.net.capsule = "net";

      run.advance(16);

      expect(scene.tags.images.net.y).toBe(
        toCanvasY(tallestMetrics(), tagY(TALLEST_FIELD)),
      );
    });

    it("show each effect in play in a row under the paddle, in its capsule's frame", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.effects["paddle-size"].capsule = "wide";
      shell.field.effects["paddle-size"].endsAt = stepsIn(20_000);
      shell.field.effects.net.capsule = "net";
      const metrics = metricsAt();
      const first = firstTagX(shell.field.paddle.x, 2);

      run.advance(16);

      expect([
        placed(scene.tags.images["paddle-size"]),
        placed(scene.tags.images.net),
      ]).toEqual([
        {
          visible: true,
          frame: tagFrame("wide"),
          x: toCanvasX(metrics, first),
          y: toCanvasY(metrics, tagY(FIELD_HEIGHT)),
        },
        {
          visible: true,
          frame: tagFrame("net"),
          x: toCanvasX(metrics, first + TAG_SPACING),
          y: toCanvasY(metrics, tagY(FIELD_HEIGHT)),
        },
      ]);
    });

    it("draw a ring for each tag, in its capsule's tone", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.effects.pace.capsule = "fast";
      shell.field.effects.pace.endsAt = stepsIn(10_000);

      run.advance(16);

      expect(colorsOf(scene.tags.rings)).toEqual(
        expect.arrayContaining([LIGHT.wall, LIGHT.capsules.bad]),
      );
    });

    it("follow the paddle between its last place and its next", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.effects.net.capsule = "net";
      shell.field.paddle.lastX = 10;
      shell.field.paddle.x = 12;

      shell.alpha = 0.25;
      run.advance(16);

      expect(scene.tags.images.net.x).toBe(
        toCanvasX(metricsAt(), firstTagX(lerp(10, 12, 0.25), 1)),
      );
    });

    it("empty each tag's ring as its time runs out", async () => {
      const { shell, run, scene } = await startBoard();
      const wide = shell.field.effects["paddle-size"];
      wide.capsule = "wide";
      wide.endsAt = shell.field.steps + stepsIn(20_000) / 2;

      run.advance(16);

      // Half the time left draws half the ring, from its top round to its foot.
      expect(strokesOf(scene.tags.rings)).toContainEqual(
        expect.objectContaining({
          start: -Math.PI / 2,
          end: expect.closeTo(Math.PI / 2, 9) as unknown,
          anticlockwise: false,
        }),
      );
    });

    it("show none, and no rings, while no effect is in play", async () => {
      const { scene } = await startBoard();

      expect({
        tags: showing(Object.values(scene.tags.images)),
        rings: commandsOf(scene.tags.rings).length,
      }).toEqual({ tags: 0, rings: 0 });
    });
  });

  describe("what happens on the field", () => {
    it("swells a brick that holds a hit, and settles it back", async () => {
      const { shell, run, scene } = await startBoard();
      hitBrick(shell.field, brickAt(shell.field, 1, 0), 3, BRICKS_TOP + 1);
      const image = scene.bricks.images[cellIndex(1, 0)];

      run.advance(POP_MS / 2);
      const swollen = image?.scale ?? 0;
      run.advance(POP_MS);

      expect({ swollen: swollen > 1, settled: image?.scale }).toEqual({
        swollen: true,
        settled: 1,
      });
    });

    it("swells a bumper a ball turns off, and settles it back", async () => {
      const { run, scene } = await turnOffBumper();
      const image = scene.bricks.images[BUMPER];

      run.advance(POP_MS / 2);
      const swollen = image?.scale ?? 0;
      run.advance(POP_MS);

      expect({ swollen: swollen > 1, settled: image?.scale }).toEqual({
        swollen: true,
        settled: 1,
      });
    });

    it("throws a broken brick's shards from its middle, in its color", async () => {
      const { shell, run, scene } = await startBoard();
      const plain = brickAt(shell.field, 0, 0);
      hitBrick(shell.field, plain, 1, BRICKS_TOP + 1);
      const metrics = metricsAt();
      const middle = {
        x: toCanvasX(metrics, cellMiddleX(plain.cell)),
        y: toCanvasY(metrics, cellMiddleY(plain.cell)),
      };

      run.advance(16);

      expect({
        places: shardsOf(scene).map(({ x, y }) => ({ x, y })),
        tints: new Set(shardsOf(scene).map(({ tint }) => tint)),
      }).toEqual({
        places: Array.from({ length: SHARDS }, () => middle),
        tints: new Set([brickColor(plain, LIGHT)]),
      });
    });

    it("sends the shards flying apart from the brick, falling faster and faster", async () => {
      const { shell, run, scene } = await startBoard();
      const plain = brickAt(shell.field, 0, 0);
      hitBrick(shell.field, plain, 1, BRICKS_TOP + 1);
      run.advance(16);
      const thrown = shardsOf(scene);

      run.advance(160);
      const flying = shardsOf(scene);

      expect({
        apart: flying.some((shard, i) => shard.x !== thrown[i]?.x),
        falling: flying.map((shard, i) => shard.fall > (thrown[i]?.fall ?? 0)),
      }).toEqual({
        apart: true,
        falling: Array.from({ length: SHARDS }, () => true),
      });
    });

    it("fades and dims a broken brick's shards toward the field as they fall", async () => {
      const { shell, run, scene } = await startBoard();
      const plain = brickAt(shell.field, 0, 0);
      hitBrick(shell.field, plain, 1, BRICKS_TOP + 1);
      const color = brickColor(plain, LIGHT);
      run.advance(16);

      run.advance(SHARDS_MS / 2);
      const falling = shardsOf(scene);

      expect({
        count: falling.length,
        faded: falling.every(({ alpha }) => alpha < 0.6),
        tints: falling.map(({ tint }) => tint),
      }).toEqual({
        count: SHARDS,
        faded: true,
        tints: dimmedTints(falling, color, LIGHT.field),
      });
    });

    it("keeps dimming a broken brick's shards from its color as the field is laid out again", async () => {
      const { shell, run, scene } = await startBoard();
      const plain = brickAt(shell.field, 0, 0);
      hitBrick(shell.field, plain, 1, BRICKS_TOP + 1);
      const color = brickColor(plain, LIGHT);
      run.advance(16);

      shell.fingerSpace = 40;
      run.advance(SHARDS_MS / 2);
      const falling = shardsOf(scene);

      expect({
        count: falling.length,
        tints: falling.map(({ tint }) => tint),
      }).toEqual({
        count: SHARDS,
        tints: dimmedTints(falling, color, LIGHT.field),
      });
    });

    it("dims the shards toward a new palette's field", async () => {
      const { shell, run, scene } = await startBoard();
      const plain = brickAt(shell.field, 0, 0);
      hitBrick(shell.field, plain, 1, BRICKS_TOP + 1);
      const color = brickColor(plain, LIGHT);
      run.advance(16);

      shell.colors = DARK;
      run.advance(SHARDS_MS / 2);
      const falling = shardsOf(scene);

      expect({
        count: falling.length,
        tints: falling.map(({ tint }) => tint),
      }).toEqual({
        count: SHARDS,
        tints: dimmedTints(falling, color, DARK.field),
      });
    });

    it("has shed a broken brick's shards once their time is up", async () => {
      const { shell, run, scene } = await startBoard();
      hitBrick(shell.field, brickAt(shell.field, 0, 0), 1, BRICKS_TOP + 1);
      run.advance(16);

      run.advance(SHARDS_MS + 16);

      expect(shardsOf(scene)).toEqual([]);
    });

    it("keeps each broken brick's shards in its own color as another breaks", async () => {
      // A third brick keeps the level from clearing, which would hold them.
      const { shell, run, scene } = await startBoard((each) => {
        each.showField(["o3o"]);
      });
      const first = brickAt(shell.field, 0, 0);
      const second = brickAt(shell.field, 1, 0);
      hitBrick(shell.field, first, 1, BRICKS_TOP + 1);
      run.advance(16);

      hitBrick(shell.field, second, 3, BRICKS_TOP + 1, "breaks");
      run.advance(16);
      run.advance(SHARDS_MS / 4);
      const falling = shardsOf(scene);

      expect({
        count: falling.length,
        tints: falling.map(({ tint }) => tint),
      }).toEqual({
        count: 2 * SHARDS,
        tints: [
          ...dimmedTints(
            falling.slice(0, SHARDS),
            brickColor(first, LIGHT),
            LIGHT.field,
          ),
          ...dimmedTints(
            falling.slice(SHARDS),
            brickColor(second, LIGHT),
            LIGHT.field,
          ),
        ],
      });
    });

    it("spreads a blast's ring once, from where it went off, and shakes the field", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.events.add("blast", 5, 4, cellIndex(2, 2));
      const ring = imagesOf(scene.effects.rings)[0];

      run.advance(16);
      const started = {
        x: ring?.x,
        y: ring?.y,
        scale: ring?.scale ?? 0,
        alpha: ring?.alpha ?? 0,
        shaking: scene.cameras.main.shakeEffect.isRunning,
      };
      run.advance(RING_MS / 2);
      const spreading = { scale: ring?.scale ?? 0, alpha: ring?.alpha ?? 1 };
      run.advance(RING_MS);

      expect({
        at: [started.x, started.y],
        shaking: started.shaking,
        spreads: spreading.scale > started.scale,
        fades: spreading.alpha < started.alpha,
        after: showing(imagesOf(scene.effects.rings)),
      }).toEqual({
        at: [toCanvasX(metricsAt(), 5), toCanvasY(metricsAt(), 4)],
        shaking: true,
        spreads: true,
        fades: true,
        after: 0,
      });
    });

    it("fades a lost ball out where it fell, in its frame", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.ballKind = "blast";
      run.advance(16);
      shell.field.events.add("lost", 6, FIELD_HEIGHT);

      run.advance(16);
      const fading = imagesOf(scene.effects.fades)[0];
      const seen = {
        visible: fading?.visible,
        frame: fading?.frame.name,
        x: fading?.x,
        y: fading?.y,
      };
      run.advance(FADE_MS / 2);
      const halfway = fading?.alpha ?? 1;
      run.advance(FADE_MS);

      expect({
        ...seen,
        halfway: halfway < 1 && halfway > 0,
        after: fading?.visible,
      }).toEqual({
        visible: true,
        frame: facedBallFrame("blast"),
        x: toCanvasX(metricsAt(), 6),
        y: toCanvasY(metricsAt(), FIELD_HEIGHT),
        halfway: true,
        after: false,
      });
    });

    it("fades the last ball lost in its kind, though its effect ends as it is lost", async () => {
      const { shell, run, scene } = await startBoard();
      catchCapsule(shell.field, "fire", 13, PADDLE_TOP);
      throwBall(shell.field, 3, FIELD_HEIGHT - 0.5, 180);
      run.advance(16);

      stepTimes(shell.field, 30);
      run.advance(16);

      expect({
        kind: shell.field.ballKind,
        fading: imagesOf(scene.effects.fades)
          .filter((fade) => fade.visible)
          .map((fade) => fade.frame.name),
      }).toEqual({ kind: "normal", fading: [facedBallFrame("fire")] });
    });

    it("fades a lost friend in its ink", async () => {
      const { shell, run, scene } = await startBoard();
      throwBall(shell.field, 13, 20, 0);
      throwBall(shell.field, 3, FIELD_HEIGHT - 0.5, 180, 1).ink = 2;
      run.advance(16);

      stepTimes(shell.field, 30);
      run.advance(16);

      expect(fadingFrames(scene)).toEqual([facedBallFrame("normal", 2)]);
    });

    it("fades each ball lost at once in its own ink, by where it was lost", async () => {
      const { shell, run, scene } = await startBoard();
      throwBall(shell.field, 3, FIELD_HEIGHT - 0.5, 180);
      throwBall(shell.field, 9, FIELD_HEIGHT - 0.5, 180, 1).ink = 2;
      run.advance(16);

      stepTimes(shell.field, 30);
      run.advance(16);

      expect([...fadingFrames(scene)].sort()).toEqual(
        [facedBallFrame("normal"), facedBallFrame("normal", 2)].sort(),
      );
    });

    it("fades a lost friend in its ink, not in that of a ball lost there before and since out of sight", async () => {
      const { shell, run, scene } = await startBoard();
      throwBall(shell.field, 13, 20, 0);
      const friend = throwBall(shell.field, 3, FIELD_HEIGHT - 0.5, 180, 2);
      friend.ink = 2;
      run.advance(16);
      stepTimes(shell.field, 30);

      Object.assign(ballOf(shell.field, 1), { x: friend.x, ink: 4 });
      run.advance(16);

      expect(fadingFrames(scene)).toEqual([facedBallFrame("normal", 2)]);
    });

    it("grows a regrown brick back from nothing", async () => {
      const { shell, run, scene } = await startBoard();
      const cell = cellIndex(0, 0);
      shell.field.events.add("regrown", 1, BRICKS_TOP + 0.5, cell);
      const image = scene.bricks.images[cell];

      run.advance(16);
      const growing = image?.scale ?? 1;
      run.advance(REGROW_MS);

      expect({ growing: growing < 0.5, grown: image?.scale }).toEqual({
        growing: true,
        grown: 1,
      });
    });

    it("slides a slider that stepped from the cell it left into its new one", async () => {
      const { run, scene } = await stepSlider();

      run.advance(SLIDE_MS / 2);
      const sliding = leftOfPlace(scene, cellIndex(1, 0));
      run.advance(SLIDE_MS);

      expect({
        partway: sliding > 0 && sliding < 2,
        landed: leftOfPlace(scene, cellIndex(1, 0)),
      }).toEqual({ partway: true, landed: 0 });
    });

    it("slides a slider the way it stepped, though it has turned since", async () => {
      const { shell, run, scene } = await stepSlider();
      brickAt(shell.field, 1, 0).heading = -1;

      run.advance(SLIDE_MS / 2);

      expect(leftOfPlace(scene, cellIndex(1, 0))).toBeGreaterThan(0);
    });

    it("frames a glowing slider where it is drawn as it slides", async () => {
      const { shell, run, scene } = await stepSlider();
      shell.field.steps += stepsIn(GLOW_AFTER_MS);

      run.advance(SLIDE_MS / 2);

      expect({
        sliding: leftOfPlace(scene, cellIndex(1, 0)) > 0,
        framed: scene.glow.images[0]?.x,
      }).toEqual({
        sliding: true,
        framed: scene.bricks.images[cellIndex(1, 0)]?.x,
      });
    });

    it("leaves an ember for each gap a fire ball goes, however often it is drawn", async () => {
      const { shell, run, scene } = await startBoard();
      const ball = throwBall(shell.field, 4, 20, 0);
      shell.field.ballKind = "fire";
      run.advance(16);

      moveAcross(run, ball, 6.1, 3, 16);
      const atSixty = scene.balls.embers.getAliveParticleCount();
      run.advance(100);
      moveAcross(run, ball, 8.1, 6, 8);
      const atOneTwenty = scene.balls.embers.getAliveParticleCount();

      expect([atSixty, atOneTwenty]).toEqual([10, 10]);
    });

    it("starts a fire ball's trail where it shows, not where its place's last ball went", async () => {
      const { shell, run, scene } = await startBoard();
      const ball = throwBall(shell.field, 4, 20, 0);
      shell.field.ballKind = "fire";
      run.advance(16);
      ball.live = false;
      run.advance(16);

      throwBall(shell.field, 5, 20, 0);
      run.advance(16);

      expect(scene.balls.embers.getAliveParticleCount()).toBe(0);
    });

    it("leaves no ember under a fire ball standing still", async () => {
      const { shell, run, scene } = await startBoard();
      throwBall(shell.field, 4, 20, 0);
      shell.field.ballKind = "fire";

      run.advance(48);

      expect(scene.balls.embers.getAliveParticleCount()).toBe(0);
    });

    it("frames the last bricks a level needs once none has broken for a while", async () => {
      const { shell, run, scene } = await startBoard((shell) => {
        shell.showField(["o3#"]);
      });
      shell.field.steps = stepsIn(GLOW_AFTER_MS) - 1;
      run.advance(16);
      const before = showing(scene.glow.images);

      shell.field.steps = stepsIn(GLOW_AFTER_MS);
      run.advance(16);

      const y = toCanvasY(metricsAt(), BRICKS_TOP + 0.5);

      expect({
        before,
        after: scene.glow.images
          .filter((image) => image.visible)
          .map((image) => [image.x, image.y, image.alpha]),
      }).toEqual({
        before: 0,
        after: [
          [toCanvasX(metricsAt(), 1), y, 1],
          [toCanvasX(metricsAt(), 3), y, 1],
        ],
      });
    });

    it("darkens the last bricks' glow as one of them breaks", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.steps = stepsIn(GLOW_AFTER_MS);
      run.advance(16);

      hitBrick(shell.field, brickAt(shell.field, 0, 0), 1, BRICKS_TOP + 1);
      run.advance(16);

      expect(showing(scene.glow.images)).toBe(0);
    });

    it("glows a new level's last bricks from when it started", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.steps = 2 * stepsIn(GLOW_AFTER_MS);
      hitBrick(shell.field, brickAt(shell.field, 0, 0), 1, BRICKS_TOP + 1);
      run.advance(16);

      shell.showField(ROWS_DRAWN);
      run.advance(16);
      shell.field.steps = stepsIn(GLOW_AFTER_MS);
      run.advance(16);

      expect(showing(scene.glow.images)).toBe(2);
    });

    it("plays each event once, however many frames pass", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.events.add("blast", 5, 4, cellIndex(2, 2));

      run.advance(RING_MS * 3);

      expect(showing(imagesOf(scene.effects.rings))).toBe(0);
    });
  });

  describe("a ball's tail", () => {
    it.each([
      [4, 0],
      [5, 4],
      [10, 6],
      [20, TAIL_MOST],
    ])(
      "follows a ball in a streak of %i with %i dots",
      async (streak, dots) => {
        const { scene } = await flyAcross(streak);

        const shown = tailDotsOf(scene);

        expect(shown).toHaveLength(dots);
      },
    );

    it("lays its dots at the ball's last places, a gap apart behind it, nearest first", async () => {
      const { scene } = await flyAcross(20);
      const metrics = metricsAt();

      const places = tailDotsOf(scene).map(({ x, y }) => ({ x, y }));

      expect(places).toEqual(
        Array.from({ length: TAIL_MOST }, (_, dot) => ({
          x: toCanvasX(metrics, 14 - (dot + 1) * TAIL_GAP),
          y: toCanvasY(metrics, 20),
        })),
      );
    });

    it("fades and shrinks its dots from the nearest back, in the balls' color", async () => {
      const { scene } = await flyAcross(20);

      const dots = tailDotsOf(scene);

      expect({
        fainter: dots.every((dot, i) => dot.alpha < (dots[i - 1]?.alpha ?? 1)),
        smaller: dots.every((dot, i) => dot.scale < (dots[i - 1]?.scale ?? 2)),
        tints: new Set(dots.map((dot) => dot.tint)),
      }).toEqual({
        fainter: true,
        smaller: true,
        tints: new Set([LIGHT.balls.normal]),
      });
    });

    it("tints a friend's tail by its ink", async () => {
      const { scene } = await flyAcross(20, (shell) => {
        ballOf(shell.field, 0).ink = 2;
      });

      const dots = tailDotsOf(scene);

      expect(new Set(dots.map((dot) => dot.tint))).toEqual(
        new Set([LIGHT.friendInks[2]]),
      );
    });

    it("follows each ball in flight with a tail of its own", async () => {
      const { shell, run, scene } = await startBoard();
      throwBall(shell.field, 2, 20, 90);
      const second = throwBall(shell.field, 2, 10, 90, 1);
      shell.field.streak = 20;

      moveAcross(run, second, 14, 24, 16);

      expect(
        scene.tails.byBall.map(
          ({ dots }) => dots.filter((dot) => dot.visible).length,
        ),
      ).toEqual(
        Array.from({ length: MAX_BALLS }, (_, ball) =>
          ball === 1 ? TAIL_MOST : 0,
        ),
      );
    });

    it("follows a ball where it is drawn, between its last place and its next", async () => {
      const { shell, run, scene } = await flyAcross(20);
      const ball = ballOf(shell.field, 0);
      ball.lastX = 14;
      ball.x = 16;

      shell.alpha = 0.5;
      run.advance(16);

      expect(tailDotsOf(scene)[0]?.x).toBe(
        toCanvasX(metricsAt(), 15 - TAIL_GAP),
      );
    });

    it("goes as the paddle ends the streak", async () => {
      const { shell, run, scene } = await flyAcross(20);

      shell.field.streak = 0;
      run.advance(16);

      expect(tailDotsOf(scene)).toEqual([]);
    });

    it("goes as the ball comes to rest on the paddle", async () => {
      const { shell, run, scene } = await flyAcross(20);

      ballOf(shell.field, 0).held = true;
      run.advance(16);

      expect(tailDotsOf(scene)).toEqual([]);
    });

    it("starts afresh where the ball comes out of a portal, though it went into one near", async () => {
      const { shell, run, scene } = await flyAcross(20);
      const ball = ballOf(shell.field, 0);
      Object.assign(ball, { x: 10, y: 14, lastX: 10, lastY: 14, jumpedAt: 1 });

      run.advance(16);

      expect(tailDotsOf(scene)).toEqual([]);
    });
  });

  describe("a streak's step", () => {
    it("rings the ball as a broken brick takes the streak to a step, in the balls' color", async () => {
      const { scene } = await stepTo(5);
      const metrics = metricsAt();

      const { ring } = scene.streak;

      expect({
        visible: ring.visible,
        x: ring.x,
        y: ring.y,
        tint: ring.tint,
      }).toEqual({
        visible: true,
        x: toCanvasX(metrics, 6),
        y: toCanvasY(metrics, 12),
        tint: LIGHT.balls.normal,
      });
    });

    it.each(STREAK_STEPS)(
      "shows a streak of %i beside the ball, above it and to its right, in whole pixels",
      async (streak) => {
        const { scene } = await stepTo(streak);
        const metrics = metricsAt();

        const count = countShown(scene);

        expect({
          text: count?.text,
          right: (count?.x ?? 0) > toCanvasX(metrics, 6),
          above:
            (count?.y ?? 0) + (count?.height ?? 0) < toCanvasY(metrics, 12),
          whole: Number.isInteger(count?.x) && Number.isInteger(count?.y),
        }).toEqual({
          text: String(streak),
          right: true,
          above: true,
          whole: true,
        });
      },
    );

    it("writes the count in the balls' color, outlined as a ball is", async () => {
      const { scene } = await stepTo(5);

      const style = countShown(scene)?.style;

      expect({ color: style?.color, stroke: style?.stroke }).toEqual({
        color: cssHex(LIGHT.balls.normal),
        stroke: cssHex(LIGHT.outline),
      });
    });

    it("writes each count again in a new palette", async () => {
      const { shell, run, scene } = await startBoard();

      shell.colors = DARK;
      run.advance(16);

      expect(new Set(countsOf(scene).map(({ style }) => style.color))).toEqual(
        new Set([cssHex(DARK.balls.normal)]),
      );
    });

    it("spreads the ring and fades it and the count, then hides both once its time is up", async () => {
      const { run, scene } = await stepTo(5);
      const { ring } = scene.streak;
      const started = ring.scale;

      run.advance(STREAK_MS * 0.75);
      const playing = {
        spread: ring.scale > started,
        ring: ring.alpha < 1,
        count: (countShown(scene)?.alpha ?? 1) < 1,
      };
      run.advance(STREAK_MS);

      expect({ playing, ring: ring.visible, count: countShown(scene) }).toEqual(
        {
          playing: { spread: true, ring: true, count: true },
          ring: false,
          count: undefined,
        },
      );
    });

    it("follows the ball as it goes", async () => {
      const { shell, run, scene } = await stepTo(5);
      const ball = ballOf(shell.field, 0);

      ball.x = 8;
      ball.lastX = 8;
      run.advance(16);

      expect(scene.streak.ring.x).toBe(toCanvasX(metricsAt(), 8));
    });

    it("plays nothing as a broken brick lengthens the streak between steps", async () => {
      const { scene } = await stepTo(6);

      expect({
        ring: scene.streak.ring.visible,
        count: countShown(scene),
      }).toEqual({ ring: false, count: undefined });
    });

    it("writes each count again in the page's font once the page has loaded it", async () => {
      const asked: string[] = [];
      let loaded = (): void => undefined;
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value: {
          load: (font: string): Promise<[]> => {
            asked.push(font);
            return new Promise((resolve) => {
              loaded = () => {
                resolve([]);
              };
            });
          },
        },
      });
      onTestFinished(() => {
        Reflect.deleteProperty(document, "fonts");
      });
      const { scene } = await startBoard(undefined, (game) => {
        game.canvas.style.fontFamily = "Figtree";
      });
      const counts = countsOf(scene);
      // What a count measures can't be read through Phaser's types, so the
      // spec reads that each count was measured again.
      const measured = vi.spyOn(GameObjects.TextStyle.prototype, "update");
      onTestFinished(() => {
        measured.mockRestore();
      });

      loaded();
      await Promise.resolve();

      expect({
        families: new Set(counts.map(({ style }) => style.fontFamily)),
        asked,
        measuredAgain: measured.mock.contexts.filter(
          (_, i) => measured.mock.calls[i]?.[0] === true,
        ),
      }).toEqual({
        families: new Set(["Figtree"]),
        asked: ["700 16px Figtree"],
        measuredAgain: counts.map(({ style }) => style),
      });
    });

    it.each([5, 15])(
      "writes the ring and the count of %i in the color of the balls' kind, at a mark of 15",
      async (streak) => {
        const { scene } = await stepTo(streak, (shell) => {
          markedAt(15)(shell);
          shell.field.ballKind = "fire";
        });

        expect({
          ring: scene.streak.ring.tint,
          count: countShown(scene)?.style.color,
        }).toEqual({
          ring: LIGHT.balls.fire,
          count: cssHex(LIGHT.balls.fire),
        });
      },
    );

    it("writes the ring and the count in a friend's ink, about a friend", async () => {
      const { scene } = await stepTo(5, (shell) => {
        ballOf(shell.field, 0).ink = 2;
      });
      const ink = LIGHT.friendInks[2] ?? NaN;

      expect({
        ring: scene.streak.ring.tint,
        count: countShown(scene)?.style.color,
      }).toEqual({ ring: ink, count: cssHex(ink) });
    });

    it("shows the newest step's count alone", async () => {
      const { shell, run, scene } = await stepTo(5);

      shell.field.streak = 9;
      hitBrick(shell.field, brickAt(shell.field, 1, 0), 6, 12, "breaks");
      run.advance(16);

      expect(
        countsOf(scene)
          .filter((count) => count.visible)
          .map((count) => count.text),
      ).toEqual(["10"]);
    });

    it("rings the ball and shows the streak's count as a broken brick takes it to the level's mark", async () => {
      const { scene } = await stepTo(15, markedAt(15));

      expect({
        ring: scene.streak.ring.visible,
        count: countShown(scene)?.text,
      }).toEqual({ ring: true, count: "15" });
    });

    it("shows a mark on a step with the step's count alone, writing no second", async () => {
      const { scene } = await stepTo(10, markedAt(10));

      expect({
        shown: countsOf(scene)
          .filter((count) => count.visible)
          .map((count) => count.text),
        mark: scene.streak.markCount.text,
      }).toEqual({ shown: ["10"], mark: "" });
    });

    it("writes each level's mark as it starts", async () => {
      const { shell, run, scene } = await startBoard(markedAt(15));
      const first = scene.streak.markCount.text;

      markedAt(30)(shell);
      run.advance(16);

      expect([first, scene.streak.markCount.text]).toEqual(["15", "30"]);
    });
  });

  describe("a ball meeting the paddle", () => {
    it("squashes the ball wider and flatter, its eyes with it", async () => {
      const { scene } = await meetPaddle();

      expect({
        ball: scaleOf(scene.balls.images[0]),
        eyes: scaleOf(scene.balls.eyes[0]),
      }).toEqual({ ball: SQUASHED, eyes: SQUASHED });
    });

    it("drops a caught ball and its eyes toward the paddle as it squashes, pressing its foot into the pad", async () => {
      const { run, scene } = await meetPaddle(catching);
      const dropped = DEEPEST_SQUASH.drop * BALL_RADIUS * metricsAt().unit;
      const [image, eyes] = [scene.balls.images[0], scene.balls.eyes[0]];
      const squashed = { ball: image?.y ?? NaN, eyes: eyes?.y ?? NaN };

      run.advance(MEET_MS);

      expect([
        squashed.ball - (image?.y ?? NaN),
        squashed.eyes - (eyes?.y ?? NaN),
      ]).toEqual([expect.closeTo(dropped), expect.closeTo(dropped)]);
    });

    it("rounds the ball again once their meeting is over", async () => {
      const { run, scene } = await meetPaddle();

      run.advance(MEET_MS);

      expect({
        ball: scaleOf(scene.balls.images[0]),
        eyes: scaleOf(scene.balls.eyes[0]),
      }).toEqual({ ball: [1, 1], eyes: [1, 1] });
    });

    it("squashes the ball nearest where they met, and no other", async () => {
      const { scene } = await meetPaddle((shell) => {
        throwBall(shell.field, 20, 10, 0, 1);
      });

      expect(scene.balls.images.slice(0, 2).map(scaleOf)).toEqual([
        SQUASHED,
        [1, 1],
      ]);
    });

    it("squashes a ball the paddle catches", async () => {
      const { shell, scene } = await meetPaddle(catching);

      expect({
        held: ballOf(shell.field, 0).held,
        ball: scaleOf(scene.balls.images[0]),
      }).toEqual({ held: true, ball: SQUASHED });
    });

    it("dips the pad a tenth of a unit, in whole pixels, the rest of the paddle still", async () => {
      const { shell, scene } = await meetPaddle();
      const metrics = metricsAt();
      const top = toCanvasY(metrics, shell.field.paddle.top);

      expect({
        pad: scene.paddle.pad.y,
        body: scene.paddle.body.y,
      }).toEqual({
        pad:
          top + paddleShape(metrics).pad.top + Math.round(0.1 * metrics.unit),
        body: top,
      });
    });

    it("raises the pad again once their meeting is over", async () => {
      const { shell, run, scene } = await meetPaddle();
      const metrics = metricsAt();

      run.advance(MEET_MS);

      expect(scene.paddle.pad.y).toBe(
        toCanvasY(metrics, shell.field.paddle.top) +
          paddleShape(metrics).pad.top,
      );
    });
  });

  describe("the last brick's hold", () => {
    it("holds the last brick's shards where they were thrown, then lets them fly", async () => {
      const { shell, run, scene } = await startBoard();
      clearLevel(shell);
      run.advance(16);
      const thrown = shardPlacesOf(scene);

      run.advance(HOLD_MS - 16);
      const held = shardPlacesOf(scene);
      run.advance(32);
      const flying = shardPlacesOf(scene);

      expect({
        held,
        moved: flying.some((place, i) => place.x !== thrown[i]?.x),
      }).toEqual({
        held: thrown,
        moved: true,
      });
    });

    it("holds a ring that plays as the level clears, then spreads it on", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.events.add("blast", 5, 4, cellIndex(2, 2));
      clearLevel(shell);
      run.advance(16);
      const ring = imagesOf(scene.effects.rings)[0];
      const thrown = ring?.scale;

      run.advance(HOLD_MS - 16);
      const held = ring?.scale;
      run.advance(32);

      expect({ held, spread: (ring?.scale ?? 0) > (thrown ?? 0) }).toEqual({
        held: thrown,
        spread: true,
      });
    });
  });

  describe("where the player prefers less motion", () => {
    it("plays no flourish", async () => {
      const { shell, run, scene } = await startBoard(stillness);
      throwBall(shell.field, 4, 20, 0);
      shell.field.ballKind = "fire";
      hitBrick(shell.field, brickAt(shell.field, 1, 0), 3, BRICKS_TOP + 1);
      hitBrick(shell.field, brickAt(shell.field, 0, 0), 1, BRICKS_TOP + 1);
      shell.field.events.add("blast", 5, 4, cellIndex(2, 2));
      shell.field.events.add("lost", 6, FIELD_HEIGHT);
      shell.field.events.add("regrown", 1, BRICKS_TOP + 0.5, cellIndex(0, 0));

      run.advance(16);

      expect({
        shards: shardsOf(scene).length,
        embers: scene.balls.embers.getAliveParticleCount(),
        rings: showing(imagesOf(scene.effects.rings)),
        fades: showing(imagesOf(scene.effects.fades)),
        shaking: scene.cameras.main.shakeEffect.isRunning,
        scaled: scene.bricks.images.filter((image) => image.scale !== 1).length,
      }).toEqual({
        shards: 0,
        embers: 0,
        rings: 0,
        fades: 0,
        shaking: false,
        scaled: 0,
      });
    });

    it("squashes no ball and dips no pad as they meet", async () => {
      const { shell, scene } = await meetPaddle(stillness);
      const metrics = metricsAt();

      expect({
        ball: scaleOf(scene.balls.images[0]),
        pad: scene.paddle.pad.y,
      }).toEqual({
        ball: [1, 1],
        pad:
          toCanvasY(metrics, shell.field.paddle.top) +
          paddleShape(metrics).pad.top,
      });
    });

    it("shows a slider that stepped at its new cell at once", async () => {
      const { run, scene } = await stepSlider(stillness);

      run.advance(16);

      expect({
        left: scene.bricks.images[cellIndex(0, 0)]?.visible,
        shown: scene.bricks.images[cellIndex(1, 0)]?.visible,
        behind: leftOfPlace(scene, cellIndex(1, 0)),
      }).toEqual({ left: false, shown: true, behind: 0 });
    });

    it("plays no streak's step", async () => {
      const { scene } = await stepTo(5, stillness);

      expect({
        ring: scene.streak.ring.visible,
        count: countShown(scene),
      }).toEqual({ ring: false, count: undefined });
    });

    it("plays nothing as a broken brick takes the streak to the level's mark", async () => {
      const { scene } = await stepTo(15, (shell) => {
        markedAt(15)(shell);
        stillness(shell);
      });

      expect({
        ring: scene.streak.ring.visible,
        count: countShown(scene),
      }).toEqual({ ring: false, count: undefined });
    });

    it("draws no ball's tail in a streak", async () => {
      const { scene } = await flyAcross(20, stillness);

      const shown = tailDotsOf(scene);

      expect(shown).toEqual([]);
    });

    it("holds the last bricks' glow still", async () => {
      const { shell, run, scene } = await startBoard(stillness);

      shell.field.steps = stepsIn(GLOW_AFTER_MS + GLOW_PULSE_MS / 2);
      run.advance(16);

      expect(scene.glow.images[0]?.alpha).toBe(1);
    });

    it("holds the last bricks' glow still once the player turns motion off", async () => {
      const { shell, run, scene } = await startBoard();
      stillness(shell);

      shell.field.steps = stepsIn(GLOW_AFTER_MS + GLOW_PULSE_MS / 2);
      run.advance(16);

      expect(scene.glow.images[0]?.alpha).toBe(1);
    });
  });

  describe("a new level", () => {
    it("makes no game object after the first", async () => {
      const { shell, run, scene } = await startBoard();
      const first = objectsIn(scene);

      shell.showField(["*?~+#"]);
      throwBall(shell.field, 4, 20, 0);
      shell.field.ballKind = "fire";
      hitBrick(shell.field, brickAt(shell.field, 0, 0), 1, BRICKS_TOP + 1);
      shell.field.events.add("lost", 6, FIELD_HEIGHT);
      shell.field.effects.net.capsule = "net";
      run.advance(DROP_IN_MS);

      expect(objectsIn(scene)).toBe(first);
    });

    it("stops what the last level set off", async () => {
      const { shell, run, scene } = await startBoard();
      throwBall(shell.field, 4, 20, 0);
      shell.field.ballKind = "fire";
      hitBrick(shell.field, brickAt(shell.field, 0, 0), 1, BRICKS_TOP + 1);
      hitBrick(shell.field, brickAt(shell.field, 1, 0), 3, BRICKS_TOP + 1);
      shell.field.events.add("blast", 5, 4, cellIndex(2, 2));
      shell.field.events.add("lost", 6, FIELD_HEIGHT);
      run.advance(16);

      shell.showField(ROWS_DRAWN);
      run.advance(16);

      expect({
        shards: shardsOf(scene).length,
        embers: scene.balls.embers.getAliveParticleCount(),
        rings: showing(imagesOf(scene.effects.rings)),
        fades: showing(imagesOf(scene.effects.fades)),
        shaking: scene.cameras.main.shakeEffect.isRunning,
        scaled: scene.bricks.images.filter((image) => image.scale !== 1).length,
      }).toEqual({
        shards: 0,
        embers: 0,
        rings: 0,
        fades: 0,
        shaking: false,
        scaled: 0,
      });
    });

    it("stops the last level's streak's step", async () => {
      const { shell, run, scene } = await stepTo(5);

      shell.showField(ROWS_DRAWN);
      run.advance(16);

      expect({
        ring: scene.streak.ring.visible,
        count: countShown(scene),
      }).toEqual({ ring: false, count: undefined });
    });

    it("rounds a ball and raises the pad the last level's meeting left", async () => {
      const { shell, run, scene } = await meetPaddle();
      const metrics = metricsAt();

      shell.showField(ROWS_DRAWN);
      run.advance(16);

      expect({
        ball: scaleOf(scene.balls.images[0]),
        pad: scene.paddle.pad.y,
      }).toEqual({
        ball: [1, 1],
        pad:
          toCanvasY(metrics, shell.field.paddle.top) +
          paddleShape(metrics).pad.top,
      });
    });

    it("starts each ball's tail anew", async () => {
      const { shell, run, scene } = await flyAcross(20);

      shell.showField(ROWS_DRAWN);
      throwBall(shell.field, 14.5, 20, 90);
      shell.field.streak = 20;
      run.advance(16);

      expect(tailDotsOf(scene)).toEqual([]);
    });

    it("plays the new level's events from its first", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.events.add("wall", 0, 5);
      shell.field.events.add("wall", 0, 6);
      run.advance(16);

      shell.showField(ROWS_DRAWN);
      shell.field.events.add("blast", 5, 4, cellIndex(2, 2));
      run.advance(16);

      expect(showing(imagesOf(scene.effects.rings))).toBe(1);
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

    it("hand How to play the atlas's picture of each brick, ball and capsule as the shell asks for them", async () => {
      const { shell, scene } = await startBoard();
      const baked = (frame: string): string =>
        scene.textures.getBase64(ATLAS, frame);

      const pictures = shell.askPictures();

      expect([
        pictures.bricks.tough,
        pictures.balls.fire,
        pictures.capsules.net,
      ]).toEqual([
        baked(PICTURE_FRAMES.bricks.tough),
        baked(PICTURE_FRAMES.balls.fire),
        baked(PICTURE_FRAMES.capsules.net),
      ]);
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

      // The headless canvas encodes a picture as its size alone, so only a
      // new encoding tells this bake's from the last.
      expect(again).not.toBe(asked);
    });
  });

  describe("the sounds", () => {
    /**
     * Returns each sound the scenes play from now on, with how far it rose,
     * as they play it. The sprite can't load headless, so playing leaves
     * nothing else to look at.
     */
    function soundsPlayed(): [string, number][] {
      const played: [string, number][] = [];
      vi.spyOn(SpritePlayer.prototype, "play").mockImplementation(
        (name: string, config) => {
          played.push([name, config?.detune ?? 0]);
        },
      );
      return played;
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

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

    it("play a broken brick's, risen along its streak's scale", async () => {
      const { shell, run } = await startBoard();
      const played = soundsPlayed();
      shell.field.streak = 4;

      hitBrick(shell.field, brickAt(shell.field, 0, 0), 1, 3);
      run.advance(16);

      expect(played).toEqual([["broken", 900]]);
    });

    it("play a key's chime, risen along its streak's scale, and the gates' sweep as the last key opens them", async () => {
      const { shell, run } = await startBoard((each) => {
        each.showField(["ok="]);
      });
      const played = soundsPlayed();
      shell.field.streak = 2;

      hitBrick(shell.field, brickAt(shell.field, 1, 0), 3, BRICKS_TOP + 1);
      run.advance(16);

      expect(played).toEqual([
        ["key", 400],
        ["gates", 0],
      ]);
    });

    it("rattle a cage's bars as a hit bends one", async () => {
      const { shell, run } = await startBoard((each) => {
        each.showField(["oc"]);
      });
      const played = soundsPlayed();

      hitBrick(shell.field, brickAt(shell.field, 1, 0), 3, BRICKS_TOP + 1);
      run.advance(16);

      expect(played).toEqual([["cage", 0]]);
    });

    it("play a broken brick's bloop and a cage's rattle as it frees its friend", async () => {
      const { shell, run } = await startBoard((each) => {
        each.showField(["oc"]);
        playWithoutBall(each.field);
      });
      const cage = brickAt(shell.field, 1, 0);
      hitBrick(shell.field, cage, 3, BRICKS_TOP + 1);
      run.advance(16);
      const played = soundsPlayed();

      hitBrick(shell.field, cage, 3, BRICKS_TOP + 1);
      run.advance(16);

      expect(played).toEqual([
        ["broken", 0],
        ["cage", 0],
      ]);
    });

    it("boing a bumper as a ball turns off it", async () => {
      const played = soundsPlayed();

      await turnOffBumper();

      expect(played).toEqual([["bumper", 0]]);
    });

    it("boing a bumper as a bolt strikes it", async () => {
      const { shell, run } = await startBoard((each) => {
        each.showField(["oO"]);
      });
      const played = soundsPlayed();

      hitBrick(shell.field, brickAt(shell.field, 1, 0), 3, BRICKS_TOP + 1);
      run.advance(16);

      expect(played).toEqual([["bumper", 0]]);
    });

    it("whoosh as a ball comes out of a portal's twin", async () => {
      const { shell, run } = await startBoard((each) => {
        each.showField(["o", "......@", "", "", "", "", "", "", "......@"]);
      });
      throwBall(shell.field, cellMiddleX(cellIndex(6, 8)), 12, 0);
      stepTimes(shell.field, 4);
      const played = soundsPlayed();

      run.advance(16);

      expect({ events: eventsOf(shell.field), played }).toEqual({
        events: ["portalled"],
        played: [["portal", 0]],
      });
    });

    it("play nothing as a slider steps on the field's beat", async () => {
      const { shell, run } = await stepSlider();
      const played = soundsPlayed();

      run.advance(16);

      expect({ events: eventsOf(shell.field), played }).toEqual({
        events: ["slid"],
        played: [],
      });
    });

    it("play the clear's chord once the last brick's hit has held", async () => {
      const { shell, run } = await startBoard();
      const played = soundsPlayed();
      clearLevel(shell);
      run.advance(16);

      run.advance(HOLD_MS - 16);
      const holding = [...played];
      run.advance(16);

      expect({ holding, held: played }).toEqual({
        holding: [["broken", 200]],
        held: [
          ["broken", 200],
          ["cleared", 0],
        ],
      });
    });

    it("play the clear's chord after the hold where the player prefers less motion too", async () => {
      const { shell, run } = await startBoard(stillness);
      const played = soundsPlayed();
      clearLevel(shell);
      run.advance(16);

      run.advance(HOLD_MS - 16);
      const holding = [...played];
      run.advance(16);

      expect({ holding, held: played }).toEqual({
        holding: [["broken", 200]],
        held: [
          ["broken", 200],
          ["cleared", 0],
        ],
      });
    });

    it("play the chime once, after the hold, as the points bring a life with the clear", async () => {
      const { shell, run } = await startBoard();
      const played = soundsPlayed();
      clearLevel(shell);
      shell.chimesCalled += 1;
      run.advance(16);

      run.advance(HOLD_MS - 16);
      const holding = [...played];
      run.advance(16);

      expect({ holding, held: played }).toEqual({
        holding: [["broken", 200]],
        held: [
          ["broken", 200],
          ["cleared", 0],
        ],
      });
    });

    it("play the last level's chord at once as a new level starts during its wait", async () => {
      const { shell, run } = await startBoard(stillness);
      const played = soundsPlayed();
      clearLevel(shell);
      run.advance(16);

      shell.showField(ROWS_DRAWN);
      run.advance(16);

      expect(played).toEqual([
        ["broken", 200],
        ["cleared", 0],
      ]);
    });

    it("play the chime each time the shell calls for it", async () => {
      const { shell, run } = await startBoard();
      const played = soundsPlayed();

      shell.chimesCalled += 1;
      run.advance(16);
      run.advance(16);
      shell.chimesCalled += 1;
      run.advance(16);

      expect(played).toEqual([
        ["cleared", 0],
        ["cleared", 0],
      ]);
    });

    it("play no chime the shell called for before the scene began", async () => {
      const played = soundsPlayed();

      await startBoard((shell) => {
        shell.chimesCalled = 3;
      });

      expect(played).toEqual([]);
    });

    it("leave the field playing where they can't be loaded", async () => {
      const { shell, run, scene } = await startBoard();

      hitBrick(shell.field, brickAt(shell.field, 0, 0), 1, 3);
      run.advance(16);

      expect(scene.sounds.loaded).toBe(false);
      expect(shardsOf(scene)).not.toHaveLength(0);
    });
  });

  describe("once it ends", () => {
    it("calls the shell no more, and lets go of the game's events", async () => {
      const awayEvents = [Core.Events.BLUR, Core.Events.HIDDEN];
      let listening: number[] = [];
      const { shell, run, scene } = await startBoard(undefined, (game) => {
        listening = awayEvents.map((name) => game.events.listenerCount(name));
      });
      const calls = (): number =>
        shell.ticks.length + shell.layouts.length + shell.bakes.length;

      run.game.scene.stop(scene.key);
      const before = calls();
      run.advance(48);
      run.key("keydown", "Space", " ");
      run.advance(16);

      expect({
        calls: calls() - before,
        commands: shell.commands,
        listening: awayEvents.map((name) =>
          run.game.events.listenerCount(name),
        ),
      }).toEqual({ calls: 0, commands: [], listening });
    });
  });
});
