import type { ArtFrame } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { THEMES } from "@fz/style/themes";
import { contrast, rgbOf } from "@fz/style/testing";
import { FIELD_ROLES } from "../../app/board/field_roles";
import type { Field } from "../../rules/field/field";
import { SPEED_INFO } from "../../rules/speed";
import { stepsIn } from "../../rules/stepper";
import {
  PICKUP_PULL_REACH,
  SPARK_BLINK_MS,
  SPARK_LIFE_MS,
} from "../../rules/tuning";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  ART_SCALES,
  reachOf,
} from "../../testing/art_frames";
import { fieldFrom, placeSpark, shipOf } from "../../testing/field_picture";
import { PALETTES } from "../../testing/roles";
import { beltPalette } from "../colors/palette";
import { atlasFrames } from "./art";
import { type WrittenHalo, energyOf } from "./energy";
import { isFine } from "./rock_art";
import {
  SPARK_CUTS,
  SPARK_FRAMES,
  SPARK_HALO,
  SPARK_SIZES,
  SPARK_TAIL,
  SPARK_TAIL_FRAME,
  SPARK_TAIL_LENGTH,
  type SparkTail,
  isSparkDrawn,
  isSparkShown,
  sparkFrames,
  sparkHalo,
  sparkSizeOf,
  sparkTail,
  sparkTurnOf,
} from "./sparks";

/** How far a size may stray from what it should be and still pass, for a rounding. */
const SLACK = 1e-9;

/** Returns a number rounded to nine places, as a spec compares one worked out two ways. */
function rounded(value: number): number {
  return Math.round(value * 1e9) / 1e9 + 0;
}

/** Returns what each of a frame's commands is, its color and how opaque it is. */
function looksOf(
  frame: ArtFrame,
): readonly (readonly [string, number, number])[] {
  return frame.commands.map(
    (command) => [command.kind, command.color, command.alpha ?? 1] as const,
  );
}

/** Returns a record a halo is written into. */
function blankHalo(): WrittenHalo {
  return { along: 9, across: 9, ahead: 9, turn: 9, strength: 9 };
}

/** Returns a field with the pod flying in its corner, at (6, 6), nose up, nothing near. */
function podField(): Field {
  return fieldFrom(["...", ".^.", "..."]);
}

describe("sparkSizeOf", () => {
  it("draws every third slot's spark the larger, as the kit's motes scatter", () => {
    expect(Array.from({ length: 6 }, (_, slot) => sparkSizeOf(slot))).toEqual([
      "medium",
      "medium",
      "large",
      "medium",
      "medium",
      "large",
    ]);
  });
});

describe("sparkTurnOf", () => {
  it("turns each slot's spark a little either way, never as far as its neighbour's", () => {
    const turns = Array.from({ length: 64 }, (_, slot) => sparkTurnOf(slot));

    expect({
      most: Math.max(...turns.map(Math.abs)) <= 0.3,
      either: turns.some((turn) => turn < 0) && turns.some((turn) => turn > 0),
      alike: turns.some((turn, slot) => turn === turns[slot + 1]),
    }).toEqual({ most: true, either: true, alike: false });
  });
});

describe("sparkHalo", () => {
  it.each(SPARK_SIZES)(
    "glows round a %s spark, as far past its points as the kit's, at its strength",
    (size) => {
      const halo = sparkHalo(size, blankHalo());

      const reach = rounded(SPARK_CUTS[size].reach * SPARK_HALO.share);
      expect({
        ...halo,
        along: rounded(halo.along),
        across: rounded(halo.across),
      }).toEqual({
        along: reach,
        across: reach,
        ahead: 0,
        turn: 0,
        strength: 0.85,
      });
    },
  );
});

describe("isSparkShown", () => {
  /** Returns a spark on a field, shed so long ago, in milliseconds. */
  function shedAgo(ms: number): {
    readonly field: Field;
    readonly steps: number;
  } {
    const field = podField();
    field.steps = stepsIn(SPARK_LIFE_MS);
    const spark = placeSpark(field, 30, 30);
    spark.shedAt = field.steps - stepsIn(ms);
    return { field, steps: field.steps };
  }

  it.each([0, 0.3])(
    "shows a spark before its last second whatever the time, %s s",
    (seconds) => {
      const { field, steps } = shedAgo(SPARK_LIFE_MS - SPARK_BLINK_MS - 100);
      const [spark] = field.sparks;
      if (!spark) throw new Error("No spark.");

      expect(isSparkShown(spark, steps, seconds)).toBe(true);
    },
  );

  it.each([
    [0, true],
    [0.3, false],
  ])(
    "shows a spark in its last second only for the first half of each blink, at %s s",
    (seconds, shown) => {
      const { field, steps } = shedAgo(SPARK_LIFE_MS - SPARK_BLINK_MS / 2);
      const [spark] = field.sparks;
      if (!spark) throw new Error("No spark.");

      expect(isSparkShown(spark, steps, seconds)).toBe(shown);
    },
  );
});

describe("isSparkDrawn", () => {
  it.each([
    [4.9, true],
    [5.1, false],
  ])(
    "draws in a spark %s units from the pod, as the ship draws one in from 5",
    (off, drawn) => {
      const field = podField();
      const ship = shipOf(field);
      const spark = placeSpark(field, ship.x + off, ship.y);

      expect(isSparkDrawn(field, spark)).toBe(drawn);
    },
  );

  it("draws in a spark across the field's edge from the pod", () => {
    const field = podField();
    const ship = shipOf(field);
    ship.x = 1;
    const spark = placeSpark(field, field.torus.width - 2, ship.y);

    expect(isSparkDrawn(field, spark)).toBe(true);
  });

  it("draws in a spark from farther at a speed that draws them from farther", () => {
    const field = fieldFrom(["...", ".^.", "..."], {
      sparkReach: SPEED_INFO.relaxed.sparkReach,
    });
    const ship = shipOf(field);
    const spark = placeSpark(field, ship.x + 7, ship.y);

    expect(isSparkDrawn(field, spark)).toBe(true);
  });

  it("draws in a spark from as far as a Magnet draws", () => {
    const field = podField();
    field.pullReach = PICKUP_PULL_REACH * 4;
    const ship = shipOf(field);
    const spark = placeSpark(field, ship.x + 10, ship.y);

    expect(isSparkDrawn(field, spark)).toBe(true);
  });

  it("draws in no spark with no ship", () => {
    const field = podField();
    const ship = shipOf(field);
    const spark = placeSpark(field, ship.x + 1, ship.y);
    field.ship = null;

    expect(isSparkDrawn(field, spark)).toBe(false);
  });
});

describe("a spark's frame", () => {
  it.each(SPARK_SIZES)(
    "draws a %s spark's points in the accent's body and its middle in its hot tone, as the kit's mote",
    (size) => {
      const tones = energyOf(ART_PALETTE.accent, ART_PALETTE);

      expect(looksOf(frameNamed(ART_FRAMES, SPARK_FRAMES[size]))).toEqual([
        ["polygon", tones.body, 1],
        ["polygon", tones.hot, 1],
      ]);
    },
  );

  it("leaves out a spark's middle where its points reach under 2 CSS pixels, as the kit's", () => {
    const frames = sparkFrames(ART_PALETTE, { unit: 6, pixelRatio: 1 });

    expect(looksOf(frameNamed(frames, SPARK_FRAMES.medium))).toHaveLength(1);
  });

  it.each(ART_SCALES)(
    "holds each spark within its reach at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const frames = atlasFrames(ART_PALETTE, scale, isFine(scale));

      const beyond = SPARK_SIZES.filter(
        (size) =>
          reachOf(frameNamed(frames, SPARK_FRAMES[size])) >
          SPARK_CUTS[size].reach * scale.unit + SLACK,
      );

      expect(beyond).toEqual([]);
    },
  );

  it("keeps a spark's body at 3:1 or more against the field in every palette, as a shot's body", () => {
    const below = THEMES.filter(({ id, mode }) => {
      const palette = beltPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);
      const { body } = energyOf(palette.accent, palette);
      return contrast(rgbOf(body), rgbOf(palette.field)) < 3;
    }).map(({ id }) => id);

    expect(below).toEqual([]);
  });
});

describe("a spark's tail", () => {
  it("is drawn in the accent's body in two layers, a unit long behind its middle, strongest by the spark", () => {
    const frame = frameNamed(ART_FRAMES, SPARK_TAIL_FRAME);
    const body = energyOf(ART_PALETTE.accent, ART_PALETTE).body;

    expect({
      looks: looksOf(frame),
      reach: reachOf(frame),
      halves: frame.commands.map((command) =>
        command.kind === "polygon"
          ? Math.max(...command.points.map(({ y }) => y - frame.height / 2))
          : 0,
      ),
    }).toEqual({
      looks: [
        ["polygon", body, 0.3],
        ["polygon", body, 0.4],
      ],
      reach: ART_SCALE.unit,
      halves: [1, 1].map(
        () => SPARK_TAIL.half * SPARK_CUTS.medium.reach * ART_SCALE.unit,
      ),
    });
  });

  it("reaches as far as a spark is drawn in a tenth of a second", () => {
    expect(SPARK_TAIL_LENGTH).toBeCloseTo(1.2);
  });
});

describe("sparkTail", () => {
  /** Returns a record a tail is written into. */
  function blankTail(): SparkTail {
    return { angle: 9, along: 9, across: 9 };
  }

  it.each([
    ["medium", 1],
    ["large", SPARK_CUTS.large.reach / SPARK_CUTS.medium.reach],
  ] as const)(
    "heads a %s spark toward the pod, its tail behind it as long as the view's and as wide as the spark",
    (size, across) => {
      const field = podField();

      const tail = sparkTail(
        size,
        { x: 10, y: 13 },
        { x: 10, y: 10 },
        field.torus,
        blankTail(),
      );

      expect({ ...tail, angle: rounded(tail.angle) }).toEqual({
        angle: rounded(-Math.PI / 2),
        along: SPARK_TAIL_LENGTH,
        across,
      });
    },
  );

  it("heads a spark toward the pod the short way across the field's edge", () => {
    const field = podField();

    const tail = sparkTail(
      "medium",
      { x: field.torus.width - 2, y: 10 },
      { x: 1, y: 10 },
      field.torus,
      blankTail(),
    );

    expect(rounded(tail.angle)).toBe(0);
  });
});
