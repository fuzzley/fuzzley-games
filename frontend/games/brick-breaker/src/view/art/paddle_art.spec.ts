import { type ArtFrame, type DrawCommand, extentOf } from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { PADDLE_HEIGHT } from "../../rules/tuning";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  FIELD_SCALES,
  SMALL_SCALE,
} from "../../testing/art_frames";
import {
  MOST_HOOKS,
  PADDLE_FRAMES,
  WIDEST_PADDLE,
  hookCount,
  paddleFrames,
  paddleShape,
} from "./paddle_art";

/** The paddle's shape at the scale the specs draw at. */
const SHAPE = paddleShape(ART_SCALE);

/** Returns a frame's middle, the point the scene puts it at. */
function middleOf(frame: ArtFrame): { x: number; y: number } {
  return { x: frame.width / 2, y: frame.height / 2 };
}

/** Returns where what a command draws starts and ends down a frame. */
function rowsOf(command: DrawCommand | undefined): readonly number[] {
  if (!command) return [];
  const { y, height } = extentOf(command);
  return [y, y + height];
}

describe("paddleShape", () => {
  it.each(FIELD_SCALES)(
    "makes the paddle as tall as the rules', its lip 11 of the kit's 75 of it, in whole device pixels, at a unit of $unit",
    (scale) => {
      const { height, lip } = paddleShape(scale);

      expect({ height, lip }).toEqual({
        height: Math.round(PADDLE_HEIGHT * scale.unit),
        lip: Math.round((height * 11) / 75),
      });
    },
  );

  it("starts the body 0.95 of a cap's radius in from each end, its pad 9 of the kit's 75 in from that", () => {
    expect({ inner: SHAPE.inner, padInset: SHAPE.pad.inset }).toEqual({
      inner: (0.95 * SHAPE.bar) / 2,
      padInset: (9 * SHAPE.height) / 75,
    });
  });

  it("stands the hooks twice as far apart where a brick is too small for its finest detail", () => {
    const small = paddleShape(SMALL_SCALE);

    expect(small.hooks.pitch / small.height).toBeCloseTo(
      (2 * SHAPE.hooks.pitch) / SHAPE.height,
    );
  });
});

describe("hookCount", () => {
  it("stands the kit's seventeen hooks along a paddle of its first width", () => {
    expect(hookCount(4 * ART_SCALE.unit, SHAPE)).toBe(17);
  });

  it("stands none on a paddle too short for its margins", () => {
    expect(hookCount(2 * SHAPE.inner, SHAPE)).toBe(0);
  });

  it("stands an odd number, so each stands where it stood as the paddle widens, and they come and go in pairs", () => {
    const pitch = SHAPE.hooks.pitch;
    const counts = Array.from({ length: 40 }, (_, i) =>
      hookCount(4 * ART_SCALE.unit + (i * pitch) / 4, SHAPE),
    );

    expect(new Set(counts.map((count) => count % 2))).toEqual(new Set([1]));
  });

  it(`stands ${String(MOST_HOOKS)} at most, however wide the paddle`, () => {
    expect(hookCount(1e6, SHAPE)).toBe(MOST_HOOKS);
  });

  it.each(FIELD_SCALES)(
    "stands a hook in every place the widest paddle has, at a unit of $unit",
    (scale) => {
      const shape = paddleShape(scale);

      expect(
        hookCount(Math.round(WIDEST_PADDLE * scale.unit), shape),
      ).toBeLessThan(MOST_HOOKS);
    },
  );
});

describe("the paddle's frames", () => {
  const names = new Set(ART_FRAMES.map((frame) => frame.name));

  it.each(Object.values(PADDLE_FRAMES))("holds the %s's frame", (name) => {
    expect(names.has(name)).toBe(true);
  });

  it("draws an end as its cap over its lip, about the cap's middle, a bolt in it toward the outer side", () => {
    const end = frameNamed(ART_FRAMES, PADDLE_FRAMES.end);
    const { x, y } = middleOf(end);
    const radius = SHAPE.bar / 2;

    expect(end.commands).toMatchObject([
      {
        kind: "circle",
        x,
        y: y + SHAPE.lip,
        radius,
        color: ART_PALETTE.paddleInks.lip,
      },
      { kind: "circle", x, y, radius, color: ART_PALETTE.paddleInks.cap },
      {
        kind: "circle",
        x: x + (0.55 - 1) * radius,
        y,
        color: ART_PALETTE.mark,
      },
    ]);
  });

  it("leaves out an end's bolt where a brick is too small for its finest detail", () => {
    const end = frameNamed(
      paddleFrames(ART_PALETTE, SMALL_SCALE),
      PADDLE_FRAMES.end,
    );

    expect(drawnIn(end, "circle", ART_PALETTE.mark)).toEqual([]);
  });

  it("stands a cannon's barrel up from its base, which straddles the paddle's top", () => {
    const cannon = frameNamed(ART_FRAMES, PADDLE_FRAMES.cannon);
    const top = middleOf(cannon).y;
    const [barrel] = drawnIn(
      cannon,
      "roundRect",
      ART_PALETTE.paddleInks.cannon,
    );
    const [base] = drawnIn(cannon, "roundRect", ART_PALETTE.paddleInks.lip);
    const [baseTop = NaN, baseFoot = NaN] = rowsOf(base);

    expect({
      barrelAbove: (rowsOf(barrel)[0] ?? NaN) < baseTop,
      straddles: baseTop < top && baseFoot > top,
      baseLast: cannon.commands.at(-1) === base,
    }).toEqual({ barrelAbove: true, straddles: true, baseLast: true });
  });

  it.each([ART_SCALE, SMALL_SCALE])(
    "draws a hook in the hooks' ink, a CSS pixel wide at least, rising from inside the bar to past the paddle's top, at a unit of $unit",
    (scale) => {
      const hook = frameNamed(
        paddleFrames(ART_PALETTE, scale),
        PADDLE_FRAMES.hook,
      );
      const top = middleOf(hook).y;
      const rows = hook.commands.flatMap(rowsOf);
      const lines = hook.commands.flatMap((command) =>
        command.kind === "line" ? [command] : [],
      );

      expect({
        colors: new Set(hook.commands.map((command) => command.color)),
        thin: lines.filter((line) => line.width < scale.pixelRatio),
        below: (lines[0]?.from.y ?? NaN) > top,
        above: Math.min(...rows) < top,
      }).toEqual({
        colors: new Set([ART_PALETTE.paddleInks.hook]),
        thin: [],
        below: true,
        above: true,
      });
    },
  );
});
