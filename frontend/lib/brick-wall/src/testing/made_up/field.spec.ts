import { viewport } from "@fz/phaser/testing/pure";
import { fieldMetrics, fieldShape } from "../../view/field_metrics";
import { marginInsets } from "../canvases";
import {
  DARK_MADE_UP,
  LIGHT_MADE_UP,
  MADE_UP_SQUARES,
  madeUpField,
  madeUpFrames,
} from "./field";

describe("the made-up palettes", () => {
  it("are made from roles each a color no other role of either takes", () => {
    const colors = [LIGHT_MADE_UP, DARK_MADE_UP].flatMap((palette) => [
      palette.field,
      palette.line,
      palette.text,
      palette.fuzzball,
      palette.dangerLine,
      palette.spark,
    ]);

    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("madeUpFrames", () => {
  it("draws each made-up frame a square its units wide, in its color", () => {
    const frames = madeUpFrames(LIGHT_MADE_UP, { unit: 40, pixelRatio: 1 });

    expect(frames).toEqual([
      {
        name: "dot",
        width: 8,
        height: 8,
        commands: [
          {
            kind: "rect",
            x: 0,
            y: 0,
            width: 8,
            height: 8,
            color: LIGHT_MADE_UP.guide,
          },
        ],
      },
      {
        name: "cell",
        width: 40,
        height: 40,
        commands: [
          {
            kind: "rect",
            x: 0,
            y: 0,
            width: 40,
            height: 40,
            color: LIGHT_MADE_UP.steel,
          },
        ],
      },
    ]);
  });

  it("draws a frame a CSS pixel wide at least", () => {
    const frames = madeUpFrames(LIGHT_MADE_UP, { unit: 2, pixelRatio: 3 });

    expect(frames.find(({ name }) => name === "dot")?.width).toBe(3);
  });

  it("names every square it draws, and no other", () => {
    const frames = madeUpFrames(DARK_MADE_UP, { unit: 30, pixelRatio: 1 });

    expect(frames.map(({ name }) => name)).toEqual(
      Object.keys(MADE_UP_SQUARES),
    );
  });
});

describe("madeUpField", () => {
  it("lays the field out as a board does, inside a compact screen's margin", () => {
    const canvas = viewport(400, 500, 2, marginInsets(12));
    const shape = fieldShape(canvas);

    expect(madeUpField(400, 500, 2)).toEqual({
      shape,
      metrics: fieldMetrics(canvas, shape),
    });
  });
});
