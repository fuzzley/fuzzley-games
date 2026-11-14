import { FUZZBALL } from "@fz/style/fuzzball";
import { type DrawCommand, ORIGIN, circle } from "../shapes";
import { combedStrands, sparkCommands, wornSparks } from "./combing";
import {
  FUZZBALL_GRID,
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

describe("FUZZBALL_GRID", () => {
  it("is as wide as the fuzzball's view box", () => {
    expect(FUZZBALL.viewBox).toBe(
      `0 0 ${String(FUZZBALL_GRID)} ${String(FUZZBALL_GRID)}`,
    );
  });
});

describe("aboutBody", () => {
  it("measures a point of the grid from the body's middle", () => {
    expect(
      aboutBody({ x: FUZZBALL.body.cx + 1, y: FUZZBALL.body.cy - 2 }),
    ).toEqual({
      x: 1,
      y: -2,
    });
  });
});

describe("strandsOf", () => {
  it("reads each of the fuzzball's strands from its path", () => {
    expect(strandsOf(FUZZBALL.fur.d)).toHaveLength(STRANDS);
  });

  it("reads a strand's start, its bend and its tip, about the body's middle", () => {
    const { cx, cy } = FUZZBALL.body;

    expect(
      strandsOf(
        `M${String(cx)} ${String(cy)}Q${String(cx + 1)} ${String(cy + 2)} ${String(cx + 3)} ${String(cy - 4)}`,
      ),
    ).toEqual([
      { from: { x: 0, y: 0 }, control: { x: 1, y: 2 }, to: { x: 3, y: -4 } },
    ]);
  });

  it.each(["M1 2L3 4", "M1 2Q3 4 5 6 7 8"])(
    "refuses a strand drawn any other way: %s",
    (path) => {
      expect(() => strandsOf(path)).toThrow("can't read");
    },
  );
});

describe("FUZZBALL_STRANDS", () => {
  it("holds the fuzzball's own fur", () => {
    expect(FUZZBALL_STRANDS).toEqual(strandsOf(FUZZBALL.fur.d));
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
  it("draws the two eyes in their color, and no glints without the glints' color", () => {
    expect(
      eyesCommands(1, { color: 3 }).map(({ kind, color }) => [kind, color]),
    ).toEqual(FUZZBALL.eyes.map(() => ["polygon", 3]));
  });

  it("glints the eyes in the glints' color where each glint is half a pixel or more", () => {
    const glints = eyesCommands(19 / FUZZBALL_GRID, { color: 3, glint: 4 })
      .slice(FUZZBALL.eyes.length)
      .map(({ kind, color }) => [kind, color]);

    expect(glints).toEqual(FUZZBALL.glints.map(() => ["circle", 4]));
  });

  it("leaves the glints out where they'd be under half a pixel, as they'd only turn the eyes grey", () => {
    expect(
      eyesCommands(18 / FUZZBALL_GRID, { color: 3, glint: 4 }),
    ).toHaveLength(FUZZBALL.eyes.length);
  });

  it("lays the eyes about the body's middle, as the fuzzball's grid has them", () => {
    const [left] = eyesCommands(1, { color: 3 });
    const xs = left?.kind === "polygon" ? left.points.map(({ x }) => x) : [];

    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(
      (FUZZBALL.eyes[0]?.cx ?? NaN) - FUZZBALL.body.cx,
    );
  });
});
