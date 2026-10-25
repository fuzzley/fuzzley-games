import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { type FileImporter, compile, compileString } from "sass";
import { THEMES } from "@fz/style/themes";

// Finds what a stylesheet loads from a package as Vite does: the libraries'
// stylesheets under their exports' `sass` condition, which Node's resolver
// doesn't take. The Solitaire Collection's contrast spec does the same. Paths
// are built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
const require = createRequire(import.meta.url);

/** Returns the `sass` export of a library's stylesheet, by its import URL. */
function librarySass(url: string): URL | null {
  const [scope, name, ...rest] = url.split("/");
  const packageName = `${scope ?? ""}/${name ?? ""}`;
  const root = (require.resolve.paths(packageName) ?? [])
    .map((folder) => path.join(folder, packageName))
    .find((folder) => existsSync(path.join(folder, "package.json")));
  if (!root) return null;
  const { exports } = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  ) as { exports: Record<string, string | { sass?: string }> };
  const entry = exports[[".", ...rest].join("/")];
  return typeof entry === "object" && entry.sass
    ? pathToFileURL(path.join(root, entry.sass))
    : null;
}

const packages: FileImporter = {
  findFileUrl: (url) =>
    url.startsWith("@fz/")
      ? librarySass(url)
      : pathToFileURL(require.resolve(url)),
};

/** Returns the CSS the app's global stylesheet compiles to. */
function compiledGlobal(): string {
  const file = path.join(import.meta.dirname, "../styles/global.scss");
  return compile(file, { importers: [packages] }).css;
}

/** Returns each number's ink, light and dark, as the board's mixin sets them. */
function inks(): ReadonlyMap<number, { light: string; dark: string }> {
  const { css } = compileString('@use "inks"; a { @include inks.inks; }', {
    loadPaths: [import.meta.dirname],
  });
  const found = new Map<number, { light: string; dark: string }>();
  for (const [, n = "", light = "", dark = ""] of css.matchAll(
    /--ink-(\d):\s*light-dark\((#\w+),\s*(#\w+)\)/g,
  )) {
    found.set(Number(n), { light, dark });
  }
  return found;
}

/** Returns each palette's own roles, by the palette's id. */
function palettes(
  css: string,
): ReadonlyMap<string, ReadonlyMap<string, string>> {
  const found = new Map<string, Map<string, string>>();
  for (const [, selectors = "", body = ""] of css.matchAll(
    /([^{}]+)\{([^{}]*)\}/g,
  )) {
    for (const [, id = ""] of selectors.matchAll(
      /\[data-theme="?([\w-]+)"?\]/g,
    )) {
      const roles = found.get(id) ?? new Map<string, string>();
      for (const [, role = "", value = ""] of body.matchAll(
        /--fz-([\w-]+):\s*([^;]+);/g,
      )) {
        roles.set(role, value.replace(/\s+/g, " ").trim());
      }
      found.set(id, roles);
    }
  }
  return found;
}

/**
 * Returns how much of a color a token mixes with transparent, from 0 to 1,
 * such as a wash, `color-mix(in srgb, var(--fz-text) 3%, …)`.
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

// Numbers and marks are held to 4.5:1, the bar for text, though WCAG asks
// only 3:1 of a graphic; a square's state is a graphic, held to 3:1.
describe("the board's contrast", () => {
  const css = compiledGlobal();
  const roles = palettes(css);
  const wash = strength(css, "--fz-wash-1", "--fz-text");
  const numberInks = inks();

  it("has an ink for every number", () => {
    expect([...numberInks.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  describe.each(THEMES)("in $name", ({ id, mode }) => {
    const palette = roles.get(id);

    /** Returns one of the palette's roles, as red, green and blue. */
    function role(name: string): readonly number[] {
      const value = palette?.get(name);
      if (!value) throw new Error(`${id} sets no --fz-${name}`);
      return channels(value);
    }

    const board = role("panel");
    const open = over(role("text"), board, wash);
    const hidden = role("accent");

    it.each([1, 2, 3, 4, 5, 6, 7, 8])(
      "keeps the number %d at 4.5:1 or more on its square",
      (n) => {
        const ink = numberInks.get(n)?.[mode] ?? "";

        expect(contrast(channels(ink), open)).toBeGreaterThanOrEqual(4.5);
      },
    );

    it("keeps a flag at 4.5:1 or more on its square", () => {
      expect(contrast(role("on-accent"), hidden)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps a mine stepped on at 4.5:1 or more on its square", () => {
      expect(
        contrast(role("on-danger"), role("danger")),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps the mines and wrong flags shown after a loss at 4.5:1 or more", () => {
      expect(contrast(role("text"), open)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps the stroke through a wrong flag at 3:1 or more", () => {
      expect(contrast(role("danger"), open)).toBeGreaterThanOrEqual(3);
    });

    it("tells a hidden square from an open one at 3:1 or more", () => {
      expect(contrast(hidden, open)).toBeGreaterThanOrEqual(3);
    });

    it("keeps the focus ring at 3:1 or more against the board", () => {
      expect(contrast(role("text"), board)).toBeGreaterThanOrEqual(3);
    });
  });
});
