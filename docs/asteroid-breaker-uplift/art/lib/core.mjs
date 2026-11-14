// What every drawing of the uplift's art shares: a seeded random, a little
// vector math, colors, and SVG written as strings. The art illustrates the
// plan (../../plan.md) and is not the game's code; the game would redraw it
// in `@fz/phaser/shapes`'s commands from the geometry `make-assets.mjs`
// writes out.

/** @typedef {[number, number]} Point */
/** @typedef {[number, number, number]} Vec3 */

/** A turn, in radians. */
export const TURN = Math.PI * 2;

/**
 * Returns a seeded random: a function that returns the next number from 0
 * up to 1, the same run every time from the same seed.
 *
 * @param {number} seed
 * @returns {() => number}
 */
export function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a number drawn evenly from a span.
 *
 * @param {() => number} random
 * @param {number} least
 * @param {number} most
 * @returns {number}
 */
export function between(random, least, most) {
  return least + (most - least) * random();
}

/**
 * Returns a whole number drawn evenly from a span, both ends included.
 *
 * @param {() => number} random
 * @param {number} least
 * @param {number} most
 * @returns {number}
 */
export function wholeBetween(random, least, most) {
  return Math.floor(between(random, least, most + 1));
}

/**
 * Returns one of a list's entries, drawn evenly.
 *
 * @template T
 * @param {() => number} random
 * @param {readonly T[]} list
 * @returns {T}
 */
export function pick(random, list) {
  return /** @type {T} */ (list[Math.floor(random() * list.length)]);
}

/**
 * Returns a value held between two bounds.
 *
 * @param {number} value
 * @param {number} least
 * @param {number} most
 * @returns {number}
 */
export function clamp(value, least, most) {
  return Math.min(most, Math.max(least, value));
}

/**
 * Returns the value a share of the way from one number to another.
 *
 * @param {number} from
 * @param {number} to
 * @param {number} share
 * @returns {number}
 */
export function lerp(from, to, share) {
  return from + (to - from) * share;
}

/**
 * Returns the point at an angle and a distance from a middle; angle 0 points
 * right and a quarter turn points down, as the screen's y does.
 *
 * @param {number} angle
 * @param {number} radius
 * @param {Point} [middle]
 * @returns {Point}
 */
export function polar(angle, radius, middle = [0, 0]) {
  return [
    middle[0] + Math.cos(angle) * radius,
    middle[1] + Math.sin(angle) * radius,
  ];
}

/**
 * Returns a point turned about the origin.
 *
 * @param {Point} point
 * @param {number} angle
 * @returns {Point}
 */
export function turned([x, y], angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c - y * s, x * s + y * c];
}

/**
 * Returns a 3D vector at length one.
 *
 * @param {Vec3} v
 * @returns {Vec3}
 */
export function unit([x, y, z]) {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/**
 * Returns the normal of a triangle in 3D, toward the viewer (z up).
 *
 * @param {Vec3} a
 * @param {Vec3} b
 * @param {Vec3} c
 * @returns {Vec3}
 */
export function normalOf(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  /** @type {Vec3} */
  const n = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const facing = unit(n);
  return facing[2] < 0 ? [-facing[0], -facing[1], -facing[2]] : facing;
}

// --- Colors -------------------------------------------------------------

/**
 * Returns a color's red, green and blue, each 0 to 255, from "#rrggbb" or
 * "#rgb".
 *
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function rgbOf(hex) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Returns "#rrggbb" for a red, green and blue, each 0 to 255.
 *
 * @param {readonly number[]} rgb
 * @returns {string}
 */
export function hexOf(rgb) {
  return `#${rgb
    .map((v) =>
      clamp(Math.round(v), 0, 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/**
 * Returns a color a share of the way from one to another.
 *
 * @param {string} from
 * @param {string} to
 * @param {number} share
 * @returns {string}
 */
export function mix(from, to, share) {
  const a = rgbOf(from);
  const b = rgbOf(to);
  return hexOf(a.map((v, i) => lerp(v, b[i] ?? 0, share)));
}

/**
 * Returns a color's relative luminance, as WCAG defines it.
 *
 * @param {string} hex
 * @returns {number}
 */
export function luminance(hex) {
  const [r, g, b] = rgbOf(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/**
 * Returns the contrast ratio of two colors, 1 to 21.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// --- SVG ----------------------------------------------------------------

/**
 * Returns a number as SVG writes it, to two places.
 *
 * @param {number} value
 * @returns {string}
 */
export function num(value) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/**
 * Returns attributes as SVG writes them, leaving out the undefined.
 *
 * @param {Record<string, string | number | undefined>} values
 * @returns {string}
 */
export function attrs(values) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(
      ([name, value]) =>
        ` ${name}="${typeof value === "number" ? num(value) : value}"`,
    )
    .join("");
}

/**
 * Returns points as a polygon's or a polyline's `points`.
 *
 * @param {readonly Point[]} points
 * @returns {string}
 */
export function pointsOf(points) {
  return points.map(([x, y]) => `${num(x)},${num(y)}`).join(" ");
}

/**
 * Returns a filled polygon.
 *
 * @param {readonly Point[]} points
 * @param {string} fill
 * @param {Record<string, string | number | undefined>} [more]
 * @returns {string}
 */
export function polygon(points, fill, more = {}) {
  return `<polygon points="${pointsOf(points)}"${attrs({ fill, ...more })}/>`;
}

/**
 * Returns a stroked line through points, round at its joins and ends.
 *
 * @param {readonly Point[]} points
 * @param {string} stroke
 * @param {number} width
 * @param {Record<string, string | number | undefined>} [more]
 * @returns {string}
 */
export function polyline(points, stroke, width, more = {}) {
  return `<polyline points="${pointsOf(points)}"${attrs({
    fill: "none",
    stroke,
    "stroke-width": width,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    ...more,
  })}/>`;
}

/**
 * Returns a filled circle.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {string} fill
 * @param {Record<string, string | number | undefined>} [more]
 * @returns {string}
 */
export function circle(cx, cy, r, fill, more = {}) {
  return `<circle${attrs({ cx, cy, r, fill, ...more })}/>`;
}

/**
 * Returns a filled ellipse.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} rx
 * @param {number} ry
 * @param {string} fill
 * @param {Record<string, string | number | undefined>} [more]
 * @returns {string}
 */
export function ellipse(cx, cy, rx, ry, fill, more = {}) {
  return `<ellipse${attrs({ cx, cy, rx, ry, fill, ...more })}/>`;
}

/**
 * Returns a ring: a circle stroked and not filled.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {string} stroke
 * @param {number} width
 * @param {Record<string, string | number | undefined>} [more]
 * @returns {string}
 */
export function ring(cx, cy, r, stroke, width, more = {}) {
  return `<circle${attrs({
    cx,
    cy,
    r,
    fill: "none",
    stroke,
    "stroke-width": width,
    ...more,
  })}/>`;
}

/**
 * Returns a rectangle, rounded if given a radius.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {string} fill
 * @param {Record<string, string | number | undefined>} [more]
 * @returns {string}
 */
export function rect(x, y, width, height, fill, more = {}) {
  return `<rect${attrs({ x, y, width, height, fill, ...more })}/>`;
}

/**
 * Returns a path.
 *
 * @param {string} d
 * @param {Record<string, string | number | undefined>} [more]
 * @returns {string}
 */
export function path(d, more = {}) {
  return `<path d="${d}"${attrs(more)}/>`;
}

/**
 * Returns a line of text.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} words
 * @param {Record<string, string | number | undefined>} [more]
 * @returns {string}
 */
export function text(x, y, words, more = {}) {
  const escaped = words
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<text${attrs({
    x,
    y,
    "font-family": "Inter, 'Segoe UI', system-ui, sans-serif",
    ...more,
  })}>${escaped}</text>`;
}

/**
 * Returns drawings in a group, moved, turned (in degrees) and scaled.
 *
 * @param {string} inner
 * @param {{ x?: number, y?: number, turn?: number, scale?: number, opacity?: number, more?: Record<string, string | number | undefined> }} [how]
 * @returns {string}
 */
export function place(
  inner,
  { x = 0, y = 0, turn = 0, scale = 1, opacity, more = {} } = {},
) {
  const transform = [
    x !== 0 || y !== 0 ? `translate(${num(x)} ${num(y)})` : "",
    turn !== 0 ? `rotate(${num(turn)})` : "",
    scale !== 1 ? `scale(${num(scale)})` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<g${attrs({ transform, opacity, ...more })}>${inner}</g>`;
}

/**
 * Returns an SVG file.
 *
 * @param {number} width
 * @param {number} height
 * @param {string} inner
 * @param {{ defs?: string, background?: string }} [how]
 * @returns {string}
 */
export function svgFile(width, height, inner, { defs = "", background } = {}) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${num(width)} ${num(height)}" width="${num(width)}" height="${num(height)}">`,
    defs ? `<defs>${defs}</defs>` : "",
    background ? rect(0, 0, width, height, background) : "",
    inner,
    "</svg>",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
