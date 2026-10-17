import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileString } from "sass";
import { DEFAULT_THEMES, THEMES } from "../provider/themes";

// The palettes are written in Sass and the palette list in TypeScript; these
// specs keep the two in step, and check Sass's guard against a palette that
// sets different roles from the default.
describe("palettes", () => {
  // A string, not new URL(): jsdom's URL isn't one Node's fileURLToPath takes.
  const styles = path.dirname(fileURLToPath(import.meta.url));

  /** Returns the palettes' CSS, with `$palettes` configured if given. */
  function compilePalettes(palettes?: string): string {
    const config = palettes ? ` with ($palettes: ${palettes})` : "";
    return compileString(`@use "palettes"${config};`, { loadPaths: [styles] })
      .css;
  }

  /** Returns each palette's name, color-scheme and selector, in order. */
  function palettes(): { name: string; mode: string; selector: string }[] {
    return [
      ...compilePalettes().matchAll(
        /([^{}]*\[data-theme=["']?([\w-]+)["']?\])\s*\{\s*color-scheme:\s*(\w+)/g,
      ),
    ].map(([, selector = "", name = "", mode = ""]) => ({
      name,
      mode,
      selector: selector.trim(),
    }));
  }

  it("has a palette for every theme, and no other", () => {
    expect(palettes().map(({ name }) => name)).toEqual(
      THEMES.map(({ id }) => id),
    );
  });

  it("gives each palette its theme's light or dark mode", () => {
    expect(palettes().map(({ name, mode }) => `${name}: ${mode}`)).toEqual(
      THEMES.map(({ id, mode }) => `${id}: ${mode}`),
    );
  });

  it("styles a page with no palette yet as the light default", () => {
    const root = palettes().find(({ selector }) =>
      selector.startsWith(":root"),
    );

    expect(root?.name).toBe(DEFAULT_THEMES.light);
  });

  it("fails the build when a palette lacks a role the default sets", () => {
    const broken =
      "(classic: (mode: light, page: #fff, text: #000), pastel: (mode: light, page: #fff))";

    expect(() => compilePalettes(broken)).toThrow(
      "The pastel palette has no text, which every palette sets.",
    );
  });

  it("fails the build when a palette sets a role the default doesn't", () => {
    const broken =
      "(classic: (mode: light, page: #fff), pastel: (mode: light, page: #fff, glow: #f0f))";

    expect(() => compilePalettes(broken)).toThrow(
      "The pastel palette sets glow, which classic doesn't.",
    );
  });
});
