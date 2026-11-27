import { colorNumber } from "@fz/phaser/color";
import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  extentOf,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  FUZZBALL,
  FUZZBALL_FACES,
  type FuzzballFace,
  lookOffset,
} from "@fz/style/fuzzball";
import { KIND_IDS } from "../../rules/catalog/kinds";
import { ART_SCALE, billionths } from "../../testing/art_frames";
import { BODY, SQUARE } from "./design_square";
import { EYES_GRID, EYES_LOOK, eyesFrames, eyesSeatOf } from "./eyes";
import { FRAMES } from "./frame_names";

/** The eyes at the specs' scale, a device pixel to each of the design's units. */
const EYES = eyesFrames(ART_SCALE);

/** The smallest square the board lays out, 40 CSS pixels, at 2 device pixels to one. */
const SMALLEST: ArtScale = { unit: 40 * 2, pixelRatio: 2 };

/** The eyes' ink. */
const INK = colorNumber(FUZZBALL.ink);

/** Returns the eyes in a face. */
function eyesIn(face: FuzzballFace): ArtFrame {
  return frameNamed(EYES, FRAMES.eyes(face));
}

/** Returns the area each shape of a frame in a color covers, from its frame's middle. */
function areasIn(frame: ArtFrame, color: number): readonly Area[] {
  return frame.commands
    .filter((command: DrawCommand) => command.color === color)
    .map(extentOf)
    .map(({ x, y, width, height }) => ({
      x: x - frame.width / 2,
      y: y - frame.height / 2,
      width,
      height,
    }));
}

describe("eyesFrames", () => {
  it("draws the eyes in each of the house fuzzball's faces, in its order", () => {
    expect(EYES.map(({ name }) => name)).toEqual(
      FUZZBALL_FACES.map((face) => FRAMES.eyes(face)),
    );
  });

  it("draws the eyes at rest as the design draws them: ovals 0.22 of a body's radius across and 0.29 down, either side of its middle 0.35 of its radius out, a glint over each", () => {
    const eyes = areasIn(eyesIn("rest"), INK).map(({ x, y, width, height }) =>
      [
        (x + width / 2) / BODY,
        (y + height / 2) / BODY,
        width / 2 / BODY,
        height / 2 / BODY,
      ].map((n) => Math.round(n * 100) / 100),
    );

    expect({
      eyes,
      glints: areasIn(eyesIn("rest"), colorNumber(FUZZBALL.glint)).length,
    }).toEqual({
      eyes: [
        [-0.35, -0.02, 0.22, 0.29],
        [0.35, -0.02, 0.22, 0.29],
      ],
      glints: 2,
    });
  });

  it.each(FUZZBALL_FACES)(
    "draws %s's eyes centered across a body's middle, as the design draws them, to a hundredth of a square",
    (face) => {
      const eyes = areasIn(eyesIn(face), INK);
      const left = Math.min(...eyes.map(({ x }) => x));
      const right = Math.max(...eyes.map(({ x, width }) => x + width));

      expect(Math.abs(left + right) / 2).toBeLessThanOrEqual(
        ART_SCALE.unit / 100,
      );
    },
  );

  it("draws a line of a face a CSS pixel wide at least, at the smallest square", () => {
    const lines = eyesFrames(SMALLEST)
      .flatMap(({ commands }) => commands)
      .filter((command) => command.kind === "line");

    expect(Math.min(...lines.map(({ width }) => width))).toBeGreaterThanOrEqual(
      Math.ceil(SMALLEST.pixelRatio),
    );
  });
});

describe("eyesSeatOf", () => {
  it.each(KIND_IDS)(
    "sits %s's eyes at its body's middle, wherever it sits in its square",
    (kind) => {
      const { x, y, scale } = eyesSeatOf(kind);

      expect({ x, y, scale }).toEqual(
        {
          blue: { x: 0, y: 0, scale: 1 },
          red: { x: 0, y: 0, scale: 1 },
          amber: { x: 0, y: (BODY * 0.24) / SQUARE, scale: 1 },
          green: { x: 0, y: 0, scale: 1 },
          violet: { x: 0, y: (-BODY * 0.22) / SQUARE, scale: 1 },
          pink: { x: 0, y: (BODY * 0.22) / SQUARE, scale: 1 },
        }[kind],
      );
    },
  );
});

describe("EYES_LOOK", () => {
  it("shifts the eyes as far as the design's looks, 0.13 of a body's radius across and 0.11 down, from where they sit", () => {
    const across = lookOffset({ x: 1, y: 0 }, EYES_LOOK);
    const down = lookOffset({ x: 0, y: 1 }, EYES_LOOK);

    expect(
      [across.x, across.y, down.x, down.y].map((shift) =>
        billionths((shift * EYES_GRID * SQUARE) / BODY),
      ),
    ).toEqual([0.13, 0, 0, 0.11]);
  });
});

describe("EYES_GRID", () => {
  it("counts a unit of the house fuzzball's grid in squares, its body as large as a fuzzball's", () => {
    expect(billionths(EYES_GRID * FUZZBALL.body.r)).toBe(BODY / SQUARE);
  });
});
