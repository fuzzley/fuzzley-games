import {
  type DrawCommand,
  ORIGIN,
  type Point,
  extentOf,
  line,
  polyline,
} from "@fz/phaser/shapes";
import { PLACES } from "../../rules/levels/levels";
import {
  type Motif,
  SHARPEST,
  arcadeMotif,
  coverOf,
  funfairMotif,
  gardenMotif,
  playroomMotif,
  workshopMotif,
} from "./motifs";
import { PLACE_ART } from "./places";

/** The size the specs draw a motif at, in device pixels. */
const SIZE = 100;

/** An ink no other command takes. */
const INK = 0x123456;

/** Picks at the start of each third of their range, choosing each of a place's three motifs. */
const PICKS = [0, 1 / 3, 2 / 3] as const;

/** Returns how many of a motif's commands are of each kind, as a spec reads its shapes. */
function kindsOf(commands: readonly DrawCommand[]): Record<string, number> {
  const kinds: Record<string, number> = {};
  for (const { kind } of commands) kinds[kind] = (kinds[kind] ?? 0) + 1;
  return kinds;
}

/** Returns how far what a motif drawn about the origin may cover reaches each way, rounded to a pixel. */
function reachOf(commands: readonly DrawCommand[]): {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
} {
  const extents = commands.map(coverOf);
  return {
    left: Math.round(Math.min(...extents.map(({ x }) => x))),
    top: Math.round(Math.min(...extents.map(({ y }) => y))),
    right: Math.round(Math.max(...extents.map(({ x, width }) => x + width))),
    bottom: Math.round(Math.max(...extents.map(({ y, height }) => y + height))),
  };
}

/** Returns a motif's commands, drawn about the origin at the specs' size and ink. */
function drawn(motif: Motif, pick: number): readonly DrawCommand[] {
  return motif(ORIGIN, SIZE, pick, INK);
}

/** Returns the angle a line through points turns through at each corner, in degrees: 180 where it runs straight on. */
function cornersOf(points: readonly Point[]): readonly number[] {
  return points.slice(1, -1).map((corner, i) => {
    const before = points[i] ?? corner;
    const after = points[i + 2] ?? corner;
    const back = Math.atan2(before.y - corner.y, before.x - corner.x);
    const on = Math.atan2(after.y - corner.y, after.x - corner.x);
    const degrees = Math.abs(((on - back) * 180) / Math.PI) % 360;
    return Math.min(degrees, 360 - degrees);
  });
}

describe.each(PLACES.map((place) => [place, PLACE_ART[place].motif] as const))(
  "the %s's motif",
  (_, motif) => {
    it.each(PICKS)("is drawn in its ink alone at pick %f", (pick) => {
      const colors = new Set(drawn(motif, pick).map(({ color }) => color));

      expect(colors).toEqual(new Set([INK]));
    });

    it.each(PICKS)(
      "reaches no further from its middle than two thirds of its size at pick %f",
      (pick) => {
        const { left, top, right, bottom } = reachOf(drawn(motif, pick));

        expect(Math.max(-left, -top, right, bottom)).toBeLessThanOrEqual(
          (2 / 3) * SIZE,
        );
      },
    );

    it.each(PICKS)(
      "turns a polyline at no corner sharper than the sharpest, at pick %f",
      (pick) => {
        const corners = drawn(motif, pick).flatMap((command) =>
          command.kind === "polyline" ? cornersOf(command.points) : [],
        );

        expect(Math.min(180, ...corners)).toBeGreaterThanOrEqual(SHARPEST);
      },
    );
  },
);

describe("playroomMotif", () => {
  it("draws a ring, a block and a wedge as its pick chooses", () => {
    const shapes = PICKS.map((pick) => kindsOf(drawn(playroomMotif, pick)));

    expect(shapes).toEqual([
      { ring: 1 },
      { line: 4, circle: 4 },
      { line: 3, circle: 3 },
    ]);
  });

  it("turns a block a twelfth of a turn at a time, as its pick says", () => {
    const square = reachOf(drawn(playroomMotif, 0.52));
    const turned = reachOf(drawn(playroomMotif, 0.45));

    expect({ square: square.right, turned: turned.right }).toEqual({
      square: Math.round(0.4 * SIZE + 0.065 * SIZE),
      turned: Math.round(
        0.4 * SIZE * (Math.cos(Math.PI / 6) + Math.sin(Math.PI / 6)) +
          0.065 * SIZE,
      ),
    });
  });
});

describe("workshopMotif", () => {
  it("draws a cog about a hub, or a cross, as its pick chooses", () => {
    const shapes = PICKS.map((pick) => kindsOf(drawn(workshopMotif, pick)));

    expect(shapes).toEqual([
      { polyline: 1, ring: 1 },
      { polyline: 1, ring: 1 },
      { line: 2, circle: 4 },
    ]);
  });

  it("outlines a cog's 32 corners in one line, from the middle of a tooth's top round to it again", () => {
    const [points = []] = drawn(workshopMotif, 0).flatMap((command) =>
      command.kind === "polyline" ? [command.points] : [],
    );

    const top = { x: 0.5 * Math.cos((8 * Math.PI) / 180) * SIZE, y: 0 };
    expect({
      corners: points.length - 2,
      first: points.at(0),
      last: points.at(-1),
    }).toEqual({ corners: 32, first: top, last: top });
  });
});

describe("funfairMotif", () => {
  it("draws a pennant, a large star or a small one, as its pick chooses", () => {
    const [pennant, large, small] = PICKS.map((pick) =>
      drawn(funfairMotif, pick),
    );

    expect({
      pennant: kindsOf(pennant ?? []),
      large: reachOf(large ?? []).top,
      small: reachOf(small ?? []).top,
    }).toEqual({
      pennant: { line: 3, circle: 3 },
      large: Math.round(-0.56 * SIZE),
      small: Math.round(-0.36 * SIZE),
    });
  });
});

describe("gardenMotif", () => {
  it("draws two leaves on a stem", () => {
    expect(kindsOf(drawn(gardenMotif, 0))).toEqual({
      line: 1,
      circle: 2,
      polygon: 2,
    });
  });

  it("grows its leaves either side of its stem, alike", () => {
    const leaves = drawn(gardenMotif, 0).filter(
      ({ kind }) => kind === "polygon",
    );

    const [left, right] = leaves.map((leaf) => reachOf([leaf]));
    expect(right).toEqual({
      left: -(left?.right ?? 0),
      top: left?.top,
      right: -(left?.left ?? 0),
      bottom: left?.bottom,
    });
  });
});

describe("arcadeMotif", () => {
  it("draws two rings about one middle, or two arrows, as its pick chooses", () => {
    const shapes = PICKS.map((pick) => kindsOf(drawn(arcadeMotif, pick)));

    expect(shapes).toEqual([
      { ring: 2 },
      { line: 4, circle: 6 },
      { line: 4, circle: 6 },
    ]);
  });
});

describe("coverOf", () => {
  it("covers a polyline's mitres, half its width past its extent each way", () => {
    const command = polyline(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      { color: INK, width: 4 },
    );

    expect(coverOf(command)).toEqual({ x: -4, y: -4, width: 18, height: 8 });
  });

  it("covers any other command's extent", () => {
    const command = line(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { color: INK, width: 4 },
    );

    expect(coverOf(command)).toEqual(extentOf(command));
  });
});
