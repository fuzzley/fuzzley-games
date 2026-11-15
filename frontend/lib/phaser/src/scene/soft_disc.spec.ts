import { canvasTexture, runBareScene } from "../testing";
import { softDisc } from "./soft_disc";

/** A call a context was given, by its method's name. */
type Call = readonly [string, ...unknown[]];

/** The methods {@link recordPainting} records, which it sets on a context. */
const RECORDED = ["translate", "scale", "createRadialGradient", "fill"];

/**
 * Has a texture's context record what a soft disc is painted with from now
 * on, in turn, and returns the calls: where it moves and scales its
 * drawing, the gradient it makes and that gradient's stops, and the alpha
 * it fills at, from whole, as a browser's context starts.
 */
function recordPainting(context: CanvasRenderingContext2D): Call[] {
  const calls: Call[] = [];
  const gradient = {
    addColorStop: (...args: unknown[]) => {
      calls.push(["addColorStop", ...args]);
    },
  };
  Object.assign(context, {
    globalAlpha: 1,
    translate: (...args: unknown[]) => {
      calls.push(["translate", ...args]);
    },
    scale: (...args: unknown[]) => {
      calls.push(["scale", ...args]);
    },
    createRadialGradient: (...args: unknown[]) => {
      calls.push(["createRadialGradient", ...args]);
      return gradient;
    },
    fill: () => {
      calls.push(["fill", context.globalAlpha]);
    },
  });
  return calls;
}

/**
 * Lets a context go back to drawing nothing, as the headless harness's
 * does, so the canvas Phaser's pool hands the next spec records nothing.
 */
function stopRecording(context: CanvasRenderingContext2D): void {
  for (const method of RECORDED) Reflect.deleteProperty(context, method);
}

/** Returns what a soft disc of a size is painted with: its middle and radius half the size. */
function painted(size: number): readonly Call[] {
  const radius = size / 2;
  return [
    ["translate", radius, radius],
    ["scale", radius, radius],
    ["createRadialGradient", 0, 0, 0, 0, 0, 1],
    ["addColorStop", 0, "rgba(255,255,255,0.9)"],
    ["addColorStop", 0.3, "rgba(255,255,255,0.42)"],
    ["addColorStop", 0.62, "rgba(255,255,255,0.13)"],
    ["addColorStop", 1, "rgba(255,255,255,0)"],
    ["fill", 1],
  ];
}

describe("softDisc", () => {
  it("paints a canvas texture of the key as wide and as tall as its size", async () => {
    const run = await runBareScene();

    softDisc(run.scene, "halo", 64);

    const texture = canvasTexture(run.scene, "halo");
    expect([texture.width, texture.height]).toEqual([64, 64]);
    run.destroy();
  });

  it.each([64, 33])(
    "paints a white disc filling it, fading from its middle to nothing at its edge, %i pixels across",
    async (size) => {
      const run = await runBareScene();
      // A context is recorded once its texture is there, so it is painted over.
      softDisc(run.scene, "halo", size);
      const context = canvasTexture(run.scene, "halo").getContext();
      const calls = recordPainting(context);

      softDisc(run.scene, "halo", size);

      expect(calls).toEqual(painted(size));
      stopRecording(context);
      run.destroy();
    },
  );

  it("paints it again once a lost context is restored", async () => {
    const run = await runBareScene();
    softDisc(run.scene, "halo", 64);
    const context = canvasTexture(run.scene, "halo").getContext();
    const calls = recordPainting(context);
    await run.loseContext();

    await run.restoreContext();

    expect(calls).toEqual(painted(64));
    stopRecording(context);
    run.destroy();
  });
});
