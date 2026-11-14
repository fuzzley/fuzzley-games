import { colorNumber, mixColors } from "@fz/phaser/color";
import { type DrawCommand, extentOf } from "@fz/phaser/shapes";
import { THEMES } from "@fz/style/themes";
import { contrast, rgbOf } from "@fz/style/testing";
import { FIELD_ROLES } from "../../app/board/field_roles";
import {
  LEVEL_SETS,
  PLACES,
  type Place,
  placeOf,
} from "../../rules/levels/levels";
import { ART_SCALE, FIELD_SCALES } from "../../testing/art_frames";
import { PALETTES } from "../../testing/roles";
import { bricksPalette } from "../colors/palette";
import { coverOf } from "./motifs";
import {
  PLACE_ART,
  TILE_MOTIFS,
  fieldInks,
  placeInks,
  placeTile,
  tileSide,
} from "./places";

/** Inks no palette takes, so a spec tells the motifs from the grid. */
const INKS = { motif: 0x123456, faint: 0x654321 };

/** Returns the colors a drawing's commands are drawn in. */
function colorsOf(commands: readonly DrawCommand[]): ReadonlySet<number> {
  return new Set(commands.map(({ color }) => color));
}

/** Returns whether what a command may cover lies wholly inside a square from the origin. */
function liesInside(command: DrawCommand, side: number): boolean {
  const { x, y, width, height } = coverOf(command);
  return x >= 0 && y >= 0 && x + width <= side && y + height <= side;
}

describe("PLACE_ART", () => {
  it.each(LEVEL_SETS.map((set) => [set.name, set] as const))(
    "draws the place %s is in",
    (_, set) => {
      const tile = placeTile(placeOf(set), ART_SCALE, INKS);

      expect(tile.commands.length).toBeGreaterThan(0);
    },
  );

  it.each(PLACES)(
    "shows the %s a little more strongly over the page than over the field",
    (place) => {
      const { field, page } = PLACE_ART[place];

      expect(page).toBeGreaterThan(field);
    },
  );
});

describe("tileSide", () => {
  it.each([
    [40, 1008],
    [24, 605],
  ])(
    "spans six motifs' steps of 4.2 units in whole device pixels, at a unit of %i pixels",
    (unit, side) => {
      expect(tileSide({ unit, pixelRatio: 2 })).toBe(side);
    },
  );

  it("is a pixel at least, as a canvas not yet laid out gives no unit", () => {
    expect(tileSide({ unit: 0, pixelRatio: 1 })).toBe(1);
  });
});

describe("placeTile", () => {
  describe.each(PLACES)("of the %s", (place) => {
    it.each(FIELD_SCALES)(
      "keeps every command inside a tile its own side at %o, so it repeats without a seam",
      (scale) => {
        const tile = placeTile(place, scale, INKS);

        expect({
          width: tile.width,
          height: tile.height,
          outside: tile.commands.filter(
            (command) => !liesInside(command, tile.width),
          ),
        }).toEqual({
          width: tileSide(scale),
          height: tileSide(scale),
          outside: [],
        });
      },
    );
  });

  it.each(PLACES.filter((place) => place !== "workshop"))(
    "draws the %s's motifs alone, in their ink",
    (place) => {
      const tile = placeTile(place, ART_SCALE, INKS);

      expect(colorsOf(tile.commands)).toEqual(new Set([INKS.motif]));
    },
  );

  it("lays a drawing board's grid under the workshop's motifs, in the faint ink", () => {
    const { commands } = placeTile("workshop", ART_SCALE, INKS);

    const firstMotif = commands.findIndex(({ color }) => color === INKS.motif);
    expect({
      under: colorsOf(commands.slice(0, firstMotif)),
      over: colorsOf(commands.slice(firstMotif)),
      lines: commands.filter(({ color }) => color === INKS.faint).length,
    }).toEqual({
      under: new Set([INKS.faint]),
      over: new Set([INKS.motif]),
      lines: 4 * TILE_MOTIFS,
    });
  });

  it("runs the workshop's grid the tile's whole side, so it carries on into the tiles beside it", () => {
    const tile = placeTile("workshop", ART_SCALE, INKS);

    const spans = tile.commands
      .filter((command) => command.color === INKS.faint)
      .map((command) => {
        const { width, height } = extentOf(command);
        return Math.max(width, height);
      });
    expect(new Set(spans)).toEqual(new Set([tile.width]));
  });

  it("lays the workshop's grid on whole device pixels, none on a seam", () => {
    const tile = placeTile("workshop", ART_SCALE, INKS);

    const edges = tile.commands
      .filter((command) => command.color === INKS.faint)
      .flatMap((command) => {
        const { x, y, width, height } = extentOf(command);
        return width < height ? [x, x + width] : [y, y + height];
      });
    expect({
      whole: edges.every(Number.isInteger),
      seams: edges.filter((edge) => edge <= 0 || edge >= tile.width),
    }).toEqual({ whole: true, seams: [] });
  });

  it("scatters a tile's motifs over every row and column of it", () => {
    const { commands, width } = placeTile("playroom", ART_SCALE, INKS);
    const step = width / TILE_MOTIFS;

    const middles = commands.map((command) => {
      const { x, y, width: across, height: down } = extentOf(command);
      return { x: x + across / 2, y: y + down / 2 };
    });
    expect({
      rows: new Set(middles.map(({ y }) => Math.floor(y / step))),
      columns: new Set(middles.map(({ x }) => Math.floor(x / step))),
    }).toEqual({
      rows: new Set([0, 1, 2, 3, 4, 5]),
      columns: new Set([0, 1, 2, 3, 4, 5]),
    });
  });

  it.each([0, 0.5])(
    "draws nothing at a unit of %f pixels, as a canvas not yet laid out gives, as no motif would fit",
    (unit) => {
      const tile = placeTile("workshop", { unit, pixelRatio: 1 }, INKS);

      expect(tile.commands).toEqual([]);
    },
  );

  it("draws the same tile for the same place and scale", () => {
    expect(placeTile("garden", ART_SCALE, INKS)).toEqual(
      placeTile("garden", ART_SCALE, INKS),
    );
  });
});

describe("placeInks", () => {
  it("washes the motifs' ink from the text over what lies behind, and the faint ink a little over half as much", () => {
    expect(placeInks(0xffffff, 0x000000, 0.25)).toEqual({
      motif: 0x404040,
      faint: 0x232323,
    });
  });
});

describe("fieldInks", () => {
  it("bakes the motifs in the palette's text, and the faint ink 55% of the way to it from the field", () => {
    const palette = bricksPalette(
      {
        panel: "#ffffff",
        text: "#000000",
        accent: "#00ff00",
        danger: "#ff0000",
        warning: "#ffa500",
      },
      "light",
    );

    expect(fieldInks(palette)).toEqual({ motif: 0x000000, faint: 0x737373 });
  });
});

/**
 * The contrast a place keeps against what lies behind it, at least, so it
 * reads, and at most, so it never competes with what is played, every piece
 * of which keeps 3:1 against the field (`contrast.spec.ts`).
 */
const SHOWS = { least: 1.05, most: 1.2 } as const;

/** Returns whether a contrast is a place's: there, but dim. */
function isDim(ratio: number): boolean {
  return ratio >= SHOWS.least && ratio <= SHOWS.most;
}

describe("a place's contrast", () => {
  describe.each(THEMES)("in $name", ({ id, mode }) => {
    const palette = bricksPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);
    const page = colorNumber(PALETTES.role(id, "page"));
    /** Returns the contrast an ink of a place's tile keeps against the field, washed over it as strongly as the place shows there. */
    const againstField = (ink: number, place: Place): number =>
      contrast(
        rgbOf(mixColors(ink, palette.field, PLACE_ART[place].field)),
        rgbOf(palette.field),
      );

    it.each(PLACES)("shows the %s over the field, dimly", (place) => {
      const { motif } = fieldInks(palette);

      expect(againstField(motif, place)).toSatisfy(isDim);
    });

    it("shows the workshop's grid over the field, fainter than its motifs", () => {
      const { motif, faint } = fieldInks(palette);

      expect(againstField(faint, "workshop")).toSatisfy(
        (ratio: number) => ratio > 1 && ratio < againstField(motif, "workshop"),
      );
    });

    it.each(PLACES)("shows the %s over the page, dimly", (place) => {
      const { motif } = placeInks(palette.text, page, PLACE_ART[place].page);

      expect(contrast(rgbOf(motif), rgbOf(page))).toSatisfy(isDim);
    });
  });
});
