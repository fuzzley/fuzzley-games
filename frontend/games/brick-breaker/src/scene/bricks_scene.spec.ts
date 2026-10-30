import { NO_INSETS } from "@fz/phaser/insets";
import type { CssRect } from "@fz/phaser/layout";
import { SpritePlayer } from "@fz/phaser/sound";
import { type SceneRun, runScene } from "@fz/phaser/testing";
import { Core, type Game, GameObjects } from "phaser";
import { hitBrick } from "../rules/bricks";
import { catchCapsule } from "../rules/capsules";
import type { Ball } from "../rules/balls";
import { cellIndex, cellMiddleX, cellMiddleY } from "../rules/grid";
import type { Steer } from "../rules/paddle";
import { stepsIn } from "../rules/stepper";
import {
  BOLT_INSET,
  BRICKS_TOP,
  COLUMNS,
  FIELD_HEIGHT,
  PADDLE_HEIGHT,
  PADDLE_TOP,
  ROWS,
} from "../rules/tuning";
import {
  ballOf,
  brickAt,
  fieldFrom,
  stepTimes,
  throwBall,
} from "../testing/field_picture";
import {
  PICTURE_FRAMES,
  type Pictures,
  atlasFrames,
  ballFrame,
  capsuleFrame,
  tagFrame,
} from "../view/art";
import { brickColor, brickFrame } from "../view/brick_art";
import type { FieldCommand } from "../view/controls";
import {
  type FieldMetrics,
  fieldMetrics,
  toCanvasX,
  toCanvasY,
  toFieldX,
} from "../view/field_metrics";
import { SOUNDS } from "../view/effects";
import type { FieldFrame } from "../view/frame";
import { type BricksPalette, bricksPalette } from "../view/palette";
import { lineWidth } from "../view/shapes";
import type { TouchSteering } from "../view/steering";
import { between } from "../view/frame";
import { TAG_SPACING, TAG_Y, firstTagX } from "../view/tags";
import {
  DROP_IN_MS,
  FADE_MS,
  GLOW_AFTER_MS,
  GLOW_PULSE_MS,
  POP_MS,
  REGROW_MS,
  RING_MS,
  SHARDS,
} from "../view/timing";
import { ATLAS } from "./atlas";
import spritemap from "./sounds/sounds.json";
import {
  type BricksScene,
  type BricksSceneOptions,
  makeBricksScene,
} from "./bricks_scene";

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
  readonly ticks: Tick[] = [];
  readonly layouts: CssRect[] = [];
  readonly commands: FieldCommand[] = [];
  readonly pictures: Pictures[] = [];

  readonly tick = (deltaMs: number, steer: Readonly<Steer>): void => {
    this.ticks.push({ deltaMs, steer: { ...steer } });
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
  readonly onLayout = (field: CssRect): void => {
    this.layouts.push(field);
  };
  readonly command = (command: FieldCommand): void => {
    this.commands.push(command);
  };
  readonly onPictures = (pictures: Pictures): void => {
    this.pictures.push(pictures);
  };

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

let running: SceneRun<BricksScene> | null = null;
/** The element the running scene's keyboard listens on. */
let listening: HTMLElement | null = null;

afterEach(() => {
  running?.destroy();
  running = null;
  listening?.remove();
  listening = null;
});

/** Runs the scene for a shell, its first frame drawn, in a game readied first as a spec asks. */
async function startBoard(
  setUp: (shell: FakeShell) => void = () => undefined,
  prepare: (game: Game) => void = () => undefined,
): Promise<Board> {
  const shell = new FakeShell();
  setUp(shell);
  const keys = document.createElement("div");
  keys.tabIndex = 0;
  document.body.append(keys);
  listening = keys;
  const run = await runScene(makeBricksScene(shell), {
    config: { input: { keyboard: { target: keys } } },
    prepare,
  });
  running = run;
  run.advance(16);
  return { shell, run, scene: run.scene, keys };
}

/** Returns how many game objects a scene holds, those in its layers too. */
function objectsIn(scene: BricksScene): number {
  const count = (objects: readonly GameObjects.GameObject[]): number =>
    objects.reduce(
      (sum, object) =>
        sum + 1 + (isLayer(object) ? count(object.getChildren()) : 0),
      0,
    );
  return count(scene.children.getChildren());
}

/** Returns whether a game object is a layer, which holds others. */
function isLayer(object: GameObjects.GameObject): object is GameObjects.Layer {
  return object.type === "Layer";
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

/** Returns every image a scene holds, those in its layers too. */
function imagesIn(scene: BricksScene): GameObjects.Image[] {
  const walk = (
    objects: readonly GameObjects.GameObject[],
  ): GameObjects.GameObject[] =>
    objects.flatMap((object) =>
      isLayer(object) ? walk(object.getChildren()) : [object],
    );
  return walk(scene.children.getChildren()).filter(
    (object): object is GameObjects.Image =>
      object instanceof GameObjects.Image,
  );
}

/** Returns where each shard alive is, and how fast it falls. */
function shardsOf(scene: BricksScene): readonly {
  readonly x: number;
  readonly y: number;
  readonly fall: number;
}[] {
  const shards: { x: number; y: number; fall: number }[] = [];
  scene.effects.shards.forEachAlive((shard) => {
    shards.push({ x: shard.x, y: shard.y, fall: shard.velocityY });
  }, null);
  return shards;
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

/** Returns how many of a set of images show. */
function showing(images: readonly GameObjects.Image[]): number {
  return images.filter((image) => image.visible).length;
}

/** Returns the field's layout on the spec's 400 × 400 canvas, at a pixel to a pixel. */
function metricsAt(width = 400, height = 400): FieldMetrics {
  return fieldMetrics({ width, height, pixelRatio: 1, insets: NO_INSETS });
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

      expect(shell.layouts).toEqual([metricsAt().css]);
    });

    it("lays the field out again when the canvas changes size", async () => {
      const { shell, run } = await startBoard();

      run.game.scale.resize(600, 400);
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(metricsAt(600, 400).css);
    });

    it("bakes the atlas again at a new unit", async () => {
      const { run, scene } = await startBoard();

      run.game.scale.resize(600, 600);
      run.advance(16);

      expect(scene.textures.getFrame(ATLAS, "plain-0").width).toBe(
        2 * metricsAt(600, 600).unit,
      );
    });

    it("has every image take up its frame anew at a new unit, and the paddle its new height", async () => {
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
        paddle: Math.round(PADDLE_HEIGHT * metricsAt(600, 600).unit),
      });
    });

    it("bakes once for a new unit and a new palette in the same frame", async () => {
      const { shell, run } = await startBoard();
      const baked = shell.pictures.length;

      run.game.scale.resize(600, 600);
      shell.colors = DARK;
      run.advance(16);

      expect(shell.pictures.length - baked).toBe(1);
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

      expect(scene.field.graphics.commandBuffer).toEqual(
        expect.arrayContaining([LIGHT.field, LIGHT.wall]),
      );
    });

    it("is painted again in a new palette", async () => {
      const { shell, run, scene } = await startBoard();

      shell.colors = DARK;
      run.advance(16);

      expect(scene.field.graphics.commandBuffer).toEqual(
        expect.arrayContaining([DARK.field, DARK.wall]),
      );
    });

    it("shows the net while there is one", async () => {
      const { shell, run, scene } = await startBoard();

      shell.field.net = true;
      run.advance(16);

      expect(scene.field.graphics.commandBuffer).toEqual(
        expect.arrayContaining([LIGHT.capsules.good]),
      );
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

    it("drop a lower row in after a higher one", async () => {
      const { run, scene } = await startBoard((shell) => {
        shell.showField(["o", "", "", "o"]);
      });
      const metrics = metricsAt();

      run.advance(DROP_IN_MS + 32);

      expect({
        top: scene.bricks.images[cellIndex(0, 0)]?.y,
        lower:
          (scene.bricks.images[cellIndex(0, 3)]?.y ?? 0) <
          toCanvasY(metrics, BRICKS_TOP + 3.5),
      }).toEqual({ top: toCanvasY(metrics, BRICKS_TOP + 0.5), lower: true });
    });

    it("drop in again as a new level starts", async () => {
      const { shell, run, scene } = await startBoard();
      run.advance(DROP_IN_MS + 64);

      shell.showField(["oo"]);
      run.advance(16);

      expect(scene.bricks.images[0]?.alpha).toBeLessThan(1);
    });

    it("show in place at once where the player prefers less motion", async () => {
      const { scene } = await startBoard(stillness);

      expect(scene.bricks.images[0]).toMatchObject({
        y: toCanvasY(metricsAt(), BRICKS_TOP + 0.5),
        alpha: 1,
      });
    });
  });

  describe("the paddle", () => {
    it("is drawn at its width, its middle at the paddle's and its top on the paddle's line", async () => {
      const { shell, scene } = await startBoard();
      const metrics = metricsAt();
      const paddle = shell.field.paddle;
      const x = toCanvasX(metrics, paddle.x);
      const width = Math.round(paddle.width * metrics.unit);
      const [left, right] = scene.paddle.ends;

      expect({
        left: (left?.x ?? 0) - (left?.displayWidth ?? 0) / 2,
        right: (right?.x ?? 0) + (right?.displayWidth ?? 0) / 2,
        middle: scene.paddle.body.x,
        top: scene.paddle.body.y,
      }).toEqual({
        left: x - width / 2,
        right: x + width / 2,
        middle: x,
        top: toCanvasY(metrics, PADDLE_TOP),
      });
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
      "shows, in %s mode, the cannons: %s, and the rim: %s",
      async (mode, cannons, rim) => {
        const { shell, run, scene } = await startBoard();

        shell.field.mode = mode;
        run.advance(16);

        expect({
          cannons: scene.paddle.cannons.map((cannon) => cannon.visible),
          rim: scene.paddle.rim.visible,
        }).toEqual({ cannons: [cannons, cannons], rim });
      },
    );

    it("puts a laser's cannons over its ends, above it", async () => {
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
        scene.paddle.cannons.map((cannon) => [
          cannon.x,
          cannon.y + cannon.height / 2,
        ]),
      ).toEqual([
        [x - inset, top],
        [x + inset, top],
      ]);
    });

    it("lays a catching paddle's rim a line below its top, along its body", async () => {
      const { shell, run, scene } = await startBoard();
      const metrics = metricsAt();
      const width = Math.round(shell.field.paddle.width * metrics.unit);

      shell.field.mode = "catch";
      run.advance(16);

      expect({
        x: scene.paddle.rim.x,
        y: scene.paddle.rim.y,
        width: scene.paddle.rim.displayWidth,
      }).toEqual({
        x: toCanvasX(metrics, shell.field.paddle.x),
        y: toCanvasY(metrics, PADDLE_TOP) + lineWidth(metrics),
        width: width - scene.paddle.body.height,
      });
    });

    it("keeps its ends round as it widens", async () => {
      const { shell, run, scene } = await startBoard();
      const height = scene.paddle.body.height;

      shell.field.paddle.width = 6;
      run.advance(16);

      expect({
        ends: scene.paddle.ends.map((end) => end.displayWidth),
        body: scene.paddle.body.displayWidth,
      }).toEqual({
        ends: [height, height],
        body: Math.round(6 * metricsAt().unit) - height,
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
        rim: scene.paddle.rim.fillColor,
      }).toEqual({ before: LIGHT.paddle, body: DARK.paddle, rim: DARK.mark });
    });
  });

  describe("the balls", () => {
    it("show the ball waiting on the paddle, in its kind's frame", async () => {
      const { scene } = await startBoard();

      const shown = scene.balls.images.filter((image) => image.visible);

      expect(shown.map((image) => image.frame.name)).toEqual([
        ballFrame("normal"),
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

      expect(scene.balls.images[0]?.frame.name).toBe(ballFrame("fire"));
    });

    it("hide a ball once it is lost", async () => {
      const { shell, run, scene } = await startBoard();

      ballOf(shell.field).live = false;
      run.advance(16);

      expect(scene.balls.images[0]?.visible).toBe(false);
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
          y: toCanvasY(metrics, TAG_Y),
        },
        {
          visible: true,
          frame: tagFrame("net"),
          x: toCanvasX(metrics, first + TAG_SPACING),
          y: toCanvasY(metrics, TAG_Y),
        },
      ]);
    });

    it("draw a ring for each tag, in its capsule's tone", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.effects.pace.capsule = "fast";
      shell.field.effects.pace.endsAt = stepsIn(10_000);

      run.advance(16);

      expect(scene.tags.rings.commandBuffer).toEqual(
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
        toCanvasX(metricsAt(), firstTagX(between(10, 12, 0.25), 1)),
      );
    });

    it("empty each tag's ring as its time runs out", async () => {
      const { shell, run, scene } = await startBoard();
      const wide = shell.field.effects["paddle-size"];
      wide.capsule = "wide";
      wide.endsAt = shell.field.steps + stepsIn(20_000) / 2;

      run.advance(16);

      // Half the time left draws half the ring, from its top round to its foot.
      expect(
        scene.tags.rings.commandBuffer.some(
          (value: unknown) =>
            typeof value === "number" && Math.abs(value - Math.PI / 2) < 1e-9,
        ),
      ).toBe(true);
    });

    it("show none, and no rings, while no effect is in play", async () => {
      const { scene } = await startBoard();

      expect({
        tags: showing(Object.values(scene.tags.images)),
        rings: scene.tags.rings.commandBuffer.length,
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

      const tints = new Set<number>();
      scene.effects.shards.forEachAlive((shard) => tints.add(shard.tint), null);

      expect({
        places: shardsOf(scene).map(({ x, y }) => ({ x, y })),
        tints,
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

    it("spreads a blast's ring once, from where it went off, and shakes the field", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.events.add("blast", 5, 4, cellIndex(2, 2));
      const ring = scene.effects.rings[0];

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
        after: showing(scene.effects.rings),
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
      const fading = scene.effects.fades[0];
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
        frame: ballFrame("blast"),
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
        fading: scene.effects.fades
          .filter((fade) => fade.visible)
          .map((fade) => fade.frame.name),
      }).toEqual({ kind: "normal", fading: [ballFrame("fire")] });
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

      expect(showing(scene.effects.rings)).toBe(0);
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
        shards: scene.effects.shards.getAliveParticleCount(),
        embers: scene.balls.embers.getAliveParticleCount(),
        rings: showing(scene.effects.rings),
        fades: showing(scene.effects.fades),
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

    it("holds the last bricks' glow still", async () => {
      const { shell, run, scene } = await startBoard(stillness);

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
        shards: scene.effects.shards.getAliveParticleCount(),
        embers: scene.balls.embers.getAliveParticleCount(),
        rings: showing(scene.effects.rings),
        fades: showing(scene.effects.fades),
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

    it("plays the new level's events from its first", async () => {
      const { shell, run, scene } = await startBoard();
      shell.field.events.add("wall", 0, 5);
      shell.field.events.add("wall", 0, 6);
      run.advance(16);

      shell.showField(ROWS_DRAWN);
      shell.field.events.add("blast", 5, 4, cellIndex(2, 2));
      run.advance(16);

      expect(showing(scene.effects.rings)).toBe(1);
    });
  });

  describe("the pictures", () => {
    it("hand How to play the atlas's picture of each brick, ball and capsule", async () => {
      const { shell, scene } = await startBoard();
      const baked = (frame: string): string =>
        scene.textures.getBase64(ATLAS, frame);

      const pictures = shell.pictures.at(-1);

      expect([
        pictures?.bricks.tough,
        pictures?.balls.fire,
        pictures?.capsules.net,
      ]).toEqual([
        baked(PICTURE_FRAMES.bricks.tough),
        baked(PICTURE_FRAMES.balls.fire),
        baked(PICTURE_FRAMES.capsules.net),
      ]);
    });

    it("are handed over again in a new palette", async () => {
      const { shell, run } = await startBoard();

      shell.colors = DARK;
      run.advance(16);

      expect(shell.pictures).toHaveLength(2);
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

    it("play a broken brick's, risen along its streak", async () => {
      const { shell, run } = await startBoard();
      const played = soundsPlayed();
      shell.field.streak = 4;

      hitBrick(shell.field, brickAt(shell.field, 0, 0), 1, 3);
      run.advance(16);

      expect(played).toEqual([["broken", 400]]);
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
        shell.ticks.length + shell.layouts.length + shell.pictures.length;

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
