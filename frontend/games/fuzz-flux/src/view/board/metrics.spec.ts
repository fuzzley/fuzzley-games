import { viewport } from "@fz/phaser/testing/pure";
import { boardMetrics } from "./metrics";

describe("boardMetrics", () => {
  it.each([
    [400, 600, 1],
    [390, 844, 3],
    [517, 517, 2.625],
    [1000, 701, 1.25],
    [320, 568, 1.75],
  ])(
    "makes each square whole device pixels, on whole pixels (%i × %i at %f)",
    (width, height, ratio) => {
      const metrics = boardMetrics(viewport(width, height, ratio), 8, 9);

      expect(
        [metrics.square, metrics.x, metrics.y].filter(
          (n) => !Number.isInteger(n),
        ),
      ).toEqual([]);
    },
  );

  it("fits the largest board the room holds with its margin", () => {
    const metrics = boardMetrics(viewport(400, 600, 1), 8, 9);

    // 400 less two margins of 16 leaves 368: 8 squares of 46.
    expect({
      square: metrics.square,
      width: metrics.width,
      height: metrics.height,
    }).toEqual({ square: 46, width: 368, height: 414 });
  });

  it("centers the board", () => {
    const metrics = boardMetrics(viewport(400, 600, 1), 8, 9);

    expect([metrics.x, metrics.y]).toEqual([16, 93]);
  });

  it.each([1, 2, 2.625, 3])(
    "gives a phone 320 px wide 8 squares of 40 CSS px, edge to edge, at %f",
    (ratio) => {
      const metrics = boardMetrics(viewport(320, 640, ratio), 8, 9);

      expect({
        square: metrics.square / ratio,
        css: metrics.css.width,
      }).toEqual({ square: 40, css: 320 });
    },
  );

  it("narrows the margin only as far as a square of 40 CSS px needs", () => {
    const metrics = boardMetrics(viewport(340, 640, 1), 8, 9);

    // Its margin would leave 38: 8 squares of 40 leave 10 either side.
    expect({ square: metrics.square, x: metrics.x }).toEqual({
      square: 40,
      x: 10,
    });
  });

  it("fills a room too narrow for 8 squares of 40 CSS px", () => {
    const metrics = boardMetrics(viewport(300, 640, 1), 8, 9);

    // 300 holds 8 squares of 37, with no margin.
    expect({ square: metrics.square, x: metrics.x }).toEqual({
      square: 37,
      x: 2,
    });
  });

  it("fills a room the chrome leaves too narrow for 8 squares of 40 CSS px", () => {
    const insets = { top: 0, right: 20, bottom: 0, left: 20 };
    const metrics = boardMetrics(viewport(340, 640, 1, insets), 8, 9);

    // The room inside the chrome, 300 across from 20, holds 8 squares of 37.
    expect({ square: metrics.square, x: metrics.x }).toEqual({
      square: 37,
      x: 22,
    });
  });

  it("holds a square to 40 CSS px at a ratio a browser keeps a hair over its zoom", () => {
    const ratio = Math.fround(1.1);
    const metrics = boardMetrics(viewport(340, 640, ratio), 8, 9);

    // 40 at 1.100000023841858 is 44.00000095 device pixels, which counts as
    // 44 rather than rounding up to 45.
    expect(metrics.square).toBe(44);
  });

  it("fills a room too short for 9 squares of 40 CSS px", () => {
    const metrics = boardMetrics(viewport(400, 300, 1), 8, 9);

    // 300 holds 9 squares of 33, with no margin.
    expect({ square: metrics.square, y: metrics.y }).toEqual({
      square: 33,
      y: 1,
    });
  });

  it("keeps the board and its margin clear of the chrome", () => {
    const insets = { top: 100, right: 40, bottom: 120, left: 30 };
    const metrics = boardMetrics(viewport(500, 700, 1, insets), 8, 9);

    // The room inside the chrome runs from 30 to 460 across and 100 to 580
    // down, which holds squares of 49 with a margin of 16 around them.
    expect({
      top: metrics.y,
      right: metrics.x + metrics.width,
      bottom: metrics.y + metrics.height,
      left: metrics.x,
    }).toEqual({ top: 119, right: 441, bottom: 560, left: 49 });
  });

  it("gives the board in CSS pixels", () => {
    const metrics = boardMetrics(viewport(400, 600, 2), 8, 9);

    expect(metrics.css).toEqual({
      x: metrics.x / 2,
      y: metrics.y / 2,
      width: metrics.width / 2,
      height: metrics.height / 2,
    });
  });

  it("stands a panel either side of the board on a wide window", () => {
    const metrics = boardMetrics(viewport(1280, 720, 1), 8, 8);

    // 720 less two margins leaves 688: a board 688 wide spares 296 either
    // side, 12 of it the gap and 284 the panel.
    expect(metrics.panels).toEqual({
      left: { x: 0, y: 16, width: 284, height: 688 },
      right: { x: 996, y: 16, width: 284, height: 688 },
    });
  });

  it("stands no panel beside the board on a phone", () => {
    const metrics = boardMetrics(viewport(390, 844, 3), 8, 9);

    expect(metrics.panels).toBeNull();
  });
});
