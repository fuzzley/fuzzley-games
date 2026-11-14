// The site's four palettes, as `@fz/style`'s `tokens/_palettes.scss` sets
// them, the roles the field is drawn in, and the game's own inks for the
// rocks and the pilots, as `src/view/colors/inks.ts` and `@fz/phaser/color`
// hold them today. The uplift adds no hex of its own to these: every new
// tone is a mix of two of them, so each palette gets the art in its own
// colors.

import { mix } from "./core.mjs";

/**
 * @typedef {object} Palette
 * @property {"classic" | "pastel" | "casino" | "midnight"} id
 * @property {string} name
 * @property {"light" | "dark"} mode
 * @property {string} page
 * @property {string} bar
 * @property {string} barText
 * @property {string} barLine
 * @property {string} panel
 * @property {string} field
 * @property {string} fieldLine
 * @property {string} fieldText
 * @property {string} fieldMuted
 * @property {string} accent
 * @property {string} onAccent
 * @property {string} danger
 * @property {string} warning
 */

/** @type {Readonly<Record<Palette["id"], Palette>>} */
export const PALETTES = {
  classic: {
    id: "classic",
    name: "Classic felt",
    mode: "light",
    page: "#ffffff",
    bar: "#ffffff",
    barText: "#1b1f24",
    barLine: "#e2e5e9",
    panel: "#f1f3f5",
    field: "#ffffff",
    fieldLine: "#e2e5e9",
    fieldText: "#1b1f24",
    fieldMuted: "#5d6672",
    accent: "#2f7d4f",
    onAccent: "#ffffff",
    danger: "#c62828",
    warning: "#a84b06",
  },
  pastel: {
    id: "pastel",
    name: "Soft pastel",
    mode: "light",
    page: "#f4f1fb",
    bar: "#f4f1fb",
    barText: "#2b2240",
    barLine: "#e2dcf0",
    panel: "#e9e3f7",
    field: "#ffffff",
    fieldLine: "#e2dcf0",
    fieldText: "#2b2240",
    fieldMuted: "#6a6080",
    accent: "#6d3fc8",
    onAccent: "#ffffff",
    danger: "#c0265a",
    warning: "#964a00",
  },
  casino: {
    id: "casino",
    name: "Casino night",
    mode: "dark",
    page: "#101418",
    bar: "#101418",
    barText: "#eceff1",
    barLine: "#232a31",
    panel: "#1c2329",
    field: "#1c2329",
    fieldLine: "#2a333b",
    fieldText: "#eceff1",
    fieldMuted: "#9aa5af",
    accent: "#e0b13a",
    onAccent: "#1a1300",
    danger: "#f47c74",
    warning: "#f39a4b",
  },
  midnight: {
    id: "midnight",
    name: "Midnight blue",
    mode: "dark",
    page: "#0e1a2b",
    bar: "#0e1a2b",
    barText: "#e6edf7",
    barLine: "#1f3150",
    panel: "#172741",
    field: "#172741",
    fieldLine: "#24395c",
    fieldText: "#e6edf7",
    fieldMuted: "#93a4bd",
    accent: "#4cc3ff",
    onAccent: "#062033",
    danger: "#ff8080",
    warning: "#fbbf24",
  },
};

/** The rocks' inks today, by the palette's mode. */
export const ROCK_INKS = {
  light: {
    stone: "#8b7f70",
    ice: "#3f88ad",
    crystal: "#7a4fd0",
    iron: "#4d5866",
    volatile: "#c4452c",
    lodestone: "#9a3456",
    boulder: "#6e6255",
    core: "#ffd27a",
  },
  dark: {
    stone: "#a99d8e",
    ice: "#86cdee",
    crystal: "#b99cff",
    iron: "#8e9cab",
    volatile: "#f0886a",
    lodestone: "#e57d9c",
    boulder: "#c4b6a3",
    core: "#ffe6a8",
  },
};

/** The eight pilots' inks, by the palette's mode: coral, orange, gold, green, teal, blue, violet, pink. */
export const PILOT_INKS = {
  light: [
    "#d33f37",
    "#c05a0c",
    "#957000",
    "#2c8a3a",
    "#0f8378",
    "#2c72d6",
    "#8b55dc",
    "#c83a8e",
  ],
  dark: [
    "#ff7b70",
    "#ff9b45",
    "#f2cb45",
    "#72d36a",
    "#3fd2c2",
    "#72adff",
    "#b892ff",
    "#ff7dc3",
  ],
};

/** The eyes' ink and their glint, the same in every palette. */
export const EYE_INK = "#14171b";
export const GLINT = "#ffffff";

/**
 * Returns the tones a lit thing is drawn in, from its ink: where the light
 * falls, its own ink, and its shade. In a light palette the ink is already
 * the darkest a thing may be against a white field and still read as its
 * color, so the light side lifts toward the field; in a dark palette the
 * shade sinks toward the field and takes a little of its hue, as a rock's
 * dark side does in space.
 *
 * @param {string} ink
 * @param {Palette} palette
 * @returns {{ lit: string, ink: string, shade: string, deep: string }}
 */
export function tonesOf(ink, palette) {
  if (palette.mode === "light") {
    return {
      lit: mix(ink, "#ffffff", 0.3),
      ink,
      shade: mix(ink, palette.fieldText, 0.3),
      deep: mix(ink, palette.fieldText, 0.52),
    };
  }
  return {
    lit: mix(ink, "#ffffff", 0.42),
    ink,
    shade: mix(ink, palette.field, 0.44),
    deep: mix(ink, palette.field, 0.66),
  };
}
