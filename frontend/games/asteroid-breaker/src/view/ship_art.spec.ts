import { SHIP_LENGTH } from "../rules/tuning";
import { ART_PALETTE, ART_SCALE, frameNamed } from "../testing/art_frames";
import {
  FLAME_BEHIND,
  SHIP_FRAMES,
  WINDOW,
  flameShare,
  flameTip,
} from "./ship_art";

describe("the ship's frame", () => {
  const ship = frameNamed(SHIP_FRAMES.ship);

  it("sets a fin on each side of the ship's line, its left first", () => {
    const [left, right] = ship.commands
      .filter((command) => command.color === ART_PALETTE.accent)
      .map((command) =>
        command.kind === "polygon"
          ? Math.sign(
              command.points.reduce((sum, { y }) => sum + y, 0) /
                command.points.length -
                ship.height / 2,
            )
          : 0,
      );

    expect([left, right]).toEqual([-1, 1]);
  });

  it("spans the ship's length, from its fins' tips to its nose", () => {
    const xs = ship.commands
      .filter((command) => command.color === ART_PALETTE.accent)
      .flatMap((command) => (command.kind === "polygon" ? command.points : []))
      .map(({ x }) => x);

    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(
      SHIP_LENGTH * ART_SCALE.unit,
    );
  });

  it("outlines each fin and the hull in the outline's color, then fills it in the accent", () => {
    expect(ship.commands.slice(0, 6).map((command) => command.color)).toEqual([
      ART_PALETTE.outline,
      ART_PALETTE.accent,
      ART_PALETTE.outline,
      ART_PALETTE.accent,
      ART_PALETTE.outline,
      ART_PALETTE.accent,
    ]);
  });

  it("draws the window in the field's color, where the pilot sits", () => {
    expect(ship.commands.at(-1)).toEqual({
      kind: "circle",
      x: ship.width / 2 + WINDOW.x * ART_SCALE.unit,
      y: ship.height / 2,
      radius: WINDOW.radius * ART_SCALE.unit,
      color: ART_PALETTE.field,
    });
  });
});

describe("the flame", () => {
  it("draws the flame in its color, its base the frame's middle and its tip behind", () => {
    const flame = frameNamed(SHIP_FRAMES.flame);
    const [shape] = flame.commands;
    const xs = shape?.kind === "polygon" ? shape.points.map(({ x }) => x) : [];

    expect({
      color: shape?.color,
      base: Math.max(...xs),
      // Within a pixel of the frame's edge, as a frame is whole pixels.
      tip: Math.round(Math.min(...xs)),
    }).toEqual({ color: ART_PALETTE.flame, base: flame.width / 2, tip: 0 });
  });

  it("sits behind the ship's middle", () => {
    expect(FLAME_BEHIND).toBeGreaterThan(0);
  });

  it.each([
    [0, 0.55 / 1.6],
    [0.5, (0.55 + 0.525) / 1.6],
    [1, 1],
  ])(
    "draws the flame at a thrust of %f a share %f of its frame",
    (thrust, share) => {
      expect(flameShare(thrust)).toBeCloseTo(share);
    },
  );

  it("ends the flame a little behind its base at no thrust", () => {
    expect(flameTip(0)).toBeCloseTo(FLAME_BEHIND + (0.55 * SHIP_LENGTH) / 2.37);
  });

  it("ends it its whole length behind its base at full thrust", () => {
    expect(flameTip(1)).toBeCloseTo(FLAME_BEHIND + (1.6 * SHIP_LENGTH) / 2.37);
  });
});

describe("the ship's rings", () => {
  it("dashes the guard's ring in the accent", () => {
    const guard = frameNamed(SHIP_FRAMES.guard);

    expect({
      dashes: guard.commands.length > 10,
      colors: new Set(guard.commands.map((command) => command.color)),
    }).toEqual({ dashes: true, colors: new Set([ART_PALETTE.accent]) });
  });

  it("rings the Shield in the accent", () => {
    expect(frameNamed(SHIP_FRAMES.shield).commands).toMatchObject([
      { kind: "ring", color: ART_PALETTE.accent },
    ]);
  });
});
