// The fuzzball: the mark the site and the games share with fuzzley.info, a
// pom-pom with two eyes. Its geometry is fuzzley.info's (branding/favicon/
// icon.svg in that repository, drawn by make_favicons.py), on a 32-unit grid.

/** Describes an ellipse on the mark's grid. */
export interface Ellipse {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** Describes a circle on the mark's grid. */
export interface Circle {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

/**
 * The fuzzball's shapes, for an inline `<svg>` that colors the body and the
 * fur itself, such as with the palette's accent.
 */
export const FUZZBALL = {
  viewBox: "0 0 32 32",
  body: { cx: 16, cy: 17.2, r: 10.4 } satisfies Circle,
  /** The strands around the body, drawn as round-capped strokes. */
  fur: {
    d: "M24.2 17.15Q25.93 17.34 27.44 19.45M23.92 19.31Q25.5 19.93 26.36 22.34M23.49 20.54Q25 21.43 25.51 23.99M22.81 21.77Q24.12 22.88 24.17 25.45M21.39 23.38Q22.45 24.9 21.88 27.54M20.44 24.09Q21.14 25.54 20.15 27.82M18.91 24.86Q19.38 26.67 17.94 28.95M16.67 25.37Q16.59 26.85 14.68 28.26M14.67 25.29Q14.16 27.16 11.72 28.48M13.32 24.95Q12.56 26.55 10.05 27.29M12.2 24.46Q11.35 25.66 8.99 25.83M10.49 23.28Q9.36 24.24 7.01 23.81M9.55 22.26Q8.19 23.08 5.86 22.29M8.71 20.95Q7.12 21.55 4.87 20.34M7.99 18.96Q6.12 19.17 4.06 17.4M7.8 17.18Q6.03 16.98 4.5 14.84M7.98 15.5Q6.28 14.93 5.21 12.52M8.49 13.9Q7.12 13.09 6.7 10.65M9.67 11.99Q8.29 10.6 8.37 7.82M10.77 10.89Q9.77 9.37 10.42 6.79M11.74 10.19Q11.1 8.75 12.16 6.54M13.27 9.47Q12.85 7.67 14.35 5.44M15.4 9.02Q15.43 6.42 17.7 3.93M17.2 9.09Q17.76 6.73 20.43 4.93M18.96 9.55Q19.93 7.61 22.75 6.65M19.67 9.87Q20.57 8.49 23.07 8.16M21.78 11.38Q23.11 10.33 25.62 10.78M22.9 12.77Q24.39 12.05 26.72 13.04M23.31 13.49Q24.97 12.86 27.3 14.07M24.07 15.76Q25.67 15.68 27.37 17.47",
    width: 2.8,
  },
  eyes: [
    { cx: 13.4, cy: 17, rx: 2.3, ry: 3 },
    { cx: 20.6, cy: 17, rx: 2.3, ry: 3 },
  ] satisfies readonly Ellipse[],
  glints: [
    { cx: 14.2, cy: 15.8, r: 0.85 },
    { cx: 21.4, cy: 15.8, r: 0.85 },
  ] satisfies readonly Circle[],
  /** The eyes' color, the same in every palette, since they sit on the fur. */
  ink: "#14171b",
  glint: "#ffffff",
} as const;

/** The fur's color: one for both color schemes, or one for each. */
export type FuzzballFill =
  string | { readonly light: string; readonly dark: string };

/**
 * Returns the fuzzball as an SVG file, its fur in the given color.
 *
 * Leave out the glints for an image drawn 16 pixels across, where each is
 * under half a pixel and only turns the eye grey.
 */
export function fuzzballSvg(
  fill: FuzzballFill,
  { withGlints = true }: { withGlints?: boolean } = {},
): string {
  const { light, dark } =
    typeof fill === "string" ? { light: fill, dark: fill } : fill;
  const { body, fur, eyes, glints, ink, glint } = FUZZBALL;
  const furStyle = (color: string): string =>
    `.body{fill:${color}}.fur{stroke:${color}}`;
  const darkStyle =
    dark === light
      ? ""
      : `@media (prefers-color-scheme:dark){${furStyle(dark)}}`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${FUZZBALL.viewBox}">`,
    `<style>${furStyle(light)}${darkStyle}</style>`,
    `<circle class="body" cx="${body.cx}" cy="${body.cy}" r="${body.r}"/>`,
    `<path class="fur" d="${fur.d}" fill="none" stroke-width="${fur.width}" stroke-linecap="round"/>`,
    ...eyes.map(
      ({ cx, cy, rx, ry }) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${ink}"/>`,
    ),
    ...(withGlints ? glints : []).map(
      ({ cx, cy, r }) =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${glint}"/>`,
    ),
    "</svg>",
    "",
  ].join("\n");
}
