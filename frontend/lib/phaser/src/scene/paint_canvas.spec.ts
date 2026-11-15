import { type Scene, Textures } from "phaser";
import {
  type DrawCommand,
  type PaintCommand,
  circle,
  line,
  polygon,
  polyline,
  rect,
  ring,
  roundRect,
  wash,
} from "../shapes";
import { runBareScene, watchUploads } from "../testing";
import { bakeTexture } from "./bake_texture";
import { paintCommands, paintTexture } from "./paint_canvas";
import { atlasFrameOf } from "./shapes_frame";

/** A call a context was given, by its method's name, or a property set on it, by its name and "=". */
type Call = readonly [string, ...unknown[]];

/** A 2D context that keeps what it is asked, in turn, and draws nothing. */
interface Recording {
  readonly context: CanvasRenderingContext2D;
  readonly calls: Call[];
}

/** How a recording context records a style set to the gradient it made. */
const GRADIENT = "the gradient";

/**
 * Returns a context that records each call and each property set in turn,
 * a gradient it makes recording its stops among them and a style set to it
 * as {@link GRADIENT}, and draws nothing; it starts at whole alpha, as a
 * canvas's context does.
 */
function recordingContext(): Recording {
  const calls: Call[] = [];
  const state: Record<PropertyKey, unknown> = { globalAlpha: 1 };
  const gradient = {
    addColorStop: (...args: unknown[]) => {
      calls.push(["addColorStop", ...args]);
    },
  };
  const context = new Proxy(state, {
    get: (target, key) =>
      key in target
        ? target[key]
        : (...args: unknown[]) => {
            calls.push([String(key), ...args]);
            return gradient;
          },
    set: (target, key, value) => {
      calls.push([`${String(key)}=`, value === gradient ? GRADIENT : value]);
      target[key] = value;
      return true;
    },
  });
  // A stand-in for the browser's context, which the code under test only calls into.
  return { context: context as unknown as CanvasRenderingContext2D, calls };
}

/** Returns what a context is asked to paint a shape as `atlasFrameOf()` has a `Graphics` draw it on a canvas. */
async function graphicsCalls(command: DrawCommand): Promise<Call[]> {
  const run = await runBareScene();
  const graphics = run.scene.make.graphics({}, false);
  // A Graphics opens its buffer with its default styles, which paint nothing.
  graphics.commandBuffer.length = 0;
  atlasFrameOf({
    name: "shape",
    width: 10,
    height: 10,
    commands: [command],
  }).draw(graphics);
  const { context, calls } = recordingContext();
  const canvas = document.createElement("canvas");
  Object.defineProperty(canvas, "getContext", { value: () => context });
  graphics.generateTexture(canvas, 10, 10);
  run.destroy();
  // Phaser's renderer sets the context up and begins a fresh path before it
  // plays the shape, and restores the context after.
  const begun = calls.findIndex(([name]) => name === "beginPath");
  return calls.slice(begun + 1, -1);
}

/** Returns what a context is asked to paint commands. */
function paintedCalls(commands: readonly PaintCommand[]): Call[] {
  const { context, calls } = recordingContext();
  paintCommands(context, commands);
  return calls;
}

/** The points of a polyline and a polygon. */
const POINTS = [
  { x: 1, y: 7 },
  { x: 4, y: 2 },
  { x: 9, y: 6 },
] as const;

/** A shape of each kind. */
const SHAPES: readonly [string, DrawCommand][] = [
  [
    "a rectangle",
    rect({ x: 1, y: 2, width: 3, height: 4 }, { color: 0x112233 }),
  ],
  [
    "a rounded rectangle",
    roundRect({ x: 1, y: 2, width: 9, height: 7 }, 3, { color: 0x112233 }),
  ],
  ["a circle", circle({ x: 5, y: 6 }, 3, { color: 0x112233 })],
  ["a ring", ring({ x: 5, y: 6 }, 3, { color: 0x112233, width: 2 })],
  [
    "a line",
    line({ x: 1, y: 2 }, { x: 7, y: 9 }, { color: 0x112233, width: 2 }),
  ],
  ["a polyline", polyline(POINTS, { color: 0x112233, width: 2 })],
  ["a polygon", polygon(POINTS, { color: 0x112233 })],
];

/** A wash about a middle, turned a little, fading from a color to nothing. */
const WASH = wash(
  { x: 20, y: 10, radiusX: 16, radiusY: 8, turn: 0.5 },
  {
    stops: [
      { at: 0, color: 0x336699, alpha: 0.75 },
      { at: 1, color: 0x336699, alpha: 0 },
    ],
    alpha: 0.4,
  },
);

describe("paintCommands", () => {
  it.each(SHAPES)(
    "paints %s as atlasFrameOf() has a Graphics draw one on a canvas",
    async (_name, command) => {
      const expected = await graphicsCalls(command);

      const calls = paintedCalls([command]);

      expect(calls).toEqual(expected);
    },
  );

  it.each(SHAPES)(
    "paints %s at its alpha as atlasFrameOf() has a Graphics draw one",
    async (_name, command) => {
      const faded = { ...command, alpha: 1 / 3 };
      const expected = await graphicsCalls(faded);

      const calls = paintedCalls([faded]);

      expect(calls).toEqual(expected);
    },
  );

  it("paints a wash as a circle stretched to its radii and turned about its middle, filled with a radial gradient of its stops, at its alpha", () => {
    const calls = paintedCalls([WASH]);

    expect(calls).toEqual([
      ["save"],
      ["translate", 20, 10],
      ["rotate", 0.5],
      ["scale", 16, 8],
      ["createRadialGradient", 0, 0, 0, 0, 0, 1],
      ["addColorStop", 0, "rgba(51,102,153,0.75)"],
      ["addColorStop", 1, "rgba(51,102,153,0)"],
      ["fillStyle=", GRADIENT],
      ["globalAlpha=", 0.4],
      ["beginPath"],
      ["arc", 0, 0, 1, 0, 2 * Math.PI, false],
      ["fill"],
      ["restore"],
    ]);
  });

  it("paints a wash at its alpha under the context's own", () => {
    const { context, calls } = recordingContext();
    context.globalAlpha = 0.5;

    paintCommands(context, [WASH]);

    expect(calls).toContainEqual(["globalAlpha=", 0.2]);
  });

  it("paints a wash with no alpha at the context's own", () => {
    const { alpha: _, ...whole } = WASH;
    const { context, calls } = recordingContext();
    context.globalAlpha = 0.5;

    paintCommands(context, [whole]);

    expect(calls).toContainEqual(["globalAlpha=", 0.5]);
  });

  it.each([
    ["no width", { ...WASH, radiusX: 0 }],
    ["no height", { ...WASH, radiusY: 0 }],
  ])("paints nothing of a wash of %s", (_name, flat) => {
    expect(paintedCalls([flat])).toEqual([]);
  });

  it("paints each command in turn, over those before it", () => {
    const square = rect({ x: 0, y: 0, width: 4, height: 4 }, { color: 1 });
    const dot = circle({ x: 2, y: 2 }, 1, { color: 2 });
    const apart = [square, WASH, dot].flatMap((command) =>
      paintedCalls([command]),
    );

    const calls = paintedCalls([square, WASH, dot]);

    expect(calls).toEqual(apart);
  });
});

describe("paintTexture", () => {
  /** A square of a color, the whole of the picture painted. */
  const SQUARE = [
    rect({ x: 0, y: 0, width: 24, height: 16 }, { color: 0x112233 }),
  ];

  /** Returns the canvas texture under a key, failing if there is none. */
  function canvasTexture(scene: Scene, key: string): Textures.CanvasTexture {
    const texture = scene.textures.get(key);
    if (!(texture instanceof Textures.CanvasTexture)) {
      throw new Error(`No canvas texture "${key}"`);
    }
    return texture;
  }

  it("paints the commands into a canvas texture of the size", async () => {
    const run = await runBareScene();

    paintTexture(run.scene, "wash", 24, 16, SQUARE);

    const texture = canvasTexture(run.scene, "wash");
    expect({
      size: [texture.width, texture.height],
      fill: texture.getContext().fillStyle,
    }).toEqual({ size: [24, 16], fill: "rgba(17,34,51,1)" });
    run.destroy();
  });

  it("paints over the texture already there, and uploads it once", async () => {
    const run = await runBareScene();
    paintTexture(run.scene, "wash", 24, 16, SQUARE);
    const first = canvasTexture(run.scene, "wash");
    const uploads: HTMLCanvasElement[] = [];
    watchUploads(run.scene, (canvas) => uploads.push(canvas));

    paintTexture(run.scene, "wash", 24, 16, SQUARE);

    expect({
      same: canvasTexture(run.scene, "wash") === first,
      uploads,
    }).toEqual({ same: true, uploads: [first.canvas] });
    run.destroy();
  });

  it("paints the texture again with what it was last painted with once a lost context is restored", async () => {
    const run = await runBareScene();
    paintTexture(run.scene, "wash", 24, 16, SQUARE);
    paintTexture(run.scene, "wash", 24, 16, [
      circle({ x: 4, y: 4 }, 2, { color: 0x445566 }),
    ]);
    const context = canvasTexture(run.scene, "wash").getContext();
    context.fillStyle = "none";
    await run.loseContext();

    await run.restoreContext();

    expect(context.fillStyle).toBe("rgba(68,85,102,1)");
    run.destroy();
  });

  it("paints a key baked before with its commands alone once a lost context is restored", async () => {
    const run = await runBareScene();
    let bakes = 0;
    bakeTexture(run.scene, "wash", 24, 16, (graphics) => {
      bakes++;
      graphics.fillStyle(0x778899).fillRect(0, 0, 24, 16);
    });
    paintTexture(run.scene, "wash", 24, 16, SQUARE);
    const context = canvasTexture(run.scene, "wash").getContext();
    context.fillStyle = "none";
    await run.loseContext();

    await run.restoreContext();

    expect({ bakes, fill: context.fillStyle }).toEqual({
      bakes: 1,
      fill: "rgba(17,34,51,1)",
    });
    run.destroy();
  });
});
