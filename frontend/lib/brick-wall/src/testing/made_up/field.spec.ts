import { viewport } from "@fz/phaser/testing/pure";
import type { Brick } from "../../rules/wall";
import { fieldMetrics, fieldShape } from "../../view/field_metrics";
import { marginInsets } from "../canvases";
import {
  DARK_MADE_UP,
  LIGHT_MADE_UP,
  MADE_UP_MOST_LAYERS,
  MADE_UP_SQUARES,
  madeUpField,
  madeUpFrames,
  madeUpLayers,
} from "./field";
import type { MadeUpKind } from "./wall";

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
  it("draws a frame as one square filling it, in its color", () => {
    const frames = madeUpFrames(LIGHT_MADE_UP, { unit: 40, pixelRatio: 1 });

    expect(frames.find(({ name }) => name === "dot")).toEqual({
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
    });
  });

  it("draws each made-up frame its units wide and high, in its color", () => {
    const frames = madeUpFrames(LIGHT_MADE_UP, { unit: 40, pixelRatio: 1 });

    expect(
      frames.map(({ name, width, height, commands }) => [
        name,
        width,
        height,
        commands.map((command) =>
          command.kind === "rect" ? command.color : null,
        ),
      ]),
    ).toEqual([
      ["dot", 8, 8, [LIGHT_MADE_UP.guide]],
      ["cell", 40, 40, [LIGHT_MADE_UP.steel]],
      ["grid-dot", 2, 2, [LIGHT_MADE_UP.line]],
      ["count-dot", 6, 6, [LIGHT_MADE_UP.jumpLine]],
      ["clay", 36, 36, [LIGHT_MADE_UP.steel]],
      ["moss", 36, 36, [LIGHT_MADE_UP.spark]],
      ["pip-2", 8, 8, [LIGHT_MADE_UP.text]],
      ["pip-3", 8, 8, [LIGHT_MADE_UP.field]],
      ["warning", 40, 40, [LIGHT_MADE_UP.dangerLine]],
      ["shard", 6, 6, [LIGHT_MADE_UP.spark]],
      ["streak", 12, 12, [LIGHT_MADE_UP.text]],
      ["ring", 48, 48, [LIGHT_MADE_UP.dangerLine]],
      ["guide-dot", 4, 4, [LIGHT_MADE_UP.guide]],
      ["struck", 40, 40, [LIGHT_MADE_UP.fuzzball]],
      ["turn-ring", 16, 16, [LIGHT_MADE_UP.guide]],
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

/** Returns a whole made-up brick of a kind and some hits. */
function brickOf(kind: MadeUpKind, hits: number): Brick<MadeUpKind> {
  return { kind, hits, full: hits, plates: 0, tint: 0, twin: null };
}

describe("madeUpLayers", () => {
  it.each([
    ["clay", 0, ["clay"]],
    ["clay", 1, ["clay"]],
    ["clay", 2, ["clay", "pip-2"]],
    ["moss", 3, ["moss", "pip-2", "pip-3"]],
    ["moss", 9, ["moss", "pip-2", "pip-3"]],
  ] as const)(
    "stacks a brick of %s of %i hits as its kind's square and a pip for each hit past the first, two at most",
    (kind, hits, frames) => {
      expect(madeUpLayers(brickOf(kind, hits))).toEqual(frames);
    },
  );

  it("stacks as many frames at most as it says", () => {
    expect(madeUpLayers(brickOf("clay", 9))).toHaveLength(MADE_UP_MOST_LAYERS);
  });

  it("hands a brick of a kind and its hits the same list each time", () => {
    expect(madeUpLayers(brickOf("clay", 3))).toBe(
      madeUpLayers(brickOf("clay", 3)),
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
