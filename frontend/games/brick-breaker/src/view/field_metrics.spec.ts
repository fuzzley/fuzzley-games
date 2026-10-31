import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { FIELD_HEIGHT } from "../rules/tuning";
import {
  fieldMetrics,
  toCanvasX,
  toCanvasY,
  toFieldX,
  toFieldY,
} from "./field_metrics";

/** Returns a viewport of a CSS size at a pixel ratio, with no chrome over it. */
function viewport(width: number, height: number, pixelRatio = 1): Viewport {
  return {
    width: Math.round(width * pixelRatio),
    height: Math.round(height * pixelRatio),
    pixelRatio,
    insets: NO_INSETS,
  };
}

describe("fieldMetrics", () => {
  it("fits the field of 26 by 30 units, the largest the canvas holds with its wall", () => {
    // 300 less a wall of 2 at the top and the bottom leaves 296: 30 units of 9.
    const metrics = fieldMetrics(viewport(400, 300), FIELD_HEIGHT);

    expect(metrics).toMatchObject({
      unit: 9,
      width: 234,
      height: 270,
      wall: 2,
    });
  });

  it("centers the field on the canvas", () => {
    const metrics = fieldMetrics(viewport(400, 300), FIELD_HEIGHT);

    expect([metrics.x, metrics.y]).toEqual([83, 15]);
  });

  it("makes a unit whole device pixels at any pixel ratio", () => {
    const metrics = fieldMetrics(viewport(517, 517, 2.625), FIELD_HEIGHT);

    expect(
      [metrics.unit, metrics.x, metrics.y, metrics.wall].every((n) =>
        Number.isInteger(n),
      ),
    ).toBe(true);
  });

  it("gives the wall and the pixel ratio in device pixels", () => {
    const metrics = fieldMetrics(viewport(400, 300, 2), FIELD_HEIGHT);

    expect({ wall: metrics.wall, ratio: metrics.pixelRatio }).toEqual({
      wall: 4,
      ratio: 2,
    });
  });

  it("fits a taller field to the same canvas, its unit as large as its height allows", () => {
    // 296 over 37 units: a unit of 8, and 26 of them across.
    const metrics = fieldMetrics(viewport(400, 300), 37);

    expect(metrics).toMatchObject({ unit: 8, width: 208, height: 296 });
  });

  it("gives the field in CSS pixels", () => {
    const metrics = fieldMetrics(viewport(400, 300, 2), FIELD_HEIGHT);

    expect(metrics.css).toEqual({
      x: metrics.x / 2,
      y: metrics.y / 2,
      width: metrics.width / 2,
      height: metrics.height / 2,
    });
  });
});

describe("toCanvasX and toCanvasY", () => {
  it("place a point of the field on the canvas", () => {
    const metrics = fieldMetrics(viewport(400, 300), FIELD_HEIGHT);

    expect([toCanvasX(metrics, 13), toCanvasY(metrics, 30)]).toEqual([
      83 + 13 * 9,
      15 + 30 * 9,
    ]);
  });
});

describe("toFieldX and toFieldY", () => {
  it("place a point of the canvas on the field", () => {
    const metrics = fieldMetrics(viewport(400, 300), FIELD_HEIGHT);

    expect([toFieldX(metrics, 83 + 4.5), toFieldY(metrics, 15 + 18)]).toEqual([
      0.5, 2,
    ]);
  });

  it("undo toCanvasX and toCanvasY", () => {
    const metrics = fieldMetrics(viewport(517, 517, 2.625), FIELD_HEIGHT);

    expect([
      toFieldX(metrics, toCanvasX(metrics, 7.25)),
      toFieldY(metrics, toCanvasY(metrics, 21.5)),
    ]).toEqual([7.25, 21.5]);
  });
});
