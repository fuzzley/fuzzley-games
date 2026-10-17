/** Whether a palette is light or dark, which sets the page's color-scheme. */
export type ColorMode = "light" | "dark";

/**
 * The palettes a player can choose between. Their colors are in
 * styles/_palettes.scss, under [data-theme="<id>"].
 */
export const THEMES = [
  { id: "classic", name: "Classic felt", mode: "light" },
  { id: "pastel", name: "Soft pastel", mode: "light" },
  { id: "casino", name: "Casino night", mode: "dark" },
  { id: "midnight", name: "Midnight blue", mode: "dark" },
] as const satisfies readonly { id: string; name: string; mode: ColorMode }[];

/** A palette's id, such as "classic". */
export type ThemeId = (typeof THEMES)[number]["id"];

/** A palette a player can choose. */
export interface Theme {
  readonly id: ThemeId;
  readonly name: string;
  readonly mode: ColorMode;
}

/** The palette for each system color scheme, until a player chooses one. */
export const DEFAULT_THEMES: Readonly<Record<ColorMode, ThemeId>> = {
  light: "classic",
  dark: "casino",
};

/** The localStorage key a player's choice is kept under. */
export const THEME_STORAGE_KEY = "fuzzley-theme";

/** Returns whether a value names one of the palettes. */
export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
