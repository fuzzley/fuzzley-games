import { furReach } from "@fz/phaser/fuzzball";
import type { ArtFrame, ArtScale, DrawCommand, Point } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { FUZZBALL_GRID, MOST_LIFT } from "@fz/style/fuzzball";
import { stepsIn } from "../../rules/stepper";
import { SHIP_LENGTH } from "../../rules/tuning";
import {
  ART_PALETTE,
  ART_SCALE,
  ART_SCALES,
  reachOf,
} from "../../testing/art_frames";
import type { BeltPalette } from "../colors/palette";
import { DASH_TRAIL } from "../effects/timing";
import { LEANS, furFrame, pilotFrames } from "./pilot_art";
import {
  CANOPY,
  FLAME_REACH,
  FLICKER_FRAMES,
  FLICKER_MS,
  GAUGE_STEPS,
  PILOT_SIZE,
  POD_FRAMES,
  POD_REACH,
  POD_RINGS,
  PUFF,
  RIM_FLASH,
  STREAKS_REACH,
  flameFlickerAt,
  flameFrame,
  flameShare,
  gaugeFrame,
  ghostScale,
  podFrames,
  podHullFrame,
  podTones,
  puffAlpha,
  puffColors,
  puffRadius,
  rimFlashAlpha,
  rimFlashScale,
} from "./pod_art";

/** How far a size may stray from what it should be and still pass, for a rounding. */
const SLACK = 1e-9;

/** The specs' palette in its dark mode, for what the pod draws apart in a dark palette. */
const DARK: BeltPalette = { ...ART_PALETTE, mode: "dark" };

/** The pod's tones in the specs' palette. */
const TONES = podTones(ART_PALETTE);

/** The scale of a field too small for the pod's fine marks: 6 CSS px a unit at 2 to a CSS pixel. */
const SMALL: ArtScale = { unit: 12, pixelRatio: 2 };

/** Every lift the pilot's fur is baked at, from flat to on end. */
const LIFTS = Array.from({ length: MOST_LIFT + 1 }, (_, lift) => lift);

/** The pod's frames for the field's atlas in the specs' palette at their scale, with its fine marks. */
const FINE_FRAMES = podFrames(ART_PALETTE, ART_SCALE, true);

/** The same, on a field too small for its fine marks. */
const SMALL_FRAMES = podFrames(ART_PALETTE, SMALL, false);

/** The hull's frame in the specs' palette at their scale, in its inks and as its normal map. */
const HULL = podHullFrame(ART_PALETTE, ART_SCALE);

/** Returns the points of a polygon, about its frame's middle, or none for any other command. */
function pointsOf(command: DrawCommand, frame: ArtFrame): readonly Point[] {
  if (command.kind !== "polygon") return [];
  return command.points.map(({ x, y }) => ({
    x: x - frame.width / 2,
    y: y - frame.height / 2,
  }));
}

/** Returns the middle of some points. */
function middleOf(points: readonly Point[]): Point {
  return {
    x: points.reduce((sum, { x }) => sum + x, 0) / points.length,
    y: points.reduce((sum, { y }) => sum + y, 0) / points.length,
  };
}

/** Returns a channel of a normal map's color as the share of a way it holds, from -1 to 1. */
function shareIn(color: number, shift: number): number {
  return (((color >> shift) & 0xff) / 255) * 2 - 1;
}

/** The way to the specs' palette's light across the field, in radians. */
const TOWARD_LIGHT = Math.atan2(
  ART_PALETTE.rockLight.way.y,
  ART_PALETTE.rockLight.way.x,
);

/** Returns how far a point lies along the way to the light from the middle. */
function towardLight({ x, y }: Point): number {
  return x * Math.cos(TOWARD_LIGHT) + y * Math.sin(TOWARD_LIGHT);
}

describe("the pod's hull", () => {
  const facets = HULL.ink.commands.filter(
    (command) => command.color !== ART_PALETTE.outline,
  );

  it("spans the ship's length, from its engines to its prow", () => {
    const xs = facets.flatMap((command) =>
      pointsOf(command, HULL.ink).map(({ x }) => x),
    );

    const span = Math.max(...xs) - Math.min(...xs);
    // Each facet is grown half a pixel past its edges, a sharp corner as far
    // as twice that.
    expect(span - SHIP_LENGTH * ART_SCALE.unit).toBeGreaterThan(0);
    expect(span - SHIP_LENGTH * ART_SCALE.unit).toBeLessThanOrEqual(2);
  });

  it("cuts its facets in the accent but for the engines' metal, in the field's muted text", () => {
    const inks = facets.map((command) => command.color);

    expect({
      hull: inks.filter((ink) => ink === ART_PALETTE.accent).length,
      trim: inks.filter((ink) => ink === ART_PALETTE.muted).length,
      all: inks.length,
    }).toEqual({ hull: 22, trim: 2, all: 24 });
  });

  it("outlines it in the field's color, beneath its facets", () => {
    const outlines = HULL.ink.commands.slice(
      0,
      HULL.ink.commands.length - facets.length,
    );

    expect(new Set(outlines.map((command) => command.color))).toEqual(
      new Set([ART_PALETTE.outline]),
    );
  });

  it("packs its normal map alike, over a flat frame", () => {
    expect({
      name: HULL.normal.name,
      width: HULL.normal.width,
      height: HULL.normal.height,
      commands: HULL.normal.commands.length,
    }).toEqual({
      name: HULL.ink.name,
      width: HULL.ink.width,
      height: HULL.ink.height,
      commands: HULL.ink.commands.length + 1,
    });
  });

  it("faces each facet of the collar out from the canopy", () => {
    const outlines = HULL.ink.commands.length - facets.length;
    const collar = HULL.normal.commands
      .slice(1 + outlines, 1 + outlines + 12)
      .map((command) => {
        const middle = middleOf(pointsOf(command, HULL.normal));
        const facing = {
          x: shareIn(command.color, 16),
          y: -shareIn(command.color, 8),
        };
        return facing.x * middle.x + facing.y * middle.y > 0;
      });

    expect(collar).toEqual(Array(12).fill(true));
  });

  it("is named apart from the field's atlas's frames", () => {
    expect(FINE_FRAMES.map((frame) => frame.name)).not.toContain(
      POD_FRAMES.hull,
    );
  });
});

describe("the pilot's size", () => {
  it("is the kit's pilot's, 1.18 units across the fuzzball's grid", () => {
    expect(PILOT_SIZE).toBeCloseTo(1.1779, 4);
  });

  it("fills most of the canopy with its fur, flat", () => {
    expect((furReach() * PILOT_SIZE) / FUZZBALL_GRID).toBeCloseTo(
      0.8 * CANOPY,
      9,
    );
  });

  it.each([
    [true, "inside the rim", ART_SCALE],
    [false, "inside the glass", SMALL],
  ])("holds the fur at every lift and lean, fine %s, %s", (fine, _, scale) => {
    const frames = podFrames(ART_PALETTE, scale, fine);
    const [disc] = frameNamed(frames, POD_FRAMES.glass).commands;
    const [rim] = frameNamed(frames, POD_FRAMES.rim).commands;
    const pilots = pilotFrames(ART_PALETTE, scale, fine);

    const reach = Math.max(
      ...LIFTS.flatMap((lift) =>
        LEANS.map((lean) => reachOf(frameNamed(pilots, furFrame(lift, lean)))),
      ),
    );

    const within =
      rim?.kind === "ring"
        ? rim.radius - rim.width / 2
        : disc?.kind === "circle"
          ? disc.radius
          : 0;
    expect(reach).toBeLessThanOrEqual(within + SLACK);
  });
});

describe("the canopy", () => {
  it("draws its glass at the canopy's radius, with its shade on its far side from the light", () => {
    const glass = frameNamed(FINE_FRAMES, POD_FRAMES.glass);
    const [disc, shade] = glass.commands;

    expect({
      disc: disc?.kind === "circle" && [disc.radius, disc.color],
      shade: shade?.color,
      far: shade && towardLight(middleOf(pointsOf(shade, glass))) < 0,
    }).toEqual({
      disc: [CANOPY * ART_SCALE.unit, TONES.glass],
      shade: TONES.glassShade,
      far: true,
    });
  });

  it("draws its glass a little wider and unshaded where its fine marks don't show", () => {
    const glass = frameNamed(SMALL_FRAMES, POD_FRAMES.glass);

    expect(glass.commands).toEqual([
      expect.objectContaining({
        kind: "circle",
        radius: CANOPY * SMALL.unit + 0.3 * SMALL.pixelRatio,
      }),
    ]);
  });

  it("lights its rim toward the light, charged", () => {
    const rim = frameNamed(FINE_FRAMES, POD_FRAMES.rim);
    const [ring, lit] = rim.commands;

    expect({
      ring: ring?.kind === "ring" && ring.color,
      lit: lit?.color,
      toward: lit && towardLight(middleOf(pointsOf(lit, rim))) > 0,
    }).toEqual({ ring: TONES.rim, lit: TONES.rimLit, toward: true });
  });

  it.each([POD_FRAMES.rim, POD_FRAMES.glint])(
    "draws no %s where its fine marks don't show",
    (name) => {
      expect(frameNamed(SMALL_FRAMES, name).commands).toEqual([]);
    },
  );

  it("draws its glint in white, toward the light", () => {
    const glint = frameNamed(FINE_FRAMES, POD_FRAMES.glint);
    const ends = glint.commands.flatMap((command) =>
      command.kind === "line" ? [command.from, command.to] : [],
    );
    const middle = middleOf(ends);

    expect({
      colors: new Set(glint.commands.map((command) => command.color)),
      toward:
        towardLight({
          x: middle.x - glint.width / 2,
          y: middle.y - glint.height / 2,
        }) > 0,
    }).toEqual({ colors: new Set([ART_PALETTE.glint]), toward: true });
  });
});

describe("the rim's gauge", () => {
  it("is dim all round with the dash just spent", () => {
    expect(
      frameNamed(FINE_FRAMES, gaugeFrame(0)).commands.map(
        (command) => command.color,
      ),
    ).toEqual([TONES.rimDim]);
  });

  it("fills clockwise from the top as the dash recharges", () => {
    const gauge = frameNamed(FINE_FRAMES, gaugeFrame(0.25));
    const [, lit] = gauge.commands;
    const points = lit ? pointsOf(lit, gauge) : [];
    const middle = middleOf(points);

    expect({
      color: lit?.color,
      // A quarter of the way round from the top, clockwise, lies to its upper right.
      right: middle.x > 0,
      up: middle.y < 0,
    }).toEqual({ color: TONES.rimLit, right: true, up: true });
  });

  it.each([
    [0, "pod-gauge-0"],
    [0.5, `pod-gauge-${String(GAUGE_STEPS / 2)}`],
    [0.99, `pod-gauge-${String(GAUGE_STEPS - 1)}`],
    [1, `pod-gauge-${String(GAUGE_STEPS)}`],
    [-1, "pod-gauge-0"],
    [2, `pod-gauge-${String(GAUGE_STEPS)}`],
  ])("names the frame of a dash recharged %f of the way %s", (share, name) => {
    expect(gaugeFrame(share)).toBe(name);
  });
});

describe("the rim's flash", () => {
  it("shows whole as the dash comes charged", () => {
    expect(rimFlashAlpha(0)).toBe(1);
  });

  it("fades to nothing over its time", () => {
    expect(rimFlashAlpha(RIM_FLASH.ms)).toBe(0);
  });

  it("shows nothing before the dash comes charged", () => {
    expect(rimFlashAlpha(-1)).toBe(0);
  });

  it("grows as it fades where motion is welcome", () => {
    expect(rimFlashScale(RIM_FLASH.ms / 2, true)).toBeCloseTo(
      1 + RIM_FLASH.growth / 2,
      9,
    );
  });

  it("holds its size where motion isn't welcome", () => {
    expect(rimFlashScale(RIM_FLASH.ms / 2, false)).toBe(1);
  });
});

describe("the Shield's shell", () => {
  it("rings the pod in the hull's ink, with a lit ring inside it and a glint, faint", () => {
    const shield = frameNamed(FINE_FRAMES, POD_FRAMES.shield);

    expect(shield.commands).toEqual([
      expect.objectContaining({
        kind: "ring",
        radius: POD_RINGS.shield * ART_SCALE.unit,
        color: TONES.hull.ink,
      }),
      expect.objectContaining({
        kind: "ring",
        color: TONES.hull.lit,
        alpha: 0.6,
      }),
      expect.objectContaining({ kind: "polygon", alpha: 0.85 }),
      expect.objectContaining({ kind: "circle", alpha: 0.85 }),
    ]);
  });

  it("is a plain ring where its fine marks don't show", () => {
    expect(frameNamed(SMALL_FRAMES, POD_FRAMES.shield).commands).toHaveLength(
      1,
    );
  });

  it("glints white in a dark palette", () => {
    const shield = frameNamed(
      podFrames(DARK, ART_SCALE, true),
      POD_FRAMES.shield,
    );

    expect(shield.commands.at(-1)?.color).toBe(DARK.glint);
  });

  it("washes the field within it in the accent", () => {
    expect(frameNamed(FINE_FRAMES, POD_FRAMES.wash).commands).toEqual([
      expect.objectContaining({
        kind: "circle",
        radius: POD_RINGS.shield * ART_SCALE.unit,
        color: ART_PALETTE.accent,
      }),
    ]);
  });
});

describe("the guard's ring", () => {
  it("is dashed in the hull's ink at its ring", () => {
    const guard = frameNamed(FINE_FRAMES, POD_FRAMES.guard);

    const reach = reachOf(guard) / ART_SCALE.unit;

    expect({
      dashes: guard.commands.length > 18,
      colors: new Set(guard.commands.map((command) => command.color)),
    }).toEqual({ dashes: true, colors: new Set([TONES.hull.ink]) });
    expect(reach).toBeCloseTo(POD_RINGS.guard + 0.06, 1);
  });
});

describe("the flame", () => {
  const flame = frameNamed(FINE_FRAMES, flameFrame(0));

  it("draws a flame behind each engine, its body and then its bright middle", () => {
    expect(flame.commands.map((command) => command.color)).toEqual([
      TONES.flame,
      TONES.flameMiddle,
      TONES.flame,
      TONES.flameMiddle,
    ]);
  });

  it("draws it from the engines' bases, the frame's middle, back", () => {
    const xs = flame.commands.flatMap((command) =>
      pointsOf(command, flame).map(({ x }) => x),
    );

    expect(Math.max(...xs)).toBeCloseTo(0, 9);
  });

  it("names a frame for each flicker, round and round", () => {
    expect([0, 1, 2, 3, -1].map((flicker) => flameFrame(flicker))).toEqual([
      "pod-flame-0",
      "pod-flame-1",
      "pod-flame-2",
      "pod-flame-0",
      "pod-flame-2",
    ]);
  });

  it.each([
    [0, 0.4 / 1.15],
    [0.5, (0.4 + 0.375) / 1.15],
    [1, 1],
  ])(
    "draws the flame at a thrust of %f a share %f of its frame",
    (thrust, share) => {
      expect(flameShare(thrust)).toBeCloseTo(share, 9);
    },
  );

  it("flickers by the field's steps", () => {
    const flickers = Array.from({ length: FLICKER_FRAMES + 1 }, (_, i) =>
      flameFlickerAt(i * stepsIn(FLICKER_MS), true),
    );

    expect(flickers).toEqual([0, 1, 2, 0]);
  });

  it("holds its first frame where motion isn't welcome", () => {
    expect(flameFlickerAt(stepsIn(FLICKER_MS), false)).toBe(0);
  });

  it("is the warning's own in a light palette", () => {
    expect(podTones(ART_PALETTE).flame).toBe(ART_PALETTE.flame);
  });

  it("glows toward white in a dark one", () => {
    const glow = (color: number): number =>
      ((color >> 16) & 0xff) + ((color >> 8) & 0xff) + (color & 0xff);

    expect(glow(podTones(DARK).flame)).toBeGreaterThan(glow(DARK.flame));
  });
});

describe("a dash", () => {
  it("leaves the pod's shape behind it in the hull's ink", () => {
    expect(
      new Set(
        frameNamed(FINE_FRAMES, POD_FRAMES.ghost).commands.map(
          (command) => command.color,
        ),
      ),
    ).toEqual(new Set([TONES.hull.ink]));
  });

  it("tapers its ghosts, each smaller the further back", () => {
    const scales = Array.from({ length: DASH_TRAIL }, (_, i) => ghostScale(i));

    expect(scales.map((scale) => Number(scale.toFixed(9)))).toEqual([
      0.76, 0.84, 0.92,
    ]);
  });

  it("streaks behind the pod in the hull's lit tone", () => {
    expect(
      new Set(
        frameNamed(FINE_FRAMES, POD_FRAMES.streaks).commands.map(
          (command) => command.color,
        ),
      ),
    ).toEqual(new Set([TONES.hull.lit]));
  });

  it("streaks nothing where its fine marks don't show", () => {
    expect(frameNamed(SMALL_FRAMES, POD_FRAMES.streaks).commands).toEqual([]);
  });
});

describe("the exhaust", () => {
  it("fades from the flame's hot middle through its body to the field's muted text", () => {
    const colors = puffColors(ART_PALETTE);

    expect([colors[1], colors.at(-1), colors.length]).toEqual([
      TONES.flame,
      ART_PALETTE.muted,
      6,
    ]);
  });

  it("starts at its strength and fades to nothing", () => {
    expect([puffAlpha(0), puffAlpha(1)]).toEqual([PUFF.alpha, 0]);
  });

  it("swells as it fades", () => {
    expect([puffRadius(0), puffRadius(1)]).toEqual([PUFF.from, PUFF.to]);
  });
});

describe("POD_REACH", () => {
  /** The frames each reach holds, from where the scene draws them. */
  const reaches = (
    frames: readonly ArtFrame[],
  ): readonly (readonly [string, number])[] =>
    frames.map((frame) => {
      if (frame.name.startsWith("pod-flame")) return [frame.name, FLAME_REACH];
      if (frame.name === POD_FRAMES.streaks) return [frame.name, STREAKS_REACH];
      return [frame.name, POD_REACH];
    });

  it.each(
    ART_SCALES.flatMap((scale) =>
      [true, false].map((fine) => ({ ...scale, fine })),
    ),
  )(
    "holds each of the pod's frames, from where it is drawn, at a unit of $unit, $pixelRatio to a CSS pixel, fine $fine",
    ({ fine, ...scale }) => {
      // The normal map is packed as the inks are, over a flat frame.
      const frames = [
        ...podFrames(ART_PALETTE, scale, fine),
        podHullFrame(ART_PALETTE, scale).ink,
      ];
      const reach = new Map(reaches(frames));
      const beyond = frames
        .filter(
          (frame) =>
            frame.commands.length > 0 &&
            reachOf(frame) > (reach.get(frame.name) ?? 0) * scale.unit + SLACK,
        )
        .map((frame) => frame.name);

      expect(beyond).toEqual([]);
    },
  );
});
