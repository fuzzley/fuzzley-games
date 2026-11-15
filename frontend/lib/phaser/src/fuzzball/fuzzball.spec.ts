import * as style from "@fz/style/fuzzball";
import {
  type EyeMark,
  FUZZBALL,
  FUZZBALL_FACES,
  SMALL_FUR_WIDTH,
  eyesOf,
  lookOffset,
} from "@fz/style/fuzzball";
import {
  type DrawCommand,
  ORIGIN,
  type Point,
  circle,
  ellipsePoints,
  extentOf,
  placed,
  polygon,
} from "../shapes";
import { combedStrands, sparkCommands, wornSparks } from "./combing";
import {
  FUZZBALL_GRID,
  FUZZBALL_LOOK,
  FUZZBALL_STRANDS,
  type Strand,
  aboutBody,
  eyesCommands,
  furReach,
  fuzzballCommands,
  fuzzballWearing,
  strandsOf,
} from "./fuzzball";

/** How many strands of fur the fuzzball's path draws, one for each move in it. */
const STRANDS = FUZZBALL.fur.d.split("M").length - 1;

/** Returns the width a command is drawn at: a line's width, or a dot's across. */
function widthOf(command: DrawCommand): number {
  if (command.kind === "line") return command.width;
  return command.kind === "circle" ? 2 * command.radius : NaN;
}

/** Returns a number to a billionth, so two worked out alike but for a rounding are equal. */
function billionths(value: number): number {
  return Math.round(value * 1e9) / 1e9 + 0;
}

/** Returns where a command's drawing starts, its left and top, to a billionth. */
function cornerOf(command: DrawCommand): Point {
  const { x, y } = extentOf(command);
  return { x: billionths(x), y: billionths(y) };
}

/** Returns a point of the view box about the body's middle, `by` device pixels to a unit of the grid. */
function onCanvas({ cx, cy }: { cx: number; cy: number }, by: number): Point {
  return { x: (cx - FUZZBALL.body.cx) * by, y: (cy - FUZZBALL.body.cy) * by };
}

describe("what it hands on from @fz/style/fuzzball", () => {
  it.each([
    ["FUZZBALL_GRID", FUZZBALL_GRID, style.FUZZBALL_GRID],
    ["aboutBody", aboutBody, style.aboutBody],
    ["strandsOf", strandsOf, style.strandsOf],
    ["FUZZBALL_STRANDS", FUZZBALL_STRANDS, style.FUZZBALL_STRANDS],
    ["FUZZBALL_LOOK", FUZZBALL_LOOK, style.FUZZBALL_LOOK],
  ])("hands on %s as @fz/style's own", (_, own, styles) => {
    expect(own).toBe(styles);
  });
});

describe("furReach", () => {
  it("reaches as far as the furthest tip, and half a strand's width", () => {
    const fur: readonly Strand[] = [
      { from: { x: 0, y: 0 }, control: { x: 0, y: 0 }, to: { x: 3, y: 4 } },
      { from: { x: 0, y: 0 }, control: { x: 0, y: 0 }, to: { x: 0, y: -2 } },
    ];

    expect(furReach(fur)).toBe(5 + FUZZBALL.fur.width / 2);
  });

  it("reaches half a strand's width past the tip for strands of another width", () => {
    const fur: readonly Strand[] = [
      { from: { x: 0, y: 0 }, control: { x: 0, y: 0 }, to: { x: 3, y: 4 } },
    ];

    expect(furReach(fur, SMALL_FUR_WIDTH)).toBe(5 + SMALL_FUR_WIDTH / 2);
  });

  it("reaches past the body with the fuzzball's own fur", () => {
    expect(furReach()).toBeGreaterThan(FUZZBALL.body.r);
  });
});

describe("fuzzballCommands", () => {
  it("draws the body, then each strand round at its ends, as wide as the grid says", () => {
    const [body, ...fur] = fuzzballCommands(2, { color: 7 });

    expect({
      body,
      lines: fur.filter((command) => command.kind === "line").length,
      widths: new Set(fur.map(widthOf)),
    }).toEqual({
      body: {
        kind: "circle",
        x: 0,
        y: 0,
        radius: 2 * FUZZBALL.body.r,
        color: 7,
      },
      // Each strand is a curve of eight straight pieces.
      lines: 8 * STRANDS,
      widths: new Set([2 * FUZZBALL.fur.width]),
    });
  });

  it("draws an outline beneath, all of it first, a width wider all round", () => {
    const plain = fuzzballCommands(1, { color: 7 });
    const outlined = fuzzballCommands(1, {
      color: 7,
      outline: { color: 9, width: 2 },
    });
    const under = outlined.slice(0, plain.length);

    expect({
      under: new Set(under.map((command) => command.color)),
      over: outlined.slice(plain.length),
      body: under[0],
      widths: new Set(under.slice(1).map(widthOf)),
    }).toEqual({
      under: new Set([9]),
      over: plain,
      body: {
        kind: "circle",
        x: 0,
        y: 0,
        radius: FUZZBALL.body.r + 2,
        color: 9,
      },
      widths: new Set([FUZZBALL.fur.width + 4]),
    });
  });

  it("draws each strand as wide as it is asked, on the grid", () => {
    const fur = fuzzballCommands(2, { color: 7, furWidth: 3.5 }).slice(1);

    expect(new Set(fur.map(widthOf))).toEqual(new Set([7]));
  });

  it("draws fur combed a game's own way", () => {
    const fur: readonly Strand[] = [
      { from: { x: 1, y: 0 }, control: { x: 2, y: 0 }, to: { x: 3, y: 0 } },
    ];

    const lines = fuzzballCommands(1, { color: 7, fur }).filter(
      (command) => command.kind === "line",
    );

    expect(lines).toHaveLength(8);
  });
});

describe("fuzzballWearing", () => {
  const outline = { color: 9, width: 2 };

  /** Returns a dot in a color, to tell apart where a part is drawn. */
  function part(color: number): DrawCommand {
    return circle(ORIGIN, 1, { color });
  }

  it("draws its outline, then what it wears' outlines, then what lies beneath, then its body and fur, then what lies over", () => {
    const plain = fuzzballCommands(1, { color: 7 });
    const outlined = fuzzballCommands(1, { color: 7, outline });

    const drawn = fuzzballWearing(
      1,
      { color: 7, outline },
      { outlines: [part(1)], beneath: [part(2)], over: [part(3)] },
    );

    expect(drawn).toEqual([
      ...outlined.slice(0, outlined.length - plain.length),
      part(1),
      part(2),
      ...plain,
      part(3),
    ]);
  });

  it("starts at what it wears' outlines without an outline of its own", () => {
    const plain = fuzzballCommands(1, { color: 7 });

    expect(
      fuzzballWearing(
        1,
        { color: 7 },
        { outlines: [part(1)], over: [part(3)] },
      ),
    ).toEqual([part(1), ...plain, part(3)]);
  });

  it("outlines its sparks as one with it, so no outline covers any of it", () => {
    const fur = combedStrands(1);
    const spark = { color: 5, width: 1 };
    // Its own outline is a command for each of its body's and fur's.
    const outlines =
      fuzzballCommands(2, { color: 7, fur }).length +
      sparkCommands(2, spark).length;

    const colors = fuzzballWearing(
      2,
      { color: 7, outline, fur },
      wornSparks(2, spark, outline),
    ).map(({ color }) => color);

    expect({
      outlines: new Set(colors.slice(0, outlines)),
      after: colors.slice(outlines).includes(outline.color),
    }).toEqual({ outlines: new Set([outline.color]), after: false });
  });
});

describe("eyesCommands", () => {
  it("draws the mark's own eyes at rest, each an ellipse's points, and each glint a dot", () => {
    expect(eyesCommands(2, { color: 3, glint: 4 })).toEqual([
      ...FUZZBALL.eyes.map((eye) =>
        polygon(ellipsePoints(onCanvas(eye, 2), eye.rx * 2, eye.ry * 2), {
          color: 3,
        }),
      ),
      ...FUZZBALL.glints.map((glint) =>
        circle(onCanvas(glint, 2), glint.r * 2, { color: 4 }),
      ),
    ]);
  });

  it("draws no glints without the glints' color", () => {
    expect(
      eyesCommands(1, { color: 3 }).map(({ kind, color }) => [kind, color]),
    ).toEqual(FUZZBALL.eyes.map(() => ["polygon", 3]));
  });

  it("glints the eyes where each glint is a pixel or more across", () => {
    const glints = eyesCommands(19 / FUZZBALL_GRID, { color: 3, glint: 4 })
      .slice(FUZZBALL.eyes.length)
      .map(({ kind, color }) => [kind, color]);

    expect(glints).toEqual(FUZZBALL.glints.map(() => ["circle", 4]));
  });

  it("leaves the glints out where they'd be under a pixel across, as they'd only turn the eyes grey", () => {
    expect(
      eyesCommands(18 / FUZZBALL_GRID, { color: 3, glint: 4 }),
    ).toHaveLength(FUZZBALL.eyes.length);
  });

  it("leaves out a glint of another shape where it'd be under a pixel across at its narrowest", () => {
    const glints = (by: number): number =>
      eyesCommands(by, { color: 3, glint: 4 }, { face: "set" }).filter(
        ({ color }) => color === 4,
      ).length;

    // At 0.8 its glints are wider than a pixel but not as tall.
    expect([glints(2), glints(0.8)]).toEqual([2, 0]);
  });

  it.each(FUZZBALL_FACES)(
    "draws the face %s in the eyes' color, then its glints over them in theirs",
    (face) => {
      // An ellipse or a polygon is a command; a line is its pieces and the dots that round them.
      const commandsOf = (mark: EyeMark): number =>
        mark.kind === "stroke" ? 2 * mark.points.length - 1 : 1;
      const marks = eyesOf({ face });

      const colors = eyesCommands(4, { color: 3, glint: 4 }, { face }).map(
        ({ color }) => color,
      );

      expect(colors).toEqual(
        marks.flatMap((mark) =>
          Array.from({ length: commandsOf(mark) }, () =>
            mark.tone === "eye" ? 3 : 4,
          ),
        ),
      );
    },
  );

  it("draws a lid as the face's polygon, `by` device pixels to a unit of the grid", () => {
    const [lid] = eyesOf({ face: "set" });

    const [drawn] = eyesCommands(3, { color: 3 }, { face: "set" });

    expect(drawn).toEqual(
      lid?.kind === "polygon"
        ? polygon(placed(lid.points, 3), { color: 3 })
        : undefined,
    );
  });

  it("draws a line of a face round at its ends and corners, as wide as the face says", () => {
    const [arc] = eyesOf({ face: "happy" });
    const width = arc?.kind === "stroke" ? arc.width : NaN;

    const drawn = eyesCommands(3, { color: 3 }, { face: "happy" });

    expect({
      lines: drawn.filter(({ kind }) => kind === "line").length,
      dots: drawn.filter(({ kind }) => kind === "circle").length,
      widths: new Set(drawn.map(widthOf)),
    }).toEqual({ lines: 2 * 12, dots: 2 * 13, widths: new Set([3 * width]) });
  });

  it("shifts every mark toward a look, as far as `lookOffset()` says", () => {
    const shift = lookOffset({ x: 1, y: -1 });
    const rest = eyesCommands(2, { color: 3, glint: 4 });

    const looking = eyesCommands(
      2,
      { color: 3, glint: 4 },
      { look: { x: 1, y: -1 } },
    );

    expect(looking.map(cornerOf)).toEqual(
      rest.map((command) => {
        const { x, y } = extentOf(command);
        return {
          x: billionths(x + shift.x * 2),
          y: billionths(y + shift.y * 2),
        };
      }),
    );
  });

  it("draws the small form's eyes with no glints", () => {
    expect(
      eyesCommands(2, { color: 3, glint: 4 }, { small: true }).map(
        ({ color }) => color,
      ),
    ).toEqual([3, 3]);
  });
});
