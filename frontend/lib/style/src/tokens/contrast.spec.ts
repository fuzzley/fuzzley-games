import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "postcss";
import { compile, compileString } from "sass";
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

/**
 * Returns each palette's custom properties, its roles and those worked out
 * from them, by the palette's id.
 */
function compiledPalettes(): ReadonlyMap<string, ReadonlyMap<string, string>> {
  const tokens = path.dirname(fileURLToPath(import.meta.url));
  const { css } = compileString('@use "derived";', { loadPaths: [tokens] });
  const everywhere = new Map<string, string>();
  const palettes = new Map<string, Map<string, string>>();
  parse(css).walkRules((rule) => {
    for (const selector of rule.selectors) {
      const id = /data-theme=["']?([\w-]+)/.exec(selector)?.[1];
      const into =
        selector === "[data-theme]"
          ? everywhere
          : id && (palettes.get(id) ?? palettes.set(id, new Map()).get(id));
      if (!into) continue;
      rule.walkDecls(/^--fz-/, (declaration) => {
        into.set(declaration.prop.slice("--fz-".length), declaration.value);
      });
    }
  });
  return new Map(
    [...palettes].map(([id, own]) => [id, new Map([...everywhere, ...own])]),
  );
}

/** Returns how much of its fill `.fz-button:hover` keeps, from 0 to 1. */
function hoverStrength(): number {
  const file = fileURLToPath(
    new URL("../fragments/_button.scss", import.meta.url),
  );
  const strength = /var\(--fz-button-fill\)\s+(\d+)%,\s*var\(--fz-text\)/.exec(
    compile(file).css,
  )?.[1];
  return Number(strength) / 100;
}

/** Returns a hex color's red, green and blue, from 0 to 255. */
function channels(hex: string): number[] {
  const digits = hex.slice(1);
  const full = digits.length === 3 ? digits.replace(/./g, "$&$&") : digits;
  return [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16));
}

/**
 * Returns two hex colors mixed as `color-mix(in srgb, …)` mixes them, with
 * `weight` of the first.
 */
function mix(first: string, second: string, weight: number): string {
  const [a, b] = [channels(first), channels(second)];
  return `#${a
    .map((channel, index) =>
      Math.round(channel * weight + (b[index] ?? 0) * (1 - weight))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Returns a hex color's relative luminance, as WCAG defines it. */
function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = channels(hex).map((value) => {
    const channel = value / 255;
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

/**
 * Returns the hex color a custom property's value paints over another: a
 * role, a tint of one, `black` or a translucent `rgba()`, as Sass writes the
 * palettes and the tints.
 */
function paint(
  value: string,
  roles: ReadonlyMap<string, string>,
  under: string,
): string {
  const css = value.replace(/\s+/g, " ").trim();
  const role = /^var\(--fz-([\w-]+)\)$/.exec(css)?.[1];
  if (role) return paint(roles.get(role) ?? "", roles, under);
  const tint = /^color-mix\(in srgb, (.+) (\d+)%, transparent\)$/.exec(css);
  if (tint) {
    const [, color = "", percent = ""] = tint;
    return mix(paint(color, roles, under), under, Number(percent) / 100);
  }
  const translucent = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(css);
  if (translucent) {
    const [red = 0, green = 0, blue = 0, alpha = 0] = translucent
      .slice(1)
      .map(Number);
    const hex = [red, green, blue]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("");
    return mix(`#${hex}`, under, alpha);
  }
  if (css === "black") return "#000000";
  if (/^#[\da-f]{3}([\da-f]{3})?$/i.test(css)) return css;
  throw new Error(`No way to paint ${value}`);
}

/** Returns the color layers of roles make, each laid over the one before. */
function layered(
  layers: readonly string[],
  roles: ReadonlyMap<string, string>,
): string {
  return layers.reduce(
    (under, layer) => paint(`var(--fz-${layer})`, roles, under),
    "#000000",
  );
}

describe("contrast", () => {
  const palettes = compiledPalettes();
  const strength = hoverStrength();

  describe.each(THEMES)("in $name", ({ id }) => {
    it.each(PAIRS)("keeps %s on %s at %d:1 or more", (color, on, least) => {
      const roles = palettes.get(id);

      const ratio = contrast(roles?.get(color) ?? "", roles?.get(on) ?? "");

      expect(ratio).toBeGreaterThanOrEqual(least);
    });

    it.each(HOVERED)(
      "keeps %s on %s, hovered, at 4.5:1 or more",
      (label, fill) => {
        const roles = palettes.get(id);
        const hovered = mix(
          roles?.get(fill) ?? "",
          roles?.get("text") ?? "",
          strength,
        );

        const ratio = contrast(roles?.get(label) ?? "", hovered);

        expect(ratio).toBeGreaterThanOrEqual(4.5);
      },
    );

    it.each(OVER)(
      "keeps %s on %s, over what shows through it, at 4.5:1 or more",
      (color, surface, under) => {
        const roles = palettes.get(id) ?? new Map<string, string>();
        const behind = paint(
          `var(--fz-${surface})`,
          roles,
          layered(under, roles),
        );

        const ratio = contrast(roles.get(color) ?? "", behind);

        expect(ratio).toBeGreaterThanOrEqual(4.5);
      },
    );
  });
});

describe("luminance and contrast", () => {
  it("measures black on white at 21:1", () => {
    expect(contrast("#000", "#ffffff")).toBe(21);
  });

  it("measures a color on itself at 1:1", () => {
    expect(contrast("#2f7d4f", "#2f7d4f")).toBe(1);
  });

  it("mixes two colors channel by channel", () => {
    expect(mix("#ff0000", "#0000ff", 0.75)).toBe("#bf0040");
  });

  it("finds how much of its fill a hovered button keeps", () => {
    expect(hoverStrength()).toBeGreaterThan(0);
  });

  it("paints a tint of a role over what is under it", () => {
    const roles = new Map([["text", "#ffffff"]]);

    expect(
      paint(
        "color-mix(in srgb, var(--fz-text) 25%, transparent)",
        roles,
        "#000",
      ),
    ).toBe("#404040");
  });

  it("paints a translucent rgba() over what is under it", () => {
    expect(paint("rgba(0, 0, 255, 0.5)", new Map(), "#ff0000")).toBe("#800080");
  });
});
