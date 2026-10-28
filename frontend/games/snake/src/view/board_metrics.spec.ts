import { NO_INSETS } from "@fz/phaser/insets";
import { type Viewport, boardMetrics, centerX, centerY } from "./board_metrics";

/** Returns a viewport of a CSS size at a pixel ratio. */
function viewport(
  width: number,
  height: number,
  pixelRatio: number,
  insets = NO_INSETS,
): Viewport {
  return {
    width: Math.round(width * pixelRatio),
    height: Math.round(height * pixelRatio),
    pixelRatio,
    insets,
  };
}

describe("boardMetrics", () => {
  it.each([
    [400, 300, 1],
    [390, 600, 3],
    [517, 517, 2.625],
    [1000, 701, 1.25],
  ])(
    "makes each square whole device pixels, on whole pixels (%i × %i at %f)",
    (width, height, ratio) => {
      const metrics = boardMetrics(viewport(width, height, ratio), 17);

      expect(
        [metrics.square, metrics.x, metrics.y, metrics.wall].every((n) =>
          Number.isInteger(n),
        ),
      ).toBe(true);
    },
  );

  it("fits the largest board the shorter side holds, with its wall", () => {
    const metrics = boardMetrics(viewport(400, 300, 1), 17);

    // 300 less two walls of 2 leaves 296: 17 squares of 17.
    expect({ square: metrics.square, side: metrics.side }).toEqual({
      square: 17,
      side: 289,
    });
  });

  it("centers the board", () => {
    const metrics = boardMetrics(viewport(400, 300, 1), 17);

    expect([metrics.x, metrics.y]).toEqual([55, 5]);
  });

  it("keeps clear of the chrome", () => {
    const metrics = boardMetrics(
      viewport(400, 400, 1, { top: 100, right: 0, bottom: 0, left: 0 }),
      17,
    );

    expect(metrics.y).toBeGreaterThanOrEqual(100);
  });

  it("gives the board in CSS pixels", () => {
    const metrics = boardMetrics(viewport(400, 300, 2), 17);

    expect(metrics.css).toEqual({
      x: metrics.x / 2,
      y: metrics.y / 2,
      width: metrics.side / 2,
      height: metrics.side / 2,
    });
  });

  it("keeps a square at least a pixel on a canvas too small for the board", () => {
    expect(boardMetrics(viewport(4, 4, 1), 17).square).toBe(1);
  });

  it("finds a square's center", () => {
    const metrics = boardMetrics(viewport(400, 300, 1), 17);

    expect([
      centerX(metrics, { x: 0, y: 2 }),
      centerY(metrics, { x: 0, y: 2 }),
    ]).toEqual([55 + 8.5, 5 + 17 * 2.5]);
  });
});
