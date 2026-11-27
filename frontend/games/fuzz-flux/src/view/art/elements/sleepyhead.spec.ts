import {
  type Area,
  type ArtFrame,
  type DrawCommand,
  ORIGIN,
  type Point,
  extentOf,
  shifted,
} from "@fz/phaser/shapes";
import {
  ART_PALETTE,
  ART_SCALE,
  billionths,
} from "../../../testing/art_frames";
import { BODY, SQUARE } from "../design_square";
import { HOUSE_EYES, eyesDrawing } from "../eyes";
import { FRAMES } from "../frame_names";
import { sleepyheadFrame } from "./sleepyhead";

/** The sleepyhead in the specs' palette, at their scale. */
const SLEEPYHEAD = sleepyheadFrame(ART_PALETTE, ART_SCALE);

/** How far below the frame's middle the sleepyhead's body sits, in its radii. */
const SEAT_DOWN = 0.2;

/** A body's radius in the frame's device pixels. */
const RADIUS = (BODY / SQUARE) * ART_SCALE.unit;

/** Returns where a shape lies from the frame's middle, in a body's radii, each to a billionth. */
function inRadii(command: DrawCommand): Area {
  const { x, y, width, height } = extentOf(command);
  return {
    x: billionths((x - SLEEPYHEAD.width / 2) / RADIUS),
    y: billionths((y - SLEEPYHEAD.height / 2) / RADIUS),
    width: billionths(width / RADIUS),
    height: billionths(height / RADIUS),
  };
}

/** Returns a frame's shapes in a color. */
function shapesIn(frame: ArtFrame, color: number): readonly DrawCommand[] {
  return frame.commands.filter((command) => command.color === color);
}

/**
 * Returns the strands of the sleepyhead's coat, each as the middles of its
 * round joints from its root to its tip, in a body's radii from the body's
 * middle: the runs of small circles in its body's color.
 */
function coatStrands(): readonly (readonly Point[])[] {
  const strands: Point[][] = [];
  let joined = false;
  for (const command of shapesIn(SLEEPYHEAD, ART_PALETTE.sleepyhead.body)) {
    const { x, y, width, height } = inRadii(command);
    const isJoint = command.kind === "circle" && width < 1;
    if (isJoint && !joined) {
      strands.push([]);
    }
    if (isJoint) {
      strands.at(-1)?.push({ x: x + width / 2, y: y + height / 2 - SEAT_DOWN });
    }
    joined = isJoint;
  }
  return strands;
}

/** Returns the circles among a frame's shapes in a color, from the largest. */
function circlesIn(frame: ArtFrame, color: number): readonly Area[] {
  return shapesIn(frame, color)
    .filter(({ kind }) => kind === "circle")
    .map(inRadii)
    .sort((a, b) => b.width - a.width);
}

describe("sleepyheadFrame", () => {
  it("names its frame the sleepyhead's", () => {
    expect(SLEEPYHEAD.name).toBe(FRAMES.sleepyhead);
  });

  it("draws it in its gray-blue, its nightcap a shade darker, the cap's trim in the palette's, and its eyes in the house fuzzball's ink", () => {
    expect(new Set(SLEEPYHEAD.commands.map(({ color }) => color))).toEqual(
      new Set([
        ART_PALETTE.sleepyhead.body,
        ART_PALETTE.sleepyhead.nightcap,
        ART_PALETTE.nightcapTrim,
        HOUSE_EYES.color,
      ]),
    );
  });

  it("sits its body, a fuzzball's size, a fifth of its radius below its square's middle", () => {
    expect(circlesIn(SLEEPYHEAD, ART_PALETTE.sleepyhead.body)[0]).toEqual({
      x: -1,
      y: -0.8,
      width: 2,
      height: 2,
    });
  });

  it("droops its coat, every tip round its lower half reaching further out than any round its upper half", () => {
    const reachOf = (strand: readonly Point[]): number =>
      Math.hypot(strand.at(-1)?.x ?? 0, strand.at(-1)?.y ?? 0);
    const strands = coatStrands();
    const lower = strands.filter(([root]) => (root?.y ?? 0) > 0);
    const upper = strands.filter(([root]) => (root?.y ?? 0) < 0);

    expect(Math.min(...lower.map(reachOf))).toBeGreaterThan(
      Math.max(...upper.map(reachOf)),
    );
  });

  it("carries each tip of its coat's 22 strands round toward its bottom, clockwise round its right half and counterclockwise round its left", () => {
    const carried = coatStrands().map((strand) => {
      const root = strand[0] ?? ORIGIN;
      const tip = strand.at(-1) ?? ORIGIN;
      return Math.sign(root.x * tip.y - root.y * tip.x) === Math.sign(root.x);
    });

    expect(carried).toEqual(Array.from({ length: 22 }, () => true));
  });

  it("flops its nightcap over to the right, from its brim across its body's top up to a tip past its right edge", () => {
    const [cap] = shapesIn(SLEEPYHEAD, ART_PALETTE.sleepyhead.nightcap).map(
      inRadii,
    );

    expect({
      left: cap?.x,
      right: billionths((cap?.x ?? 0) + (cap?.width ?? 0)),
      brim: billionths((cap?.y ?? 0) + (cap?.height ?? 0)),
    }).toEqual({ left: -0.86, right: 1.16, brim: -0.3 });
  });

  it("trims its nightcap with a band along its brim, end to end, and a pompom at its tip", () => {
    const [pompom, ...band] = circlesIn(SLEEPYHEAD, ART_PALETTE.nightcapTrim);
    const middle = ({
      x,
      y,
      width,
      height,
    }: Area): Point & { width: number } => ({
      x: billionths(x + width / 2),
      y: billionths(y + height / 2),
      width,
    });

    expect({
      pompom,
      bandEnds: [band[0], band.at(-1)].map((end) =>
        end === undefined ? null : middle(end),
      ),
    }).toEqual({
      pompom: { x: 0.98, y: -1.36, width: 0.44, height: 0.44 },
      bandEnds: [
        { x: -0.9, y: -0.28, width: 0.24 },
        { x: 0.9, y: -0.28, width: 0.24 },
      ],
    });
  });

  it("shuts its eyes as the house fuzzball's are shut in a blink, lower on its body than a fuzzball's", () => {
    const blink = eyesDrawing("blink", HOUSE_EYES, ART_SCALE, 1);
    const down = (SEAT_DOWN + 0.219) * RADIUS;

    expect(shapesIn(SLEEPYHEAD, HOUSE_EYES.color).map(inRadii)).toEqual(
      blink
        .map((command) =>
          shifted(command, {
            x: SLEEPYHEAD.width / 2,
            y: SLEEPYHEAD.height / 2 + down,
          }),
        )
        .map(inRadii),
    );
  });

  it("draws the whole of it within its square", () => {
    expect(Math.max(SLEEPYHEAD.width, SLEEPYHEAD.height)).toBeLessThanOrEqual(
      ART_SCALE.unit,
    );
  });
});
