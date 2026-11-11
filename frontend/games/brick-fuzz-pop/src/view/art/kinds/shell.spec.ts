import type {
  Area,
  ArtFrame,
  ArtScale,
  CircleCommand,
  PolygonCommand,
  RoundRectCommand,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  billionths,
  everyScale,
} from "../../../testing/art_frames";
import { FRAMES, THICK_HITS } from "../frames";
import { cellOf } from "../symbols";
import { SHELL_ART } from "./shell";

const INKS = ART_PALETTE.kinds.shell;

/** The cell the specs draw in, at a unit of 31 CSS pixels, 2 device pixels to one. */
const CELL = cellOf(ART_SCALE).width;

/**
 * Returns a shell brick with hits left of those it had whole, as its art
 * reads it. Its kind is one the catalog has, as the shell isn't cataloged
 * yet; the art reads its hits alone.
 */
function shell(hits: number, full = 3) {
  return { kind: "tough", tint: 0, hits, full, plates: 0 } as const;
}

/** Returns the shell's frames at a scale, by name. */
function framesAt(scale: ArtScale): (name: string) => ArtFrame {
  const frames = SHELL_ART.frames(ART_PALETTE, scale);
  return (name) => frameNamed(frames, name);
}

/** Returns the circles a frame draws in a color. */
function circlesIn(frame: ArtFrame, color: number): readonly CircleCommand[] {
  return frame.commands.filter(
    (command): command is CircleCommand =>
      command.kind === "circle" && command.color === color,
  );
}

/** Returns the rounded rectangles a frame draws in a color. */
function roundRectsIn(
  frame: ArtFrame,
  color: number,
): readonly RoundRectCommand[] {
  return frame.commands.filter(
    (command): command is RoundRectCommand =>
      command.kind === "roundRect" && command.color === color,
  );
}

/** Returns a shell brick's core in its body's frame. */
function coreOf(body: ArtFrame): RoundRectCommand {
  const [core] = roundRectsIn(body, INKS.face);
  if (!core) throw new Error("No core.");
  return core;
}

/** Returns a shell brick's bolt in its body's frame. */
function boltOf(body: ArtFrame): PolygonCommand {
  const [bolt] = body.commands.filter(
    (command): command is PolygonCommand =>
      command.kind === "polygon" && command.color === INKS.glyph,
  );
  if (!bolt) throw new Error("No bolt.");
  return bolt;
}

/** Returns how far a circle lies inside an area at its nearest: negative where it reaches past it. */
function insideBy(pip: CircleCommand, area: Area): number {
  return Math.min(
    pip.x - pip.radius - area.x,
    pip.y - pip.radius - area.y,
    area.x + area.width - (pip.x + pip.radius),
    area.y + area.height - (pip.y + pip.radius),
  );
}

describe("SHELL_ART", () => {
  it.each([
    [3, 3, ["shell-body", "shell-3"]],
    [2, 3, ["shell-body", "shell-2"]],
    [1, 3, ["shell-body"]],
    [2, 2, ["shell-body", "shell-2"]],
    [1, 2, ["shell-body"]],
  ])(
    "shows a shell with %i hits left of %i as its body and a pip for each hit left from 2",
    (hits, full, layers) => {
      expect(SHELL_ART.layersOf(shell(hits, full))).toEqual(layers);
    },
  );

  it("finds a look's layers in a list made once", () => {
    expect(SHELL_ART.layersOf(shell(2))).toBe(SHELL_ART.layersOf(shell(2)));
  });

  it.each([0, 4])("throws for a shell with %i hits left", (hits) => {
    expect(() => SHELL_ART.layersOf(shell(hits, 4))).toThrow(RangeError);
  });

  it("gives a shell brick's shards its shell's color", () => {
    expect(SHELL_ART.colorOf(shell(3), ART_PALETTE)).toBe(INKS.body);
  });

  it("brings its body, and its pips for 2 hits and for 3, to the atlas", () => {
    expect(
      SHELL_ART.frames(ART_PALETTE, ART_SCALE).map(({ name }) => name),
    ).toEqual([FRAMES.shellBody, FRAMES.shell(2), FRAMES.shell(3)]);
  });
});

describe("a shell brick at 31 CSS pixels a unit, 2 to one", () => {
  const frame = framesAt(ART_SCALE);
  const body = frame(FRAMES.shellBody);

  it("draws its tile in its shell's color", () => {
    expect(roundRectsIn(body, INKS.body)).toHaveLength(1);
  });

  it("draws its core in its face's color, its edges on whole pixels", () => {
    expect(coreOf(body)).toEqual({
      kind: "roundRect",
      x: 11,
      y: 11,
      width: 40,
      height: 36,
      radius: 0.07 * CELL,
      color: INKS.face,
    });
  });

  it("cuts its bolt out of its core in its glyph's color", () => {
    expect(boltOf(body).points).toEqual(
      [
        [0.488, 0.25],
        [0.575, 0.25],
        [0.521, 0.37],
        [0.593, 0.37],
        [0.455, 0.55],
        [0.494, 0.418],
        [0.416, 0.418],
      ].map(([x = 0, y = 0]) => ({ x: x * CELL, y: y * CELL })),
    );
  });

  it.each([
    [2, [0.4325, 0.5675]],
    [3, [0.365, 0.5, 0.635]],
  ] as const)(
    "cuts %i pips out of its core in a row under its bolt",
    (hits, across) => {
      expect(
        circlesIn(frame(FRAMES.shell(hits)), INKS.glyph).map((pip) => ({
          ...pip,
          x: billionths(pip.x),
        })),
      ).toEqual(
        across.map((x) => ({
          kind: "circle",
          x: billionths(x * CELL),
          y: 0.655 * CELL,
          radius: 0.044 * CELL,
          color: INKS.glyph,
        })),
      );
    },
  );
});

describe.each(PIXEL_RATIOS)(
  "a shell brick at every unit from 24 CSS pixels to 128 device pixels, %f to one",
  (pixelRatio) => {
    const looks = everyScale(pixelRatio).map((scale) => {
      const frame = framesAt(scale);
      const body = frame(FRAMES.shellBody);
      return {
        unit: scale.unit,
        core: coreOf(body),
        bolt: boltOf(body),
        pips: THICK_HITS.flatMap((hits) =>
          circlesIn(frame(FRAMES.shell(hits)), INKS.glyph),
        ),
      };
    });

    it("lays its core's edges on whole pixels", () => {
      expect(
        looks
          .filter(
            ({ core }) =>
              ![core.x, core.y, core.width, core.height].every(
                Number.isInteger,
              ),
          )
          .map(({ unit }) => unit),
      ).toEqual([]);
    });

    it("keeps its bolt a device pixel inside its core at least", () => {
      expect(
        looks
          .filter(({ core, bolt }) =>
            bolt.points.some(
              ({ x, y }) =>
                x < core.x + 1 ||
                y < core.y + 1 ||
                x > core.x + core.width - 1 ||
                y > core.y + core.height - 1,
            ),
          )
          .map(({ unit }) => unit),
      ).toEqual([]);
    });

    it("keeps each pip a device pixel inside its core at least", () => {
      expect(
        looks
          .filter(({ core, pips }) =>
            pips.some((pip) => insideBy(pip, core) < 1),
          )
          .map(({ unit }) => unit),
      ).toEqual([]);
    });

    it("keeps each pip a device pixel below its bolt at least", () => {
      expect(
        looks
          .filter(({ bolt, pips }) => {
            const foot = Math.max(...bolt.points.map(({ y }) => y));
            return pips.some((pip) => pip.y - pip.radius - foot < 1);
          })
          .map(({ unit }) => unit),
      ).toEqual([]);
    });
  },
);
