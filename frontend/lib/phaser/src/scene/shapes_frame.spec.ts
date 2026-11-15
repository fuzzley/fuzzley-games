import { type GameObjects, Math as PhaserMath } from "phaser";
import type { HostedScene } from "../host";
import {
  type ArtFrame,
  type DrawCommand,
  circle,
  line,
  polygon,
  polyline,
  rect,
  ring,
  roundRect,
} from "../shapes";
import { type SceneRun, runBareScene } from "../testing";
import { atlasFrameOf } from "./shapes_frame";

/** The points of a polyline and a polygon. */
const POINTS = [
  { x: 1, y: 7 },
  { x: 4, y: 2 },
  { x: 9, y: 6 },
] as const;

/** Returns the points as the vectors a `Graphics` takes. */
function vectors(): PhaserMath.Vector2[] {
  return POINTS.map((point) => new PhaserMath.Vector2(point.x, point.y));
}

/** Draws a shape by hand with a `Graphics`, in styles at an alpha where one is given. */
type ByHand = (graphics: GameObjects.Graphics, alpha?: number) => void;

/** A shape of each kind, and how a `Graphics` draws it by hand. */
const SHAPES: readonly [string, DrawCommand, ByHand][] = [
  [
    "a rectangle",
    rect({ x: 1, y: 2, width: 3, height: 4 }, { color: 0x112233 }),
    (graphics, alpha) => {
      graphics.fillStyle(0x112233, alpha);
      graphics.fillRect(1, 2, 3, 4);
    },
  ],
  [
    "a rounded rectangle",
    roundRect({ x: 1, y: 2, width: 9, height: 7 }, 3, { color: 0x112233 }),
    (graphics, alpha) => {
      graphics.fillStyle(0x112233, alpha);
      graphics.fillRoundedRect(1, 2, 9, 7, 3);
    },
  ],
  [
    "a circle",
    circle({ x: 5, y: 6 }, 3, { color: 0x112233 }),
    (graphics, alpha) => {
      graphics.fillStyle(0x112233, alpha);
      graphics.fillCircle(5, 6, 3);
    },
  ],
  [
    "a ring",
    ring({ x: 5, y: 6 }, 3, { color: 0x112233, width: 2 }),
    (graphics, alpha) => {
      graphics.lineStyle(2, 0x112233, alpha);
      graphics.strokeCircle(5, 6, 3);
    },
  ],
  [
    "a line",
    line({ x: 1, y: 2 }, { x: 7, y: 9 }, { color: 0x112233, width: 2 }),
    (graphics, alpha) => {
      graphics.lineStyle(2, 0x112233, alpha);
      graphics.lineBetween(1, 2, 7, 9);
    },
  ],
  [
    "a polyline",
    polyline(POINTS, { color: 0x112233, width: 2 }),
    (graphics, alpha) => {
      graphics.lineStyle(2, 0x112233, alpha);
      graphics.strokePoints(vectors());
    },
  ],
  [
    "a polygon",
    polygon(POINTS, { color: 0x112233 }),
    (graphics, alpha) => {
      graphics.fillStyle(0x112233, alpha);
      graphics.fillPoints(vectors(), true);
    },
  ],
];

/** Returns a frame of one shape. */
function frameOf(command: DrawCommand): ArtFrame {
  return { name: "shape", width: 10, height: 10, commands: [command] };
}

describe("atlasFrameOf", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Returns a new `Graphics` in a bare scene. */
  async function newGraphics(): Promise<GameObjects.Graphics> {
    run ??= await runBareScene();
    return run.scene.add.graphics();
  }

  afterEach(() => {
    run?.destroy();
    run = null;
  });

  it("keeps the frame's name and size", () => {
    const frame = { name: "dot", width: 6, height: 4, commands: [] };

    const drawn = atlasFrameOf(frame);

    expect({
      name: drawn.name,
      width: drawn.width,
      height: drawn.height,
    }).toEqual({ name: "dot", width: 6, height: 4 });
  });

  it.each(SHAPES)(
    "draws %s as the Graphics draws one",
    async (_name, command, byHand) => {
      const drawn = await newGraphics();
      const expected = await newGraphics();
      byHand(expected);

      atlasFrameOf(frameOf(command)).draw(drawn);

      expect(drawn.commandBuffer).toEqual(expected.commandBuffer);
    },
  );

  it.each(SHAPES)(
    "draws %s at its alpha, as the Graphics draws one in a style at it",
    async (_name, command, byHand) => {
      const drawn = await newGraphics();
      const expected = await newGraphics();
      byHand(expected, 0.4);

      atlasFrameOf(frameOf({ ...command, alpha: 0.4 })).draw(drawn);

      expect(drawn.commandBuffer).toEqual(expected.commandBuffer);
    },
  );

  it("draws each shape in turn, over those before it", async () => {
    const drawn = await newGraphics();
    const expected = await newGraphics();
    expected.fillStyle(1);
    expected.fillCircle(5, 5, 4);
    expected.lineStyle(1, 2);
    expected.strokeCircle(5, 5, 2);

    atlasFrameOf({
      name: "target",
      width: 10,
      height: 10,
      commands: [
        circle({ x: 5, y: 5 }, 4, { color: 1 }),
        ring({ x: 5, y: 5 }, 2, { color: 2, width: 1 }),
      ],
    }).draw(drawn);

    expect(drawn.commandBuffer).toEqual(expected.commandBuffer);
  });
});
