import { colorNumber } from "@fz/phaser/color";
import { fuzzballCommands } from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  centered,
  extentOf,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { FUZZBALL, FUZZBALL_FACES } from "@fz/style/fuzzball";
import {
  ART_PALETTE,
  ART_SCALE,
  SMALLEST_SCALE,
  billionths,
} from "../../testing/art_frames";
import { BODY, SQUARE } from "./design_square";
import { EYES_GRID, eyesFrames } from "./eyes";
import { FRAMES } from "./frame_names";
import { FRIZZBALL_EYES_SEAT, frizzballFrames } from "./frizzball";

/** The frizzball's frames in the specs' palette, at their scale. */
const FRIZZBALL = frizzballFrames(ART_PALETTE, ART_SCALE);

/** The frizzball's body. */
const BODY_FRAME = frameNamed(FRIZZBALL, FRAMES.frizzball);

/** A scale so large that no line of a face is widened to a CSS pixel, as the eyes of a fuzzball and the frizzball's are, each by the least it is shown at. */
const LARGE: ArtScale = { unit: 400, pixelRatio: 1 };

/** Returns how many of a frame's shapes are of a kind and in a color. */
function countOf(
  frame: ArtFrame,
  kind: DrawCommand["kind"],
  color: number,
): number {
  return frame.commands.filter(
    (command) => command.kind === kind && command.color === color,
  ).length;
}

/** Returns how far a frame's shapes in the frizzball's body color reach from its middle, either way. */
function reachOf(frame: ArtFrame): number {
  return Math.max(
    ...frame.commands
      .filter(({ color }) => color === ART_PALETTE.frizzball.body)
      .map((command) => {
        const { x, y, width, height } = extentOf(command);
        return Math.max(
          frame.width / 2 - x,
          x + width - frame.width / 2,
          frame.height / 2 - y,
          y + height - frame.height / 2,
        );
      }),
  );
}

describe("frizzballFrames", () => {
  it("draws the frizzball's body, then its eyes in each of the house fuzzball's faces", () => {
    expect(FRIZZBALL.map(({ name }) => name)).toEqual([
      FRAMES.frizzball,
      ...FUZZBALL_FACES.map((face) => FRAMES.frizzballEyes(face)),
    ]);
  });

  it("draws its body 0.84 of a fuzzball's across, in the text, and its sparks in the sparks' color, nothing else", () => {
    const [disc] = BODY_FRAME.commands;

    expect({
      disc: disc?.kind === "circle" ? billionths(disc.radius) : NaN,
      colors: new Set(BODY_FRAME.commands.map(({ color }) => color)),
    }).toEqual({
      disc: billionths(((0.84 * BODY) / SQUARE) * ART_SCALE.unit),
      colors: new Set([ART_PALETTE.frizzball.body, ART_PALETTE.spark]),
    });
  });

  it("stands the house fuzzball's fur on end, reaching further than at rest", () => {
    const atRest = centered(
      FRAMES.frizzball,
      fuzzballCommands(0.84 * EYES_GRID * ART_SCALE.unit, {
        color: ART_PALETTE.frizzball.body,
      }),
    );

    expect(reachOf(BODY_FRAME)).toBeGreaterThan(reachOf(atRest));
  });

  it("sparks with static's three ticks and three stars, their cores alone, with no halo in its own color", () => {
    expect({
      cores: countOf(BODY_FRAME, "polygon", ART_PALETTE.spark),
      halos: countOf(BODY_FRAME, "polygon", ART_PALETTE.frizzball.body),
    }).toEqual({ cores: 3, halos: 0 });
  });

  it.each(FUZZBALL_FACES)(
    "draws its eyes in %s as a fuzzball's are, in the page's color, glinting in its own",
    (face) => {
      const eyes = frameNamed(
        frizzballFrames(ART_PALETTE, LARGE),
        FRAMES.frizzballEyes(face),
      );
      const fuzzballs = frameNamed(eyesFrames(LARGE), FRAMES.eyes(face));
      const recolor = new Map([
        [ART_PALETTE.frizzball.eyes, "eye"],
        [ART_PALETTE.frizzball.body, "glint"],
      ]);
      const houseRecolor = new Map([
        [colorNumber(FUZZBALL.ink), "eye"],
        [colorNumber(FUZZBALL.glint), "glint"],
      ]);

      expect(
        eyes.commands.map((command) => ({
          ...command,
          color: recolor.get(command.color),
        })),
      ).toEqual(
        fuzzballs.commands.map((command) => ({
          ...command,
          color: houseRecolor.get(command.color),
        })),
      );
    },
  );
});

describe("frizzballFrames at the smallest square", () => {
  it("draws a line of its eyes' faces a CSS pixel wide at least, shown at its size", () => {
    const lines = frizzballFrames(ART_PALETTE, SMALLEST_SCALE)
      .filter(({ name }) => name !== FRAMES.frizzball)
      .flatMap(({ commands }) => commands)
      .filter((command) => command.kind === "line");

    expect(
      billionths(
        Math.min(...lines.map(({ width }) => width)) *
          FRIZZBALL_EYES_SEAT.scale,
      ),
    ).toBeGreaterThanOrEqual(Math.ceil(SMALLEST_SCALE.pixelRatio));
  });
});

describe("FRIZZBALL_EYES_SEAT", () => {
  it("sits its eyes at its body's middle, in the middle of its square, 0.84 of a fuzzball's", () => {
    expect(FRIZZBALL_EYES_SEAT).toEqual({ x: 0, y: 0, scale: 0.84 });
  });
});
