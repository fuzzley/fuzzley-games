import { colorNumber } from "@fz/phaser/color";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type LineCommand,
  ORIGIN,
  type Point,
  circle,
  extentOf,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  FUZZBALL,
  FUZZBALL_FACES,
  type FuzzballFace,
} from "@fz/style/fuzzball";
import {
  ART_PALETTE,
  ART_ROLES,
  ART_SCALE,
  SMALLEST_SCALE,
  billionths,
} from "../../testing/art_frames";
import { type BoardPalette, boardPalette } from "../colors/palette";
import { BODY, SQUARE } from "./design_square";
import { eyesFrames } from "./eyes";
import { FRAMES } from "./frame_names";
import { FRIZZBALL_EYES_SEAT, frizzballFrames } from "./frizzball";

/** The frizzball's frames in the specs' palette, at their scale. */
const FRIZZBALL = frizzballFrames(ART_PALETTE, ART_SCALE);

/** The frizzball's body. */
const BODY_FRAME = frameNamed(FRIZZBALL, FRAMES.frizzball);

/** The frizzball's sparks. */
const SPARKS_FRAME = frameNamed(FRIZZBALL, FRAMES.frizzballSparks);

/** The frizzball's body's radius in the body's frame: 0.84 of a fuzzball's. */
const RADIUS = ((0.84 * BODY) / SQUARE) * ART_SCALE.unit;

/** A scale so large that no line of a face is widened to a CSS pixel, as the eyes of a fuzzball and the frizzball's are, each by the least it is shown at. */
const LARGE: ArtScale = { unit: 400, pixelRatio: 1 };

/** The specs' palette's roles in a dark palette, whose frizzball's eyes hold no pupils. */
const DARK_PALETTE = boardPalette(ART_ROLES, "dark");

/** The faces whose eyes are open, each filled, which a light palette's frizzball's white eyes hold pupils in. */
const OPEN_FACES = [
  "rest",
  "eep",
  "plead",
] as const satisfies readonly FuzzballFace[];

/** The faces whose eyes are lines, or shut in part by a lid, which hold no pupil. */
const CLOSED_FACES = FUZZBALL_FACES.filter(
  (face) => !(OPEN_FACES as readonly FuzzballFace[]).includes(face),
);

/** Returns the frizzball's eyes in a face, in a palette, at a scale where no line of a face is widened. */
function eyesIn(palette: BoardPalette, face: FuzzballFace): ArtFrame {
  return frameNamed(
    frizzballFrames(palette, LARGE),
    FRAMES.frizzballEyes(face),
  );
}

/** Returns where a shape's middle lies and how large it is, times a share, each to a billionth. */
function middleAndSize(
  command: DrawCommand | undefined,
  share = 1,
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const { x, y, width, height } = extentOf(
    command ?? circle(ORIGIN, 0, { color: 0 }),
  );
  return {
    x: billionths(x + width / 2),
    y: billionths(y + height / 2),
    width: billionths(width * share),
    height: billionths(height * share),
  };
}

/** Returns the straight lines among drawing commands in a color, in the order they are drawn. */
function linesIn(
  commands: readonly DrawCommand[],
  color: number,
): readonly LineCommand[] {
  return commands.flatMap((command) =>
    command.kind === "line" && command.color === color ? [command] : [],
  );
}

/** Returns an angle in radians as a turn from the right, clockwise, from 0 up to a whole turn, to a billionth. */
function turnOf(angle: number): number {
  const whole = 2 * Math.PI;
  return billionths(((angle % whole) + whole) % whole);
}

/** Returns where a point in a frame lies from its middle: how far, in the frizzball's body's radii, and which way, each to a billionth. */
function polarOf(
  frame: ArtFrame,
  { x, y }: Point,
): { radii: number; turn: number } {
  const across = x - frame.width / 2;
  const down = y - frame.height / 2;
  return {
    radii: billionths(Math.hypot(across, down) / RADIUS),
    turn: turnOf(Math.atan2(down, across)),
  };
}

describe("frizzballFrames", () => {
  it("draws the frizzball's body, then its sparks, then its eyes in each of the house fuzzball's faces", () => {
    expect(FRIZZBALL.map(({ name }) => name)).toEqual([
      FRAMES.frizzball,
      FRAMES.frizzballSparks,
      ...FUZZBALL_FACES.map((face) => FRAMES.frizzballEyes(face)),
    ]);
  });

  it("draws its body over its rays, a disc 0.84 of a fuzzball's across, all in its own color", () => {
    const disc = BODY_FRAME.commands.at(-1);

    expect({
      disc: disc?.kind === "circle" ? billionths(disc.radius) : NaN,
      colors: new Set(BODY_FRAME.commands.map(({ color }) => color)),
    }).toEqual({
      disc: billionths(RADIUS),
      colors: new Set([ART_PALETTE.frizzball.body]),
    });
  });

  it("stands its fur on end in 18 rays straight out round it from straight up, 1.52 and 1.3 of its body's radius long in turn and 0.24 wide", () => {
    const rays = linesIn(BODY_FRAME.commands, ART_PALETTE.frizzball.body);

    expect(
      rays.map(({ from, to, width }) => ({
        root: polarOf(BODY_FRAME, from),
        tip: polarOf(BODY_FRAME, to),
        width: billionths(width / RADIUS),
      })),
    ).toEqual(
      Array.from({ length: 18 }, (_, i) => {
        const turn = turnOf((i / 18) * 2 * Math.PI - Math.PI / 2);
        return {
          root: { radii: 0.78, turn },
          tip: { radii: i % 2 === 0 ? 1.52 : 1.3, turn },
          width: 0.24,
        };
      }),
    );
  });

  it("sparks in a frame of their own about its body's middle, 4 zigzags of three strokes each in the sparks' color, 0.13 of its body's radius wide, their middles 1.86 of it out, a quarter turn apart from 0.3 radians round", () => {
    const strokes = linesIn(SPARKS_FRAME.commands, ART_PALETTE.spark);

    expect({
      colors: new Set(SPARKS_FRAME.commands.map(({ color }) => color)),
      widths: new Set(strokes.map(({ width }) => billionths(width / RADIUS))),
      middles: strokes
        .filter((_, i) => i % 3 === 1)
        .map(({ from, to }) =>
          polarOf(SPARKS_FRAME, {
            x: (from.x + to.x) / 2,
            y: (from.y + to.y) / 2,
          }),
        ),
    }).toEqual({
      colors: new Set([ART_PALETTE.spark]),
      widths: new Set([0.13]),
      middles: Array.from({ length: 4 }, (_, i) => ({
        radii: 1.86,
        turn: turnOf(0.3 + (i * Math.PI) / 2),
      })),
    });
  });

  it.each(OPEN_FACES)(
    "draws each eye in %s white, in the page's color, holding a pupil in the text half its size about its middle",
    (face) => {
      const [left, right, ...pupils] = eyesIn(ART_PALETTE, face).commands;

      expect(
        pupils.slice(0, 2).map((pupil) => ({
          color: pupil.color,
          ...middleAndSize(pupil),
        })),
      ).toEqual(
        [left, right].map((white) => ({
          color: ART_PALETTE.frizzball.pupils,
          ...middleAndSize(white, 0.5),
        })),
      );
    },
  );

  it.each(OPEN_FACES)(
    "glints each pupil in %s in the page's color, over it",
    (face) => {
      const glints = eyesIn(ART_PALETTE, face).commands.slice(4);

      expect({
        glints: glints.length > 0,
        drawn: new Set(
          glints.map(({ kind, color }) => `${kind} ${String(color)}`),
        ),
      }).toEqual({
        glints: true,
        drawn: new Set([`circle ${String(ART_PALETTE.frizzball.glint)}`]),
      });
    },
  );

  it.each(CLOSED_FACES)(
    "draws its eyes in %s in the page's color alone, with no pupil",
    (face) => {
      expect(
        new Set(eyesIn(ART_PALETTE, face).commands.map(({ color }) => color)),
      ).toEqual(new Set([ART_PALETTE.frizzball.eyes]));
    },
  );

  it.each(FUZZBALL_FACES)(
    "draws its eyes in %s on a dark palette as a fuzzball's are, in the page's color, glinting in the text",
    (face) => {
      const { frizzball } = DARK_PALETTE;
      const recolor = new Map([
        [frizzball.eyes, "eye"],
        [frizzball.glint, "glint"],
      ]);
      const houseRecolor = new Map([
        [colorNumber(FUZZBALL.ink), "eye"],
        [colorNumber(FUZZBALL.glint), "glint"],
      ]);

      expect(
        eyesIn(DARK_PALETTE, face).commands.map((command) => ({
          ...command,
          color: recolor.get(command.color),
        })),
      ).toEqual(
        frameNamed(eyesFrames(LARGE), FRAMES.eyes(face)).commands.map(
          (command) => ({
            ...command,
            color: houseRecolor.get(command.color),
          }),
        ),
      );
    },
  );
});

describe("frizzballFrames at a 40 CSS px square at a pixel ratio of 1", () => {
  it.each(OPEN_FACES)(
    "leaves out a glint of a pupil in %s narrower than a device pixel, as a fuzzball's eyes do",
    (face) => {
      const glints = frameNamed(
        frizzballFrames(ART_PALETTE, { unit: 40, pixelRatio: 1 }),
        FRAMES.frizzballEyes(face),
      ).commands.flatMap((command) =>
        command.kind === "circle" ? [2 * command.radius] : [],
      );

      expect(Math.min(...glints)).toBeGreaterThanOrEqual(1);
    },
  );
});

describe("frizzballFrames at the smallest square", () => {
  it("draws its sparks a CSS pixel wide at least", () => {
    const strokes = linesIn(
      frameNamed(
        frizzballFrames(ART_PALETTE, SMALLEST_SCALE),
        FRAMES.frizzballSparks,
      ).commands,
      ART_PALETTE.spark,
    );

    expect(
      billionths(Math.min(...strokes.map(({ width }) => width))),
    ).toBeGreaterThanOrEqual(Math.ceil(SMALLEST_SCALE.pixelRatio));
  });

  it("draws a line of its eyes' faces a CSS pixel wide at least, shown at its size", () => {
    const frames = frizzballFrames(ART_PALETTE, SMALLEST_SCALE);
    const lines = FUZZBALL_FACES.flatMap(
      (face) => frameNamed(frames, FRAMES.frizzballEyes(face)).commands,
    ).filter((command) => command.kind === "line");

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
