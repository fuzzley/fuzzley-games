import { type ArtFrame, widthOf } from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { PICKUP_IDS, type PickupId } from "../../rules/catalog/pickups";
import { type Floating, createPickups } from "../../rules/rocks/drops";
import { stepsIn } from "../../rules/stepper";
import { COMET_MARGIN, PICKUP_BLINK_MS } from "../../rules/tuning";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  ART_SCALES,
  edgeOf,
  reachOf,
} from "../../testing/art_frames";
import { ROLES } from "../../testing/roles";
import { beltPalette } from "../colors/palette";
import { GOLDEN_ANGLE } from "../effects/flourish";
import { CHEVRON_LITS, type ChevronLit } from "../field/warning";
import { atlasFrames } from "./art";
import { energyOf } from "./energy";
import { isFine } from "./rock_art";
import { outlineWidth } from "./shapes";
import {
  CHEVRON_HALOS,
  COMET,
  COMET_FRAMES,
  COMET_REACH,
  ORB,
  ORB_DIM,
  PICKUP_REACH,
  orbColors,
  orbLook,
  pickupFrame,
  pickupLook,
  TAIL_REACH,
  WARNING_REACH,
  cometHeadFrame,
  restingLook,
  thingsFrames,
  warningFrame,
} from "./things";

/** How far a size may stray from what it should be and still pass, for a rounding. */
const SLACK = 1e-9;

/** White, which an orb's fine glint is drawn in. */
const WHITE = 0xffffff;

/** A dark palette, the specs' roles in its mode. */
const DARK_ART = beltPalette(ROLES, "dark");

/** The colors an orb is drawn in, in the specs' palette. */
const COLORS = orbColors(ART_PALETTE);

/** Returns a number rounded to nine places, as a spec compares one worked out two ways. */
function rounded(value: number): number {
  return Math.round(value * 1e9) / 1e9;
}

/** Returns a pickup's frame at the specs' scale, with the fine marks or without. */
function orbOf(id: PickupId, fine = isFine(ART_SCALE)): ArtFrame {
  return frameNamed(
    thingsFrames(ART_PALETTE, ART_SCALE, fine),
    pickupFrame(id),
  );
}

describe("a pickup's frame", () => {
  it.each(PICKUP_IDS)(
    "outlines the %s's orb in the field's color, an outline's width outside its glass",
    (id) => {
      const [outline, glass] = orbOf(id).commands;

      expect([outline, glass]).toEqual([
        expect.objectContaining({
          kind: "circle",
          color: ART_PALETTE.outline,
          radius: ORB.radius * ART_SCALE.unit + outlineWidth(ART_SCALE),
        }),
        expect.objectContaining({
          kind: "circle",
          color: COLORS.glass,
          radius: ORB.radius * ART_SCALE.unit,
        }),
      ]);
    },
  );

  it.each(PICKUP_IDS)(
    "draws the %s's symbol in its ink and the glint on its rim",
    (id) => {
      const colors = new Set(orbOf(id).commands.map(({ color }) => color));

      expect([colors.has(COLORS.ink), colors.has(COLORS.glint)]).toEqual([
        true,
        true,
      ]);
    },
  );

  it.each([
    ["spread", 1, false],
    ["rapid", 1, false],
    ["lance", 1, false],
    ["shield", 2, false],
    ["magnet", 0, true],
    ["slow", 0, true],
  ] as const)(
    "rims the %s's orb in the accent in %i rings, in arcs: %s",
    (id, rings, arcs) => {
      const frame = orbOf(id);

      expect([
        drawnIn(frame, "ring", ART_PALETTE.accent).length,
        drawnIn(frame, "line", ART_PALETTE.accent).length > 0,
      ]).toEqual([rings, arcs]);
    },
  );

  it("doubles a guard's rim into one wider ring without the fine marks, as the kit draws it small", () => {
    const rings = drawnIn(orbOf("shield", false), "ring", ART_PALETTE.accent);

    expect(
      rings.flatMap((ring) => (ring.kind === "ring" ? [ring.width] : [])),
    ).toEqual([expect.closeTo(1.7 * widthOf(ORB.rim, ART_SCALE), 9)]);
  });

  it.each([
    [true, 1],
    [false, 0],
  ])(
    "deepens the glass and dots the glint only as fine marks, with the fine marks %s: %i of each",
    (fine, count) => {
      const frame = orbOf("spread", fine);

      expect([
        drawnIn(frame, "circle", COLORS.deep).length,
        drawnIn(frame, "circle", WHITE).length,
      ]).toEqual([count, count]);
    },
  );

  it("cuts a magnet's poles from its shoe in its glass", () => {
    expect(drawnIn(orbOf("magnet"), "line", COLORS.glass)).toHaveLength(2);
  });
});

describe("PICKUP_REACH", () => {
  it.each(ART_SCALES)(
    "holds every pickup, from its middle, at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const frames = atlasFrames(ART_PALETTE, scale, isFine(scale));

      const beyond = PICKUP_IDS.filter(
        (id) =>
          reachOf(frameNamed(frames, pickupFrame(id))) >
          PICKUP_REACH * scale.unit + SLACK,
      );

      expect(beyond).toEqual([]);
    },
  );

  it("is the atlas's own frame for each pickup", () => {
    expect(
      PICKUP_IDS.map((id) => frameNamed(ART_FRAMES, pickupFrame(id)).name),
    ).toEqual(PICKUP_IDS.map((id) => `pickup-${id}`));
  });
});

describe("orbLook", () => {
  it("shows an orb at its size, opaque, its halo breathed out, where motion isn't welcome", () => {
    expect(orbLook(false, 0.4, 1, false, restingLook())).toEqual({
      scale: 1,
      alpha: 1,
      haloReach: ORB.halo,
      haloStrength: 0.72,
    });
  });

  it("swells an orb breathed fully in, and widens and strengthens its halo with it, as the kit has them", () => {
    // A quarter of a breath's turn, at 0.64 turns a second, from a phase of 0.
    const seconds = 1 / (4 * 0.64);

    const look = orbLook(false, seconds, 0, true, restingLook());

    expect(
      [look.scale, look.alpha, look.haloReach, look.haloStrength].map(rounded),
    ).toEqual([1.07, 1, ORB.halo * 1.1 * 1.07, 1].map(rounded));
  });

  it.each([
    [0.1, 1, 0.72],
    [0.3, ORB_DIM, 0],
  ])(
    "blinking, %f seconds in, shows an orb at %f opaque, its halo at %f",
    (seconds, alpha, haloStrength) => {
      const look = orbLook(true, seconds, 0, false, restingLook());

      expect([look.alpha, look.haloStrength]).toEqual([alpha, haloStrength]);
    },
  );

  it("writes into the record it is given", () => {
    const into = restingLook();

    expect(orbLook(false, 0, 0, false, into)).toBe(into);
  });
});

describe("restingLook", () => {
  it("is how an orb shows at rest, breathed out and bright", () => {
    expect(restingLook()).toEqual(
      orbLook(false, 0.4, 1, false, {
        scale: 0,
        alpha: 0,
        haloReach: 0,
        haloStrength: 0,
      }),
    );
  });
});

describe("pickupLook", () => {
  /** Returns a pickup floating on the field with so many steps of its life left. */
  function floatingFor(lifeSteps: number): Floating {
    const [floating] = createPickups();
    if (!floating) throw new Error("The field floats no pickups.");
    return { ...floating, live: true, lifeSteps };
  }

  it("breathes a pickup at its slot's phase, each a golden angle on from the last", () => {
    const floating = floatingFor(stepsIn(PICKUP_BLINK_MS) + 1);

    const look = pickupLook(floating, 2, 0.3, true, restingLook());

    expect(look).toEqual(
      orbLook(false, 0.3, 2 * GOLDEN_ANGLE, true, restingLook()),
    );
  });

  it("blinks a pickup through its last seconds", () => {
    const floating = floatingFor(stepsIn(PICKUP_BLINK_MS));

    const look = pickupLook(floating, 0, 0.3, false, restingLook());

    expect(look.alpha).toBe(ORB_DIM);
  });
});

describe("COMET", () => {
  /** Returns numbers rounded to four places, as the kit's are copied. */
  function toFour(values: readonly number[]): number[] {
    return values.map((value) => Math.round(value * 1e4) / 1e4);
  }

  it("is cut as the kit cuts its first comet: its outline and its leading edge", () => {
    expect({
      outline: COMET.outline.map(({ x, y }) => toFour([x, y])),
      edge: COMET.edge.map(({ x, y }) => toFour([x, y])),
    }).toEqual({
      outline: [
        [1.8, 0],
        [-0.0899, -0.8714],
        [-1.0729, -0.4873],
        [-0.66, 0.0419],
        [-1.0345, 0.5632],
        [-0.1676, 0.8717],
      ],
      edge: [
        [0.5716, -0.5664],
        [1.8, 0],
        [0.521, 0.5666],
      ],
    });
  });

  it("faces each of its facets the way the kit's do", () => {
    expect(
      COMET.facets.map(({ facing: { x, y, z } }) => toFour([x, y, z])),
    ).toEqual([
      [0.3075, -0.6669, 0.6787],
      [0.1484, -0.5994, 0.7866],
      [-0.2532, -0.6481, 0.7182],
      [-0.7335, 0.5723, 0.3666],
      [0.2789, 0.6295, 0.7253],
      [0.223, 0.6043, 0.7649],
      [-0.2315, 0.6504, 0.7235],
      [-0.7634, -0.5485, 0.3411],
    ]);
  });
});

describe("the comet's frames", () => {
  /** Returns the comet's frames at a scale, with the fine marks or without. */
  function cometAt(name: string, fine = isFine(ART_SCALE)): ArtFrame {
    return frameNamed(thingsFrames(ART_PALETTE, ART_SCALE, fine), name);
  }

  it("keeps its head within the margin it leaves the field by, so it is out of sight as the comet goes", () => {
    expect(COMET_REACH).toBeLessThanOrEqual(COMET_MARGIN);
  });

  it.each(ART_SCALES)(
    "holds its head, its edge, its tail and its warning within their reaches at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const fine = isFine(scale);
      const frames = thingsFrames(ART_PALETTE, scale, fine);
      const reaches: readonly (readonly [ArtFrame, number])[] = [
        [cometHeadFrame(ART_PALETTE, scale).ink, COMET_REACH],
        [frameNamed(frames, COMET_FRAMES.edge), COMET_REACH],
        [frameNamed(frames, COMET_FRAMES.tail), TAIL_REACH],
        ...CHEVRON_LITS.map(
          (lit) =>
            [frameNamed(frames, warningFrame(lit)), WARNING_REACH] as const,
        ),
      ];

      const beyond = reaches
        .filter(([frame, reach]) => reachOf(frame) > reach * scale.unit + SLACK)
        .map(([frame]) => frame.name);

      expect(beyond).toEqual([]);
    },
  );

  it("outlines its head in the field's color and cuts it in facets of the danger color, each facing its way in the normal map", () => {
    const { ink, normal } = cometHeadFrame(ART_PALETTE, ART_SCALE);

    expect({
      colors: ink.commands.map(({ color }) => color),
      ways: new Set(normal.commands.slice(2).map(({ color }) => color)).size,
    }).toEqual({
      colors: [
        ART_PALETTE.outline,
        ...COMET.facets.map(() => ART_PALETTE.comet),
      ],
      ways: COMET.facets.length,
    });
  });

  it.each([
    [true, true],
    [false, false],
  ])(
    "draws its leading edge in its energy's middle only as a fine mark, with the fine marks %s: %s",
    (fine, drawn) => {
      const { hot } = energyOf(ART_PALETTE.comet, ART_PALETTE);

      expect(
        drawnIn(cometAt(COMET_FRAMES.edge, fine), "line", hot).length > 0,
      ).toBe(drawn);
    },
  );

  it.each([
    [true, 6],
    [false, 3],
  ])(
    "draws its tail's streaks in its energy's body, and with the fine marks %s, %i speed lines",
    (fine, lines) => {
      const { body, hot } = energyOf(ART_PALETTE.comet, ART_PALETTE);
      const tail = cometAt(COMET_FRAMES.tail, fine);

      expect({
        lines: drawnIn(tail, "line", body).length,
        streaks: drawnIn(tail, "polygon", body).map((command) => command.alpha),
        middle: drawnIn(tail, "polygon", hot).map((command) => command.alpha),
      }).toEqual({
        lines,
        streaks: COMET.tail.flatMap(() => [0.28, 0.4]),
        middle: [0.9],
      });
    },
  );

  it("frames its tail about its own middle, behind the comet's", () => {
    const tail = cometAt(COMET_FRAMES.tail);
    const edge = tail.commands.flatMap(edgeOf);

    const left = Math.min(...edge.map(({ x }) => x));
    const right = tail.width - Math.max(...edge.map(({ x }) => x));

    expect(Math.abs(left - right)).toBeLessThanOrEqual(2);
  });
});

describe("the comet's warning", () => {
  /** Returns how strongly each of a warning's chevrons shows, from the edge in. */
  function chevronAlphas(lit: ChevronLit, palette = ART_PALETTE): number[] {
    const frame = frameNamed(
      thingsFrames(palette, ART_SCALE, true),
      warningFrame(lit),
    );
    return drawnIn(frame, "polygon", palette.comet).map(
      (command) => command.alpha ?? 1,
    );
  }

  it("holds its chevrons still, each fainter than the one before, where motion isn't welcome", () => {
    expect(chevronAlphas(null)).toEqual([1, 0.7, 0.45]);
  });

  it.each([0, 1, 2] as const)(
    "lights its chevron %i whole and the others faint",
    (lit) => {
      expect(chevronAlphas(lit)).toEqual(
        [0, 1, 2].map((i) => (i === lit ? 1 : 0.32)),
      );
    },
  );

  it.each([
    ["dark", DARK_ART, 1],
    ["light", ART_PALETTE, 0],
  ] as const)(
    "draws its lit chevron's middle in its energy's on a %s field: %i",
    (_, palette, middles) => {
      const { hot } = energyOf(palette.comet, palette);
      const frame = frameNamed(
        thingsFrames(palette, ART_SCALE, true),
        warningFrame(0),
      );

      expect(drawnIn(frame, "polygon", hot)).toHaveLength(middles);
    },
  );

  it("stands its bar on the edge, half of it off the field", () => {
    const frame = frameNamed(ART_FRAMES, warningFrame(null));
    const middles = drawnIn(frame, "rect", ART_PALETTE.comet).flatMap((bar) =>
      bar.kind === "rect" ? [bar.x + bar.width / 2] : [],
    );

    expect(middles).toEqual([frame.width / 2]);
  });

  it("glows round each chevron while it is lit, as large as it is and where it lies", () => {
    expect(
      ([0, 1, 2] as const).map((lit) => [
        CHEVRON_HALOS[lit].along,
        CHEVRON_HALOS[lit].ahead,
      ]),
    ).toEqual([
      [1.5, 0.95],
      [1.5 * 0.86, 2],
      [1.5 * 0.72, 3.05],
    ]);
  });
});
