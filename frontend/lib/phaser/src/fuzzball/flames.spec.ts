import type { DrawCommand, Point } from "../shapes";
import { wornFlames } from "./flames";

/** The art's tongues of flame: which way each points, how far out its tip is, its width and its lean, on the fuzzball's grid. */
const ART_FLAMES = [
  { turn: -129, to: 20, width: 8.6, lean: 3 },
  { turn: -104, to: 24, width: 9.6, lean: 1.2 },
  { turn: -78, to: 21.6, width: 9, lean: -2.6 },
  { turn: -53, to: 19.2, width: 8.2, lean: -3 },
] as const;

/** How many device pixels a unit of the fuzzball's grid is drawn at, here. */
const BY = 2;

/** The outline the flames are worn in. */
const OUTLINE = { color: 0x111111, width: 1.5 };

/** The flames, worn in orange. */
const FLAMES = wornFlames(BY, 0xff8800, OUTLINE);

/** Returns a polygon's points, or none for any other command. */
function pointsOf(command: DrawCommand | undefined): readonly Point[] {
  return command?.kind === "polygon" ? command.points : [];
}

/** Returns a point drawn about the body's middle on the fuzzball's grid again, turned back by degrees. */
function onGrid({ x, y }: Point, degrees: number): Point {
  const cos = Math.cos((degrees * Math.PI) / 180);
  const sin = Math.sin((degrees * Math.PI) / 180);
  return { x: (x * cos + y * sin) / BY, y: (y * cos - x * sin) / BY };
}

/** Returns a point matched as near as a rounding. */
function nearPoint(x: number, y: number): Point {
  return {
    x: expect.closeTo(x, 9) as number,
    y: expect.closeTo(y, 9) as number,
  };
}

describe("wornFlames", () => {
  it("lays four tongues beneath the body and fur, each a polygon in the color, and nothing over them", () => {
    expect({
      beneath: FLAMES.beneath?.map(({ kind, color }) => [kind, color]),
      over: FLAMES.over,
    }).toEqual({
      beneath: Array<unknown>(4).fill(["polygon", 0xff8800]),
      over: undefined,
    });
  });

  it.each(ART_FLAMES.map((flame, i) => ({ ...flame, i })))(
    "draws the tongue pointing $turn° as the art's: rising from behind the body, swelling, then leaning as it narrows to its tip",
    ({ turn, to, width, lean, i }) => {
      const points = pointsOf(FLAMES.beneath?.[i]);
      const swell = (width / 2) * 0.5 ** 1.2 * 1.35;
      const middle = 11.5 + (to - 11.5) / 2;

      expect({
        points: points.length,
        shape: points
          .filter((_, at) => at % 4 === 0)
          .map((point) => onGrid(point, turn)),
      }).toEqual({
        points: 17,
        shape: [
          nearPoint(11.5, -0.35 * width),
          nearPoint(middle, lean / 4 - swell),
          nearPoint(to, lean),
          nearPoint(middle, lean / 4 + swell),
          nearPoint(11.5, 0.35 * width),
        ],
      });
    },
  );

  it("outlines each tongue all round in the outline's color, a line along each edge twice its width, round at each corner", () => {
    const tongues = (FLAMES.beneath ?? []).map(pointsOf);
    const outlines = FLAMES.outlines ?? [];

    expect({
      edges: outlines.flatMap((command) =>
        command.kind === "line"
          ? [[command.from, command.to, command.width]]
          : [],
      ),
      corners: outlines.flatMap((command) =>
        command.kind === "circle"
          ? [[command.x, command.y, command.radius]]
          : [],
      ),
      colors: [...new Set(outlines.map(({ color }) => color))],
    }).toEqual({
      edges: tongues.flatMap((points) =>
        points.map((point, j) => [point, points[(j + 1) % points.length], 3]),
      ),
      corners: tongues.flatMap((points) =>
        [...points, ...points.slice(0, 1)].map(({ x, y }) => [x, y, 1.5]),
      ),
      colors: [OUTLINE.color],
    });
  });
});
