import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { type FileImporter, compile } from "sass";
import { THEMES, darkTheme } from "@fz/style/themes";
import { FELT_KEYS, TABLE_FELTS } from "@/ui/app/model/table_felt";

// Finds what a stylesheet loads from a package as Vite does: @fz/style's
// stylesheets under its exports' `sass` condition, which Node's resolver
// doesn't take, and the font through its own exports.
const require = createRequire(import.meta.url);
const STYLE_ROOT = path.resolve(
  path.dirname(require.resolve("@fz/style/themes")),
  "..",
);
const STYLE_EXPORTS = (
  JSON.parse(readFileSync(path.join(STYLE_ROOT, "package.json"), "utf8")) as {
    exports: Record<string, string | { sass?: string }>;
  }
).exports;
const packages: FileImporter = {
  findFileUrl: (url) => {
    if (!url.startsWith("@fz/style"))
      return pathToFileURL(require.resolve(url));
    const entry = STYLE_EXPORTS[`.${url.slice("@fz/style".length)}`];
    return typeof entry === "object" && entry.sass
      ? pathToFileURL(path.join(STYLE_ROOT, entry.sass))
      : null;
  },
};

/** Returns the CSS the app's global stylesheet compiles to. */
function compiledGlobal(): string {
  const file = fileURLToPath(
    new URL("../../../../src/ui/app/styles/global.scss", import.meta.url),
  );
  return compile(file, { importers: [packages] }).css;
}

/** Returns each palette's roles and their colors, by the palette's id. */
function palettes(
  css: string,
): ReadonlyMap<string, ReadonlyMap<string, string>> {
  const found = new Map<string, Map<string, string>>();
  for (const [, id = "", body = ""] of css.matchAll(
    /\[data-theme="?([\w-]+)"?\]\s*\{([^}]*)\}/g,
  )) {
    found.set(
      id,
      new Map(
        [...body.matchAll(/--fz-([\w-]+):\s*([^;]+);/g)].map(
          ([, role = "", value = ""]) => [role, value.trim()],
        ),
      ),
    );
  }
  return found;
}

/**
 * Returns how much of a color a token mixes with transparent, from 0 to 1,
 * such as the header's glass, `color-mix(in srgb, var(--fz-bar) 75%, …)`.
 * Sass passes a custom property's value through as written, line breaks and
 * all.
 */
function strength(css: string, token: string, of: string): number {
  const percent = new RegExp(
    `${token}:\\s*color-mix\\(\\s*in srgb,\\s*var\\(${of}\\)\\s+(\\d+)%,\\s*transparent\\s*\\)`,
  ).exec(css)?.[1];
  if (percent === undefined) throw new Error(`${token} is no tint of ${of}`);
  return Number(percent) / 100;
}

/** Returns a hex color's red, green and blue, from 0 to 255. */
function channels(hex: string): readonly number[] {
  const digits = hex.slice(1);
  const full = digits.length === 3 ? digits.replace(/./g, "$&$&") : digits;
  return [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16));
}

/** Returns a color laid over another at some opacity, as the browser blends it. */
function over(
  top: readonly number[],
  under: readonly number[],
  opacity: number,
): readonly number[] {
  return top.map(
    (channel, index) => channel * opacity + (under[index] ?? 0) * (1 - opacity),
  );
}

/** Returns a color's relative luminance, as WCAG defines it. */
function luminance(color: readonly number[]): number {
  const [red = 0, green = 0, blue = 0] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Returns the contrast ratio between two colors, from 1 to 21. */
function contrast(a: readonly number[], b: readonly number[]): number {
  const [lighter = 0, darker = 0] = [luminance(a), luminance(b)].sort(
    (x, y) => y - x,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

// The header is glass over the felt, so its labels' contrast depends on the
// felt as well as on the palette its chrome wears: the one in use or its dark
// partner.
describe("the header's contrast", () => {
  const css = compiledGlobal();
  const roles = palettes(css);
  const glass = strength(css, "--surface-panel-translucent", "--fz-bar");
  const wash = strength(css, "--fz-wash-2", "--fz-text");

  describe.each(THEMES)("in $name", ({ id }) => {
    const chrome = roles.get(darkTheme(id));
    const felts = [
      { name: "its own felt", color: roles.get(id)?.get("felt") ?? "" },
      ...FELT_KEYS.map((key) => TABLE_FELTS[key]),
    ];

    it.each(felts)(
      "keeps a metric's muted label at 4.5:1 or more over $name",
      ({ color }) => {
        const bar = over(
          channels(chrome?.get("bar") ?? ""),
          channels(color),
          glass,
        );
        const card = over(channels(chrome?.get("text") ?? ""), bar, wash);

        const ratio = contrast(channels(chrome?.get("muted") ?? ""), card);

        expect(ratio).toBeGreaterThanOrEqual(4.5);
      },
    );
  });
});
