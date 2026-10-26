import type { ColorMode } from "../themes.ts";

/** Holds what a page needs to pick a palette before it paints. */
export interface ThemeChoice {
  readonly ids: readonly string[];
  readonly storageKey: string;
  readonly defaults: Readonly<Record<ColorMode, string>>;
}

/**
 * Returns theme.js, which picks the palette before anything paints: the
 * player's saved choice, else the default for the system's color scheme.
 *
 * It is plain ES5, since it runs before anything else on the page.
 */
export function themeBootstrapScript({
  ids,
  storageKey,
  defaults,
}: ThemeChoice): string {
  const json = (value: unknown): string => JSON.stringify(value);
  return `// Picks the palette before anything paints; the app's ThemeService takes
// over once it starts. Generated from @fz/style's themes.ts.
(function () {
  var themes = ${json(ids)};
  var saved;
  try {
    saved = localStorage.getItem(${json(storageKey)});
  } catch (e) {}
  var dark =
    window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme =
    themes.indexOf(saved) >= 0 ? saved : dark ? ${json(defaults.dark)} : ${json(defaults.light)};
})();
`;
}
