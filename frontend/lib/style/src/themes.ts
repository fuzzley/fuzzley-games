/** Whether a palette is light or dark, which sets the page's color-scheme. */
export type ColorMode = "light" | "dark";

/**
 * The palettes a player can choose between, with their colors in
 * tokens/_palettes.scss under [data-theme="<id>"].
 */
export const THEMES = [
  { id: "emerald", name: "Emerald felt", mode: "dark" },
  { id: "classic", name: "Classic felt", mode: "light" },
  { id: "pastel", name: "Soft pastel", mode: "light" },
  { id: "casino", name: "Casino night", mode: "dark" },
  { id: "midnight", name: "Midnight blue", mode: "dark" },
] as const satisfies readonly { id: string; name: string; mode: ColorMode }[];

/** A palette's id, such as "classic". */
export type ThemeId = (typeof THEMES)[number]["id"];

/** The id of a palette of one mode, such as "casino" for dark. */
export type ThemeIdOfMode<M extends ColorMode> = Extract<
  (typeof THEMES)[number],
  { mode: M }
>["id"];

/**
 * The dark palette whose colors each light one lends a game's chrome, for a
 * game whose chrome is drawn for dark palettes only, as the Solitaire
 * Collection's is.
 */
export const DARK_PARTNERS: Readonly<
  Record<ThemeIdOfMode<"light">, ThemeIdOfMode<"dark">>
> = {
  classic: "casino",
  pastel: "midnight",
};

/** Returns a palette if it is dark, or else its dark partner. */
export function darkTheme(id: ThemeId): ThemeId {
  for (const [light, dark] of Object.entries(DARK_PARTNERS)) {
    if (light === id) return dark;
  }
  return id;
}

/** Describes a palette a player can choose. */
export interface Theme {
  readonly id: ThemeId;
  readonly name: string;
  readonly mode: ColorMode;
}

/**
 * The palette for each system color scheme, until a player chooses one.
 *
 * Both are Emerald felt, the Solitaire Collection's own table, for now, so a
 * light system scheme gets a dark palette too.
 */
export const DEFAULT_THEMES: Readonly<Record<ColorMode, ThemeId>> = {
  light: "emerald",
  dark: "emerald",
};

/**
 * The roles every palette sets, each as the custom property --fz-<role>, for
 * code that reads one, such as the color of the browser's own toolbar.
 */
export const PALETTE_ROLES = [
  "page",
  "bar",
  "bar-text",
  "bar-line",
  "text",
  "muted",
  "line",
  "panel",
  "panel-raised",
  "field",
  "field-line",
  "field-text",
  "field-muted",
  "accent",
  "on-accent",
  "danger",
  "on-danger",
  "warning",
  "on-warning",
  "felt",
  "on-felt",
  "scrim",
] as const;

/** A palette role, such as "accent". */
export type PaletteRole = (typeof PALETTE_ROLES)[number];

/**
 * The localStorage key a player's choice is kept under, shared by the site
 * and every game, which are served from one origin.
 */
export const THEME_STORAGE_KEY = "fuzzley-theme";

/** Returns whether a value names one of the palettes. */
export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
