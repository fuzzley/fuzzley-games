import type { ArtFrame } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { THEMES } from "@fz/style/themes";
import { FIELD_ROLES } from "../../app/board/field_roles";
import { ROCK_RADIUS, STATIC_MOST } from "../../rules/tuning";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  ART_SCALES,
  reachOf,
} from "../../testing/art_frames";
import {
  fieldFrom,
  loggedOn,
  placeRock,
  shipOf,
} from "../../testing/field_picture";
import { PALETTES } from "../../testing/roles";
import { beltPalette } from "../colors/palette";
import { atlasFrames } from "./art";
import { rimToward } from "./breaks";
import {
  ARC_CUT,
  ARC_FROM,
  ARC_OVERHANG,
  ARC_RIM,
  ARC_SPARK,
  ARC_SPARK_FRAME,
  type Arc,
  type ArcEnds,
  type ArcLine,
  HULL_ARC_SEEDS,
  LEAST_ARC,
  MOST_BRANCHES,
  ZAP_ARC_SEEDS,
  ZAP_STROKES,
  arcShift,
  arcSparkHalo,
  arcSparkScale,
  arcSparkTurn,
  arcSteps,
  arcWidth,
  createArc,
  createZapStrike,
  cutArc,
  createHullArcs,
  hullArcInk,
  hullArcSeed,
  hullArcs,
  placeArc,
  strikeOf,
  zapAlpha,
  zapArc,
  zapBranches,
  zapEnds,
  zapLeap,
  zapSeed,
  zapStrength,
} from "./arcs";
import { type WrittenHalo, energyOf, haloAlpha } from "./energy";
import { CANOPY, HULL_RUNS } from "./pod_art";
import { isFine } from "./rock_art";

/** A dark palette, to hold a zap's strokes in. */
const DARK_THEME = (() => {
  const theme = THEMES.find(({ mode }) => mode === "dark");
  if (!theme) throw new Error("No dark theme.");
  return theme;
})();

/** How far a size may stray from what it should be and still pass, for a rounding. */
const SLACK = 1e-9;

/** Returns a number to six places, as the kit's numbers are written down here. */
function sixPlaces(value: number): number {
  return Math.round(value * 1e6) / 1e6 + 0;
}

/** Returns a number to four places, as the kit's runs are written down here. */
function fourPlaces(value: number): number {
  return Math.round(value * 1e4) / 1e4 + 0;
}

/** Returns the places a line runs through, to six places. */
function placesOf(line: ArcLine | undefined): readonly (readonly number[])[] {
  return (line?.at ?? [])
    .slice(0, line?.count ?? 0)
    .map(({ x, y }) => [sixPlaces(x), sixPlaces(y)]);
}

/** Returns an arc's main line and each of its branches, to six places. */
function linesOf(arc: Arc): readonly (readonly (readonly number[])[])[] {
  return [arc.main, ...arc.branches.slice(0, arc.branchCount)].map(placesOf);
}

/** Returns an arc whose main line and branches run through places. */
function arcThrough(
  main: readonly (readonly [number, number])[],
  branch: readonly (readonly [number, number])[] = [],
): Arc {
  const arc = createArc();
  const write = (line: ArcLine, places: typeof main) => {
    places.forEach(([x, y], i) => Object.assign(line.at[i] ?? {}, { x, y }));
    line.count = places.length;
  };
  write(arc.main, main);
  const [first] = arc.branches;
  if (first && branch.length > 0) write(first, branch);
  arc.branchCount = branch.length > 0 ? 1 : 0;
  return arc;
}

/** Returns an arc cut from a seed with so many branches, laid between two places, as the kit's `makeArc()` cuts one between them. */
function arcBetween(
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  seed: number,
  branches: number,
): Arc {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const cut = cutArc(length, seed, branches, createArc());
  return placeArc(cut, from, to, createArc());
}

/** Returns how far apart two lists of places lie at most, along either axis. */
function farthestApart(
  places: readonly (readonly number[])[],
  others: readonly (readonly number[])[],
): number {
  return Math.max(
    ...places.flatMap(([x, y], i) => {
      const [otherX, otherY] = others[i] ?? [];
      return [
        Math.abs((x ?? 9) - (otherX ?? 0)),
        Math.abs((y ?? 9) - (otherY ?? 0)),
      ];
    }),
  );
}

/** Returns a record a halo is written into. */
function blankHalo(): WrittenHalo {
  return { along: 9, across: 9, ahead: 9, turn: 9, strength: 9 };
}

/** Returns a record an arc's ends are written into. */
function blankEnds(): ArcEnds {
  return { from: { x: 9, y: 9 }, to: { x: 9, y: 9 } };
}

/** Returns what each of a frame's commands is and its color. */
function looksOf(frame: ArtFrame): readonly (readonly [string, number])[] {
  return frame.commands.map((command) => [command.kind, command.color]);
}

describe("cutArc and placeArc", () => {
  it("cuts the kit's arc from the kit's seed, its main line and its two branches", () => {
    const arc = arcBetween({ x: 0, y: 0 }, { x: 6, y: 0 }, 5, 2);

    // `makeArc([0, 0], [6, 0], 5, { branches: 2 })` in the kit's `fx.mjs`.
    expect(linesOf(arc)).toEqual([
      [
        [0, 0],
        [1.003414, 0.087347],
        [2.024942, -0.500398],
        [3.116252, -0.058979],
        [4.105788, -0.359327],
        [5.235665, 0.141815],
        [6, 0],
      ],
      [
        [4.105788, -0.359327],
        [4.296545, -0.090968],
        [4.901376, 0.010762],
        [5.182142, 0.29789],
      ],
      [
        [3.116252, -0.058979],
        [3.594042, -0.319515],
        [3.877816, -0.72235],
        [3.986206, -1.230487],
      ],
    ]);
  });

  it("cuts a long arc in its most steps, as the kit's, its sway less as it is longer", () => {
    const arc = arcBetween({ x: 1, y: 2 }, { x: 12, y: 9 }, 77, 1);

    // `makeArc([1, 2], [12, 9], 77, { branches: 1 })` in the kit's `fx.mjs`.
    expect(linesOf(arc)).toEqual([
      [
        [1, 2],
        [2.105281, 2.156163],
        [2.441329, 3.232915],
        [3.893919, 3.342993],
        [4.543631, 4.609884],
        [5.446308, 5.042325],
        [6.64958, 4.986495],
        [6.916586, 6.305081],
        [8.610857, 6.359684],
        [9.079508, 7.613417],
        [10.482281, 7.414801],
        [10.940119, 8.628199],
        [12, 9],
      ],
      [
        [6.64958, 4.986495],
        [6.537004, 5.715378],
        [7.051791, 6.410026],
        [6.883339, 7.121039],
      ],
    ]);
  });

  it.each([
    [1, 6],
    [6.3, 7],
    [30, 13],
  ])(
    "runs an arc %s units long from end to end through %s places, a step for about each unit, five at least and twelve at most",
    (length, places) => {
      const arc = arcBetween({ x: 2, y: 3 }, { x: 2 + length, y: 3 }, 1, 0);

      expect({
        places: arc.main.count,
        first: placesOf(arc.main)[0],
        last: placesOf(arc.main).at(-1),
      }).toEqual({ places, first: [2, 3], last: [2 + length, 3] });
    },
  );

  it.each([
    [5, MOST_BRANCHES],
    [1, 1],
    [0, 0],
  ])("gives an arc asked for %s branches %s", (asked, branches) => {
    const arc = arcBetween({ x: 0, y: 0 }, { x: 8, y: 0 }, 3, asked);

    expect(arc.branchCount).toBe(branches);
  });

  it("cuts an arc in its own frame, from (0, 0) to (1, 0)", () => {
    const arc = cutArc(6, 5, 2, createArc());

    expect([placesOf(arc.main)[0], placesOf(arc.main).at(-1)]).toEqual([
      [0, 0],
      [1, 0],
    ]);
  });

  it("cuts an arc of no length as one of the least length", () => {
    const none = cutArc(0, 5, 2, createArc());
    const least = cutArc(LEAST_ARC, 5, 2, createArc());

    expect(linesOf(none)).toEqual(linesOf(least));
  });

  it("lays a cut arc stretched and turned between other places, as the kit's would be cut between them", () => {
    const cut = cutArc(6, 5, 2, createArc());

    const turned = placeArc(
      cut,
      { x: 10, y: 10 },
      { x: 10, y: 16 },
      createArc(),
    );

    // The kit's arc from (0, 0) to (6, 0), turned a quarter about its start.
    const along = linesOf(arcBetween({ x: 0, y: 0 }, { x: 6, y: 0 }, 5, 2));
    expect(linesOf(turned)).toEqual(
      along.map((line) =>
        line.map(([x, y]) => [
          sixPlaces(10 - (y ?? 0)),
          sixPlaces(10 + (x ?? 0)),
        ]),
      ),
    );
  });

  it("cuts the same arc from the same seed, and another from another", () => {
    const cut = (seed: number) =>
      JSON.stringify(
        linesOf(arcBetween({ x: 0, y: 0 }, { x: 8, y: 4 }, seed, 2)),
      );

    expect({ again: cut(9) === cut(9), other: cut(10) === cut(9) }).toEqual({
      again: true,
      other: false,
    });
  });
});

describe("arcShift", () => {
  const torus = fieldFrom(["..."]).torus;

  it.each([
    [
      "within the field",
      [
        [10, 10],
        [14, 12],
      ],
      [],
      [0, 0],
    ],
    [
      "past its right edge",
      [
        [torus.width - 2, 10],
        [torus.width + 3, 10],
      ],
      [],
      [-torus.width, 0],
    ],
    [
      "past its top",
      [
        [10, 1],
        [10, -3],
      ],
      [],
      [0, torus.height],
    ],
    [
      "past its left edge and its bottom",
      [
        [1, torus.height - 1],
        [-2, torus.height + 2],
      ],
      [],
      [torus.width, -torus.height],
    ],
    [
      "past an edge by a branch alone",
      [
        [10, 1.5],
        [14, 1.5],
      ],
      [
        [12, 1.5],
        [12, -0.5],
      ],
      [0, torus.height],
    ],
    [
      "past its top by its strokes alone",
      [
        [10, ARC_OVERHANG - 0.01],
        [14, ARC_OVERHANG - 0.01],
      ],
      [],
      [0, torus.height],
    ],
  ] as const)(
    "copies an arc %s where it reaches past",
    (_, main, branch, [x, y]) => {
      const shift = arcShift(arcThrough(main, branch), torus, { x: 9, y: 9 });

      expect([shift.x + 0, shift.y + 0]).toEqual([x, y]);
    },
  );
});

describe("a zap's arc in time", () => {
  it.each([
    [0, 0],
    [44, 0],
    [45, 1],
    [179, 3],
  ])(
    "leaps anew every 45 ms where motion is welcome: at %s ms, its leap %s",
    (ms, leap) => {
      expect(zapLeap(ms, true)).toBe(leap);
    },
  );

  it("holds its first leap where motion isn't welcome", () => {
    expect(zapLeap(170, false)).toBe(0);
  });

  it.each([
    [0, 1],
    [90, 1],
    [135, 0.5],
    [180, 0],
    [400, 0],
  ])(
    "shows whole till 90 ms, then fades to nothing by 180: at %s ms, %s",
    (ms, strength) => {
      expect(zapStrength(ms)).toBeCloseTo(strength, 9);
    },
  );

  it("is cut from its event's serial and its leap, as the kit seeds it", () => {
    expect([zapSeed(5, 0), zapSeed(5, 2)]).toEqual([155, 169]);
  });

  it("branches twice on its first leap and once on each after", () => {
    expect([0, 1, 3].map(zapBranches)).toEqual([2, 1, 1]);
  });
});

describe("zapEnds", () => {
  const torus = fieldFrom(["..."]).torus;

  it("runs from past the hull to just inside the rock's rim, along the way to it", () => {
    const into = blankEnds();

    const runs = zapEnds({ x: 10, y: 10 }, { x: 10, y: 20 }, 1.5, torus, into);

    expect({ runs, ...into }).toEqual({
      runs: true,
      from: { x: 10, y: 10 + ARC_FROM },
      to: { x: 10, y: 20 - 1.5 * ARC_RIM },
    });
  });

  it("runs the short way across the field's edge, its end off the field", () => {
    const into = blankEnds();

    zapEnds({ x: 1, y: 10 }, { x: torus.width - 5, y: 10 }, 1, torus, into);

    expect([into.from.x, into.to.x].map(sixPlaces)).toEqual([
      sixPlaces(1 - ARC_FROM),
      sixPlaces(1 - (6 - ARC_RIM)),
    ]);
  });

  it("runs no arc to a rock that lies over the hull", () => {
    const ends = zapEnds(
      { x: 10, y: 10 },
      { x: 11.5, y: 10 },
      0.5,
      torus,
      blankEnds(),
    );

    expect(ends).toBe(false);
  });
});

describe("strikeOf", () => {
  /** Returns a field with a medium rock laid so far ahead of the pod along x, a zap's arc to it logged, and that event. */
  function struck(ahead = 8) {
    const field = fieldFrom(["...", ".^.", "..."]);
    const ship = shipOf(field);
    const rock = placeRock(field, "medium", ship.x + ahead, ship.y);
    field.events.addArc(rock, ahead, 0);
    const event = loggedOn(field).at(-1);
    if (!event) throw new Error("No event.");
    return { field, ship, rock, event };
  }

  it("keeps where the pod zapped from, where the rock lay, and how far its rim lay toward the pod, its outline turned as it was", () => {
    const { field, ship, rock, event } = struck();

    const strike = strikeOf(event, field, createZapStrike());

    expect({
      pod: { ...strike.pod },
      rock: { ...strike.rock },
      rim: sixPlaces(strike.rim),
    }).toEqual({
      pod: { x: ship.x, y: ship.y },
      rock: { x: rock.x, y: rock.y },
      rim: sixPlaces(rimToward(rock, Math.PI)),
    });
  });

  it("takes a rock of its size's rim once its slot no longer holds it", () => {
    const { field, event } = struck();

    const strike = strikeOf(
      event,
      { rocks: [], torus: field.torus },
      createZapStrike(),
    );

    expect(strike.rim).toBe(ROCK_RADIUS.medium);
  });

  it("keeps where the pod zapped from on the field, across its edge from the rock", () => {
    const { field, ship, event } = struck(-8);

    const strike = strikeOf(event, field, createZapStrike());

    expect(sixPlaces(strike.pod.x)).toBe(sixPlaces(ship.x));
  });

  it("counts its arc's steps as long as it runs from the hull to the rim, and keeps its event's serial", () => {
    const { field, event } = struck(12);
    const into = { ...createZapStrike(), steps: 99, serial: 99 };

    const strike = strikeOf(event, field, into);

    expect({ steps: strike.steps, serial: strike.serial }).toEqual({
      steps: arcSteps(12 - ARC_FROM - strike.rim * ARC_RIM),
      serial: event.serial,
    });
  });
});

describe("arcSteps", () => {
  it.each([
    [0, 5],
    [4, 5],
    [7.35, 7],
    [9.5, 9],
    [30, 12],
  ])(
    "zigzags an arc a step a unit or so, from five to twelve: %s units long, %s steps",
    (length, steps) => {
      expect(arcSteps(length)).toBe(steps);
    },
  );
});

describe("zapArc", () => {
  const torus = fieldFrom(["..."]).torus;

  /** Returns a zap's arc to a medium rock so far ahead of the pod along x, as it struck, and where it runs. */
  function struckArc(ahead: number) {
    const field = fieldFrom(["...", ".^.", "..."]);
    const ship = shipOf(field);
    const rock = placeRock(field, "medium", ship.x + ahead, ship.y);
    field.events.addArc(rock, ahead, 0);
    const event = loggedOn(field).at(-1);
    if (!event) throw new Error("No event.");
    const strike = strikeOf(event, field, createZapStrike());
    const ends = blankEnds();
    zapEnds(strike.pod, strike.rock, strike.rim, torus, ends);
    return { strike, ends };
  }

  it.each([0, 1, 2, 3])(
    "lays the kit's arc on leap %s, cut from the kit's seed among those cut, with its leap's branches",
    (leap) => {
      const { strike, ends } = struckArc(8);

      const arc = zapArc(strike, leap, ends, createArc());

      expect(linesOf(arc)).toEqual(
        linesOf(
          arcBetween(
            ends.from,
            ends.to,
            zapSeed(strike.serial, leap) % ZAP_ARC_SEEDS,
            zapBranches(leap),
          ),
        ),
      );
    },
  );

  it("lays a long arc as cut as long as its steps run", () => {
    const { strike, ends } = struckArc(24);

    const arc = zapArc(strike, 0, ends, createArc());

    const cut = cutArc(
      ARC_CUT.mostSteps * ARC_CUT.stepLength,
      zapSeed(strike.serial, 0) % ZAP_ARC_SEEDS,
      2,
      createArc(),
    );
    expect(linesOf(arc)).toEqual(
      linesOf(placeArc(cut, ends.from, ends.to, createArc())),
    );
  });
});

describe("the spark where a zap's arc lands", () => {
  it("shrinks with each leap and turns, as the kit's", () => {
    expect({
      scales: [0, 3].map((leap) => sixPlaces(arcSparkScale(leap))),
      turns: [0, 2].map(arcSparkTurn),
    }).toEqual({
      scales: [1, sixPlaces((0.55 - 0.24) / 0.55)],
      turns: [0, 1.2],
    });
  });

  it("glows round as far as the kit's past its points, as strongly as the arc shows", () => {
    const halo = arcSparkHalo(1, 0.5, blankHalo());

    const reach = sixPlaces(0.47 * ARC_SPARK.halo.share);
    expect({
      ...halo,
      along: sixPlaces(halo.along),
      across: sixPlaces(halo.across),
    }).toEqual({
      along: reach,
      across: reach,
      ahead: 0,
      turn: 0,
      strength: 0.4,
    });
  });

  it("is drawn in the accent's body, its middle in its hot tone, as the kit's spark", () => {
    const tones = energyOf(ART_PALETTE.accent, ART_PALETTE);

    expect(looksOf(frameNamed(ART_FRAMES, ARC_SPARK_FRAME))).toEqual([
      ["polygon", tones.body],
      ["polygon", tones.hot],
    ]);
  });

  it.each(ART_SCALES)(
    "holds within its reach at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const frames = atlasFrames(ART_PALETTE, scale, isFine(scale));

      expect(reachOf(frameNamed(frames, ARC_SPARK_FRAME))).toBeLessThanOrEqual(
        ARC_SPARK.reach * scale.unit + SLACK,
      );
    },
  );
});

describe("a zap's strokes", () => {
  it("are the kit's halo, body and hot middle, back to front, each as wide as a share of the unit", () => {
    expect(
      ZAP_STROKES.map((stroke) => [
        stroke.tone,
        arcWidth(stroke, 1, ART_SCALE),
      ]),
    ).toEqual([
      ["halo", 0.62 * 24],
      ["body", 0.26 * 24],
      ["hot", 0.11 * 24],
    ]);
  });

  it("narrow a branch, but never under their least width in CSS pixels", () => {
    const small = { unit: 6, pixelRatio: 1 };

    expect(
      ZAP_STROKES.map((stroke) => sixPlaces(arcWidth(stroke, 0.62, small))),
    ).toEqual([sixPlaces(0.62 * 0.62 * 6), 2, 1.1]);
  });

  it("show the body and the middle as opaque as the kit's, at the arc's strength, and the halo as the palette lets a halo show", () => {
    const light = ART_PALETTE;
    const dark = beltPalette(
      PALETTES.rolesIn(DARK_THEME.id, FIELD_ROLES),
      "dark",
    );

    expect(
      [light, dark].map((palette) =>
        ZAP_STROKES.map((stroke) => sixPlaces(zapAlpha(stroke, 0.5, palette))),
      ),
    ).toEqual(
      [light, dark].map((palette) => [
        sixPlaces(haloAlpha(0.1, palette)),
        0.3,
        0.5,
      ]),
    );
  });
});

describe("HULL_RUNS", () => {
  it("runs between the hull's facets as the kit's Bumble does, the first nearest its tail", () => {
    const [first] = HULL_RUNS;

    // The kit's `podSvg()` finds 26 runs over Bumble, the first from
    // (-0.6776, -0.3912) to (-0.64, -0.91).
    expect({
      runs: HULL_RUNS.length,
      first: [first?.from, first?.to].map((at) => [
        fourPlaces(at?.x ?? 9),
        fourPlaces(at?.y ?? 9),
      ]),
    }).toEqual({
      runs: 26,
      first: [
        [-0.6776, -0.3912],
        [-0.64, -0.91],
      ],
    });
  });

  it("keeps each run near and clear of the canopy", () => {
    const off = HULL_RUNS.filter(({ from, to }) => {
      const far = Math.hypot(to.x - from.x, to.y - from.y);
      const clear = Math.hypot((from.x + to.x) / 2, (from.y + to.y) / 2);
      return far <= 0.3 || far >= 0.85 || clear <= CANOPY + 0.12;
    });

    expect(off).toEqual([]);
  });
});

describe("hullArcInk", () => {
  it("crawls arcs over the hull at full static in the pilot's ink", () => {
    const field = fieldFrom(["...", ".^.", "..."], { charge: STATIC_MOST });

    const pilot = field.crew.pilot ?? 0;
    expect(hullArcInk(field, ART_PALETTE)).toBe(ART_PALETTE.pilots[pilot]);
  });

  it("crawls none short of full static", () => {
    const field = fieldFrom(["...", ".^.", "..."], { charge: STATIC_MOST - 1 });

    expect(hullArcInk(field, ART_PALETTE)).toBeNull();
  });

  it("crawls none with no pilot at the controls", () => {
    const field = fieldFrom(["...", ".^.", "..."], { charge: STATIC_MOST });
    field.crew = { ...field.crew, pilot: null };

    expect(hullArcInk(field, ART_PALETTE)).toBeNull();
  });

  it("crawls them in the accent for a pilot the palette has no ink for", () => {
    const field = fieldFrom(["...", ".^.", "..."], { charge: STATIC_MOST });

    const ink = hullArcInk(field, { pilots: [], accent: ART_PALETTE.accent });

    expect(ink).toBe(ART_PALETTE.accent);
  });
});

describe("the arcs crawling over the hull", () => {
  /** The pod at the field's origin, unturned. */
  const ORIGIN_POD = { x: 0, y: 0, angle: 0 };

  /** `podSvg()`'s three arcs in the kit's `ship.mjs`, its seed 4, unturned. */
  const KIT_SEED_4 = [
    [
      [0.637601, -0.470975],
      [0.790177, -0.331183],
      [0.766567, -0.103101],
      [0.944375, 0.024047],
      [0.984068, 0.220406],
    ],
    [
      [-0.689, 0.9145],
      [-0.585994, 0.870329],
      [-0.469652, 0.971384],
      [-0.36644, 0.929455],
      [-0.264333, 0.8755],
    ],
    [
      [-0.732215, -0.31788],
      [-0.66192, -0.512571],
      [-0.418797, -0.578475],
      [-0.484246, -0.874321],
      [-0.258697, -0.95332],
    ],
  ];

  /** `podSvg()`'s two arcs on a small pod in the kit's `ship.mjs`, its seed 4, unturned. */
  const KIT_SMALL_SEED_4 = [
    KIT_SEED_4[0] ?? [],
    [
      [-0.683215, 0.34038],
      [-0.635303, 0.44653],
      [-0.73801, 0.569387],
      [-0.692423, 0.675795],
      [-0.634363, 0.78082],
    ],
  ];

  it.each([
    [true, 199, 1],
    [true, 250, 2],
    [true, 100 * (HULL_ARC_SEEDS + 2), 2],
    [false, 250, 0],
  ])(
    "crawl anew every 100 ms where motion is welcome, %s, through their seeds in turn, and hold still where it isn't: at %s ms, seed %s",
    (motion, now, seed) => {
      expect(hullArcSeed(now, motion)).toBe(seed);
    },
  );

  it.each([
    ["fine marks show", ART_SCALE, KIT_SEED_4],
    ["fine marks don't show", { unit: 6, pixelRatio: 1 }, KIT_SMALL_SEED_4],
  ] as const)(
    "are cut as the kit cuts them from its seed, spread round the hull, where the pod's %s",
    (_, scale, kit) => {
      const arcs = createHullArcs();

      const count = hullArcs(4, scale, ORIGIN_POD, arcs);

      const places = arcs.slice(0, count).flatMap(placesOf);
      expect({
        count,
        off: farthestApart(places, kit.flat()) < 1e-5,
      }).toEqual({ count: kit.length, off: true });
    },
  );

  it("lie on the field where the pod is drawn, turned as it is", () => {
    const unturned = createHullArcs();
    const placed = createHullArcs();
    hullArcs(4, ART_SCALE, ORIGIN_POD, unturned);

    hullArcs(4, ART_SCALE, { x: 10, y: 20, angle: Math.PI / 2 }, placed);

    expect(placed.map(placesOf)).toEqual(
      unturned.map((arc) =>
        placesOf(arc).map(([x, y]) => [
          sixPlaces(10 - (y ?? 0)),
          sixPlaces(20 + (x ?? 0)),
        ]),
      ),
    );
  });

  it("are cut from each seed in turn, the same arcs for the same seed", () => {
    const cut = (seed: number) => {
      const arcs = createHullArcs();
      hullArcs(seed, ART_SCALE, ORIGIN_POD, arcs);
      return JSON.stringify(arcs.map(placesOf));
    };

    expect({
      again: cut(3) === cut(3),
      next: cut(4) === cut(3),
      round: cut(HULL_ARC_SEEDS + 3) === cut(3),
    }).toEqual({ again: true, next: false, round: true });
  });
});
