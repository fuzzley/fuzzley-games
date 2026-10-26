import path from "node:path";
import { compile } from "sass";
import {
  type Rgb,
  type Roles,
  compileStylesheet,
  contrast,
  over,
  paint,
  paletteRoles,
} from "../testing/index.ts";
import { THEMES } from "../themes.ts";

// Each pair is a color and what it sits on, with the least contrast WCAG asks
// between them: 4.5:1 for text, and for a fill's label, and 3:1 for the focus
// ring, which is part of a control rather than text.
const PAIRS = [
  ["text", "page", 4.5],
  ["text", "panel", 4.5],
  ["text", "panel-raised", 4.5],
  ["muted", "page", 4.5],
  ["muted", "panel", 4.5],
  ["muted", "panel-raised", 4.5],
  ["bar-text", "bar", 4.5],
  ["field-text", "field", 4.5],
  ["field-muted", "field", 4.5],
  ["danger", "page", 4.5],
  ["danger", "panel-raised", 4.5],
  ["warning", "page", 4.5],
  ["warning", "panel-raised", 4.5],
  ["on-accent", "accent", 4.5],
  ["on-danger", "danger", 4.5],
  ["on-warning", "warning", 4.5],
  ["on-felt", "felt", 4.5],
  ["accent", "page", 3],
  ["accent", "panel", 3],
  ["accent", "panel-raised", 3],
] as const;

// Each filled button's label and fill, which `.fz-button:hover` mixes with the
// text.
const HOVERED = [
  ["on-accent", "accent"],
  ["on-danger", "danger"],
  ["on-warning", "warning"],
] as const;

// Text on each surface that floats over a game, and what shows through it,
// from the bottom up: a bar over the felt, a drawer or a card over the page
// the scrim dims, and a well in a panel.
const OVER = [
  ["bar-text", "bar-glass", ["felt"]],
  ["text", "panel-glass", ["page", "scrim"]],
  ["muted", "panel-glass", ["page", "scrim"]],
  ["text", "float", ["page", "scrim"]],
  ["muted", "float", ["page", "scrim"]],
  ["text", "well", ["panel-raised"]],
  ["muted", "well", ["panel-raised"]],
] as const;

/** Returns how much of its fill `.fz-button:hover` keeps, from 0 to 1. */
function hoverStrength(): number {
  const file = path.join(import.meta.dirname, "../fragments/_button.scss");
  const strength = /var\(--fz-button-fill\)\s+(\d+)%,\s*var\(--fz-text\)/.exec(
    compile(file).css,
  )?.[1];
  return Number(strength) / 100;
}

/** Returns the color layers of roles make, each laid over the one before. */
function layered([bottom = "", ...rest]: readonly string[], roles: Roles): Rgb {
  return rest.reduce(
    (under, layer) => paint(`var(--fz-${layer})`, roles, under),
    paint(`var(--fz-${bottom})`, roles),
  );
}

describe("contrast", () => {
  const palettes = paletteRoles(
    compileStylesheet(path.join(import.meta.dirname, "_derived.scss")),
  );
  const strength = hoverStrength();

  describe.each(THEMES)("in $name", ({ id }) => {
    const roles = palettes.get(id) ?? new Map<string, string>();

    /** Returns one of the palette's roles, which is opaque. */
    function role(name: string): Rgb {
      return paint(`var(--fz-${name})`, roles);
    }

    it.each(PAIRS)("keeps %s on %s at %d:1 or more", (color, on, least) => {
      const ratio = contrast(role(color), role(on));

      expect(ratio).toBeGreaterThanOrEqual(least);
    });

    it.each(HOVERED)(
      "keeps %s on %s, hovered, at 4.5:1 or more",
      (label, fill) => {
        const hovered = over(role(fill), role("text"), strength);

        const ratio = contrast(role(label), hovered);

        expect(ratio).toBeGreaterThanOrEqual(4.5);
      },
    );

    it.each(OVER)(
      "keeps %s on %s, over what shows through it, at 4.5:1 or more",
      (color, surface, under) => {
        const behind = paint(
          `var(--fz-${surface})`,
          roles,
          layered(under, roles),
        );

        const ratio = contrast(role(color), behind);

        expect(ratio).toBeGreaterThanOrEqual(4.5);
      },
    );
  });
});

describe("hoverStrength", () => {
  it("finds how much of its fill a hovered button keeps", () => {
    expect(hoverStrength()).toBeGreaterThan(0);
  });
});
