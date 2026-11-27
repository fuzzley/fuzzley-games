import { type ArtFrame, type DrawCommand, extentOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { KIND_IDS } from "../../rules/catalog/kinds";
import {
  ART_PALETTE,
  ART_SCALE,
  SMALLEST_SCALE,
  billionths,
} from "../../testing/art_frames";
import { BOLT_LENGTH, RING_RADIUS, STREAK_HEAD, fluffFrames } from "./fluff";
import { FRAMES } from "./frame_names";

/** The kit's frames in the specs' palette, at their scale, a device pixel to each of the design's units. */
const KIT = fluffFrames(ART_PALETTE, ART_SCALE);

/** Returns how far a drawing reaches across and down, to a billionth. */
function sizeOf(commands: readonly DrawCommand[]): {
  width: number;
  height: number;
} {
  const areas = commands.map(extentOf);
  const left = Math.min(...areas.map(({ x }) => x));
  const top = Math.min(...areas.map(({ y }) => y));
  return {
    width: billionths(
      Math.max(...areas.map(({ x, width }) => x + width)) - left,
    ),
    height: billionths(
      Math.max(...areas.map(({ y, height }) => y + height)) - top,
    ),
  };
}

/** Returns the colors a frame is drawn in. */
function colorsOf(frame: ArtFrame): ReadonlySet<number> {
  return new Set(frame.commands.map(({ color }) => color));
}

describe("fluffFrames", () => {
  it("draws a tuft of each kind, the ring, the streak, the bolt and the hand", () => {
    expect(KIT.map(({ name }) => name)).toEqual([
      ...KIND_IDS.map((kind) => FRAMES.tuft(kind)),
      FRAMES.ring,
      FRAMES.streak,
      FRAMES.bolt,
      FRAMES.hand,
    ]);
  });

  it.each(KIND_IDS)(
    "draws a %s tuft in its kind's ink, a strand 18 of the design's units long and 9.5 wide, its middle bowed 3.6 above its ends",
    (kind) => {
      const tuft = frameNamed(KIT, FRAMES.tuft(kind));

      expect({
        colors: colorsOf(tuft),
        size: sizeOf(tuft.commands),
      }).toEqual({
        colors: new Set([ART_PALETTE.kinds[kind]]),
        size: { width: 18 + 9.5, height: 9.5 + 3.6 },
      });
    },
  );

  it("draws the ring in white, for a tint, a square in radius and its line 6 of the design's units wide", () => {
    expect(frameNamed(KIT, FRAMES.ring).commands).toEqual([
      expect.objectContaining({
        kind: "ring",
        radius: RING_RADIUS * ART_SCALE.unit,
        width: 6,
        color: 0xffffff,
      }),
    ]);
  });

  it("draws the ring's line a CSS pixel wide at least at its frame's radius, at a square too small for its own", () => {
    const [line] = frameNamed(
      fluffFrames(ART_PALETTE, { unit: 20, pixelRatio: 2 }),
      FRAMES.ring,
    ).commands;

    expect(line).toMatchObject({ width: 2 });
  });

  it("draws the streak in white, its round head ahead of its frame's middle as far as STREAK_HEAD says, its tail trailing 3.4 squares and fading, its frame as wide as it in whole pixels", () => {
    const streak = frameNamed(KIT, FRAMES.streak);
    const head = streak.commands.at(-1);
    const tail = streak.commands.slice(0, -1);
    const alphas = tail.map(({ alpha }) => alpha ?? 1);

    expect({
      colors: colorsOf(streak),
      head:
        head?.kind === "circle"
          ? { ahead: head.x - streak.width / 2, radius: head.radius }
          : null,
      trails: sizeOf(tail).width,
      fades: alphas.every((alpha, i) => i === 0 || alpha < alphas[i - 1]!),
      frame: streak.width,
    }).toEqual({
      colors: new Set([0xffffff]),
      head: { ahead: STREAK_HEAD * ART_SCALE.unit, radius: 25 },
      trails: 340,
      fades: true,
      frame: 340 + 25 + 1,
    });
  });

  it("draws the bolt BOLT_LENGTH squares long, zigzagging either side of its line in turn, in the sparks' color with a core of the frizzball's", () => {
    const bolt = frameNamed(KIT, FRAMES.bolt);
    const corners = bolt.commands.flatMap((command) =>
      command.kind === "circle" && command.color === ART_PALETTE.spark
        ? [Math.sign(billionths(command.y - bolt.height / 2))]
        : [],
    );

    expect({
      colors: colorsOf(bolt),
      length: sizeOf(
        bolt.commands.filter(({ color }) => color === ART_PALETTE.spark),
      ).width,
      corners,
    }).toEqual({
      colors: new Set([ART_PALETTE.spark, ART_PALETTE.frizzball.body]),
      length: BOLT_LENGTH * ART_SCALE.unit + 13.3,
      corners: [0, -1, 1, -1, 1, 0],
    });
  });

  it("draws the hand a fingertip 0.6 of a square across, in the marks' color over a rim in the page's", () => {
    const hand = frameNamed(KIT, FRAMES.hand);
    const tip = hand.commands.at(-1);

    expect({
      tip: tip === undefined ? null : sizeOf([tip]),
      tipColor: tip?.color,
      rim: new Set(hand.commands.slice(0, -1).map(({ color }) => color)),
    }).toEqual({
      tip: { width: 60, height: 60 },
      tipColor: ART_PALETTE.marks,
      rim: new Set([ART_PALETTE.page]),
    });
  });

  it("draws every line of the kit and the hand a CSS pixel wide at least, at the smallest square", () => {
    const widths = fluffFrames(ART_PALETTE, SMALLEST_SCALE).flatMap(
      ({ commands }) =>
        commands.flatMap((command) =>
          command.kind === "line" || command.kind === "ring"
            ? [command.width]
            : [],
        ),
    );

    expect(Math.min(...widths)).toBeGreaterThanOrEqual(
      Math.ceil(SMALLEST_SCALE.pixelRatio),
    );
  });
});
