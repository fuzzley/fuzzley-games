import { DEFAULT_BACKGROUND_COLOR } from "@/engine/render/presentation";

/** Describes a table felt a player can choose: its name and board colour. */
export interface TableTheme {
  readonly name: string;
  readonly color: string;
}

/** The felts on offer, in the order they are shown. */
export const TABLE_THEMES = {
  green: { name: "Emerald Felt", color: DEFAULT_BACKGROUND_COLOR },
  blue: { name: "Deep Ocean", color: "#1b4353" },
  charcoal: { name: "Midnight Charcoal", color: "#2b2d42" },
  purple: { name: "Royal Velvet", color: "#3c096c" },
} as const satisfies Record<string, TableTheme>;

/** Names one of the felts on offer. */
export type ThemeKey = keyof typeof TABLE_THEMES;

/** Every felt's key, in the order they are shown. */
export const THEME_KEYS = Object.keys(TABLE_THEMES) as ThemeKey[];

/** The felt a player gets before choosing one. */
export const DEFAULT_THEME: ThemeKey = "green";

/** Returns whether a value names a felt on offer. */
export function isThemeKey(value: unknown): value is ThemeKey {
  return THEME_KEYS.some((key) => key === value);
}

/**
 * Returns the felt drawn in the given colour, or undefined, for settings saved
 * when the colour was stored rather than the felt.
 */
export function themeWithColor(color: unknown): ThemeKey | undefined {
  return THEME_KEYS.find((key) => TABLE_THEMES[key].color === color);
}
