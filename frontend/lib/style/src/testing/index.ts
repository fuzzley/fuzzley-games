import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { type FileImporter, compile } from "sass";
import { onTestFinished } from "vitest";

/** A color's red, green and blue, each from 0 to 255. */
export type Rgb = readonly [red: number, green: number, blue: number];

/** The custom properties a palette sets, by their names without `--fz-`. */
export type Roles = ReadonlyMap<string, string>;

/**
 * Returns the CSS a stylesheet compiles to, loading packages as an app's Vite
 * does: a library's stylesheets under its exports' `sass` condition, which
 * Node's resolver doesn't take, and any other package, such as the font,
 * through its own exports.
 */
export function compileStylesheet(file: string): string {
  const require = createRequire(file);
  const packages: FileImporter = {
    findFileUrl: (url) =>
      url.startsWith("@fz/")
        ? librarySass(require, url)
        : pathToFileURL(require.resolve(url)),
  };
  return compile(file, { importers: [packages] }).css;
}

/** Returns the `sass` export of a library's stylesheet, by its import URL. */
function librarySass(
  require: ReturnType<typeof createRequire>,
  url: string,
): URL | null {
  const [scope = "", name = "", ...rest] = url.split("/");
  const packageName = `${scope}/${name}`;
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

/**
 * Returns the custom properties each palette sets in compiled CSS, by the
 * palette's id: those declared on it (`[data-theme=casino]`) over those
 * declared on every palette (`[data-theme]`), such as the tints.
 */
export function paletteRoles(css: string): ReadonlyMap<string, Roles> {
  const everywhere = new Map<string, string>();
  const own = new Map<string, Map<string, string>>();
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selectors = "", body = ""] of uncommented.matchAll(
    /([^{}]+)\{([^{}]*)\}/g,
  )) {
    const declared = [...body.matchAll(/--fz-([\w-]+):\s*([^;]+);/g)].map(
      ([, name = "", value = ""]) => [name, normalized(value)] as const,
    );
    for (const selector of selectors.split(",")) {
      const palette = /^\[data-theme(?:=["']?([\w-]+)["']?)?\]$/.exec(
        selector.trim(),
      );
      if (!palette) continue;
      const [, id] = palette;
      const into =
        id === undefined
          ? everywhere
          : (own.get(id) ?? own.set(id, new Map()).get(id));
      for (const [name, value] of declared) into?.set(name, value);
    }
  }
  return new Map(
    [...own].map(([id, roles]) => [id, new Map([...everywhere, ...roles])]),
  );
}

/** Reads an app's palettes, as its global stylesheet sets them. */
export interface StylesheetPalettes {
  /**
   * Returns every role a palette sets, as `paint()` takes them.
   *
   * @throws {Error} for a palette the stylesheet doesn't set.
   */
  palette(id: string): Roles;
  /**
   * Returns one of a palette's roles, as the stylesheet sets it.
   *
   * @throws {Error} for a palette or a role the stylesheet doesn't set.
   */
  role(id: string, name: string): string;
  /**
   * Returns a palette's roles under the names an app reads them by, as
   * `ThemeService`'s `roles()` gives them from the page.
   *
   * @throws {Error} for a palette or a role the stylesheet doesn't set.
   */
  rolesIn<Key extends string>(
    id: string,
    names: Readonly<Record<Key, string>>,
  ): Record<Key, string>;
}

/**
 * Returns the palettes the global stylesheet at a path sets, compiling it
 * when first asked for one, so a spec that never asks compiles nothing.
 */
export function stylesheetPalettes(file: string): StylesheetPalettes {
  let palettes: ReadonlyMap<string, Roles> | undefined;
  const palette = (id: string): Roles => {
    palettes ??= paletteRoles(compileStylesheet(file));
    const roles = palettes.get(id);
    if (roles === undefined) {
      throw new Error(`No palette ${id} in ${path.basename(file)}`);
    }
    return roles;
  };
  const role = (id: string, name: string): string => {
    const value = palette(id).get(name);
    if (value === undefined) throw new Error(`No --fz-${name} in ${id}`);
    return value;
  };
  return {
    palette,
    role,
    rolesIn<Key extends string>(
      id: string,
      names: Readonly<Record<Key, string>>,
    ): Record<Key, string> {
      return Object.fromEntries(
        Object.entries<string>(names).map(([key, name]) => [
          key,
          role(id, name),
        ]),
      ) as Record<Key, string>;
    },
  };
}

/**
 * Gives the page `colors` until the test finishes, each under the role
 * `names` gives its key, as `ThemeService.roles()` reads them.
 *
 * It paints in a test or a `beforeEach`; in a `beforeAll` it throws, having
 * painted nothing, since no test is running to finish.
 */
export function paintRoles<Key extends string>(
  names: Readonly<Record<Key, string>>,
  colors: Readonly<Record<Key, string>>,
): void {
  const { style } = document.documentElement;
  const painted = (Object.keys(names) as Key[]).map((key) => ({
    property: `--fz-${names[key]}`,
    color: colors[key],
  }));
  const before = painted.map(({ property }) => ({
    property,
    color: style.getPropertyValue(property),
  }));
  onTestFinished(() => {
    for (const { property, color } of before) {
      if (color === "") style.removeProperty(property);
      else style.setProperty(property, color);
    }
  });
  for (const { property, color } of painted) {
    style.setProperty(property, color);
  }
}

/**
 * Returns a custom property's value on one line, as Sass passes it through
 * as written, line breaks and all.
 */
function normalized(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\( /g, "(")
    .replace(/ \)/g, ")")
    .trim();
}

/** Returns a hex color's red, green and blue. */
export function rgb(hex: string): Rgb {
  const digits = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(hex)?.[1];
  if (digits === undefined) throw new Error(`${hex} is no hex color`);
  const full = digits.length === 3 ? digits.replace(/./g, "$&$&") : digits;
  const channel = (start: number): number =>
    parseInt(full.slice(start, start + 2), 16);
  return [channel(0), channel(2), channel(4)];
}

/**
 * Returns the red, green and blue of a color written as a number, `0xrrggbb`,
 * as a canvas game, such as one drawn with Phaser, takes it.
 */
export function rgbOf(color: number): Rgb {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

/**
 * Returns a color laid over another at an opacity from 0 to 1, as the browser
 * blends it, which is also how `color-mix(in srgb, …)` mixes two colors.
 */
export function over(top: Rgb, under: Rgb, opacity: number): Rgb {
  const blend = (index: 0 | 1 | 2): number =>
    top[index] * opacity + under[index] * (1 - opacity);
  return [blend(0), blend(1), blend(2)];
}

/** Returns a color's relative luminance, as WCAG defines it, from 0 to 1. */
export function luminance([red, green, blue]: Rgb): number {
  const linear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

/** Returns the contrast ratio between two colors, from 1 to 21. */
export function contrast(a: Rgb, b: Rgb): number {
  const [first, second] = [luminance(a), luminance(b)];
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/**
 * Returns the color a custom property's value paints, as Sass writes the
 * palettes and their tints: a hex color, `black`, a translucent `rgba()`, a
 * role (`var(--fz-text)`) or a tint of one
 * (`color-mix(in srgb, var(--fz-text) 5%, transparent)`).
 *
 * A translucent value needs `under`, what shows through it; it throws without.
 */
export function paint(value: string, roles: Roles, under?: Rgb): Rgb {
  const css = normalized(value);
  const role = /^var\(--fz-([\w-]+)\)$/.exec(css)?.[1];
  if (role !== undefined) {
    const declared = roles.get(role);
    if (declared === undefined) throw new Error(`No --fz-${role} to paint`);
    return paint(declared, roles, under);
  }
  const tint = /^color-mix\(in srgb, (.+) ([\d.]+)%, transparent\)$/.exec(css);
  if (tint) {
    const [, color = "", percent = ""] = tint;
    return over(
      paint(color, roles, under),
      showingThrough(css, under),
      Number(percent) / 100,
    );
  }
  const translucent = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(css);
  if (translucent) {
    const [red, green, blue, alpha] = translucent.slice(1).map(Number);
    return over(
      [red ?? 0, green ?? 0, blue ?? 0],
      showingThrough(css, under),
      alpha ?? 0,
    );
  }
  if (css === "black") return [0, 0, 0];
  return rgb(css);
}

/** Returns what shows through a translucent value, which must be given. */
function showingThrough(value: string, under: Rgb | undefined): Rgb {
  if (under === undefined) {
    throw new Error(`${value} is translucent, so it needs what is under it`);
  }
  return under;
}
