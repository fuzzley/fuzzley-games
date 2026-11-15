import type { Area, Point } from "@fz/phaser/shapes";
import { FIELD_SHORT_SIDE } from "../../rules/tuning";
import { ENDLESS, SECTORS } from "../../rules/waves/waves";
import { CONSTELLATION } from "../art/pilot_art";
import { MOST_STARS } from "../field/specks";
import type { Mark } from "./marks";
import { PLACE_IDS, type PlaceId, backdropOf, placeOfSector } from "./places";

/** A laptop's field, wider than it is tall. */
const WIDE = { width: 72, height: 40 };

/** A phone's field, upright. */
const TALL = { width: 40, height: 72 };

/** Each place on each shape of field. */
const LAID = PLACE_IDS.flatMap((place) =>
  (
    [
      ["wide", WIDE],
      ["tall", TALL],
    ] as const
  ).map(([shape, torus]) => ({ place, shape, torus })),
);

/** Returns the area the points reach over. */
function areaOf(points: readonly Point[]): Area {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Returns the area an ellipse turned about its middle reaches over, at most, as a circle of its longer radius would. */
function ellipseArea(at: Point, rx: number, ry: number): Area {
  const most = Math.max(rx, ry);
  return areaOf([
    { x: at.x - most, y: at.y - most },
    { x: at.x + most, y: at.y + most },
  ]);
}

/** Returns the area a mark reaches over, in field units, or near it. */
function reachOf(mark: Mark): Area {
  switch (mark.kind) {
    case "soft":
      return ellipseArea(mark.at, mark.rx, mark.ry);
    case "streak":
      return ellipseArea(mark.at, mark.length / 2, mark.width);
    case "speck":
      return ellipseArea(mark.at, mark.r, mark.r);
    case "flat":
    case "line":
      return areaOf(mark.points);
    case "bank":
      return areaOf(
        mark.billows.flatMap(({ at, rx, ry }) => {
          const { x, y, width, height } = ellipseArea(at, rx, ry);
          return [
            { x, y },
            { x: x + width, y: y + height },
          ];
        }),
      );
  }
}

/** Returns whether an area lies on a field at all. */
function onField(area: Area, { width, height }: typeof WIDE): boolean {
  return (
    area.x < width &&
    area.y < height &&
    area.x + area.width > 0 &&
    area.y + area.height > 0
  );
}

/** Returns whether an area reaches past an edge of a field. */
function pastAnEdge(area: Area, { width, height }: typeof WIDE): boolean {
  return (
    area.x < 0 ||
    area.y < 0 ||
    area.x + area.width > width ||
    area.y + area.height > height
  );
}

/** Returns the numbers that lay a mark out, its places and its sizes, added up. */
function numbersOf(mark: Mark): number {
  const at = ({ x, y }: Point): number => x + y;
  switch (mark.kind) {
    case "soft":
      return at(mark.at) + mark.rx + mark.ry;
    case "flat":
    case "line":
      return mark.points.reduce((sum, point) => sum + at(point), 0);
    case "speck":
      return at(mark.at) + mark.r;
    case "streak":
      return at(mark.at) + mark.length + mark.width;
    case "bank":
      return mark.billows.reduce(
        (sum, billow) => sum + at(billow.at) + billow.rx + billow.ry,
        0,
      );
  }
}

/** Returns a number of marks in turn, each mark's numbers weighed by its place among them, so a mark out of turn changes it. */
function printOf(marks: readonly Mark[]): number {
  return marks.reduce((sum, mark, i) => sum + (i + 1) * numbersOf(mark), 0);
}

/**
 * How many marks each layer of each place holds on a wide field from seed 7,
 * and each layer's print, as the kit's `makeBackdrop()` lays them out
 * (`docs/asteroid-breaker-uplift/art/lib/backdrop.mjs`), Endless's landmark
 * without the constellation, which the kit lays itself; Endless's air, which
 * the kit strews after two draws for its constellation, is the port's own.
 */
const KIT: Readonly<
  Record<
    PlaceId,
    readonly [counts: readonly number[], prints: readonly (number | null)[]]
  >
> = {
  "inner-belt": [
    [4, 84, 20],
    [1097.135963, 2480957.664241, 12181.571473],
  ],
  "iron-reach": [
    [5, 279, 30],
    [1612.343696, 12125108.615986, 168906.876314],
  ],
  storm: [
    [5, 10, 15],
    [1610.621656, 10449.671651, 7840.680492],
  ],
  endless: [
    [4, 107, 6],
    [1128.177381, 310890.207101, null],
  ],
};

describe("placeOfSector", () => {
  it.each([...SECTORS, ENDLESS].map(({ id }) => id))(
    "shows the game's sector %s in a place of its own, named as it is",
    (id) => {
      expect(placeOfSector(id)).toBe(id);
    },
  );

  it("shows each sector in a place of its own, in the order a run meets them", () => {
    expect([...SECTORS, ENDLESS].map(({ id }) => placeOfSector(id))).toEqual(
      PLACE_IDS,
    );
  });

  it("shows a sector the game doesn't write of, as a spec's, in the first place", () => {
    expect(placeOfSector("spec")).toBe("inner-belt");
  });
});

describe("backdropOf", () => {
  describe.each(LAID)("$place, $shape", ({ place, torus }) => {
    const backdrop = backdropOf({ place, torus, seed: 7, constellation: null });

    it("lays the place out on the field's size", () => {
      expect([backdrop.place, backdrop.width, backdrop.height]).toEqual([
        place,
        torus.width,
        torus.height,
      ]);
    });

    it("lays its landmark on the field, cut off by an edge", () => {
      const reaches = backdrop.landmark.map(reachOf);

      expect([
        reaches.some((reach) => onField(reach, torus)),
        reaches.some((reach) => pastAnEdge(reach, torus)),
      ]).toEqual([true, true]);
    });

    it("lays its landmark the same every run", () => {
      const other = backdropOf({ place, torus, seed: 8, constellation: null });

      expect(other.landmark).toEqual(backdrop.landmark);
    });

    it("strews its air afresh each run", () => {
      const other = backdropOf({ place, torus, seed: 8, constellation: null });

      expect(other.air).not.toEqual(backdrop.air);
    });

    it("strews its air over the field", () => {
      const off = backdrop.air
        .map(reachOf)
        .filter((reach) => !onField(reach, torus));

      expect({ air: backdrop.air.length > 0, off }).toEqual({
        air: true,
        off: [],
      });
    });

    it("lays its wash over the field", () => {
      expect(
        backdrop.wash.map(reachOf).every((reach) => onField(reach, torus)),
      ).toBe(true);
    });

    it("strews the run's stars, as many as the largest field holds", () => {
      expect([
        backdrop.stars.far.length,
        backdrop.stars.mid.length,
        backdrop.stars.bright.length,
      ]).toEqual([MOST_STARS.far, MOST_STARS.mid, MOST_STARS.bright]);
    });

    it("darkens or tints each edge to under a fifth of the short side", () => {
      expect([backdrop.vignette.depth, backdrop.vignette.strength]).toEqual([
        0.18 * FIELD_SHORT_SIDE,
        0.6,
      ]);
    });
  });

  it.each(PLACE_IDS)(
    "lays %s out as the kit does, mark for mark and in its order",
    (place) => {
      const { wash, landmark, air } = backdropOf({
        place,
        torus: WIDE,
        seed: 7,
        constellation: null,
      });
      const [counts, prints] = KIT[place];

      const laidOut = [wash, landmark, air];

      expect([
        laidOut.map((marks) => marks.length),
        laidOut.map((marks, i) =>
          prints[i] === null ? null : Math.round(printOf(marks) * 1e6) / 1e6,
        ),
      ]).toEqual([counts, prints]);
    },
  );

  it.each(PLACE_IDS)(
    "strews the stars of %s from the run's seed, which every place shares",
    (place) => {
      const other = backdropOf({
        place: "storm",
        torus: WIDE,
        seed: 7,
        constellation: null,
      });

      const stars = backdropOf({
        place,
        torus: WIDE,
        seed: 7,
        constellation: null,
      }).stars;

      expect(stars).toEqual(other.stars);
    },
  );

  it("strews more air over a larger field, by its area", () => {
    const small = backdropOf({
      place: "inner-belt",
      torus: { width: 40, height: 40 },
      seed: 7,
      constellation: null,
    });
    const large = backdropOf({
      place: "inner-belt",
      torus: { width: 80, height: 40 },
      seed: 7,
      constellation: null,
    });

    expect([small.air.length, large.air.length]).toEqual([11, 22]);
  });

  it("flickers the Storm's forks, the first about every eleven seconds and the other less often", () => {
    const { landmark } = backdropOf({
      place: "storm",
      torus: WIDE,
      seed: 7,
      constellation: null,
    });

    const flickers = [
      ...new Set(
        landmark.flatMap((mark) => ("flicker" in mark ? [mark.flicker] : [])),
      ),
    ];

    expect(flickers.map(({ every }) => every)).toEqual([11, 17]);
  });

  it("flickers nothing in the other places", () => {
    const flickering = PLACE_IDS.filter((place) => place !== "storm").filter(
      (place) =>
        backdropOf({
          place,
          torus: WIDE,
          seed: 7,
          constellation: null,
        }).landmark.some((mark) => "flicker" in mark),
    );

    expect(flickering).toEqual([]);
  });

  it("lays the constellation an Endless wave gives over the galaxy's band, its fur's tips and its eyes where the wave lays it, joined by a faint line", () => {
    const at = { x: 0.5, y: 0.5 };
    const without = backdropOf({
      place: "endless",
      torus: WIDE,
      seed: 7,
      constellation: null,
    });

    const { landmark } = backdropOf({
      place: "endless",
      torus: WIDE,
      seed: 7,
      constellation: at,
    });

    const added = landmark.slice(without.landmark.length);
    const [line] = added;
    const reach = line ? reachOf(line) : { x: 0, y: 0, width: 0, height: 0 };
    expect({
      line: line?.kind,
      specks: added.filter((mark) => mark.kind === "speck").length,
      near:
        Math.hypot(
          reach.x + reach.width / 2 - 36,
          reach.y + reach.height / 2 - 20,
        ) < 1.5,
    }).toEqual({
      line: "line",
      specks: CONSTELLATION.specks.length + CONSTELLATION.eyes.length,
      near: true,
    });
  });

  it("lays no constellation in a sector's place, whatever it is given", () => {
    const at = { x: 0.5, y: 0.5 };

    const laid = backdropOf({
      place: "storm",
      torus: WIDE,
      seed: 7,
      constellation: at,
    });

    expect(laid.landmark).toEqual(
      backdropOf({ place: "storm", torus: WIDE, seed: 7, constellation: null })
        .landmark,
    );
  });
});
