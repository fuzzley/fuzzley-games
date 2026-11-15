import {
  type ArtFrame,
  type DrawCommand,
  type Point,
  placed,
  widthOf,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { THEMES } from "@fz/style/themes";
import { contrast, rgbOf } from "@fz/style/testing";
import { FIELD_ROLES } from "../../app/board/field_roles";
import { ROCK_KIND_IDS } from "../../rules/catalog/rocks";
import { WEAPON_IDS } from "../../rules/catalog/weapons";
import { ROCK_OUTLINES } from "../../rules/rocks/rocks";
import { ROCK_RADIUS } from "../../rules/tuning";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  ART_SCALES,
  reachOf,
} from "../../testing/art_frames";
import { PALETTES, ROLES } from "../../testing/roles";
import { beltPalette } from "../colors/palette";
import { atlasFrames } from "./art";
import {
  MOST_ROCK_HALOS,
  MUZZLE_BEATS,
  MUZZLE_FRAME,
  MUZZLE_REACH,
  SHOTS,
  SHOT_FRAMES,
  SHOT_OUTLINE,
  SHOT_REACH,
  energyFrames,
  energyOf,
  haloAlpha,
  muzzleHalo,
  rockHalos,
  roundHalo,
} from "./energy";
import { isFine, rockShape, sizesOf } from "./rock_art";

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

/** How far a size may stray from what it should be and still pass, for a rounding. */
const SLACK = 1e-9;

/** Returns a point's place rounded to four places, as the kit's numbers are copied in. */
function toFour({
  x,
  y,
}: {
  readonly x: number;
  readonly y: number;
}): number[] {
  return [x, y].map((value) => Math.round(value * 1e4) / 1e4 + 0);
}

/** Returns what each of a frame's commands is, its color and how opaque it is. */
function looksOf(
  frame: ArtFrame,
): readonly (readonly [string, number, number])[] {
  return frame.commands.map(
    (command) => [command.kind, command.color, command.alpha ?? 1] as const,
  );
}

describe("energyOf", () => {
  it("draws a glowing thing on a light field in its own color, its middle sunk toward the field's text, as the kit does", () => {
    const palette = { ...ART_PALETTE, shot: 0x14171b };

    expect(energyOf(0x0b6bcb, palette)).toEqual({
      hot: 0x0f457c,
      body: 0x0b6bcb,
      halo: 0x0b6bcb,
    });
  });

  it("lifts a glowing thing on a dark field toward white, its middle nearly to it, as the kit does", () => {
    expect(energyOf(0x5aa9ff, DARK)).toEqual({
      hot: 0xe1f0ff,
      body: 0x7ebcff,
      halo: 0x5aa9ff,
    });
  });
});

describe("SHOTS", () => {
  it("cuts the gun's bolt and its middle as the kit does, round at the nose and flat at the back", () => {
    expect([SHOTS.gun.body.map(toFour), SHOTS.gun.core.map(toFour)]).toEqual([
      [
        [-0.42, -0.18],
        [0.34, -0.18],
        [0.43, -0.1559],
        [0.4959, -0.09],
        [0.52, 0],
        [0.4959, 0.09],
        [0.43, 0.1559],
        [0.34, 0.18],
        [-0.42, 0.18],
      ],
      [
        [-0.26, -0.085],
        [0.335, -0.085],
        [0.3775, -0.0736],
        [0.4086, -0.0425],
        [0.42, 0],
        [0.4086, 0.0425],
        [0.3775, 0.0736],
        [0.335, 0.085],
        [-0.26, 0.085],
      ],
    ]);
  });

  it("gives each weapon's shot a halo longer along its way than across it, a little ahead of it", () => {
    expect(
      WEAPON_IDS.map((weapon) => {
        const { along, across, ahead, strength } = SHOTS[weapon].halo;
        return [weapon, along, across, ahead, strength];
      }),
    ).toEqual([
      ["gun", 1.05, 0.62, 0.05, 0.95],
      ["spread", 0.8, 0.46, 0.04, 0.7],
      ["rapid", 0.72, 0.5, 0.05, 0.8],
      ["lance", 2, 0.56, 0.2, 0.9],
    ]);
  });
});

describe("a shot's frame", () => {
  /** Returns a frame's middle, where its drawing's origin lies. */
  function middleOf(frame: ArtFrame): Point {
    return { x: frame.width / 2, y: frame.height / 2 };
  }

  /** Returns points in field units laid about a frame's middle at the art's scale, rounded. */
  function laidOut(points: readonly Point[], frame: ArtFrame): number[][] {
    return placed(points, ART_SCALE.unit, middleOf(frame)).map(toFour);
  }

  /** Returns the points of a frame's polygons, in turn, rounded. */
  function polygonsOf(frame: ArtFrame): number[][][] {
    return frame.commands.flatMap((command) =>
      command.kind === "polygon" ? [command.points.map(toFour)] : [],
    );
  }

  /** Returns a frame's commands of a kind in a color. */
  function drawnAs<K extends DrawCommand["kind"]>(
    frame: ArtFrame,
    kind: K,
    color: number,
  ): Extract<DrawCommand, { kind: K }>[] {
    return frame.commands.filter(
      (command): command is Extract<DrawCommand, { kind: K }> =>
        command.kind === kind && command.color === color,
    );
  }

  it.each(WEAPON_IDS)(
    "fills the %s's tail in three layers, strongest nearest it, then outlines its body in the field's color, fills it, and fills its middle in the field's text",
    (weapon) => {
      const body = energyOf(ART_PALETTE.accent, ART_PALETTE).body;

      const drawn = looksOf(frameNamed(ART_FRAMES, SHOT_FRAMES[weapon])).filter(
        ([kind]) => kind === "polygon",
      );

      expect(drawn).toEqual([
        ["polygon", body, 0.3],
        ["polygon", body, 0.45],
        ["polygon", body, 0.6],
        ["polygon", ART_PALETTE.outline, 1],
        ["polygon", body, 1],
        ["polygon", ART_PALETTE.shot, 1],
      ]);
    },
  );

  it.each(WEAPON_IDS)(
    "lays the %s's tail behind it, each layer as far back as its share, and its body and middle where the kit cuts them",
    (weapon) => {
      const frame = frameNamed(ART_FRAMES, SHOT_FRAMES[weapon]);
      const { body, core, tail } = SHOTS[weapon];

      const [first, second, third, , filled, middle] = polygonsOf(frame);

      expect({
        tips: [first?.[1], second?.[1], third?.[1]],
        body: filled,
        core: middle,
      }).toEqual({
        tips: [1, 0.62, 0.3].map(
          (share) => laidOut([{ x: -tail.reach * share, y: 0 }], frame)[0],
        ),
        body: laidOut(body, frame),
        core: laidOut(core, frame),
      });
    },
  );

  it.each(WEAPON_IDS)(
    "outlines the %s's body all round in a line twice the outline's width, joined round at every corner, however sharp",
    (weapon) => {
      const frame = frameNamed(ART_FRAMES, SHOT_FRAMES[weapon]);
      const { outline } = ART_PALETTE;
      const width = 2 * widthOf(SHOT_OUTLINE, ART_SCALE);
      const corners = laidOut(SHOTS[weapon].body, frame);

      const lines = drawnAs(frame, "line", outline);
      const joins = drawnAs(frame, "circle", outline);

      expect({
        from: lines.map(({ from }) => toFour(from)),
        to: lines.map(({ to }) => toFour(to)),
        widths: [...new Set(lines.map((line) => line.width))],
        joins: [...new Set(joins.map(({ x, y }) => toFour({ x, y }).join()))],
        radii: [...new Set(joins.map(({ radius }) => radius))],
      }).toEqual({
        from: corners,
        to: [...corners.slice(1), ...corners.slice(0, 1)],
        widths: [width],
        joins: corners.map((corner) => corner.join()),
        radii: [width / 2],
      });
    },
  );

  it.each([true, false])(
    "draws a lance's barbs, in its body's tone, only as fine marks, with the fine marks %s",
    (fine) => {
      const body = energyOf(ART_PALETTE.accent, ART_PALETTE).body;

      const lance = frameNamed(
        energyFrames(ART_PALETTE, ART_SCALE, fine),
        SHOT_FRAMES.lance,
      );

      expect(drawnAs(lance, "line", body).length > 0).toBe(fine);
    },
  );

  it("keeps a shot's body at 3:1 or more against the field in every palette, as the shots are followed", () => {
    const below = THEMES.filter(({ id, mode }) => {
      const palette = beltPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);
      const { body } = energyOf(palette.accent, palette);
      return contrast(rgbOf(body), rgbOf(palette.field)) < 3;
    }).map(({ id }) => id);

    expect(below).toEqual([]);
  });
});

describe("SHOT_REACH", () => {
  it("reaches as far as each weapon's shot's tail, which reaches farther than its body and barbs", () => {
    expect(SHOT_REACH).toEqual({
      gun: 1.9,
      spread: 1.25,
      rapid: 1.15,
      lance: 2.3,
    });
  });

  it.each(ART_SCALES)(
    "holds each shot, from its middle, at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const frames = atlasFrames(ART_PALETTE, scale, isFine(scale));

      const beyond = WEAPON_IDS.filter(
        (weapon) =>
          reachOf(frameNamed(frames, SHOT_FRAMES[weapon])) >
          SHOT_REACH[weapon] * scale.unit + SLACK,
      );

      expect(beyond).toEqual([]);
    },
  );
});

describe("the muzzle's flash", () => {
  it("draws its star in the accent's body tone and its middle in the field's text", () => {
    const body = energyOf(ART_PALETTE.accent, ART_PALETTE).body;

    expect(looksOf(frameNamed(ART_FRAMES, MUZZLE_FRAME))).toEqual([
      ["polygon", body, 1],
      ["polygon", ART_PALETTE.shot, 1],
    ]);
  });

  it.each(ART_SCALES)(
    "holds its frame within its reach, from the muzzle, at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const frame = frameNamed(
        atlasFrames(ART_PALETTE, scale, isFine(scale)),
        MUZZLE_FRAME,
      );

      expect(reachOf(frame)).toBeLessThanOrEqual(
        MUZZLE_REACH * scale.unit + SLACK,
      );
    },
  );

  it("shows its second beat smaller and fainter, as the kit's second frame", () => {
    expect(MUZZLE_BEATS).toEqual([
      { size: 1, alpha: 1, glow: 0.95 },
      { size: 0.64, alpha: 0.55, glow: 0.5 },
    ]);
  });

  it("glows a little ahead of the muzzle, as large and as strong as its beat", () => {
    const [, fading] = MUZZLE_BEATS;

    expect(muzzleHalo(fading)).toEqual({
      along: 1.05 * 0.64,
      across: 1.05 * 0.64,
      ahead: 0.25 * 0.64,
      turn: 0,
      strength: 0.5,
    });
  });
});
