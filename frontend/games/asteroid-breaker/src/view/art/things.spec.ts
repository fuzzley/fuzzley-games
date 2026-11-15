import { type ArtFrame, widthOf } from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { PICKUP_IDS, type PickupId } from "../../rules/catalog/pickups";
import { type Floating, createPickups } from "../../rules/rocks/drops";
import { stepsIn } from "../../rules/stepper";
import { PICKUP_BLINK_MS } from "../../rules/tuning";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  ART_SCALES,
  reachOf,
} from "../../testing/art_frames";
import { GOLDEN_ANGLE } from "../effects/flourish";
import { atlasFrames } from "./art";
import { isFine } from "./rock_art";
import { outlineWidth } from "./shapes";
import {
  ORB,
  ORB_DIM,
  PICKUP_REACH,
  orbColors,
  orbLook,
  pickupFrame,
  pickupLook,
  restingLook,
  thingsFrames,
} from "./things";

/** How far a size may stray from what it should be and still pass, for a rounding. */
const SLACK = 1e-9;

/** White, which an orb's fine glint is drawn in. */
const WHITE = 0xffffff;

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
