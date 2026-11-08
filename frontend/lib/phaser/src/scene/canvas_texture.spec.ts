import { Display, type Scene, Textures } from "phaser";
import { runBareScene, watchUploads } from "../testing";
import { type DrawCanvas, drawCanvasTexture } from "./canvas_texture";

/** Returns the canvas texture under a key, failing if there is none. */
function canvasTexture(scene: Scene, key: string): Textures.CanvasTexture {
  const texture = scene.textures.get(key);
  if (!(texture instanceof Textures.CanvasTexture)) {
    throw new Error(`No canvas texture "${key}"`);
  }
  return texture;
}

/** Returns a canvas's size, as "24×16". */
function sizeOf({ width, height }: HTMLCanvasElement): string {
  return `${String(width)}×${String(height)}`;
}

/** Returns a drawing that records, in turn, each canvas it draws on, as "draw on 24×16". */
function recordDraws(events: string[]): DrawCanvas {
  return ({ canvas }) => {
    events.push(`draw on ${sizeOf(canvas)}`);
  };
}

/** Records, in turn, every canvas the game uploads from now on, as "upload". */
function recordUploads(scene: Scene, events: string[]): void {
  watchUploads(scene, () => {
    events.push("upload");
  });
}

/** What {@link recordContext} stands in for on a context, by name. */
const RECORDED = [
  "clearRect",
  "getImageData",
  "save",
  "restore",
  "translate",
  "scale",
  "rotate",
  "clip",
] as const;

/**
 * Records, in turn, what is done to a canvas's context from now on, until the
 * test finishes: each clear, with the canvas's size and whatever moves or
 * clips the context then, as "clear 0 0 24 24 on 24×24" or "clear 0 0 24 24
 * on 24×24 under translate 5 5, clip", and each read back, as "read". A
 * headless canvas keeps no pixels and no transform, so this watches the calls
 * themselves, and what each save keeps and each restore brings back.
 */
function recordContext(
  context: CanvasRenderingContext2D,
  events: string[],
): void {
  const { canvas } = context;
  let moves: string[] = [];
  const saved: string[][] = [];
  context.save = () => {
    saved.push([...moves]);
  };
  context.restore = () => {
    moves = saved.pop() ?? moves;
  };
  for (const name of ["translate", "scale", "rotate"] as const) {
    context[name] = (...by: number[]) => {
      moves.push([name, ...by].join(" "));
    };
  }
  context.clip = () => {
    moves.push("clip");
  };
  context.clearRect = (...area) => {
    const under = moves.length === 0 ? "" : ` under ${moves.join(", ")}`;
    events.push(`clear ${area.join(" ")} on ${sizeOf(canvas)}${under}`);
  };
  const read = context.getImageData.bind(context);
  context.getImageData = (...area: Parameters<typeof read>) => {
    events.push("read");
    return read(...area);
  };
  // The canvas goes back to Phaser's pool, for the next texture made.
  onTestFinished(() => {
    for (const name of RECORDED) Reflect.deleteProperty(context, name);
  });
}

/**
 * Records, in turn, what is done to the canvas of the texture under a key
 * from now on, as {@link recordContext} does.
 */
function recordClears(scene: Scene, key: string, events: string[]): void {
  recordContext(canvasTexture(scene, key).context, events);
}

/**
 * Records, in turn, what is done to each canvas Phaser's pool hands out from
 * now on, as {@link recordContext} does, until the test finishes.
 */
function recordPooledClears(events: string[]): void {
  const { CanvasPool } = Display.Canvas;
  const take = CanvasPool.create;
  const taking = vi
    .spyOn(CanvasPool, "create")
    .mockImplementation((...args) => {
      const canvas = take(...args);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) recordContext(context, events);
      return canvas;
    });
  onTestFinished(() => {
    taking.mockRestore();
  });
}

/**
 * Watches each canvas asked for a context from now on, until the test
 * finishes, and returns what reads back the settings a canvas was asked with,
 * in turn.
 */
function watchContextSettings(): (canvas: HTMLCanvasElement) => unknown[] {
  const asked = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
  onTestFinished(() => {
    asked.mockRestore();
  });
  return (canvas) =>
    asked.mock.calls
      .filter((_, call) => asked.mock.contexts[call] === canvas)
      .map(([, settings]): unknown => settings);
}

describe("drawCanvasTexture", () => {
  it("makes a canvas texture of the key at the size", async () => {
    const run = await runBareScene();

    const made = drawCanvasTexture(run.scene, "apple", 24, 16, vi.fn());

    const texture = canvasTexture(run.scene, "apple");
    expect({
      made: made === texture,
      size: [texture.width, texture.height],
    }).toEqual({ made: true, size: [24, 16] });
    run.destroy();
  });

  it("draws a new texture on its canvas, then uploads it once", async () => {
    const run = await runBareScene();
    const events: string[] = [];
    recordUploads(run.scene, events);

    drawCanvasTexture(run.scene, "apple", 24, 16, recordDraws(events));

    expect(events).toEqual(["draw on 24×16", "upload"]);
    run.destroy();
  });

  it("asks the canvas of a new texture for its context as the texture does", async () => {
    const run = await runBareScene();
    const settingsAsked = watchContextSettings();

    const made = drawCanvasTexture(run.scene, "apple", 24, 16, vi.fn());

    // Asked for it to draw on, then by the texture as it is made.
    expect(settingsAsked(made.canvas)).toEqual([
      { willReadFrequently: true },
      { willReadFrequently: true },
    ]);
    run.destroy();
  });

  it("draws a new texture through the context it draws with", async () => {
    const run = await runBareScene();
    let drawnWith: CanvasRenderingContext2D | undefined;

    const made = drawCanvasTexture(run.scene, "apple", 24, 16, (context) => {
      drawnWith = context;
    });

    expect(drawnWith).toBe(made.getContext());
    run.destroy();
  });

  it.each([
    [24, 24],
    [40, 30],
  ])(
    "draws over the texture already there, through the context it draws with, at %i × %i",
    async (width, height) => {
      const run = await runBareScene();
      const first = drawCanvasTexture(run.scene, "apple", 24, 24, vi.fn());
      let drawnWith: CanvasRenderingContext2D | undefined;
      const draw: DrawCanvas = (context) => {
        drawnWith = context;
      };

      const made = drawCanvasTexture(run.scene, "apple", width, height, draw);

      expect({
        same: made === first,
        context: drawnWith === first.getContext(),
      }).toEqual({ same: true, context: true });
      run.destroy();
    },
  );

  it("clears the texture already there, then draws it and uploads it once", async () => {
    const run = await runBareScene();
    drawCanvasTexture(run.scene, "apple", 24, 24, vi.fn());
    const events: string[] = [];
    recordClears(run.scene, "apple", events);
    recordUploads(run.scene, events);

    drawCanvasTexture(run.scene, "apple", 24, 24, recordDraws(events));

    expect(events).toEqual([
      "clear 0 0 24 24 on 24×24",
      "draw on 24×24",
      "upload",
    ]);
    run.destroy();
  });

  it("clears the whole canvas, unmoved and unclipped, after drawings that move and clip its context", async () => {
    const run = await runBareScene();
    const events: string[] = [];
    recordPooledClears(events);
    const moveAndClip: DrawCanvas = (context) => {
      context.translate(5, 5);
      context.scale(2, 2);
      context.clip();
    };
    drawCanvasTexture(run.scene, "apple", 24, 24, moveAndClip);
    drawCanvasTexture(run.scene, "apple", 24, 24, moveAndClip);

    drawCanvasTexture(run.scene, "apple", 24, 24, vi.fn());

    // Made, the texture reads its canvas back.
    expect(events).toEqual([
      "read",
      "clear 0 0 24 24 on 24×24",
      "clear 0 0 24 24 on 24×24",
    ]);
    run.destroy();
  });

  // Giving a canvas a size clears it, so nothing more clears it.
  it("sizes the texture already there anew, then draws it and uploads it once", async () => {
    const run = await runBareScene();
    drawCanvasTexture(run.scene, "apple", 24, 24, vi.fn());
    const events: string[] = [];
    recordClears(run.scene, "apple", events);
    recordUploads(run.scene, events);

    drawCanvasTexture(run.scene, "apple", 40, 30, recordDraws(events));

    expect(events).toEqual(["draw on 40×30", "upload"]);
    run.destroy();
  });

  it("sizes its canvas, its source and its whole frame anew at a new size", async () => {
    const run = await runBareScene();
    drawCanvasTexture(run.scene, "apple", 24, 24, vi.fn());

    drawCanvasTexture(run.scene, "apple", 40, 30, vi.fn());

    const texture = canvasTexture(run.scene, "apple");
    const whole = texture.get("__BASE");
    expect({
      texture: [texture.width, texture.height],
      canvas: [texture.canvas.width, texture.canvas.height],
      source: [whole.source.width, whole.source.height],
      frame: [whole.cutWidth, whole.cutHeight],
    }).toEqual({
      texture: [40, 30],
      canvas: [40, 30],
      source: [40, 30],
      frame: [40, 30],
    });
    run.destroy();
  });

  it("maps its whole frame onto the whole canvas at a new size", async () => {
    const run = await runBareScene();
    drawCanvasTexture(run.scene, "apple", 24, 24, vi.fn());

    drawCanvasTexture(run.scene, "apple", 40, 30, vi.fn());

    // Phaser 4 counts v up from the bottom.
    const whole = run.scene.textures.get("apple").get("__BASE");
    expect([whole.u0, whole.u1, whole.v0, whole.v1]).toEqual([0, 1, 1, 0]);
    run.destroy();
  });

  it("replaces a texture of the key that isn't a canvas", async () => {
    const run = await runBareScene();
    run.scene.textures.addImage("apple", new Image());

    drawCanvasTexture(run.scene, "apple", 8, 8, vi.fn());

    expect(run.scene.textures.get("apple")).toBeInstanceOf(
      Textures.CanvasTexture,
    );
    run.destroy();
  });

  it("throws for a key Phaser refuses, drawing nothing and taking no canvas from the pool", async () => {
    const run = await runBareScene();
    run.scene.textures.silentWarnings = true;
    const { CanvasPool } = Display.Canvas;
    const taken = CanvasPool.total();
    const events: string[] = [];

    const make = (): unknown =>
      drawCanvasTexture(run.scene, "", 8, 8, recordDraws(events));

    expect(make).toThrow('The texture "" could not be made.');
    expect({ drawn: events, taken: CanvasPool.total() }).toEqual({
      drawn: [],
      taken,
    });
    run.destroy();
  });

  it("gives the canvas it took back to the pool where the drawing throws", async () => {
    const run = await runBareScene();
    const { CanvasPool } = Display.Canvas;
    const taken = CanvasPool.total();

    const make = (): unknown =>
      drawCanvasTexture(run.scene, "apple", 8, 8, () => {
        throw new Error("Out of ink");
      });

    expect(make).toThrow("Out of ink");
    expect({
      made: run.scene.textures.exists("apple"),
      taken: CanvasPool.total(),
    }).toEqual({ made: false, taken });
    run.destroy();
  });

  it("throws where the drawing makes a texture of the key itself, giving the canvas it took back to the pool", async () => {
    const run = await runBareScene();
    const graphics = run.scene.make.graphics({}, false);
    const { CanvasPool } = Display.Canvas;
    const taken = CanvasPool.total();

    const make = (): unknown =>
      drawCanvasTexture(run.scene, "apple", 8, 8, () => {
        graphics.generateTexture("apple", 8, 8);
      });

    expect(make).toThrow('Drawing the texture "apple" made one of its own');
    // The texture the drawing made keeps the canvas it took for itself.
    expect(CanvasPool.total()).toBe(taken + 1);
    run.destroy();
  });
});
