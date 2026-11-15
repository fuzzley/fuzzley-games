import type { PaintCommand, Point, WashCommand } from "@fz/phaser/shapes";
import { FIELD_ROLES } from "../../app/board/field_roles";
import { NARROWEST, TALLEST, WIDEST } from "../../testing/autopilot";
import { PALETTES } from "../../testing/roles";
import { CONSTELLATION } from "../art/pilot_art";
import { beltPalette } from "../colors/palette";
import { starCount } from "../field/specks";
import { type PlaceColors, hardOther, placeColors, starColor } from "./colors";
import type { Mark } from "./marks";
import {
  BLEED_CSS_PX,
  FINE_FROM,
  MOST_FLASHES,
  type PlaceFrame,
  placeArt,
  placeLayers,
} from "./paint";
import { type Backdrop, PLACE_IDS, backdropOf } from "./places";

/** What a dark palette's places are mixed from: Casino night's. */
const DARK = placeColors(
  beltPalette(PALETTES.rolesIn("casino", FIELD_ROLES), "dark"),
);

/** What a light palette's places are mixed from: Classic felt's. */
const LIGHT = placeColors(
  beltPalette(PALETTES.rolesIn("classic", FIELD_ROLES), "light"),
);

/** A laptop's field, wider than it is tall. */
const WIDE = { width: 72, height: 40 };

/** The wide field at 10 device pixels a unit, 1 to a CSS pixel. */
const FRAME: PlaceFrame = { unit: 10, pixelRatio: 1, width: 720, height: 400 };

/** Returns a place laid out on the wide field from seed 7. */
function laid(place: Backdrop["place"], constellation = false): Backdrop {
  return backdropOf({
    place,
    torus: WIDE,
    seed: 7,
    constellation: constellation ? { x: 0.5, y: 0.5 } : null,
  });
}

/** Returns a place of nothing but some marks of its landmark and some stars, on the wide field. */
function bare(
  landmark: readonly Mark[],
  stars: Partial<Backdrop["stars"]> = {},
): Backdrop {
  return {
    place: "storm",
    width: WIDE.width,
    height: WIDE.height,
    stars: { far: [], mid: [], bright: [], ...stars },
    wash: [],
    landmark,
    air: [],
    vignette: { depth: 7.2, tint: "crystal", strength: 0.6 },
    starTint: "volatile",
  };
}

/** Returns a place's landmark painted alone. */
function landmarkOf(
  backdrop: Backdrop,
  colors: PlaceColors = DARK,
  frame: PlaceFrame = FRAME,
): readonly PaintCommand[] {
  return placeLayers(backdrop, colors, frame).landmark;
}

/** Returns the commands of a kind among some. */
function ofKind<Kind extends PaintCommand["kind"]>(
  commands: readonly PaintCommand[],
  kind: Kind,
): Extract<PaintCommand, { kind: Kind }>[] {
  return commands.filter(
    (command): command is Extract<PaintCommand, { kind: Kind }> =>
      command.kind === kind,
  );
}

/** A flicker a spec's marks take. */
const FLICKER = { every: 11, after: 4 };

describe("placeArt", () => {
  /** Returns commands moved right and down by a distance, as painted from a corner that far up and left. */
  function movedBy(
    commands: readonly PaintCommand[],
    by: number,
  ): PaintCommand[] {
    const move = ({ x, y }: Point): Point => ({ x: x + by, y: y + by });
    return commands.map((command) => {
      switch (command.kind) {
        case "line":
          return { ...command, from: move(command.from), to: move(command.to) };
        case "polyline":
        case "polygon":
          return { ...command, points: command.points.map(move) };
        default:
          return { ...command, ...move(command) };
      }
    });
  }

  it("reaches as far past each edge of the field as a kick and a shake scroll its camera, in whole device pixels", () => {
    const art = placeArt(laid("inner-belt"), DARK, {
      ...FRAME,
      pixelRatio: 1.5,
    });

    expect(art.bleed).toBe(Math.ceil(BLEED_CSS_PX * 1.5));
  });

  it("paints the back opaque, over the field and its bleed: the field's color under all, then the wash and the far stars", () => {
    const art = placeArt(laid("inner-belt"), DARK, FRAME);
    const layers = placeLayers(laid("inner-belt"), DARK, FRAME);
    const { bleed } = art;

    expect(art.back).toEqual([
      {
        kind: "rect",
        x: 0,
        y: 0,
        width: 720 + 2 * bleed,
        height: 400 + 2 * bleed,
        color: DARK.field,
      },
      ...movedBy([...layers.wash, ...layers.far], bleed),
    ]);
  });

  it("paints the nearer stars on a picture of their own, from the field's corner, and the landmark, the air and the vignette before them, over the field and its bleed, with nothing apart", () => {
    const art = placeArt(laid("iron-reach"), DARK, FRAME);
    const layers = placeLayers(laid("iron-reach"), DARK, FRAME);

    expect([art.near, art.front, art.over]).toEqual([
      layers.near,
      movedBy(
        [...layers.landmark, ...layers.air, ...layers.vignette],
        art.bleed,
      ),
      [],
    ]);
  });

  it("paints the Storm's tower and forks in front, and the bank at their foot, the air and the vignette apart, over the field and its bleed", () => {
    const backdrop = laid("storm");
    const foot = backdrop.landmark.slice(-1);
    const layers = placeLayers(backdrop, DARK, FRAME);
    const footLayers = placeLayers(
      { ...backdrop, landmark: foot },
      DARK,
      FRAME,
    );
    const behind = layers.landmark.length - footLayers.landmark.length;

    const art = placeArt(backdrop, DARK, FRAME);

    expect([foot[0]?.kind, art.front, art.over]).toEqual([
      "bank",
      movedBy(layers.landmark.slice(0, behind), art.bleed),
      movedBy(
        [...footLayers.landmark, ...layers.air, ...layers.vignette],
        art.bleed,
      ),
    ]);
  });

  it.each(PLACE_IDS)(
    "lays no billow or face of %s's between its first mark that flickers and its last, so every flash lies behind what stands before the flickers",
    (place) => {
      const { landmark } = laid(place);
      const flickering = landmark.flatMap((mark, i) =>
        "flicker" in mark ? [i] : [],
      );

      const between = landmark.slice(
        flickering[0] ?? 0,
        (flickering.at(-1) ?? -1) + 1,
      );

      expect(
        between.filter(({ kind }) => kind === "bank" || kind === "flat"),
      ).toEqual([]);
    },
  );

  it("paints nothing apart for a place whose flickers flash nothing on the field", () => {
    const fork: Mark = {
      kind: "line",
      points: [
        { x: -20, y: 10 },
        { x: -10, y: 20 },
      ],
      width: 0.1,
      tint: "spark",
      strength: 0.5,
      flicker: FLICKER,
    };
    const face: Mark = {
      kind: "flat",
      points: [
        { x: 18, y: 18 },
        { x: 22, y: 18 },
        { x: 20, y: 22 },
      ],
      light: 0.8,
      tint: "stone",
    };
    const backdrop = bare([fork, face]);
    const layers = placeLayers(backdrop, DARK, FRAME);

    const art = placeArt(backdrop, DARK, FRAME);

    expect([art.front, art.over]).toEqual([
      movedBy([...layers.landmark, ...layers.vignette], art.bleed),
      [],
    ]);
  });

  it.each(["inner-belt", "iron-reach", "endless"] as const)(
    "flashes nothing in %s, where nothing flickers",
    (place) => {
      expect(placeArt(laid(place), DARK, FRAME).flashes).toEqual([]);
    },
  );

  describe("a flash", () => {
    const GLOW: Mark = {
      kind: "soft",
      at: { x: 20, y: 20 },
      rx: 4,
      ry: 2,
      turn: 0,
      tint: "spark",
      strength: 0.25,
      flicker: FLICKER,
    };
    const FORK: Mark = {
      kind: "line",
      points: [
        { x: 19, y: 18 },
        { x: 21, y: 22 },
      ],
      width: 0.16,
      tint: "spark",
      strength: 0.55,
      flicker: FLICKER,
    };
    const OTHER_FORK: Mark = { ...FORK, flicker: { every: 17, after: 9 } };
    const FACE: Mark = {
      kind: "flat",
      points: [
        { x: 18, y: 18 },
        { x: 22, y: 18 },
        { x: 20, y: 22 },
      ],
      light: 0.8,
      tint: "stone",
    };
    const BANK: Mark = {
      kind: "bank",
      billows: [{ at: { x: 20, y: 21 }, rx: 2, ry: 1, turn: 0 }],
      tint: "crystal",
      rim: 0.5,
    };
    const PLACE = bare([FACE, GLOW, FORK, OTHER_FORK, BANK, FACE]);

    it("paints a flicker's marks alone, as much stronger again as at its height", () => {
      const { flashes } = placeArt(PLACE, DARK, FRAME);

      const [flash] = flashes;
      expect(
        flash?.commands.map((command) => [command.kind, command.alpha]),
      ).toEqual([
        ["wash", 0.25 * 0.1 * 1.2],
        ["polyline", 0.55 * 0.16 * 1.2],
      ]);
    });

    it("paints what lies behind the first billow or face after the first flicker in front, and that billow or face on, then the vignette, apart", () => {
      const layers = placeLayers(PLACE, DARK, FRAME);
      const [face, glow, fork, otherFork] = [FACE, GLOW, FORK, OTHER_FORK].map(
        (mark) => placeLayers(bare([mark]), DARK, FRAME).landmark.length,
      );
      const behind = (face ?? 0) + (glow ?? 0) + (fork ?? 0) + (otherFork ?? 0);

      const art = placeArt(PLACE, DARK, FRAME);

      expect([art.front, art.over]).toEqual([
        movedBy(layers.landmark.slice(0, behind), art.bleed),
        movedBy(
          [...layers.landmark.slice(behind), ...layers.vignette],
          art.bleed,
        ),
      ]);
    });

    it("paints only the vignette apart where no billow or face stands before the flickers", () => {
      const backdrop = bare([FACE, GLOW, FORK]);
      const layers = placeLayers(backdrop, DARK, FRAME);

      const art = placeArt(backdrop, DARK, FRAME);

      expect([art.front, art.over]).toEqual([
        movedBy(layers.landmark, art.bleed),
        movedBy(layers.vignette, art.bleed),
      ]);
    });

    it("paints one for each flicker", () => {
      const { flashes } = placeArt(PLACE, DARK, FRAME);

      expect(flashes.map(({ flicker }) => flicker.every)).toEqual([11, 17]);
    });

    it("paints it from its area's corner", () => {
      const [flash] = placeArt(PLACE, DARK, FRAME).flashes;

      const [glow] = flash?.commands ?? [];

      expect(glow && "x" in glow ? [glow.x, glow.y] : []).toEqual([
        200 - (flash?.area.x ?? 0),
        200 - (flash?.area.y ?? 0),
      ]);
    });

    it("flashes each of the Storm's forks over the area it reaches, on the field and its bleed", () => {
      const { flashes, bleed } = placeArt(laid("storm"), DARK, FRAME);

      const outside = flashes.filter(
        ({ area }) =>
          area.x < -bleed ||
          area.y < -bleed ||
          area.x + area.width > FRAME.width + bleed ||
          area.y + area.height > FRAME.height + bleed,
      );

      expect({
        flickers: flashes.map(({ flicker }) => flicker.every),
        outside,
      }).toEqual({ flickers: [11, 17], outside: [] });
    });
  });

  it.each([
    ["the widest", WIDEST],
    ["the tallest", TALLEST],
    ["the narrowest", NARROWEST],
  ])(
    "paints no more flashes than the most, the Storm's, on %s field",
    (_shape, torus) => {
      const counts = PLACE_IDS.map(
        (place) =>
          placeArt(
            backdropOf({ place, torus, seed: 7, constellation: null }),
            DARK,
            {
              unit: 10,
              pixelRatio: 1,
              width: torus.width * 10,
              height: torus.height * 10,
            },
          ).flashes.length,
      );

      expect(Math.max(...counts)).toBe(MOST_FLASHES);
    },
  );

  it("flashes nothing of a flicker whose marks lie off the field", () => {
    const fork: Mark = {
      kind: "line",
      points: [
        { x: -20, y: 10 },
        { x: -10, y: 20 },
      ],
      width: 0.1,
      tint: "spark",
      strength: 0.5,
      flicker: FLICKER,
    };

    expect(placeArt(bare([fork]), DARK, FRAME).flashes).toEqual([]);
  });

  it("flashes a glow at the field's edge no further past it than the bleed", () => {
    const glow: Mark = {
      kind: "soft",
      at: { x: 0, y: 20 },
      rx: 4,
      ry: 2,
      turn: 0,
      tint: "spark",
      strength: 0.25,
      flicker: FLICKER,
    };

    const { flashes, bleed } = placeArt(bare([glow]), DARK, FRAME);

    expect(flashes[0]?.area.x).toBe(-bleed);
  });

  it("flashes a soft glow over the area its turned bounds reach", () => {
    const glow: Mark = {
      kind: "soft",
      at: { x: 20, y: 20 },
      rx: 4,
      ry: 2,
      turn: Math.PI / 2,
      tint: "spark",
      strength: 0.25,
      flicker: FLICKER,
    };

    const [flash] = placeArt(bare([glow]), DARK, FRAME).flashes;

    expect(flash?.area).toEqual({ x: 178, y: 158, width: 44, height: 84 });
  });
});

describe("placeLayers", () => {
  it("paints a far star for each the field shows, at its place", () => {
    const backdrop = laid("inner-belt");

    const { far } = placeLayers(backdrop, DARK, FRAME);

    const [first] = backdrop.stars.far;
    expect([far.length, far[0]]).toEqual([
      starCount("far", WIDE),
      expect.objectContaining({
        kind: "circle",
        x: (first?.x ?? 0) * 720,
        y: (first?.y ?? 0) * 400,
        color: starColor("far", "stone", DARK),
      }),
    ]);
  });

  it("paints each star at least as wide as a pixel can show, by the CSS pixel", () => {
    const tiny = { x: 0.5, y: 0.5, r: 0.01, shine: 0.5 };
    const frame = { ...FRAME, pixelRatio: 2 };

    const { far, near } = placeLayers(
      bare([], { far: [tiny], mid: [tiny] }),
      DARK,
      frame,
    );

    expect(
      [far, near].map((stars) => ofKind(stars, "circle")[0]?.radius),
    ).toEqual([0.55 * 2, 0.8 * 2]);
  });

  it.each([
    ["faintest", 0.1, 0.62],
    ["middling", 0.5, 0.82],
    ["brightest", 0.9, 1],
  ])(
    "paints a star among its depth's %s as strongly",
    (_name, shine, alpha) => {
      const star = { x: 0.5, y: 0.5, r: 0.12, shine };

      const { near } = placeLayers(bare([], { mid: [star] }), DARK, FRAME);

      expect(near).toEqual([
        expect.objectContaining({ kind: "circle", alpha }),
      ]);
    },
  );

  it("paints a bright star whole, in a round halo that fades to nothing", () => {
    const star = { x: 0.5, y: 0.5, r: 0.15, shine: 0 };

    const { near } = placeLayers(bare([], { bright: [star] }), LIGHT, FRAME);

    expect(near).toEqual([
      expect.objectContaining({
        kind: "wash",
        x: 360,
        y: 200,
        radiusX: 4.5,
        radiusY: 4.5,
        alpha: 0.3,
      }),
      expect.objectContaining({ kind: "circle", radius: 1.5, alpha: 1 }),
    ]);
  });

  it("paints a nearer star again past each edge it crosses, so the picture tiles as the field wraps", () => {
    const star = { x: 0.001, y: 0.999, r: 0.12, shine: 0.9 };

    const { near } = placeLayers(bare([], { mid: [star] }), DARK, FRAME);

    expect(
      ofKind(near, "circle").map(({ x, y }) => [
        Math.round(x * 100) / 100,
        Math.round(y * 100) / 100,
      ]),
    ).toEqual([
      [0.72, 399.6],
      [0.72, -0.4],
      [720.72, 399.6],
      [720.72, -0.4],
    ]);
  });

  it("paints a far star once, as the far stars never move", () => {
    const star = { x: 0.001, y: 0.999, r: 0.08, shine: 0.9 };

    const { far } = placeLayers(bare([], { far: [star] }), DARK, FRAME);

    expect(far).toHaveLength(1);
  });

  it("paints the wash's pool behind the landmark's shade in a dark palette, and behind its lit side in a light one", () => {
    const backdrop = laid("inner-belt");
    const [shade, lit] = backdrop.wash;

    const [dark, light] = [DARK, LIGHT].map(
      (colors) => placeLayers(backdrop, colors, FRAME).wash,
    );

    expect([dark?.length, dark?.[0], light?.length, light?.[0]]).toEqual([
      backdrop.wash.length - 1,
      expect.objectContaining({ x: (shade?.at.x ?? 0) * 10 }),
      backdrop.wash.length - 1,
      expect.objectContaining({ x: (lit?.at.x ?? 0) * 10 }),
    ]);
  });

  it("paints a soft shape as a wash of its tint, a bell from its middle, at its share of its layer's limit", () => {
    const glow: Mark = {
      kind: "soft",
      at: { x: 10, y: 5 },
      rx: 3,
      ry: 2,
      turn: 0.5,
      tint: "ice",
      strength: 0.5,
    };

    const [wash] = ofKind(landmarkOf(bare([glow])), "wash");

    expect(wash).toEqual({
      kind: "wash",
      x: 100,
      y: 50,
      radiusX: 30,
      radiusY: 20,
      turn: 0.5,
      alpha: 0.05,
      stops: [
        [0, 1],
        [0.15, 0.94],
        [0.3, 0.78],
        [0.45, 0.57],
        [0.6, 0.35],
        [0.75, 0.16],
        [0.88, 0.05],
        [1, 0],
      ].map(([at, alpha]) => ({ at, color: DARK.rocks.ice, alpha })),
    });
  });

  it("holds a mote to the small marks' limit", () => {
    const mote: Mark = {
      kind: "soft",
      at: { x: 10, y: 5 },
      rx: 0.3,
      ry: 0.3,
      turn: 0,
      tint: "stone",
      strength: 0.5,
      small: true,
    };

    expect(landmarkOf(bare([mote]))).toEqual([
      expect.objectContaining({ alpha: 0.13 }),
    ]);
  });

  it("paints a face of a landmark in its tone under the light, with a seam in its own color round it", () => {
    const face: Mark = {
      kind: "flat",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
      light: 0.9,
      tint: "stone",
    };

    const [polygon, seam] = landmarkOf(bare([face]));

    expect([polygon?.kind, seam?.kind, seam]).toEqual([
      "polygon",
      "polyline",
      expect.objectContaining({
        color: polygon && "color" in polygon ? polygon.color : 0,
        width: 0.5,
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 0, y: 10 },
          { x: 0, y: 0 },
        ],
      }),
    ]);
  });

  it("paints a filing as a face alone, held to the small marks' limit", () => {
    const filing: Mark = {
      kind: "flat",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
      light: 0.9,
      tint: "iron",
      small: true,
    };

    expect(landmarkOf(bare([filing])).map(({ kind }) => kind)).toEqual([
      "polygon",
    ]);
  });

  it("paints a line in the hard ink at its share of the lines' limit, no thinner than a pixel can show", () => {
    const line: Mark = {
      kind: "line",
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 3 },
      ],
      width: 0.01,
      tint: "muted",
      strength: 0.5,
    };

    expect(landmarkOf(bare([line]))).toEqual([
      expect.objectContaining({
        kind: "polyline",
        color: hardOther("muted", DARK),
        width: 0.6,
        alpha: 0.08,
      }),
    ]);
  });

  it("holds a line to half its color at most", () => {
    const line: Mark = {
      kind: "line",
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 3 },
      ],
      width: 0.1,
      tint: "muted",
      strength: 9,
    };

    expect(landmarkOf(bare([line]))).toEqual([
      expect.objectContaining({ alpha: 0.5 }),
    ]);
  });

  it("leaves a landmark's fine marks out where a unit is too few CSS pixels to show them", () => {
    const fine: Mark = {
      kind: "line",
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 3 },
      ],
      width: 0.1,
      tint: "muted",
      strength: 0.5,
      fine: true,
    };
    const coarse = { ...FRAME, unit: 2 * (FINE_FROM - 0.5), pixelRatio: 2 };
    const sharp = { ...FRAME, unit: 2 * FINE_FROM, pixelRatio: 2 };

    expect([
      landmarkOf(bare([fine]), DARK, coarse).length,
      landmarkOf(bare([fine]), DARK, sharp).length,
    ]).toEqual([0, 1]);
  });

  it("paints a landmark's speck as a star of its depth", () => {
    const speck: Mark = {
      kind: "speck",
      at: { x: 1, y: 2 },
      r: 0.15,
      depth: "mid",
    };

    expect(landmarkOf(bare([speck]))).toEqual([
      {
        kind: "circle",
        x: 10,
        y: 20,
        radius: 1.5,
        color: starColor("mid", "volatile", DARK),
      },
    ]);
  });

  it("paints a streak of wind as a long, thin wash that fades to its ends, at its share of the lines' limit", () => {
    const streak: Mark = {
      kind: "streak",
      at: { x: 10, y: 10 },
      length: 12,
      width: 0.1,
      turn: -0.2,
      tint: "text",
      strength: 0.5,
    };

    expect(landmarkOf(bare([streak]))).toEqual([
      expect.objectContaining({
        kind: "wash",
        x: 100,
        y: 100,
        radiusX: 60,
        radiusY: 1,
        turn: -0.2,
        alpha: 0.08,
      }),
    ]);
  });

  describe("a bank of cloud", () => {
    const BANK: Mark = {
      kind: "bank",
      billows: [
        { at: { x: 10, y: 10 }, rx: 4, ry: 3, turn: 0 },
        { at: { x: 14, y: 12 }, rx: 4, ry: 3, turn: 0.1 },
      ],
      tint: "crystal",
      rim: 0.5,
    };

    /** Returns where each wash of a bank lies, in device pixels. */
    function middles(colors: PlaceColors): number[][] {
      return ofKind(landmarkOf(bare([BANK]), colors), "wash").map(
        ({ x, y }: WashCommand) =>
          [x, y].map((at) => Math.round(at * 100) / 100),
      );
    }

    it("paints each billow in a dark palette as a rim toward the light, then its body over it", () => {
      expect(middles(DARK)).toEqual([
        [95, 95],
        [100, 100],
        [135, 115],
        [140, 120],
      ]);
    });

    it("paints a light palette's under a shade, each a rim away from the light, then its body", () => {
      expect(middles(LIGHT)).toEqual([
        [117, 117],
        [157, 137],
        [107.5, 107.5],
        [100, 100],
        [147.5, 127.5],
        [140, 120],
      ]);
    });

    it("paints each rim and each shade whole, in one flat color, so where they cross they never add up", () => {
      const washes = ofKind(landmarkOf(bare([BANK]), LIGHT), "wash");

      expect(washes.map(({ alpha }) => alpha)).toEqual(
        washes.map(() => undefined),
      );
    });
  });

  it("darkens each edge toward the page in a dark palette", () => {
    const { vignette } = placeLayers(laid("storm"), DARK, FRAME);

    expect(vignette).toEqual([
      expect.objectContaining({ x: 360, y: 0, radiusY: 72, alpha: 0.3 }),
      expect.objectContaining({ x: 360, y: 400, radiusY: 72 }),
      expect.objectContaining({ x: 0, y: 200, radiusX: 72 }),
      expect.objectContaining({ x: 720, y: 200, radiusX: 72 }),
    ]);
  });

  it("tints each edge faintly with the place's own in a light palette", () => {
    const [top] = ofKind(
      placeLayers(laid("storm"), LIGHT, FRAME).vignette,
      "wash",
    );

    expect([top?.alpha, top?.stops[0]]).toEqual([
      0.6 * 0.05,
      { at: 0, color: LIGHT.rocks.crystal, alpha: 1 },
    ]);
  });

  it("paints Endless's constellation over its band", () => {
    const [without, laidWith] = [laid("endless"), laid("endless", true)].map(
      (backdrop) => landmarkOf(backdrop),
    );

    expect((laidWith?.length ?? 0) - (without?.length ?? 0)).toBe(
      1 + CONSTELLATION.specks.length + CONSTELLATION.eyes.length,
    );
  });
});
