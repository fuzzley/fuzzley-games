import { DEFAULT_BACKGROUND_COLOR } from "@/engine/render/view/presentation";

/** Describes a table felt a player can choose: its name and board colour. */
export interface TableFelt {
  readonly name: string;
  readonly color: string;
}

/** The felts on offer, in the order they are shown. */
export const TABLE_FELTS = {
  green: { name: "Emerald Felt", color: DEFAULT_BACKGROUND_COLOR },
  blue: { name: "Deep Ocean", color: "#1b4353" },
  charcoal: { name: "Midnight Charcoal", color: "#2b2d42" },
  purple: { name: "Royal Velvet", color: "#3c096c" },
} as const satisfies Record<string, TableFelt>;

/** Names one of the felts on offer. */
export type FeltKey = keyof typeof TABLE_FELTS;

/** Every felt's key, in the order they are shown. */
export const FELT_KEYS = Object.keys(TABLE_FELTS) as FeltKey[];

/**
 * Names the felt a player chose: one on offer, or the palette's own, which
 * changes with the theme.
 */
export type FeltChoice = FeltKey | "theme";

/** The felt a player gets before choosing one: the palette's. */
export const DEFAULT_FELT: FeltChoice = "theme";

/** Returns whether a value names a felt on offer. */
export function isFeltKey(value: unknown): value is FeltKey {
  return FELT_KEYS.some((key) => key === value);
}

/** Returns whether a value names a felt a player can choose. */
export function isFeltChoice(value: unknown): value is FeltChoice {
  return value === "theme" || isFeltKey(value);
}

/**
 * Returns the felt drawn in the given colour, or undefined, for settings saved
 * when the colour was stored rather than the felt.
 */
export function feltWithColor(color: unknown): FeltKey | undefined {
  return FELT_KEYS.find((key) => TABLE_FELTS[key].color === color);
}
