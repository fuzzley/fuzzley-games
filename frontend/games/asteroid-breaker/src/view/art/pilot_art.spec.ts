import { FUZZBALL_STRANDS } from "@fz/phaser/fuzzball";
import type { ArtFrame, ArtScale, DrawCommand } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  FUZZBALL,
  FUZZBALL_FACES,
  FUZZBALL_GRID,
  FUZZBALL_LOOK_FAR,
  MOST_LIFT,
  lookOffset,
} from "@fz/style/fuzzball";
import { STRAY_RADIUS } from "../../rules/tuning";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  reachOf,
} from "../../testing/art_frames";
import type { BeltPalette } from "../colors/palette";
import { mixTone } from "../colors/tones";
import {
  ADRIFT_FRAMES,
  BAIL_OUT_RADIUS,
  CONSTELLATION,
  LEANS,
  PILOT_SIZES,
  SEATS,
  eyesCommands,
  eyesFrame,
  eyesShift,
  furFrame,
  fuzzballCommands,
  isSparking,
  leanStep,
  lookingFrom,
  pilotFrames,
  podPilotForm,
  sparkCore,
  sparksFrames,
} from "./pilot_art";
import { PILOT_SIZE, canopyWithin } from "./pod_art";

/** How many strands of fur the fuzzball's path draws, one for each move in it. */
const STRANDS = FUZZBALL.fur.d.split("M").length - 1;

/** How far a size may stray from what it should be and still pass, for a rounding. */
const SLACK = 1e-9;

/** The scale of a field too small for its fine marks: 6 CSS px a unit at 2 to a CSS pixel. */
const SMALL: ArtScale = { unit: 12, pixelRatio: 2 };

/** The pilots' frames on a field too small for its fine marks. */
const SMALL_FRAMES = pilotFrames(ART_PALETTE, SMALL, false);

/** Every lift the pod's pilot's fur is baked at, from flat to on end. */
const LIFTS = Array.from({ length: MOST_LIFT + 1 }, (_, lift) => lift);

/** Returns the colors a frame draws in, each once. */
function colorsOf(frame: ArtFrame): ReadonlySet<number> {
  return new Set(frame.commands.map((command) => command.color));
}

/** Returns how far right of a frame's middle what it draws lies, on average, over its lines' ends and its circles' middles. */
function leaningOf(frame: ArtFrame): number {
  const xs = frame.commands.flatMap((command: DrawCommand) => {
    if (command.kind === "line") return [command.from.x, command.to.x];
    if (command.kind === "circle") return [command.x];
    return [];
  });
  return xs.reduce((sum, x) => sum + x, 0) / xs.length - frame.width / 2;
}

describe("the pilot's sizes", () => {
  it("seats the pod's pilot at the size its canopy holds", () => {
    expect(PILOT_SIZES.pod).toBe(PILOT_SIZE);
  });

  it("draws a pilot adrift wider than its bubble's radius", () => {
    expect(PILOT_SIZES.adrift).toBeCloseTo(1.55 * STRAY_RADIUS, 9);
  });

  it("bails a pilot out in a bubble smaller than a stray's", () => {
    expect(BAIL_OUT_RADIUS).toBeLessThan(STRAY_RADIUS);
  });
});

describe("the pod's pilot's fur", () => {
  it("names each lift and push apart", () => {
    const names = LIFTS.flatMap((lift) =>
      LEANS.map((lean) => furFrame(lift, lean)),
    );

    expect(new Set(names).size).toBe(LIFTS.length * LEANS.length);
  });

  it("draws every frame white, for the scene to tint in the pilot's ink", () => {
    const colors = LIFTS.flatMap((lift) =>
      LEANS.map((lean) => [
        ...colorsOf(frameNamed(ART_FRAMES, furFrame(lift, lean))),
      ]),
    );

    expect(new Set(colors.flat())).toEqual(new Set([0xffffff]));
  });

  it("stands the fur further out at each lift", () => {
    const reaches = LIFTS.map((lift) =>
      reachOf(frameNamed(ART_FRAMES, furFrame(lift, 0))),
    );

    expect(reaches).toEqual([...reaches].sort((a, b) => a - b));
    expect(new Set(reaches).size).toBe(LIFTS.length);
  });

  it.each(LIFTS)("holds the fur lifted %i inside the canopy", (lift) => {
    const by = (PILOT_SIZE * ART_SCALE.unit) / FUZZBALL_GRID;
    const reaches = LEANS.map((lean) =>
      reachOf(frameNamed(ART_FRAMES, furFrame(lift, lean))),
    );

    expect(Math.max(...reaches)).toBeLessThanOrEqual(
      canopyWithin(ART_SCALE, true) * by + SLACK,
    );
  });

  it("sweeps the fur back, away from a push along x, the more the harder", () => {
    const leaning = LEANS.map((lean) =>
      leaningOf(frameNamed(ART_FRAMES, furFrame(0, lean))),
    );

    expect(leaning).toEqual([...leaning].sort((a, b) => b - a));
    expect(leaning.at(-1)).toBeLessThan(leaning[0] ?? 0);
  });

  it.each([
    [2.6, 3],
    [-1, 0],
    [9, MOST_LIFT],
  ])("draws a lift of %f as its nearest baked, %i", (lift, baked) => {
    expect(furFrame(lift, 0)).toBe(furFrame(baked, 0));
  });

  it("has no frame for a lift that is no number", () => {
    expect(() => furFrame(Number.NaN, 0)).toThrow(RangeError);
  });

  it.each([
    [0.2, 0],
    [0.3, 1],
    [0.74, 1],
    [0.8, 2],
    [1.6, 3],
    [5, 3],
  ])("draws a push of %f at its nearest baked, the %ith", (push, step) => {
    expect(leanStep(push)).toBe(step);
  });
});

describe("static's sparks", () => {
  it.each(LEANS)(
    "draws halos and cores, white, about fur on end pushed %f",
    (lean) => {
      const { halo, core } = sparksFrames(lean);

      expect(
        [halo, core].map((name) => [...colorsOf(frameNamed(ART_FRAMES, name))]),
      ).toEqual([[0xffffff], [0xffffff]]);
    },
  );

  it.each(LEANS)("draws none about the small form, pushed %f", (lean) => {
    const { halo, core } = sparksFrames(lean);

    expect(
      [halo, core].map((name) => frameNamed(SMALL_FRAMES, name).commands),
    ).toEqual([[], []]);
  });

  it.each([
    [2, false],
    [2.5, true],
    [3, true],
  ])("shows them at a lift of %f, %s", (lift, sparking) => {
    expect(isSparking(lift)).toBe(sparking);
  });

  it("mixes their cores toward the field's text in a light palette", () => {
    const ink = ART_PALETTE.pilots[2] ?? 0;

    expect(sparkCore(ink, ART_PALETTE)).toBe(
      mixTone(ink, ART_PALETTE.shot, 0.4),
    );
  });

  it("mixes their cores toward white in a dark palette", () => {
    const dark: BeltPalette = { ...ART_PALETTE, mode: "dark" };
    const ink = dark.pilots[2] ?? 0;

    expect(sparkCore(ink, dark)).toBe(mixTone(ink, 0xffffff, 0.82));
  });
});

describe("the pod's pilot's form", () => {
  it("is the fuzzball's own on a field that keeps its fine marks", () => {
    expect(podPilotForm(ART_SCALE).small).toBe(false);
  });

  it("is the small form on the smallest field", () => {
    expect(podPilotForm(SMALL)).toEqual({ small: true, tiny: 1 });
  });
});

describe("a pilot adrift", () => {
  it("draws its fur white, and stood out further in a fright", () => {
    const [fur, puffed] = [ADRIFT_FRAMES.fur, ADRIFT_FRAMES.puffed].map(
      (name) => frameNamed(ART_FRAMES, name),
    );

    expect({
      colors: [fur, puffed].map((frame) => frame && [...colorsOf(frame)]),
      puffs: fur && puffed && reachOf(puffed) > reachOf(fur),
    }).toEqual({ colors: [[0xffffff], [0xffffff]], puffs: true });
  });

  it("holds its fur, stood out, inside its bubble", () => {
    const puffed = frameNamed(ART_FRAMES, ADRIFT_FRAMES.puffed);

    expect(reachOf(puffed)).toBeLessThanOrEqual(
      0.93 * STRAY_RADIUS * ART_SCALE.unit + SLACK,
    );
  });

  it("draws the fuzzball's body, then each strand round at its ends, as wide as its grid says", () => {
    const [body, ...fur] = fuzzballCommands(32, 7);
    const lines = fur.filter((command) => command.kind === "line");
    const dots = fur.filter((command) => command.kind === "circle");

    expect({
      body,
      strands: lines.length,
      lineWidths: new Set(
        lines.map((command) => ("width" in command ? command.width : 0)),
      ),
      dotWidths: new Set(
        dots.map((command) => ("radius" in command ? 2 * command.radius : 0)),
      ),
    }).toEqual({
      body: { kind: "circle", x: 0, y: 0, radius: FUZZBALL.body.r, color: 7 },
      // Each strand is a curve of eight straight pieces.
      strands: 8 * STRANDS,
      lineWidths: new Set([FUZZBALL.fur.width]),
      dotWidths: new Set([FUZZBALL.fur.width]),
    });
  });
});

describe("a pilot's eyes", () => {
  it("names each seat's and each face's apart", () => {
    const names = SEATS.flatMap((seat) =>
      FUZZBALL_FACES.map((face) => eyesFrame(seat, face)),
    );

    expect(new Set(names).size).toBe(SEATS.length * FUZZBALL_FACES.length);
  });

  it.each(SEATS)("draws each face's eyes in the eyes' ink, %s", (seat) => {
    const inks = FUZZBALL_FACES.map((face) =>
      colorsOf(frameNamed(ART_FRAMES, eyesFrame(seat, face))).has(
        ART_PALETTE.eyes,
      ),
    );

    expect(inks).toEqual(FUZZBALL_FACES.map(() => true));
  });

  it.each(SEATS)(
    "glints the eyes at rest where the field keeps its fine marks, %s",
    (seat) => {
      expect(
        colorsOf(frameNamed(ART_FRAMES, eyesFrame(seat, "rest"))).has(
          ART_PALETTE.glint,
        ),
      ).toBe(true);
    },
  );

  it.each(SEATS)(
    "glints no eyes where the field doesn't keep them, %s",
    (seat) => {
      const glinting = FUZZBALL_FACES.filter((face) =>
        colorsOf(frameNamed(SMALL_FRAMES, eyesFrame(seat, face))).has(
          ART_PALETTE.glint,
        ),
      );

      expect(glinting).toEqual([]);
    },
  );

  it("glints the eyes in the glint's color where each glint is half a pixel or more", () => {
    const glints = eyesCommands(19, ART_PALETTE)
      .slice(FUZZBALL.eyes.length)
      .map((command) => [command.kind, command.color]);

    expect(glints).toEqual(
      FUZZBALL.glints.map(() => ["circle", ART_PALETTE.glint]),
    );
  });

  it("leaves the glints out where they'd be under half a pixel, as they'd only turn the eyes grey", () => {
    expect(eyesCommands(18, ART_PALETTE)).toHaveLength(FUZZBALL.eyes.length);
  });

  it("lays the eyes about the body's middle, as the fuzzball's grid has them", () => {
    const [left] = eyesCommands(32, ART_PALETTE);
    const xs = left?.kind === "polygon" ? left.points.map(({ x }) => x) : [];

    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(
      (FUZZBALL.eyes[0]?.cx ?? NaN) - FUZZBALL.body.cx,
    );
  });
});

describe("eyesShift", () => {
  it.each(SEATS)(
    "moves the eyes as far as a look shifts them, by the pilot's size, %s",
    (seat) => {
      const look = { x: 0.6, y: 0.8 };
      const offset = lookOffset(look, FUZZBALL_LOOK_FAR);

      const shift = eyesShift(look, seat, { x: 0, y: 0 });

      expect([shift.x, shift.y]).toEqual([
        expect.closeTo((offset.x * PILOT_SIZES[seat]) / FUZZBALL_GRID, 9),
        expect.closeTo((offset.y * PILOT_SIZES[seat]) / FUZZBALL_GRID, 9),
      ]);
    },
  );

  it("moves them nowhere for no look", () => {
    expect(eyesShift({ x: 0, y: 0 }, "pod", { x: 1, y: 1 })).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe("lookingFrom", () => {
  it.each([
    ["far off", 1],
    ["near", 0.1],
  ])("looks straight at what the pilot watches, %s", (_, scale) => {
    const watched = { x: 10 + 3 * scale, y: 20 + 4 * scale };

    const look = lookingFrom(10, 20, watched, 0, { x: 0, y: 0 });

    expect(look.x).toBeCloseTo(0.6, 9);
    expect(look.y).toBeCloseTo(0.8, 9);
  });

  it.each([
    ["nothing", null],
    ["what is right there", { x: 10, y: 20 }],
  ])("looks along its heading where it watches %s", (_, watched) => {
    const look = lookingFrom(10, 20, watched, Math.PI / 2, { x: 0, y: 0 });

    expect([look.x, look.y]).toEqual([Math.cos(Math.PI / 2), 1]);
  });

  it("writes the way into the record it is given", () => {
    const into = { x: 0, y: 0 };

    expect(lookingFrom(10, 20, null, 0, into)).toBe(into);
  });
});

describe("CONSTELLATION", () => {
  it("traces the fuzzball by every other strand's tip, and its eyes by two", () => {
    expect([CONSTELLATION.specks.length, CONSTELLATION.eyes.length]).toEqual([
      Math.ceil(STRANDS / 2),
      FUZZBALL.eyes.length,
    ]);
  });

  it("places its specks as shares of the fuzzball's size, within it", () => {
    const places = [...CONSTELLATION.specks, ...CONSTELLATION.eyes];

    expect(
      places.every(({ x, y }) => Math.abs(x) <= 0.5 && Math.abs(y) <= 0.5),
    ).toBe(true);
  });

  it("places its first speck at the first strand's tip, from the body's middle", () => {
    const [first] = FUZZBALL_STRANDS;

    expect(CONSTELLATION.specks[0]).toEqual({
      x: (first?.to.x ?? NaN) / 32,
      y: (first?.to.y ?? NaN) / 32,
    });
  });
});
