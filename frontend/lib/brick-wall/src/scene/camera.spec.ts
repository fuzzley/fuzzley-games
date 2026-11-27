import type { PixelRect } from "@fz/phaser/layout";
import { runBareScene } from "@fz/phaser/testing";
import type { Cameras } from "phaser";
import { madeUpField } from "../testing/made_up/field";
import { type FieldMetrics, frameBounds } from "../view/field_metrics";
import { SHAKE_CSS_PX, SHAKE_MS } from "../view/timing";
import { FieldCamera } from "./camera";

/** A field on a canvas of 400 × 400 CSS pixels at a pixel to one. */
const FIELD = madeUpField(400, 400);

/** Returns a camera's viewport on the canvas, and where in the world it looks. */
function cameraOf(
  camera: Cameras.Scene2D.Camera,
): PixelRect & { scrollX: number; scrollY: number } {
  const { x, y, width, height, scrollX, scrollY } = camera;
  return { x, y, width, height, scrollX, scrollY };
}

/** Returns where the camera rests about a frame: its viewport the frame, scrolled so the canvas's pixels are the world's. */
function restingOn(
  frame: PixelRect,
): PixelRect & { scrollX: number; scrollY: number } {
  return { ...frame, scrollX: frame.x, scrollY: frame.y };
}

/** Returns a scene's main camera, framed on a field, {@link FIELD} unless given, and the field camera over it, in a scene running till the test finishes. */
async function framedCamera(on = FIELD) {
  const run = await runBareScene();
  onTestFinished(() => {
    run.destroy();
  });
  const main = run.scene.cameras.main;
  const field = new FieldCamera(main);
  field.fit(on.metrics, on.shape);
  return { main, field };
}

/** Has a field camera draw the frame of a time, on a field's layout. */
function drawAt(
  field: FieldCamera,
  now: number,
  metrics: FieldMetrics = FIELD.metrics,
): void {
  field.draw({ now, metrics });
}

describe("FieldCamera", () => {
  it("frames the camera on the field's frame, scrolled so the canvas's pixels are the world's", async () => {
    const { main } = await framedCamera();

    expect(cameraOf(main)).toEqual(
      restingOn(frameBounds(FIELD.metrics, FIELD.shape)),
    );
  });

  it("frames the camera again where the field is laid out again", async () => {
    const { main, field } = await framedCamera();
    const wider = madeUpField(600, 500);

    field.fit(wider.metrics, wider.shape);

    expect(cameraOf(main)).toEqual(
      restingOn(frameBounds(wider.metrics, wider.shape)),
    );
  });

  it("moves nothing while the field isn't shaken", async () => {
    const { main, field } = await framedCamera();
    const rest = cameraOf(main);

    drawAt(field, 100);

    expect(cameraOf(main)).toEqual(rest);
  });

  it("shakes the field from when it is told, moving the viewport by whole pixels, the world it looks at still", async () => {
    const { main, field } = await framedCamera();
    const rest = cameraOf(main);
    field.shake(1000);

    drawAt(field, 1016);

    const shaken = cameraOf(main);
    expect({
      moved: shaken.x !== rest.x || shaken.y !== rest.y,
      whole: Number.isInteger(shaken.x) && Number.isInteger(shaken.y),
      size: [shaken.width, shaken.height],
      scrolled: [shaken.scrollX, shaken.scrollY],
    }).toEqual({
      moved: true,
      whole: true,
      size: [rest.width, rest.height],
      scrolled: [rest.scrollX, rest.scrollY],
    });
  });

  it("shakes the field as far as the wall's shake at the pixel ratio, dying away in a straight line", async () => {
    const sharp = madeUpField(400, 400, 2);
    const { main, field } = await framedCamera(sharp);
    const rest = cameraOf(main);
    field.shake(1000);

    const strays = Array.from({ length: SHAKE_MS }, (_, ms) => {
      drawAt(field, 1000 + ms, sharp.metrics);
      return Math.max(Math.abs(main.x - rest.x), Math.abs(main.y - rest.y));
    });

    const third = SHAKE_MS / 3;
    const farthest = Math.max(...strays);
    expect({
      within: farthest <= SHAKE_CSS_PX * 2,
      byTheRatio: farthest > SHAKE_CSS_PX,
      dyingAway:
        Math.max(...strays.slice(2 * third)) <
        Math.max(...strays.slice(0, third)) / 2,
    }).toEqual({ within: true, byTheRatio: true, dyingAway: true });
  });

  it("stills the field once the shake is over, the viewport back at rest", async () => {
    const { main, field } = await framedCamera();
    const rest = cameraOf(main);
    field.shake(1000);
    drawAt(field, 1016);

    drawAt(field, 1000 + SHAKE_MS);

    expect(cameraOf(main)).toEqual(rest);
  });

  it("moves nothing once the shake is over, however the viewport is set", async () => {
    const { main, field } = await framedCamera();
    field.shake(1000);
    drawAt(field, 1000 + SHAKE_MS);
    main.setPosition(3, 4);

    drawAt(field, 1100 + SHAKE_MS);

    expect([main.x, main.y]).toEqual([3, 4]);
  });

  it("stills a shaken field where it is laid out again before the shake is over", async () => {
    const { main, field } = await framedCamera();
    const wider = madeUpField(600, 500);
    field.shake(1000);
    drawAt(field, 1016);
    field.fit(wider.metrics, wider.shape);

    drawAt(field, 1000 + SHAKE_MS, wider.metrics);

    expect(cameraOf(main)).toEqual(
      restingOn(frameBounds(wider.metrics, wider.shape)),
    );
  });
});
