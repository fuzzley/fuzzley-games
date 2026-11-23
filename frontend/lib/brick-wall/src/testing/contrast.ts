import { contrast, rgbOf } from "@fz/style/testing";
import { THEMES, type Theme } from "@fz/style/themes";
import { describe, expect, it } from "vitest";

/** The contrast a graphic keeps against what it is drawn on, as WCAG asks of graphics. */
export const GRAPHIC = 3;

/** The contrast text keeps against what it is written on, as WCAG asks of text. */
export const TEXT = 4.5;

/** Describes a color a wall game holds to a contrast against what it lies on, in one palette. */
export interface ContrastPair {
  /** What the color draws, as a case names it, such as "guide". */
  readonly name: string;
  readonly color: number;
  /** What it lies on, as a case names it, such as "field". */
  readonly on: string;
  readonly under: number;
  /** The least contrast it keeps: {@link GRAPHIC} or {@link TEXT}. */
  readonly least: number;
}

/**
 * Returns the pairs of each of some named colors against what they all lie
 * on, each held to the same contrast, 3:1 unless another is given.
 */
export function against(
  on: string,
  under: number,
  colors: readonly (readonly [name: string, color: number])[],
  least: number = GRAPHIC,
): readonly ContrastPair[] {
  return colors.map(([name, color]) => ({ name, color, on, under, least }));
}

/** Returns the contrast between a pair's two colors, as WCAG measures it. */
export function contrastOf(pair: ContrastPair): number {
  return contrast(rgbOf(pair.color), rgbOf(pair.under));
}

/** Fails the spec it runs in where a pair's colors keep less than its least contrast. */
export function expectContrast(pair: ContrastPair): void {
  expect(
    contrastOf(pair),
    `the ${pair.name} on the ${pair.on}`,
  ).toBeGreaterThanOrEqual(pair.least);
}

/**
 * Holds each pair a game lists to its contrast, in every palette, as a case
 * of its own under a block for the palette: what a game lists for a
 * palette, a function of it, is all that palette's checks, so a color the
 * list leaves out is checked in none.
 */
export function holdContrast(
  pairsIn: (theme: Theme) => readonly ContrastPair[],
): void {
  describe.each(THEMES)("in $name", (theme) => {
    it.each(pairsIn(theme))(
      "keeps the $name at $least:1 or more against the $on",
      expectContrast,
    );
  });
}
