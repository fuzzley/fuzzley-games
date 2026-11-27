import {
  type EyeMark,
  FUZZBALL,
  FUZZBALL_FACES,
  FUZZBALL_GRID,
  FUZZBALL_LOOK,
  FUZZBALL_LOOK_FAR,
  FUZZBALL_STRANDS,
  type FurPose,
  type FuzzballFace,
  type GridPoint,
  MOST_LIFT,
  SMALL_FUR_WIDTH,
  SMALL_UNDER,
  SPARK_LOOK,
  type Strand,
  aboutBody,
  combFur,
  eyesOf,
  fuzzballDrawing,
  fuzzballForm,
  fuzzballShape,
  fuzzballSvg,
  lookOffset,
  restingLook,
  sparksOf,
  strandsOf,
  sweptFur,
} from "./fuzzball.ts";

/** How many strands of fur the fuzzball's path draws, one for each move in it. */
const STRANDS = FUZZBALL.fur.d.split("M").length - 1;

/** How far a tip swept flat lies from the body's middle at the nearest. */
const FLAT = FUZZBALL.body.r + 0.5;

/** Returns a number to a ten-thousandth, as the art kit's numbers are copied here. */
function rounded(value: number): number {
  return Math.round(value * 1e4) / 1e4 + 0;
}

/** Returns a point to a ten-thousandth. */
function roundedPoint({ x, y }: GridPoint): GridPoint {
  return { x: rounded(x), y: rounded(y) };
}

/** Returns a strand's points to a ten-thousandth. */
function roundedStrand({ from, control, to }: Strand): Strand {
  return {
    from: roundedPoint(from),
    control: roundedPoint(control),
    to: roundedPoint(to),
  };
}

/** Returns how far a point lies from the body's middle. */
function farOf({ x, y }: GridPoint): number {
  return Math.hypot(x, y);
}

/** Returns a mark of a face in a few words, its numbers to a ten-thousandth: an ellipse's middle and radii, or how many points a polygon or a stroke has, where it starts and ends, and a stroke's width. */
function said(mark: EyeMark): string {
  const at = ({ x, y }: GridPoint): string =>
    `${String(rounded(x))},${String(rounded(y))}`;
  if (mark.kind === "ellipse") {
    return `ellipse ${mark.tone} at ${at(mark.at)} ${String(rounded(mark.rx))}x${String(rounded(mark.ry))}`;
  }
  const [first = { x: NaN, y: NaN }] = mark.points;
  const last = mark.points.at(-1) ?? first;
  const width =
    mark.kind === "stroke" ? ` width ${String(rounded(mark.width))}` : "";
  return `${mark.kind} ${mark.tone} ${String(mark.points.length)} from ${at(first)} to ${at(last)}${width}`;
}

/** Returns a line of a face, its points and its width to a ten-thousandth, or nothing for another mark. */
function lineOf(
  mark: EyeMark | undefined,
):
  | { readonly points: readonly GridPoint[]; readonly width: number }
  | undefined {
  return mark?.kind === "stroke"
    ? { points: mark.points.map(roundedPoint), width: rounded(mark.width) }
    : undefined;
}

/** Returns where an ellipse of a face lies, or nowhere for another mark. */
function middleOf(mark: EyeMark | undefined): GridPoint | undefined {
  return mark?.kind === "ellipse" ? roundedPoint(mark.at) : undefined;
}

describe("fuzzballSvg", () => {
  it("draws the body and the fur in one color", () => {
    const svg = fuzzballSvg("#123456");

    expect(svg).toContain(".body{fill:#123456}.fur{stroke:#123456}");
  });

  it("needs no color scheme rule for one color", () => {
    expect(fuzzballSvg("#123456")).not.toContain("prefers-color-scheme");
  });

  it("switches the fur's color with the system's color scheme", () => {
    const svg = fuzzballSvg({ light: "#123456", dark: "#abcdef" });

    expect(svg).toContain(
      "<style>.body{fill:#123456}.fur{stroke:#123456}@media (prefers-color-scheme:dark){.body{fill:#abcdef}.fur{stroke:#abcdef}}</style>",
    );
  });

  it("gives both eyes their own ink, whatever the fur's color", () => {
    const svg = fuzzballSvg("#123456");

    expect(svg.match(/<ellipse [^>]*fill="([^"]+)"/g)).toEqual([
      expect.stringContaining(`fill="${FUZZBALL.ink}"`),
      expect.stringContaining(`fill="${FUZZBALL.ink}"`),
    ]);
  });

  it("gives each eye a glint", () => {
    const svg = fuzzballSvg("#123456");

    expect(svg.split(`fill="${FUZZBALL.glint}"`).length - 1).toBe(
      FUZZBALL.glints.length,
    );
  });

  it("leaves out the glints when asked", () => {
    expect(fuzzballSvg("#123456", { withGlints: false })).not.toContain(
      `fill="${FUZZBALL.glint}"`,
    );
  });

  it("draws the fur's strands", () => {
    expect(fuzzballSvg("#123456")).toContain(`d="${FUZZBALL.fur.d}"`);
  });
});

describe("fuzzballSvg's faces", () => {
  it("writes the eyes and their glints at the mark's own numbers at rest", () => {
    const svg = fuzzballSvg("#123456");

    expect(svg).toContain(
      [
        ...FUZZBALL.eyes.map(
          ({ cx, cy, rx, ry }) =>
            `<ellipse cx="${String(cx)}" cy="${String(cy)}" rx="${String(rx)}" ry="${String(ry)}" fill="${FUZZBALL.ink}"/>`,
        ),
        ...FUZZBALL.glints.map(
          ({ cx, cy, r }) =>
            `<circle cx="${String(cx)}" cy="${String(cy)}" r="${String(r)}" fill="${FUZZBALL.glint}"/>`,
        ),
      ].join("\n"),
    );
  });

  it("draws a face of lines as lines in the eyes' ink, round at their ends and corners", () => {
    const svg = fuzzballSvg("#123456", { face: "blink" });

    expect({
      ellipses: svg.includes("<ellipse"),
      lines: svg.match(
        new RegExp(
          `<polyline points="[^"]+" fill="none" stroke="${FUZZBALL.ink}" stroke-width="1\\.42" stroke-linecap="round" stroke-linejoin="round"/>`,
          "g",
        ),
      )?.length,
    }).toEqual({ ellipses: false, lines: 2 });
  });

  it("draws a face's shapes as polygons, its glints in white", () => {
    const svg = fuzzballSvg("#123456", { face: "set" });

    expect({
      eyes: svg.split(`fill="${FUZZBALL.ink}"`).length - 1,
      glints: svg.match(/<polygon points="[^"]+" fill="#ffffff"\/>/g)?.length,
    }).toEqual({ eyes: 2, glints: 2 });
  });

  it("leaves out a face's glints when asked", () => {
    expect(
      fuzzballSvg("#123456", { face: "plead", withGlints: false }),
    ).not.toContain(`fill="${FUZZBALL.glint}"`);
  });
});

describe("fuzzballDrawing", () => {
  it("is the mark with no pose, its fur the mark's own path", () => {
    const drawing = fuzzballDrawing();

    expect({
      fur: drawing.fur,
      furWidth: drawing.furWidth,
      eyes: drawing.eyes.map(({ kind }) => kind),
      sparks: drawing.sparks,
      reach: drawing.reach,
    }).toEqual({
      fur: FUZZBALL.fur.d,
      furWidth: FUZZBALL.fur.width,
      eyes: ["ellipse", "ellipse", "circle", "circle"],
      sparks: [],
      reach: fuzzballShape().reach,
    });
  });

  it("writes combed fur on the mark's view box, each strand a move and a curve, to a hundredth", () => {
    const [first] = combFur({ lift: 3 });
    const at = (point: GridPoint | undefined): string =>
      point
        ? `${String(Math.round((point.x + FUZZBALL.body.cx) * 100) / 100)} ${String(Math.round((point.y + FUZZBALL.body.cy) * 100) / 100)}`
        : "";

    const { fur } = fuzzballDrawing({ lift: 3 });

    expect({
      strands: fur.split("M").length - 1,
      first: fur.split("M")[1],
    }).toEqual({
      strands: FUZZBALL_STRANDS.length,
      first: `${at(first?.from)}Q${at(first?.control)} ${at(first?.to)}`,
    });
  });

  it("draws a line of a face with its width, and a dot of equal radii as a circle", () => {
    expect([
      fuzzballDrawing({ face: "squeeze" }).eyes[0],
      fuzzballDrawing({ face: "dizzy", small: true }).eyes[0],
    ]).toEqual([
      {
        kind: "polyline",
        tone: "eye",
        points: "11.22,14.84 15.24,17.1 11.22,19.16",
        width: 1.49,
      },
      { kind: "circle", tone: "eye", cx: 12.9, cy: 17, r: 2.39 },
    ]);
  });

  it("reaches as far as its sparks' halos, past its fur, swept or not", () => {
    const pose = { lift: MOST_LIFT, lean: { x: 2, y: 0 } };
    const halo = Math.max(SPARK_LOOK.tickHalo, SPARK_LOOK.starHalo) / 2;
    const sparks = fuzzballShape(pose).sparks.flatMap(({ points }) =>
      points.map(({ x, y }) => Math.hypot(x, y)),
    );

    expect(fuzzballDrawing(pose).reach).toBe(Math.max(...sparks) + halo);
  });

  it("draws static's sparks at its last step, each its points on the mark's view box", () => {
    const { sparks } = fuzzballDrawing({ lift: 3 });

    expect({
      kinds: sparks.map(({ kind }) => kind),
      points: sparks.map(({ points }) => points.split(" ").length),
    }).toEqual({
      kinds: ["tick", "star", "tick", "star", "tick", "star"],
      points: [4, 8, 4, 8, 4, 8],
    });
  });
});

describe("FUZZBALL_GRID", () => {
  it("is as wide as the mark's view box", () => {
    expect(FUZZBALL.viewBox).toBe(
      `0 0 ${String(FUZZBALL_GRID)} ${String(FUZZBALL_GRID)}`,
    );
  });
});

describe("aboutBody", () => {
  it("measures a point of the grid from the body's middle", () => {
    expect(
      aboutBody({ x: FUZZBALL.body.cx + 1, y: FUZZBALL.body.cy - 2 }),
    ).toEqual({ x: 1, y: -2 });
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

  it("reads a strand however its numbers are spaced", () => {
    expect(strandsOf("M1  2Q3 4 5 6 ")).toEqual(strandsOf("M1 2Q3 4 5 6"));
  });

  it.each(["M1 2L3 4", "M1 2Q3 4 5 6 7 8", "M1 2Q3 4 5"])(
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

describe("combFur", () => {
  it("leaves the fur as the mark has it, unposed, give or take a rounding", () => {
    expect(combFur().map(roundedStrand)).toEqual(
      FUZZBALL_STRANDS.map(roundedStrand),
    );
  });

  it.each<[string, FurPose]>([
    ["lifted", { lift: 3 }],
    ["swept", { lean: { x: 2, y: 0 } }],
    ["puffed", { puff: 1 }],
    ["held", { lift: 3, within: 12 }],
  ])("keeps every root where it grew, %s", (_, pose) => {
    expect(combFur(pose).map(({ from }) => from)).toEqual(
      FUZZBALL_STRANDS.map(({ from }) => from),
    );
  });

  // The art kit's own numbers for the first strand, the eighth and the
  // fifteenth, from lib/fuzzball.mjs's combFur(), so the port draws what
  // the user saw.
  it.each<[string, FurPose, readonly Strand[]]>([
    [
      "lifted a step",
      { lift: 1 },
      [
        {
          from: { x: 8.2, y: -0.05 },
          control: { x: 10.5562, y: 0.0988 },
          to: { x: 12.8023, y: 1.2076 },
        },
        {
          from: { x: 0.67, y: 8.17 },
          control: { x: 0.6801, y: 10.1857 },
          to: { x: -0.2249, y: 12.1664 },
        },
        {
          from: { x: -8.01, y: 1.76 },
          control: { x: -10.4838, y: 2.1389 },
          to: { x: -13.0526, y: 1.5278 },
        },
      ],
    ],
    [
      "standing at the second step",
      { lift: 2 },
      [
        {
          from: { x: 8.2, y: -0.05 },
          control: { x: 11.3166, y: -0.011 },
          to: { x: 14.4068, y: 0.2585 },
        },
        {
          from: { x: 0.67, y: 8.17 },
          control: { x: 0.8235, y: 10.64 },
          to: { x: 0.7575, y: 13.1016 },
        },
        {
          from: { x: -8.01, y: 1.76 },
          control: { x: -11.204, y: 2.403 },
          to: { x: -14.4207, y: 2.8085 },
        },
      ],
    ],
    [
      "on end at the last",
      { lift: 3 },
      [
        {
          from: { x: 8.2, y: -0.05 },
          control: { x: 12.0044, y: -0.0732 },
          to: { x: 15.8089, y: -0.0964 },
        },
        {
          from: { x: 0.67, y: 8.17 },
          control: { x: 0.9007, y: 10.9836 },
          to: { x: 1.1315, y: 13.7972 },
        },
        {
          from: { x: -8.01, y: 1.76 },
          control: { x: -11.8634, y: 2.6067 },
          to: { x: -15.7168, y: 3.4534 },
        },
      ],
    ],
    [
      "under a thrust to the right",
      { lean: { x: 1, y: 0 } },
      [
        {
          from: { x: 8.2, y: -0.05 },
          control: { x: 8.88, y: 0.14 },
          to: { x: 10.6166, y: 2.4693 },
        },
        {
          from: { x: 0.67, y: 8.17 },
          control: { x: -0.46, y: 9.65 },
          to: { x: -4.0487, y: 11.06 },
        },
        {
          from: { x: -8.01, y: 1.76 },
          control: { x: -10.93, y: 1.97 },
          to: { x: -15.4399, y: 0.2 },
        },
      ],
    ],
    [
      "in a dash to the right",
      { lean: { x: 2, y: 0 } },
      [
        {
          from: { x: 8.2, y: -0.05 },
          control: { x: 7.83, y: 0.14 },
          to: { x: 10.4838, y: 2.9832 },
        },
        {
          from: { x: 0.67, y: 8.17 },
          control: { x: -1.51, y: 9.65 },
          to: { x: -6.6157, y: 11.06 },
        },
        {
          from: { x: -8.01, y: 1.76 },
          control: { x: -11.98, y: 1.97 },
          to: { x: -21.0394, y: 0.2 },
        },
      ],
    ],
    [
      "puffed in a fright",
      { puff: 1 },
      [
        {
          from: { x: 8.2, y: -0.05 },
          control: { x: 11.9635, y: 0.3379 },
          to: { x: 13.108, y: 2.5781 },
        },
        {
          from: { x: 0.67, y: 8.17 },
          control: { x: 0.5452, y: 11.6927 },
          to: { x: -1.5215, y: 12.748 },
        },
        {
          from: { x: -8.01, y: 1.76 },
          control: { x: -11.9099, y: 2.2024 },
          to: { x: -13.6398, y: 0.2285 },
        },
      ],
    ],
    [
      "on end inside glass 14 units round",
      { lift: 3, within: 14 },
      [
        {
          from: { x: 8.2, y: -0.05 },
          control: { x: 12.0044, y: -0.0732 },
          to: { x: 12.5998, y: -0.0768 },
        },
        {
          from: { x: 0.67, y: 8.17 },
          control: { x: 0.9007, y: 10.9836 },
          to: { x: 1.0298, y: 12.5578 },
        },
        {
          from: { x: -8.01, y: 1.76 },
          control: { x: -11.8634, y: 2.6067 },
          to: { x: -12.3064, y: 2.704 },
        },
      ],
    ],
  ])("combs the fur as the art kit does, %s", (_, pose, kit) => {
    const fur = combFur(pose);

    expect([fur[0], fur[7], fur[14]].map((s) => s && roundedStrand(s))).toEqual(
      kit,
    );
  });

  it("keeps every other strand in the small form, a little longer, as the art kit does", () => {
    const fur = combFur({ small: true });

    expect({
      count: fur.length,
      roots: fur.map(({ from }) => from),
      eighth: fur[7] && roundedStrand(fur[7]),
    }).toEqual({
      count: STRANDS / 2,
      roots: FUZZBALL_STRANDS.filter((_, i) => i % 2 === 0).map(
        ({ from }) => from,
      ),
      eighth: {
        from: { x: -8.01, y: 1.76 },
        control: { x: -10.13, y: 1.9742 },
        to: { x: -12.4399, y: 0.2084 },
      },
    });
  });

  it("stands every other strand taller on end, so the fringe breaks into points", () => {
    const fur = combFur({ lift: MOST_LIFT });
    const grown = fur.map(
      ({ to }, i) => farOf(to) - farOf(FUZZBALL_STRANDS[i]?.to ?? to),
    );

    expect({
      taller: grown.filter((_, i) => i % 2 === 0).every((g) => g > 4),
      shorter: grown.filter((_, i) => i % 2 === 1).every((g) => g < 3),
    }).toEqual({ taller: true, shorter: true });
  });

  it("combs between two steps between them", () => {
    const [half] = combFur({ lift: 1.5 });
    const [one] = combFur({ lift: 1 });
    const [two] = combFur({ lift: 2 });
    const reach = (strand: Strand | undefined): number =>
      strand ? farOf(strand.to) : NaN;

    expect(reach(half)).toBeCloseTo((reach(one) + reach(two)) / 2);
  });

  it.each([
    [-1, 0],
    [4, MOST_LIFT],
  ])("combs a step of %f as the nearest there is, %f", (lift, nearest) => {
    expect(combFur({ lift })).toEqual(combFur({ lift: nearest }));
  });

  it("holds every tip inside the glass, its round end and all", () => {
    const within = 13;

    const tips = combFur({ lift: MOST_LIFT, lean: { x: 2, y: 0 }, within }).map(
      ({ to }) => farOf(to) + FUZZBALL.fur.width / 2,
    );

    expect(Math.max(...tips)).toBeCloseTo(within);
  });

  it("holds every tip inside the glass in its small form, its wider round end and all", () => {
    const within = 13;

    const tips = combFur({
      lift: MOST_LIFT,
      lean: { x: 2, y: 0 },
      small: true,
      within,
    }).map(({ to }) => farOf(to) + SMALL_FUR_WIDTH / 2);

    expect(Math.max(...tips)).toBeCloseTo(within);
  });
});

describe("sweptFur", () => {
  const thrust = { x: 1, y: 0 };

  it("returns the fur it is handed with no push", () => {
    const fur = combFur({ lift: 1 });

    expect(sweptFur(fur, { x: 0, y: 0 })).toBe(fur);
  });

  it("sweeps the fur as the comb does a push", () => {
    expect(sweptFur(FUZZBALL_STRANDS, thrust).map(roundedStrand)).toEqual(
      combFur({ lean: thrust }).map(roundedStrand),
    );
  });

  it("streams the lee side out behind and lays the side facing the push flat on the body", () => {
    const swept = sweptFur(FUZZBALL_STRANDS, thrust);
    // The strands that grew furthest each way across.
    const behind = swept[15];
    const ahead = swept[0];

    expect({
      behind: behind && behind.to.x < (FUZZBALL_STRANDS[15]?.to.x ?? 0) - 3,
      ahead:
        ahead && farOf(ahead.to) < farOf(FUZZBALL_STRANDS[0]?.to ?? ahead.to),
      flat: Math.min(...swept.map(({ to }) => farOf(to))),
    }).toEqual({
      behind: true,
      ahead: true,
      flat: expect.closeTo(FLAT, 9) as number,
    });
  });

  it("keeps every root where it grew", () => {
    expect(
      sweptFur(FUZZBALL_STRANDS, { x: -1.4, y: 1.4 }).map(({ from }) => from),
    ).toEqual(FUZZBALL_STRANDS.map(({ from }) => from));
  });
});

describe("sparksOf", () => {
  // The art kit's sparks at a full charge, seeded as its sheet draws them.
  const KIT: readonly { kind: string; points: readonly GridPoint[] }[] = [
    {
      kind: "tick",
      points: [
        { x: -2.9062, y: 17.6774 },
        { x: -6.157, y: 17.1835 },
        { x: -4.9064, y: 16.2878 },
        { x: -7.8688, y: 15.0335 },
      ],
    },
    {
      kind: "star",
      points: [
        { x: 4.7743, y: 18.9229 },
        { x: 3.6841, y: 19.0008 },
        { x: 3.204, y: 19.9827 },
        { x: 3.1262, y: 18.8925 },
        { x: 2.1443, y: 18.4124 },
        { x: 3.2345, y: 18.3346 },
        { x: 3.7145, y: 17.3527 },
        { x: 3.7924, y: 18.4429 },
      ],
    },
    {
      kind: "tick",
      points: [
        { x: -13.8526, y: -11.4016 },
        { x: -11.7389, y: -14.2069 },
        { x: -11.664, y: -12.6515 },
        { x: -8.9223, y: -14.6821 },
      ],
    },
    {
      kind: "star",
      points: [
        { x: -16.4661, y: -5.3108 },
        { x: -17.6826, y: -5.5967 },
        { x: -18.5406, y: -4.6882 },
        { x: -18.2548, y: -5.9047 },
        { x: -19.1633, y: -6.7627 },
        { x: -17.9468, y: -6.4768 },
        { x: -17.0888, y: -7.3853 },
        { x: -17.3746, y: -6.1688 },
      ],
    },
    {
      kind: "tick",
      points: [
        { x: 12.2721, y: -12.357 },
        { x: 15.1786, y: -10.4464 },
        { x: 13.5198, y: -10.3694 },
        { x: 15.6725, y: -7.9542 },
      ],
    },
    {
      kind: "star",
      points: [
        { x: 9.7303, y: -16.2262 },
        { x: 8.6368, y: -16.5134 },
        { x: 7.8394, y: -15.7118 },
        { x: 8.1265, y: -16.8053 },
        { x: 7.325, y: -17.6027 },
        { x: 8.4185, y: -17.3156 },
        { x: 9.2159, y: -18.1171 },
        { x: 8.9288, y: -17.0236 },
      ],
    },
  ];

  it("draws three ticks, each with a star beside it, as the art kit's sheet draws a full charge, within a hundredth", () => {
    const sparks = sparksOf(combFur({ lift: MOST_LIFT }));

    expect({
      kinds: sparks.map(({ kind }) => kind),
      far: Math.max(
        ...sparks.flatMap(({ points }, i) =>
          points.map((point, j) => {
            const kit = KIT[i]?.points[j] ?? { x: NaN, y: NaN };
            return Math.hypot(point.x - kit.x, point.y - kit.y);
          }),
        ),
      ),
    }).toEqual({
      kinds: KIT.map(({ kind }) => kind),
      far: expect.closeTo(0, 2) as number,
    });
  });

  it("jumps each tick between the tips of two tall strands, from just past one to just past the other", () => {
    const fur = combFur({ lift: MOST_LIFT, lean: { x: 1, y: 0 } });
    const [tick] = sparksOf(fur);
    const first = tick?.points[0] ?? { x: NaN, y: NaN };
    const last = tick?.points.at(-1) ?? { x: NaN, y: NaN };
    const from = fur[8]?.to ?? { x: NaN, y: NaN };
    const to = fur[10]?.to ?? { x: NaN, y: NaN };

    expect({
      leaves: farOf(first) - farOf(from),
      reaches: farOf(last) - farOf(to),
      along: [
        Math.atan2(first.y, first.x) - Math.atan2(from.y, from.x),
        Math.atan2(last.y, last.x) - Math.atan2(to.y, to.x),
      ].map((turn) => Math.round(turn * 1e9)),
    }).toEqual({
      leaves: expect.closeTo(1.7, 9) as number,
      reaches: expect.closeTo(1.7, 9) as number,
      along: [0, 0],
    });
  });

  it.each([
    ["the small form's", combFur({ small: true })],
    ["one strand short", FUZZBALL_STRANDS.slice(1)],
  ])("refuses fur of another number of strands: %s", (_, fur) => {
    expect(() => sparksOf(fur)).toThrow(RangeError);
  });
});

describe("FUZZBALL_FACES", () => {
  it("lists the ten faces once each, the mark's own first", () => {
    expect({
      first: FUZZBALL_FACES[0],
      count: new Set(FUZZBALL_FACES).size,
    }).toEqual({ first: "rest", count: 10 });
  });
});

describe("eyesOf", () => {
  it("draws the mark's own eyes and glints at rest, number for number", () => {
    const glints = FUZZBALL.glints.map(({ cx, cy, r }) => ({
      kind: "ellipse",
      tone: "glint",
      at: aboutBody({ x: cx, y: cy }),
      rx: r,
      ry: r,
    }));

    expect(eyesOf()).toEqual([
      ...FUZZBALL.eyes.map(({ cx, cy, rx, ry }) => ({
        kind: "ellipse",
        tone: "eye",
        at: aboutBody({ x: cx, y: cy }),
        rx,
        ry,
      })),
      ...glints,
    ]);
  });

  // Every mark of every face as the art kit's eyesOf() draws it, at its own
  // look (FUZZBALL_LOOK_FAR), the eyes' ink first and their glints over
  // them, so the port draws what the user saw.
  it.each<[FuzzballFace, readonly string[]]>([
    [
      "rest",
      [
        "ellipse eye at -2.6,-0.2 2.3x3",
        "ellipse eye at 4.6,-0.2 2.3x3",
        "ellipse glint at -1.8,-1.4 0.85x0.85",
        "ellipse glint at 5.4,-1.4 0.85x0.85",
      ],
    ],
    [
      "blink",
      [
        "stroke eye 13 from -4.9,0.3 to -0.3,0.3 width 1.4175",
        "stroke eye 13 from 2.3,0.3 to 6.9,0.3 width 1.4175",
      ],
    ],
    [
      "set",
      [
        "polygon eye 21 from -0.3,-0.2 to -0.3442,-0.7853",
        "stroke eye 2 from -4.854,-1.16 to -0.346,-1.16 width 0.81",
        "polygon eye 21 from 6.9,-0.2 to 6.8558,-0.7853",
        "stroke eye 2 from 2.346,-1.16 to 6.854,-1.16 width 0.81",
        "polygon glint 11 from -0.95,-0.61 to -0.9838,-0.78",
        "polygon glint 11 from 6.25,-0.61 to 6.2162,-0.78",
      ],
    ],
    [
      "eep",
      [
        "ellipse eye at -2.95,-0.8 2.921x3.24",
        "ellipse eye at 4.95,-0.8 2.921x3.24",
        "ellipse glint at -1.8,-2.25 0.58x0.58",
        "ellipse glint at 6.1,-2.25 0.58x0.58",
      ],
    ],
    [
      "happy",
      [
        "stroke eye 13 from -5.015,1.1 to -0.185,1.1 width 1.5525",
        "stroke eye 13 from 2.185,1.1 to 7.015,1.1 width 1.5525",
      ],
    ],
    [
      "dizzy",
      [
        "stroke eye 45 from -2.4649,0.0104 to -4.9561,1.3128 width 0.95",
        "stroke eye 45 from 4.7351,0.0104 to 6.9561,-1.7128 width 0.95",
      ],
    ],
    [
      "sleepy",
      [
        "polygon eye 16 from -0.3015,-0.1797 to -4.7789,0.7158",
        "stroke eye 2 from -5.245,0.809 to 0.045,-0.249 width 1.08",
        "polygon eye 16 from 6.7789,0.7158 to 2.3015,-0.1797",
        "stroke eye 2 from 1.955,-0.249 to 7.245,0.809 width 1.08",
      ],
    ],
    [
      "plead",
      [
        "ellipse eye at -3.35,-1.5125 2.668x3.36",
        "ellipse eye at 3.85,-1.5125 2.668x3.36",
        "ellipse glint at -2.6,-2.9625 1.2x1.2",
        "ellipse glint at -4.3,-0.2125 0.55x0.55",
        "ellipse glint at 4.6,-2.9625 1.2x1.2",
        "ellipse glint at 2.9,-0.2125 0.55x0.55",
      ],
    ],
    [
      "squeeze",
      [
        "stroke eye 3 from -4.785,-2.36 to -4.785,1.96 width 1.485",
        "stroke eye 3 from 6.785,-2.36 to 6.785,1.96 width 1.485",
      ],
    ],
  ])("draws %s as the art kit does", (face, kit) => {
    expect(eyesOf({ face, range: FUZZBALL_LOOK_FAR }).map(said)).toEqual(kit);
  });

  it("draws cross as < >, each eye a chevron pointing away from the other, at squeeze's size and weight", () => {
    const cross = eyesOf({ face: "cross", range: FUZZBALL_LOOK_FAR });

    expect(cross.map(lineOf)).toEqual([
      {
        points: [
          { x: -0.415, y: -2.36 },
          { x: -4.44, y: -0.1 },
          { x: -0.415, y: 1.96 },
        ],
        width: 1.485,
      },
      {
        points: [
          { x: 2.415, y: -2.36 },
          { x: 6.44, y: -0.1 },
          { x: 2.415, y: 1.96 },
        ],
        width: 1.485,
      },
    ]);
  });

  it.each<FuzzballFace>(["squeeze", "cross"])(
    "mirrors the right eye of %s, a face drawn across, about the eyes' middle",
    (face) => {
      const [left, right] = eyesOf({ face });
      const middle =
        FUZZBALL.eyes.reduce((sum, { cx }) => sum + cx, 0) /
        FUZZBALL.eyes.length;
      const across = (mark: EyeMark | undefined): readonly number[] =>
        mark?.kind === "stroke"
          ? mark.points.map(({ x }) => rounded(x + FUZZBALL.body.cx - middle))
          : [];

      expect(across(right)).toEqual(across(left).map((x) => -x + 0));
    },
  );

  it.each<[string, GridPoint, GridPoint, GridPoint]>([
    ["right", { x: 1, y: 0 }, { x: -1.7, y: -0.2 }, { x: 5.5, y: -0.2 }],
    ["left", { x: -1, y: 0 }, { x: -5.5, y: -0.2 }, { x: 1.7, y: -0.2 }],
    ["down", { x: 0, y: 1 }, { x: -3.6, y: 1.15 }, { x: 3.6, y: 1.15 }],
    [
      "down and right",
      { x: 0.6, y: 0.8 },
      { x: -2.46, y: 0.88 },
      { x: 4.74, y: 0.88 },
    ],
    [
      "down and right, long",
      { x: 3, y: 4 },
      { x: -2.46, y: 0.88 },
      { x: 4.74, y: 0.88 },
    ],
    [
      "half right",
      { x: 0.5, y: 0 },
      { x: -2.15, y: -0.2 },
      { x: 5.05, y: -0.2 },
    ],
  ])(
    "shifts both eyes as the art kit's look does, looking %s",
    (_, look, left, right) => {
      const eyes = eyesOf({ look, range: FUZZBALL_LOOK_FAR });

      expect([middleOf(eyes[0]), middleOf(eyes[1])]).toEqual([left, right]);
    },
  );

  it("shifts both eyes by the brick games' look unless asked for more", () => {
    const eyes = eyesOf({ look: { x: 0.6, y: 0.8 } });

    expect([middleOf(eyes[0]), middleOf(eyes[1])]).toEqual([
      { x: -1.82, y: 0.52 },
      { x: 5.38, y: 0.52 },
    ]);
  });

  it.each<[number, readonly string[]]>([
    [
      0,
      [
        "ellipse eye at -3.104,-0.2 2.99x3.9",
        "ellipse eye at 5.104,-0.2 2.99x3.9",
      ],
    ],
    [
      1,
      [
        "ellipse eye at -4.112,-0.2 3.68x4.8",
        "ellipse eye at 6.112,-0.2 3.68x4.8",
      ],
    ],
  ])(
    "draws the small form %f of the way to its smallest with larger eyes further apart and no glints, as the art kit does",
    (tiny, kit) => {
      expect(eyesOf({ small: true, tiny }).map(said)).toEqual(kit);
    },
  );

  it("draws the small form dizzy as round dots, too small for a spiral", () => {
    expect(
      eyesOf({ face: "dizzy", small: true }).map((mark) =>
        mark.kind === "ellipse" ? [mark.rx, mark.ry].map(rounded) : mark.kind,
      ),
    ).toEqual([
      [2.392, 2.392],
      [2.392, 2.392],
    ]);
  });

  it.each([
    [0, 1.14],
    [1, 1.44],
  ])(
    "draws the small form's lids heavier, %f of the way to its smallest",
    (tiny, width) => {
      const lids = eyesOf({ face: "set", small: true, tiny }).flatMap((mark) =>
        mark.kind === "stroke" ? [rounded(mark.width)] : [],
      );

      expect(lids).toEqual([width, width]);
    },
  );
});

describe("restingLook", () => {
  it.each<[FuzzballFace, GridPoint]>([
    ["plead", { x: 0, y: -0.75 }],
    ["rest", { x: 0, y: 0 }],
    ["eep", { x: 0, y: 0 }],
  ])("looks %s's way unless told where", (face, look) => {
    expect(restingLook(face)).toEqual(look);
  });

  it("draws a face at its resting look unless given another", () => {
    expect(eyesOf({ face: "plead" })).toEqual(
      eyesOf({ face: "plead", look: { x: 0, y: -0.75 } }),
    );
  });
});

describe("lookOffset", () => {
  it.each<[string, GridPoint, GridPoint]>([
    ["straight out", { x: 0, y: 0 }, { x: 0, y: 0 }],
    ["right", { x: 1, y: 0 }, { x: 1.3, y: 0 }],
    ["up", { x: 0, y: -1 }, { x: 0, y: -0.9 }],
    ["half right and down", { x: 0.5, y: 0.5 }, { x: 0.65, y: 0.45 }],
  ])(
    "shifts the eyes by the brick games' look, looking %s",
    (_, look, offset) => {
      expect(roundedPoint(lookOffset(look))).toEqual(offset);
    },
  );

  it("counts a look longer than a unit as a unit", () => {
    expect(lookOffset({ x: 0, y: 3 }, FUZZBALL_LOOK)).toEqual(
      lookOffset({ x: 0, y: 1 }, FUZZBALL_LOOK),
    );
  });

  it("takes the eyes about the body's middle for a look that centers them", () => {
    const [left, right] = FUZZBALL.eyes.map(({ cx }) => cx - FUZZBALL.body.cx);
    const { x } = lookOffset({ x: 0, y: 1 }, FUZZBALL_LOOK_FAR);

    expect(rounded((left ?? NaN) + x + (right ?? NaN) + x)).toBe(0);
  });
});

describe("fuzzballShape", () => {
  it("is the mark with no pose", () => {
    expect(fuzzballShape()).toEqual({
      fur: combFur(),
      furWidth: FUZZBALL.fur.width,
      eyes: eyesOf(),
      sparks: [],
      reach: expect.closeTo(14.7784, 4) as number,
    });
  });

  it("poses its face, its look and its fur together", () => {
    const pose = {
      face: "set",
      look: { x: 1, y: 0 },
      lift: 1,
      lean: { x: 1, y: 0 },
    } as const;

    const shape = fuzzballShape(pose);

    expect({ fur: shape.fur, eyes: shape.eyes }).toEqual({
      fur: combFur(pose),
      eyes: eyesOf(pose),
    });
  });

  it.each([
    [0, 14.7784],
    [1, 15.9784],
    [2, 17.5284],
    [3, 18.9284],
  ])(
    "reaches as far as the art kit's fur at static's step %i, its round ends and all",
    (lift, reach) => {
      expect(fuzzballShape({ lift }).reach).toBeCloseTo(reach, 4);
    },
  );

  it.each([
    [2, false],
    [2.5, true],
    [MOST_LIFT, true],
  ])("sparks at static's step %f: %s", (lift, sparks) => {
    expect(fuzzballShape({ lift }).sparks.length > 0).toBe(sparks);
  });

  it("sparks about its own fur, wherever it is swept", () => {
    const pose = { lift: MOST_LIFT, lean: { x: 0, y: 2 } };

    expect(fuzzballShape(pose).sparks).toEqual(sparksOf(combFur(pose)));
  });

  it("draws the small form's fur wider and leaves out its sparks", () => {
    const shape = fuzzballShape({ small: true, lift: MOST_LIFT });

    expect({ furWidth: shape.furWidth, sparks: shape.sparks }).toEqual({
      furWidth: SMALL_FUR_WIDTH,
      sparks: [],
    });
  });
});

describe("fuzzballForm", () => {
  it.each([
    [SMALL_UNDER + 0.5, { small: false, tiny: 0 }],
    [SMALL_UNDER, { small: true, tiny: 0 }],
    [10, { small: true, tiny: 0.5 }],
    [8, { small: true, tiny: 1 }],
    [4, { small: true, tiny: 1 }],
  ])("draws a fuzzball %f pixels across in %o", (pixels, form) => {
    expect(fuzzballForm(pixels)).toEqual(form);
  });
});
