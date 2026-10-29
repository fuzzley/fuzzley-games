import { NO_INSETS } from "@fz/phaser/insets";
import type { CssRect } from "@fz/phaser/layout";
import { type SceneRun, runScene } from "@fz/phaser/testing";
import { Core } from "phaser";
import { hitBrick } from "../rules/bricks";
import { cellIndex } from "../rules/grid";
import type { Steer } from "../rules/paddle";
import { BRICKS_TOP, COLUMNS, ROWS } from "../rules/tuning";
import {
  ballOf,
  brickAt,
  fieldFrom,
  throwBall,
} from "../testing/field_picture";
import { atlasFrames, ballFrame, brickFrame } from "../view/art";
import type { FieldCommand } from "../view/controls";
import {
  type FieldMetrics,
  fieldMetrics,
  toCanvasX,
  toCanvasY,
  toFieldX,
} from "../view/field_metrics";
import type { FieldFrame } from "../view/frame";
import { type BricksPalette, bricksPalette } from "../view/palette";
import type { TouchSteering } from "../view/steering";
import { DROP_IN_MS } from "../view/timing";
import { ATLAS } from "./atlas";
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
  readonly ticks: Tick[] = [];
  readonly layouts: CssRect[] = [];
  readonly commands: FieldCommand[] = [];

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
  readonly onLayout = (field: CssRect): void => {
    this.layouts.push(field);
  };
  readonly command = (command: FieldCommand): void => {
    this.commands.push(command);
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

afterEach(() => {
  running?.destroy();
  running = null;
});

/** Runs the scene for a shell, its first frame drawn. */
async function startBoard(
  setUp: (shell: FakeShell) => void = () => undefined,
): Promise<Board> {
  const shell = new FakeShell();
  setUp(shell);
  const keys = document.createElement("div");
  keys.tabIndex = 0;
  document.body.append(keys);
  const run = await runScene(makeBricksScene(shell), {
    config: { input: { keyboard: { target: keys } } },
  });
  running = run;
  run.advance(16);
  return { shell, run, scene: run.scene, keys };
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
    it("is drawn at its width, its middle at the paddle's", async () => {
      const { shell, scene } = await startBoard();
      const metrics = metricsAt();
      const paddle = shell.field.paddle;

      expect(scene.paddle.paddle).toMatchObject({
        x: toCanvasX(metrics, paddle.x),
        width: Math.round(paddle.width * metrics.unit),
      });
    });

    it("is drawn between its last place and its next", async () => {
      const { shell, run, scene } = await startBoard();
      const paddle = shell.field.paddle;
      paddle.lastX = 10;
      paddle.x = 12;

      shell.alpha = 0.25;
      run.advance(16);

      expect(scene.paddle.paddle.x).toBe(toCanvasX(metricsAt(), 10.5));
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

    it("keeps its ends whole as it widens", async () => {
      const { shell, run, scene } = await startBoard();
      const ends = scene.paddle.paddle.leftWidth;

      shell.field.paddle.width = 6;
      run.advance(16);

      expect(scene.paddle.paddle).toMatchObject({
        leftWidth: ends,
        rightWidth: ends,
        width: Math.round(6 * metricsAt().unit),
      });
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
      const ball = throwBall(shell.field, 4, 20, 0);
      ball.y = 19;

      shell.alpha = 0.5;
      run.advance(16);

      expect(scene.balls.images[0]).toMatchObject({
        x: toCanvasX(metricsAt(), 4),
        y: toCanvasY(metricsAt(), 19.5),
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

    it("leave Enter on a button over the field to press the button", async () => {
      const { shell, run, keys } = await startBoard();
      const resume = document.createElement("button");
      keys.append(resume);

      resume.dispatchEvent(
        new KeyboardEvent("keydown", { code: "Enter", bubbles: true }),
      );
      run.advance(16);

      expect(shell.commands).toEqual([]);
    });

    it("ignore a held key, a shortcut and a key the game doesn't use", async () => {
      const { shell, run, keys } = await startBoard();

      keys.dispatchEvent(
        new KeyboardEvent("keydown", { code: "Space", repeat: true }),
      );
      keys.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyP", ctrlKey: true }),
      );
      run.key("keydown", "KeyQ", "q");
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
});
