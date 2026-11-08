import type { GameObjects } from "phaser";
import type { HostedScene } from "../host";
import {
  type GraphicsCommand,
  colorsOf,
  commandsOf,
  strokesOf,
} from "./graphics_commands";
import { type SceneRun, runBareScene } from "./run_scene";

let run: SceneRun<HostedScene> | null = null;

/** Returns a `Graphics` in a bare scene, holding no command yet. */
async function graphics(): Promise<GameObjects.Graphics> {
  run = await runBareScene();
  return run.scene.add.graphics().clear();
}

afterEach(() => {
  run?.destroy();
  run = null;
});

// Each command is given arguments that differ, so one read in another's place
// shows. A release of Phaser that numbers its commands anew fails here, not
// in a game's spec.
describe("commandsOf", () => {
  it.each<[string, (drawn: GameObjects.Graphics) => unknown, GraphicsCommand]>([
    [
      "arc",
      (drawn) => drawn.arc(1, 2, 3, 0.5, 1.5, true, 0.25),
      {
        kind: "arc",
        x: 1,
        y: 2,
        radius: 3,
        start: 0.5,
        end: 1.5,
        anticlockwise: true,
        overshoot: 0.25,
      },
    ],
    ["beginPath", (drawn) => drawn.beginPath(), { kind: "beginPath" }],
    ["closePath", (drawn) => drawn.closePath(), { kind: "closePath" }],
    [
      "fillRect",
      (drawn) => drawn.fillRect(1, 2, 3, 4),
      { kind: "fillRect", x: 1, y: 2, width: 3, height: 4 },
    ],
    ["lineTo", (drawn) => drawn.lineTo(1, 2), { kind: "lineTo", x: 1, y: 2 }],
    ["moveTo", (drawn) => drawn.moveTo(1, 2), { kind: "moveTo", x: 1, y: 2 }],
    [
      "lineStyle",
      (drawn) => drawn.lineStyle(2, 0xff0000, 0.5),
      { kind: "lineStyle", width: 2, color: 0xff0000, alpha: 0.5 },
    ],
    [
      "fillStyle",
      (drawn) => drawn.fillStyle(0x00ff00, 0.5),
      { kind: "fillStyle", color: 0x00ff00, alpha: 0.5 },
    ],
    ["fillPath", (drawn) => drawn.fillPath(), { kind: "fillPath" }],
    ["strokePath", (drawn) => drawn.strokePath(), { kind: "strokePath" }],
    [
      "fillTriangle",
      (drawn) => drawn.fillTriangle(1, 2, 3, 4, 5, 6),
      { kind: "fillTriangle", points: [1, 2, 3, 4, 5, 6] },
    ],
    [
      "strokeTriangle",
      (drawn) => drawn.strokeTriangle(1, 2, 3, 4, 5, 6),
      { kind: "strokeTriangle", points: [1, 2, 3, 4, 5, 6] },
    ],
    ["save", (drawn) => drawn.save(), { kind: "save" }],
    ["restore", (drawn) => drawn.restore(), { kind: "restore" }],
    [
      "translateCanvas",
      (drawn) => drawn.translateCanvas(1, 2),
      { kind: "translateCanvas", x: 1, y: 2 },
    ],
    [
      "scaleCanvas",
      (drawn) => drawn.scaleCanvas(1, 2),
      { kind: "scaleCanvas", x: 1, y: 2 },
    ],
    [
      "rotateCanvas",
      (drawn) => drawn.rotateCanvas(0.5),
      { kind: "rotateCanvas", radians: 0.5 },
    ],
    [
      "fillGradientStyle",
      (drawn) =>
        drawn.fillGradientStyle(0x11, 0x22, 0x33, 0x44, 0.1, 0.2, 0.3, 0.4),
      {
        kind: "fillGradientStyle",
        colors: [0x11, 0x22, 0x33, 0x44],
        alphas: [0.1, 0.2, 0.3, 0.4],
      },
    ],
    [
      "lineGradientStyle",
      (drawn) => drawn.lineGradientStyle(2, 0x11, 0x22, 0x33, 0x44, 0.5),
      {
        kind: "lineGradientStyle",
        width: 2,
        colors: [0x11, 0x22, 0x33, 0x44],
        alpha: 0.5,
      },
    ],
  ])("reads %s as Phaser writes it", async (_name, draw, command) => {
    const drawn = await graphics();

    draw(drawn);

    expect(commandsOf(drawn)).toEqual([command]);
  });

  it("reads the commands a shape is drawn with, in order", async () => {
    const drawn = await graphics();

    drawn.strokeCircle(10, 20, 5);

    expect(commandsOf(drawn)).toEqual([
      { kind: "beginPath" },
      {
        kind: "arc",
        x: 10,
        y: 20,
        radius: 5,
        start: 0,
        end: 2 * Math.PI,
        anticlockwise: false,
        overshoot: 0,
      },
      { kind: "strokePath" },
    ]);
  });

  it("refuses a number that names no command, whose arguments it can't step over", async () => {
    const drawn = await graphics();

    drawn.commandBuffer.push(99);

    expect(() => commandsOf(drawn)).toThrow("names no command");
  });
});

describe("strokesOf", () => {
  it("reads each arc stroked, in the line it was given", async () => {
    const drawn = await graphics();

    drawn.lineStyle(2, 0xff0000, 1);
    drawn.strokeCircle(10, 20, 5);
    drawn.lineStyle(3, 0x00ff00, 0.5);
    drawn.beginPath();
    drawn.arc(30, 40, 6, 0, Math.PI, true);
    drawn.strokePath();

    expect(strokesOf(drawn)).toEqual([
      {
        x: 10,
        y: 20,
        radius: 5,
        start: 0,
        end: 2 * Math.PI,
        anticlockwise: false,
        width: 2,
        color: 0xff0000,
      },
      {
        x: 30,
        y: 40,
        radius: 6,
        start: 0,
        end: Math.PI,
        anticlockwise: true,
        width: 3,
        color: 0x00ff00,
      },
    ]);
  });

  // WebGL gives each point of an arc the width in force as the arc is added
  // to its path (phaser/src/gameobjects/graphics/GraphicsWebGLRenderer.js),
  // draws each segment that wide (phaser/src/renderer/webgl/renderNodes/
  // StrokePath.js), and tints it with the line in force at strokePath.
  it("strokes an arc in the width set as it is drawn and the color set as its path is stroked, as WebGL draws it", async () => {
    const drawn = await graphics();

    drawn.lineStyle(2, 0xff0000);
    drawn.beginPath();
    drawn.arc(10, 20, 5, 0, Math.PI);
    drawn.lineStyle(3, 0x00ff00);
    drawn.strokePath();

    expect(strokesOf(drawn)).toMatchObject([{ width: 2, color: 0x00ff00 }]);
  });

  it("strokes an arc a pixel wide where no line was set, as WebGL starts", async () => {
    const drawn = await graphics();

    drawn.strokeCircle(10, 20, 5);

    expect(strokesOf(drawn)).toMatchObject([{ width: 1, color: 0 }]);
  });

  it("strokes an arc in a gradient's width and color where its corners share one", async () => {
    const drawn = await graphics();

    drawn.lineGradientStyle(4, 0x22, 0x22, 0x22, 0x22);
    drawn.strokeCircle(10, 20, 5);

    expect(strokesOf(drawn)).toMatchObject([{ width: 4, color: 0x22 }]);
  });

  it("refuses an arc stroked in a gradient of several colors, which no one color describes", async () => {
    const drawn = await graphics();

    drawn.lineGradientStyle(4, 0x11, 0x22, 0x33, 0x44);
    drawn.strokeCircle(10, 20, 5);

    expect(() => strokesOf(drawn)).toThrow("no one color describes");
  });

  it("leaves out an arc filled, and what else is drawn", async () => {
    const drawn = await graphics();

    drawn.fillStyle(0xff0000);
    drawn.fillCircle(10, 20, 5);
    drawn.fillRect(0, 0, 4, 4);
    drawn.lineStyle(2, 0x00ff00);
    drawn.lineBetween(0, 0, 4, 4);
    drawn.lineGradientStyle(2, 0x11, 0x22, 0x33, 0x44);
    drawn.lineBetween(0, 0, 4, 4);

    expect(strokesOf(drawn)).toEqual([]);
  });
});

describe("colorsOf", () => {
  it("reads the color of each fill and line style, and each corner of a gradient's, in order", async () => {
    const drawn = await graphics();

    drawn.fillStyle(0x11);
    drawn.fillRect(0, 0, 4, 4);
    drawn.lineStyle(2, 0x22);
    drawn.fillGradientStyle(0x31, 0x32, 0x33, 0x34);
    drawn.lineGradientStyle(2, 0x41, 0x42, 0x43, 0x44);

    expect(colorsOf(drawn)).toEqual([
      0x11, 0x22, 0x31, 0x32, 0x33, 0x34, 0x41, 0x42, 0x43, 0x44,
    ]);
  });
});
