import { fileURLToPath } from "node:url";
import { parse } from "postcss";
import { compile } from "sass";
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

/** Returns each palette's roles and their colors, by the palette's id. */
function compiledPalettes(): ReadonlyMap<string, ReadonlyMap<string, string>> {
  const file = fileURLToPath(new URL("_palettes.scss", import.meta.url));
  const palettes = new Map<string, Map<string, string>>();
  parse(compile(file).css).walkRules((rule) => {
    const id = /data-theme=["']?([\w-]+)/.exec(rule.selector)?.[1];
    if (!id) return;
    const roles = new Map<string, string>();
    rule.walkDecls(/^--fz-/, (declaration) => {
      roles.set(declaration.prop.slice("--fz-".length), declaration.value);
    });
    palettes.set(id, roles);
  });
  return palettes;
}

/** Returns a hex color's relative luminance, as WCAG defines it. */
function luminance(hex: string): number {
  const digits = hex.slice(1);
  const full = digits.length === 3 ? digits.replace(/./g, "$&$&") : digits;
  const [red = 0, green = 0, blue = 0] = [0, 2, 4].map((start) => {
    const channel = parseInt(full.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Returns the contrast ratio between two hex colors, from 1 to 21. */
function contrast(a: string, b: string): number {
  const [lighter = 0, darker = 0] = [luminance(a), luminance(b)].sort(
    (x, y) => y - x,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe("contrast", () => {
  const palettes = compiledPalettes();

  describe.each(THEMES)("in $name", ({ id }) => {
    it.each(PAIRS)("keeps %s on %s at %d:1 or more", (color, on, least) => {
      const roles = palettes.get(id);

      const ratio = contrast(roles?.get(color) ?? "", roles?.get(on) ?? "");

      expect(ratio).toBeGreaterThanOrEqual(least);
    });
  });
});

describe("luminance and contrast", () => {
  it("measures black on white at 21:1", () => {
    expect(contrast("#000", "#ffffff")).toBe(21);
  });

  it("measures a color on itself at 1:1", () => {
    expect(contrast("#2f7d4f", "#2f7d4f")).toBe(1);
  });
});
