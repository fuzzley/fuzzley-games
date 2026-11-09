import type { Scene } from "phaser";
import { runBareScene } from "../testing";
import { canvasChanged, viewportOf } from "./viewport";

/** Chrome over a canvas, as an app's bars lie over it. */
const CHROME = { top: 56, right: 0, bottom: 72, left: 0 };

/**
 * Returns a scene whose canvas renders at a ratio, which the harness holds
 * at 1.
 */
function sceneAt(ratio: number): Scene {
  // Only the scale manager is read.
  return {
    scale: { width: 120, height: 80, displayScale: { x: ratio } },
  } as unknown as Scene;
}

describe("viewportOf", () => {
  it("reads the canvas's size, in device pixels", async () => {
    const run = await runBareScene({ width: 120, height: 80 });

    const viewport = viewportOf(run.scene, CHROME);

    expect(viewport).toEqual({
      width: 120,
      height: 80,
      pixelRatio: 1,
      insets: CHROME,
    });
    run.destroy();
  });

  it("reads the pixel ratio the canvas renders at", () => {
    const viewport = viewportOf(sceneAt(2.625), CHROME);

    expect(viewport.pixelRatio).toBe(2.625);
  });

  it("keeps the chrome it is given, not a copy", async () => {
    const run = await runBareScene();

    const viewport = viewportOf(run.scene, CHROME);

    expect(viewport.insets).toBe(CHROME);
    run.destroy();
  });
});

describe("canvasChanged", () => {
  it("says a canvas changed that the scene was never laid out on", async () => {
    const run = await runBareScene();

    const changed = canvasChanged(run.scene, null);

    expect(changed).toBe(true);
    run.destroy();
  });

  it("says the canvas the scene was laid out on is unchanged", async () => {
    const run = await runBareScene();
    const last = viewportOf(run.scene, CHROME);

    const changed = canvasChanged(run.scene, last);

    expect(changed).toBe(false);
    run.destroy();
  });

  it.each([
    ["width", 121, 80],
    ["height", 120, 81],
  ])("says the canvas changed at a new %s", async (_, width, height) => {
    const run = await runBareScene({ width: 120, height: 80 });
    const last = viewportOf(run.scene, CHROME);
    run.game.scale.resize(width, height);

    const changed = canvasChanged(run.scene, last);

    expect(changed).toBe(true);
    run.destroy();
  });

  it("says the canvas changed at a new pixel ratio", () => {
    const last = viewportOf(sceneAt(2), CHROME);

    const changed = canvasChanged(sceneAt(2.625), last);

    expect(changed).toBe(true);
  });
});
