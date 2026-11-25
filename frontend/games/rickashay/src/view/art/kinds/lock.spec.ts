import { TINT } from "@fz/brick-wall/view/inks";
import type {
  ArtFrame,
  ArtScale,
  CircleCommand,
  RoundRectCommand,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  billionths,
  scalesAt,
} from "../../../testing/art_frames";
import { brickColor } from "../../colors/brick_colors";
import type { KindLook } from "../art";
import { BOLTS, FRAMES, LOCK_LOOKS } from "../frames";
import { lockTint } from "../lock_tint";
import { PLAIN_ART } from "./brick";
import { LOCK_ART } from "./lock";

/** The marks' color, which the slots and the keyholes are cut out in. */
const MARK = ART_PALETTE.mark;

/** The bolts' steel. */
const STEEL = ART_PALETTE.steel;

/** A cell at the specs' scale, 62 device pixels a side. */
const SIDE = 62;

/** Every look of a lock, each with its bolts and how many of them are shut. */
const LOOKS = BOLTS.flatMap((bolts) =>
  LOCK_LOOKS[bolts].map((look, shut) => ({ look, bolts, shut })),
);

/** Returns a lock's look as its art reads it: its tint, its bolts with as many as given drawn back. */
function lock(bolts: number, drawn = 0): KindLook {
  return { tint: lockTint(bolts, drawn), hits: 1, full: 1, plates: 0 };
}

/** Returns the lock's frames at a scale, by name. */
function framesAt(scale: ArtScale): (name: string) => ArtFrame {
  const frames = LOCK_ART.frames(ART_PALETTE, scale);
  return (name) => frameNamed(frames, name);
}

/** Returns the rounded rectangles a frame fills in a color, top first. */
function barsIn(frame: ArtFrame, color: number): readonly RoundRectCommand[] {
  return frame.commands.filter(
    (command): command is RoundRectCommand =>
      command.kind === "roundRect" && command.color === color,
  );
}

/** Returns the circles a frame fills in the marks' color, its keyholes. */
function keyholesIn(frame: ArtFrame): readonly CircleCommand[] {
  return frame.commands.filter(
    (command): command is CircleCommand =>
      command.kind === "circle" && command.color === MARK,
  );
}

/** Returns a rounded rectangle as its edges and its corners' radius, to a billionth of a pixel. */
function edgesOf({ x, y, width, height, radius }: RoundRectCommand): number[] {
  return [x, y, x + width, y + height, radius].map(billionths);
}

describe("LOCK_ART's layers", () => {
  const tile = FRAMES.tile(TINT.violet);

  it.each([
    [1, 0, "1-1"],
    [1, 1, "1-0"],
    [2, 0, "2-2"],
    [2, 1, "2-1"],
    [2, 2, "2-0"],
    [3, 0, "3-3"],
    [3, 1, "3-2"],
    [3, 2, "3-1"],
    [3, 3, "3-0"],
  ] as const)(
    "shows a lock of %i bolts, %i of them drawn back, as the violet tile and the look %s",
    (bolts, drawn, look) => {
      expect(LOCK_ART.layersOf(lock(bolts, drawn))).toEqual([
        tile,
        FRAMES.lock(look),
      ]);
    },
  );

  it("shows a lock of fewer bolts than are drawn open", () => {
    expect(LOCK_ART.layersOf(lock(1, 3))).toEqual([tile, FRAMES.lock("1-0")]);
  });

  it("finds a lock's layers without making them", () => {
    expect(LOCK_ART.layersOf(lock(2, 1))).toBe(LOCK_ART.layersOf(lock(2, 1)));
  });

  // A tint of 0 or 4 gives a lock no bolts, and 9 one bolt with 2 back.
  it.each([0, 4, 9, 19])(
    "throws for a lock of the tint %i, whose look no frame shows",
    (tint) => {
      expect(() =>
        LOCK_ART.layersOf({ tint, hits: 1, full: 1, plates: 0 }),
      ).toThrow(RangeError);
    },
  );

  it("stands it on a tile in the lock's own color, which its shards take", () => {
    const [layer] = LOCK_ART.layersOf(lock(2));

    const [, body] = frameNamed(
      PLAIN_ART.frames(ART_PALETTE, ART_SCALE),
      layer ?? "",
    ).commands;

    expect(body?.color).toBe(
      brickColor({ kind: "lock", tint: 2 }, ART_PALETTE),
    );
  });
});

describe("LOCK_ART's frames", () => {
  it("brings every look of a lock of 1, 2 and 3 bolts to the atlas", () => {
    expect(
      LOCK_ART.frames(ART_PALETTE, ART_SCALE).map(({ name }) => name),
    ).toEqual(LOOKS.map(({ look }) => FRAMES.lock(look)));
  });
});

describe("a lock at 31 CSS pixels a unit, 2 to one", () => {
  const frame = framesAt(ART_SCALE);

  it.each([
    [1, [[9, 25, 53, 35, 5]]],
    [
      2,
      [
        [9, 17, 53, 27, 5],
        [9, 33, 53, 43, 5],
      ],
    ],
    [
      3,
      [
        [9, 11, 53, 21, 5],
        [9, 25, 53, 35, 5],
        [9, 38, 53, 48, 5],
      ],
    ],
  ] as const)(
    "cuts a slot for each of a lock of %i bolts out of its tile in the marks' color, across it, top first, round at its ends",
    (bolts, slots) => {
      expect(
        barsIn(frame(FRAMES.lock(`${bolts}-0`)), MARK).map(edgesOf),
      ).toEqual(slots);
    },
  );

  it("shuts each bolt in its slot, a rim of 2 pixels of the slot round it, in steel, round at its ends", () => {
    expect(barsIn(frame(FRAMES.lock("2-2")), STEEL).map(edgesOf)).toEqual([
      [11, 19, 51, 25, 3],
      [11, 35, 51, 41, 3],
    ]);
  });

  it("leaves each slot empty once its bolt is drawn back", () => {
    expect(barsIn(frame(FRAMES.lock("2-0")), STEEL)).toEqual([]);
  });

  it("draws the top bolts back first, the rest still shut", () => {
    expect(barsIn(frame(FRAMES.lock("3-1")), STEEL).map(edgesOf)).toEqual([
      [11, 40, 51, 46, 3],
    ]);
  });

  it("cuts a keyhole out of each shut bolt, near its left end, and none out of a bolt drawn back", () => {
    expect(
      keyholesIn(frame(FRAMES.lock("3-2"))).map(({ x, y, radius }) =>
        [x, y, radius].map(billionths),
      ),
    ).toEqual([
      [billionths(0.3 * SIDE), 30, billionths(0.026 * SIDE)],
      [billionths(0.3 * SIDE), 43, billionths(0.026 * SIDE)],
    ]);
  });
});

describe.each(PIXEL_RATIOS)(
  "a lock at every unit from 24 CSS pixels to 128 device pixels, %f to one",
  (pixelRatio) => {
    const drawn = scalesAt(pixelRatio).flatMap((scale) => {
      const frame = framesAt(scale);
      return LOOKS.map(({ look, bolts, shut }) => {
        const art = frame(FRAMES.lock(look));
        return {
          name: `${look} at ${String(scale.unit)}`,
          bolts,
          shut,
          slots: barsIn(art, MARK),
          bars: barsIn(art, STEEL),
          keyholes: keyholesIn(art),
          detailed: scale.unit / pixelRatio >= 30,
        };
      });
    });

    it("lays every slot and bolt on whole device pixels", () => {
      expect(
        drawn
          .filter(({ slots, bars }) =>
            [...slots, ...bars].some(({ x, y, width, height }) =>
              [x, y, width, height].some((edge) => !Number.isInteger(edge)),
            ),
          )
          .map(({ name }) => name),
      ).toEqual([]);
    });

    it("cuts a slot for each bolt, the top ones empty once drawn back, a bolt shut in each of the rest", () => {
      expect(
        drawn
          .filter(
            ({ bolts, shut, slots, bars }) =>
              slots.length !== bolts || bars.length !== shut,
          )
          .map(({ name }) => name),
      ).toEqual([]);
    });

    it("keeps each shut bolt in its slot, the lowest slots, a device pixel of the slot round it at least", () => {
      expect(
        drawn
          .filter(({ slots, bars }) =>
            bars.some((bolt, at) => {
              const slot = slots[slots.length - bars.length + at];
              return (
                !slot ||
                bolt.x - slot.x < 1 ||
                bolt.y - slot.y < 1 ||
                slot.x + slot.width - (bolt.x + bolt.width) < 1 ||
                slot.y + slot.height - (bolt.y + bolt.height) < 1
              );
            }),
          )
          .map(({ name }) => name),
      ).toEqual([]);
    });

    it("keeps the slots a device pixel apart at least", () => {
      expect(
        drawn
          .filter(({ slots }) =>
            slots.some((slot, at) => {
              const next = slots[at + 1];
              return next !== undefined && next.y - (slot.y + slot.height) < 1;
            }),
          )
          .map(({ name }) => name),
      ).toEqual([]);
    });

    it("cuts a keyhole out of each shut bolt, inside it, only at 30 CSS pixels a unit or more", () => {
      expect(
        drawn
          .filter(
            ({ bars, keyholes, shut, detailed }) =>
              keyholes.length !== (detailed ? shut : 0) ||
              keyholes.some(({ x, y, radius }, at) => {
                const bolt = bars[at];
                return (
                  !bolt ||
                  x - radius < bolt.x ||
                  x + radius > bolt.x + bolt.width ||
                  y - radius < bolt.y ||
                  y + radius > bolt.y + bolt.height
                );
              }),
          )
          .map(({ name }) => name),
      ).toEqual([]);
    });
  },
);
