import {
  type DrawCommand,
  type LineCommand,
  type Point,
  turned,
} from "../shapes";
import { combedStrands, sparkCommands, wornSparks } from "./combing";
import { FUZZBALL_STRANDS, type Strand } from "./fuzzball";

/** Returns a number to a billionth, so two worked out alike but for a rounding are equal. */
function billionths(value: number): number {
  return Math.round(value * 1e9) / 1e9 + 0;
}

/** Returns a point to a billionth. */
function inBillionths({ x, y }: Point): Point {
  return { x: billionths(x), y: billionths(y) };
}

/** Returns a strand's points to a billionth. */
function strandInBillionths({ from, control, to }: Strand): Strand {
  return {
    from: inBillionths(from),
    control: inBillionths(control),
    to: inBillionths(to),
  };
}

/** Returns a way a unit long. */
function unit({ x, y }: Point): Point {
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}

/** Returns the way a strand runs, from its root to its tip, a unit long. */
function wayOf({ from, to }: Strand): Point {
  return unit({ x: to.x - from.x, y: to.y - from.y });
}

/** Returns how long a strand is, from its root straight to its tip. */
function lengthOf({ from, to }: Strand): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/** Returns how far a strand's control lies aside the line through its root and its tip. */
function asideOf({ from, control, to }: Strand): number {
  return (
    ((to.x - from.x) * (control.y - from.y) -
      (to.y - from.y) * (control.x - from.x)) /
    lengthOf({ from, control, to })
  );
}

/** Returns the sine of the angle from one way to another. */
function crossOf(one: Point, other: Point): number {
  return one.x * other.y - one.y * other.x;
}

/** Each strand of the fuzzball's fur, with the way straight out from the body's middle through its root. */
const STRANDS = FUZZBALL_STRANDS.map((strand) => ({
  strand,
  out: unit(strand.from),
}));

/** The art's sparks: which way each lies from the body's middle, in degrees clockwise from its right, and how far out it starts, on the fuzzball's grid. */
const ART_SPARKS = [
  { turn: -58, from: 16.4 },
  { turn: 8, from: 17 },
  { turn: 62, from: 16.4 },
  { turn: 148, from: 17 },
  { turn: 212, from: 16.4 },
] as const;

/** Returns the lines among a drawing's commands. */
function linesOf(commands: readonly DrawCommand[]): readonly LineCommand[] {
  return commands.flatMap((command) =>
    command.kind === "line" ? [command] : [],
  );
}

describe("combedStrands", () => {
  it.each([0, 0.3, 0.5, 1])(
    "keeps every strand's root where it grew, combed %f of the way",
    (share) => {
      expect(combedStrands(share).map(({ from }) => from)).toEqual(
        FUZZBALL_STRANDS.map(({ from }) => from),
      );
    },
  );

  it("leaves the fur as it grew at none of the way, give or take a rounding", () => {
    expect(combedStrands(0).map(strandInBillionths)).toEqual(
      FUZZBALL_STRANDS.map(strandInBillionths),
    );
  });

  it.each([
    [0, 1],
    [0.25, 1.075],
    [0.5, 1.15],
    [1, 1.3],
  ])(
    "grows every strand by 30%% of its length times the share, at %f of the way %f as long",
    (share, grown) => {
      expect(
        combedStrands(share).map((strand, i) =>
          billionths(
            lengthOf(strand) / lengthOf(FUZZBALL_STRANDS[i] ?? strand),
          ),
        ),
      ).toEqual(FUZZBALL_STRANDS.map(() => grown));
    },
  );

  it("bends every strand half as much a quarter of the way", () => {
    expect(
      combedStrands(0.25).map((strand, i) =>
        billionths(
          asideOf(strand) /
            lengthOf(strand) /
            (asideOf(FUZZBALL_STRANDS[i] ?? strand) /
              lengthOf(FUZZBALL_STRANDS[i] ?? strand)),
        ),
      ),
    ).toEqual(FUZZBALL_STRANDS.map(() => 0.5));
  });

  it.each([0.5, 0.75, 1])(
    "combs every strand straight from half the way, as at %f",
    (share) => {
      expect(
        combedStrands(share).map((strand) => billionths(asideOf(strand))),
      ).toEqual(FUZZBALL_STRANDS.map(() => 0));
    },
  );

  it("turns every strand by a blend of its own way and straight out, a unit long each, weighted by the share", () => {
    const combed = combedStrands(0.25);

    expect(
      STRANDS.map(({ strand }, i) => inBillionths(wayOf(combed[i] ?? strand))),
    ).toEqual(
      STRANDS.map(({ strand, out }) => {
        const own = wayOf(strand);
        return inBillionths(
          unit({
            x: 0.75 * own.x + 0.25 * out.x,
            y: 0.75 * own.y + 0.25 * out.y,
          }),
        );
      }),
    );
  });

  it("leans every strand half way out at half the way: as far from its own way as from straight out", () => {
    const combed = combedStrands(0.5);

    expect(
      STRANDS.map(({ strand, out }, i) => {
        const way = wayOf(combed[i] ?? strand);
        return billionths(crossOf(wayOf(strand), way) - crossOf(way, out));
      }),
    ).toEqual(STRANDS.map(() => 0));
  });

  it("stands every strand on end all the way: straight out from the body's middle through its root", () => {
    const combed = combedStrands(1);

    expect(
      STRANDS.map(({ strand }, i) => inBillionths(wayOf(combed[i] ?? strand))),
    ).toEqual(STRANDS.map(({ out }) => inBillionths(out)));
  });

  it.each([-0.01, 1.01, Number.NaN])(
    "refuses a share of %f, outside 0 to 1",
    (share) => {
      expect(() => combedStrands(share)).toThrow(RangeError);
    },
  );
});

describe("sparkCommands", () => {
  it("draws five zigzags of three lines each in the style, round at their ends and corners", () => {
    const commands = sparkCommands(2, { color: 7, width: 3 });
    const lines = linesOf(commands);
    const dots = commands.flatMap((command) =>
      command.kind === "circle" ? [command] : [],
    );

    expect({
      lines: lines.length,
      widths: new Set(lines.map(({ width }) => width)),
      dots: dots.length,
      radii: new Set(dots.map(({ radius }) => radius)),
      colors: new Set(commands.map(({ color }) => color)),
    }).toEqual({
      lines: 15,
      widths: new Set([3]),
      dots: 20,
      radii: new Set([1.5]),
      colors: new Set([7]),
    });
  });

  it("lays each spark as the art's zigzag, in its place round the body's middle, `by` device pixels to a unit of the grid", () => {
    const by = 2.5;
    const lines = linesOf(sparkCommands(by, { color: 7, width: 1 }));

    const sparks = ART_SPARKS.map(({ turn }, i) =>
      [
        lines[3 * i]?.from,
        ...lines.slice(3 * i, 3 * i + 3).map(({ to }) => to),
      ].map(
        (point) =>
          point &&
          inBillionths(turned({ x: point.x / by, y: point.y / by }, -turn)),
      ),
    );

    expect(sparks).toEqual(
      ART_SPARKS.map(({ from }) =>
        [
          { x: from, y: -0.4 },
          { x: from + 1.7, y: -1.5 },
          { x: from + 1.5, y: 1.1 },
          { x: from + 3.6, y: 0 },
        ].map(inBillionths),
      ),
    );
  });
});

describe("wornSparks", () => {
  it("draws the sparks over the body, and beneath it in the outline's color, its width wider either side", () => {
    const style = { color: 7, width: 3 };

    const worn = wornSparks(2, style, { color: 9, width: 1 });

    expect(worn).toEqual({
      outlines: sparkCommands(2, { color: 9, width: 5 }),
      over: sparkCommands(2, style),
    });
  });
});
