import { THEMES } from "@fz/style/themes";
import { contrast, rgbOf } from "@fz/style/testing";
import { colorNumber } from "@fz/phaser/color";
import { FIELD_ROLES } from "../../app/board/field_roles";
import { PALETTES } from "../../testing/roles";
import { podTones } from "../art/pod_art";
import { burrInk, orbColors } from "../art/things";
import { beltPalette } from "./palette";
import { faceExtremes } from "./rock_light";

/** The contrast a graphic keeps against what it is drawn on, as WCAG asks of graphics. */
const GRAPHIC = 3;

/** Returns the contrast between two colors Phaser takes. */
function between(one: number, other: number): number {
  return contrast(rgbOf(one), rgbOf(other));
}

// Everything a player follows, aims at or dodges keeps 3:1, the bar for
// graphics, against the field, in every palette, and so does the flame,
// which shows the thrust, and a stray's bubble's rim, which tells it from a
// rock. A rock is lit, so each kind keeps 3:1 at its darkest face, turned
// from the palette's light, and at its brightest, turned to it, a crystal's
// stone body too, and so does the pod's hull, lit as a rock is, its trim
// too. Each thing is outlined in the field's color, a burr's thorns cased
// in it, so it reads apart from a rock it crosses, and a rock's cracks are
// drawn in the same, so each keeps 3:1 against those too, and against
// every face of a rock. Each pilot keeps 3:1 against what it is drawn on:
// the field; the pod's glass and its shade, in its canopy; a stray's
// bubble; and the bar, where the crew waits; and its eyes keep 3:1 against
// it. The deck's symbols at rest keep 3:1 against its buttons, and the knob
// against the stick's base.
describe("the field's contrast", () => {
  describe.each(THEMES)("in $name", ({ id, mode }) => {
    const palette = beltPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);
    const bar = colorNumber(PALETTES.role(id, "bar"));
    const rocks = Object.entries(palette.rocks).map(
      ([kind, color]) => [`${kind} rock`, color] as const,
    );
    // Every ink a rock's faces are drawn in: each kind's, a crystal's gem's
    // among them, and its body's, a stone's.
    const faces = Object.entries(palette.rockTones).flatMap(([kind, tones]) => {
      const { darkest, brightest } = faceExtremes(tones.ink, palette.rockLight);
      return [
        [`${kind} rock's darkest face`, darkest],
        [`${kind} rock's brightest face`, brightest],
      ] as const;
    });
    // The pod's hull is lit as a rock is, its facets in the accent and its
    // trim in the muted text, and so is the comet's head, in the danger
    // color.
    const hull = (
      [
        ["pod's hull", palette.accent],
        ["pod's trim", palette.muted],
        ["comet's head", palette.comet],
      ] as const
    ).flatMap(([part, ink]) => {
      const { darkest, brightest } = faceExtremes(ink, palette.rockLight);
      return [
        [`${part}'s darkest face`, darkest],
        [`${part}'s brightest face`, brightest],
      ] as const;
    });
    const { glass, glassShade } = podTones(palette);
    const outlined = [
      ...rocks,
      ["pod", palette.accent],
      ["pickup", palette.accent],
      ["comet", palette.comet],
      ["burr", burrInk(palette)],
    ] as const;
    const pilots = palette.pilots.map(
      (color, i) => [`pilot ${String(i + 1)}`, color] as const,
    );

    it.each([
      ...outlined,
      ["shots", palette.shot],
      ["flame", palette.flame],
      ["stray's bubble's rim", palette.rim],
    ] as const)("keeps the %s at 3:1 or more against the field", (_, color) => {
      expect(between(color, palette.field)).toBeGreaterThanOrEqual(GRAPHIC);
    });

    it.each(outlined)(
      "keeps the outline at 3:1 or more against the %s",
      (_, color) => {
        expect(between(palette.outline, color)).toBeGreaterThanOrEqual(GRAPHIC);
      },
    );

    it.each(rocks)(
      "keeps the marks at 3:1 or more against the %s",
      (_, color) => {
        expect(between(palette.mark, color)).toBeGreaterThanOrEqual(GRAPHIC);
      },
    );

    it.each(faces)(
      "keeps the %s at 3:1 or more against the field, and the marks and the outline against it",
      (_, color) => {
        expect(
          Math.min(
            between(color, palette.field),
            between(palette.mark, color),
            between(palette.outline, color),
          ),
        ).toBeGreaterThanOrEqual(GRAPHIC);
      },
    );

    it.each(hull)(
      "keeps the %s at 3:1 or more against the field, and the outline against it",
      (_, color) => {
        expect(
          Math.min(
            between(color, palette.field),
            between(palette.outline, color),
          ),
        ).toBeGreaterThanOrEqual(GRAPHIC);
      },
    );

    it("keeps a pickup's symbol at 3:1 or more against its orb's glass, and the glass deeper in it", () => {
      const { ink, glass, deep } = orbColors(palette);

      expect(
        Math.min(between(ink, glass), between(ink, deep)),
      ).toBeGreaterThanOrEqual(GRAPHIC);
    });

    it.each(
      pilots.flatMap(([name, color]) =>
        (
          [
            ["field", palette.field],
            ["pod's glass", glass],
            ["pod's glass's shade", glassShade],
            ["stray's bubble", palette.bubble],
            ["bar", bar],
          ] as const
        ).map(([surface, under]) => [name, surface, color, under] as const),
      ),
    )("keeps %s at 3:1 or more against the %s", (_, __, color, under) => {
      expect(between(color, under)).toBeGreaterThanOrEqual(GRAPHIC);
    });

    it.each(pilots)("keeps the eyes at 3:1 or more against %s", (_, color) => {
      expect(between(palette.eyes, color)).toBeGreaterThanOrEqual(GRAPHIC);
    });

    it.each([
      ["a button's symbol at rest", palette.muted],
      ["the stick's knob", palette.accent],
    ] as const)("keeps %s at 3:1 or more against the deck", (_, color) => {
      expect(between(color, palette.deck)).toBeGreaterThanOrEqual(GRAPHIC);
    });
  });
});
