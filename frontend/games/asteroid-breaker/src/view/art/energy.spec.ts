import { ROCK_KIND_IDS } from "../../rules/catalog/rocks";
import { ROCK_OUTLINES } from "../../rules/rocks/rocks";
import { ROCK_RADIUS } from "../../rules/tuning";
import { ART_PALETTE } from "../../testing/art_frames";
import { ROLES } from "../../testing/roles";
import { beltPalette } from "../colors/palette";
import { MOST_ROCK_HALOS, haloAlpha, rockHalos, roundHalo } from "./energy";
import { rockShape, sizesOf } from "./rock_art";

/** A dark palette, the specs' roles in its mode. */
const DARK = beltPalette(ROLES, "dark");

/** Returns a number rounded to nine places, as a spec compares one worked out two ways. */
function rounded(value: number): number {
  return Math.round(value * 1e9) / 1e9;
}

describe("roundHalo", () => {
  it("reaches as far along a thing's way as across it, about its middle", () => {
    expect(roundHalo(2, 0.7)).toEqual({
      along: 2,
      across: 2,
      ahead: 0,
      turn: 0,
      strength: 0.7,
    });
  });
});

describe("haloAlpha", () => {
  it.each([
    ["light", ART_PALETTE, 0.5, 0.31],
    ["dark", DARK, 0.5, 0.5],
  ] as const)(
    "shows a halo in a %s palette at its strength times the palette's",
    (_, palette, strength, alpha) => {
      expect(haloAlpha(strength, palette)).toBeCloseTo(alpha, 9);
    },
  );

  it.each([
    [1.4, 1],
    [-0.2, 0],
  ])("holds a strength of %f to what an image shows, %f", (strength, alpha) => {
    expect(haloAlpha(strength, DARK)).toBe(alpha);
  });
});

describe("rockHalos", () => {
  it("gives a crystal a halo where its gems glow, as far as they glow, in field units", () => {
    const rock = { kind: "crystal", size: "large", outline: 2 } as const;
    const [glow] = rockShape(rock).glows;
    const radius = ROCK_RADIUS.large;

    const [halo] = rockHalos(rock);

    expect(halo).toEqual({
      tone: "gem",
      along: (glow?.r ?? 0) * radius,
      across: (glow?.r ?? 0) * radius,
      ahead: Math.hypot(glow?.at.x ?? 0, glow?.at.y ?? 0) * radius,
      turn: Math.atan2(glow?.at.y ?? 0, glow?.at.x ?? 0),
      strength: glow?.strength,
    });
  });

  it("lays a crystal's halo where its gems glow, at its distance and way from the rock's middle", () => {
    const rock = { kind: "crystal", size: "medium", outline: 4 } as const;
    const [glow] = rockShape(rock).glows;
    const radius = ROCK_RADIUS.medium;

    const [halo] = rockHalos(rock);

    expect([
      rounded(Math.cos(halo?.turn ?? 0) * (halo?.ahead ?? 0)),
      rounded(Math.sin(halo?.turn ?? 0) * (halo?.ahead ?? 0)),
    ]).toEqual([
      rounded((glow?.at.x ?? 0) * radius),
      rounded((glow?.at.y ?? 0) * radius),
    ]);
  });

  it("gives a volatile rock two halos about its middle, its core's glow and its heart's", () => {
    const halos = rockHalos({ kind: "volatile", size: "medium", outline: 0 });

    expect(
      halos.map(({ tone, ahead, along, strength }) => [
        tone,
        ahead,
        along,
        strength,
      ]),
    ).toEqual([
      ["core", 0, 1.25 * ROCK_RADIUS.medium, 0.55],
      ["core", 0, 0.42 * ROCK_RADIUS.medium, 0.9],
    ]);
  });

  it.each(["stone", "ice", "iron", "lodestone", "boulder"] as const)(
    "gives a %s rock none",
    (kind) => {
      expect(
        rockHalos({ kind, size: sizesOf(kind)[0] ?? "small", outline: 0 }),
      ).toEqual([]);
    },
  );
});

describe("MOST_ROCK_HALOS", () => {
  it("is as many halos as the rock that gives off the most", () => {
    const counts = ROCK_KIND_IDS.flatMap((kind) =>
      sizesOf(kind).flatMap((size) =>
        Array.from(
          { length: ROCK_OUTLINES },
          (_, outline) => rockHalos({ kind, size, outline }).length,
        ),
      ),
    );

    expect(MOST_ROCK_HALOS).toBe(Math.max(...counts));
  });
});
