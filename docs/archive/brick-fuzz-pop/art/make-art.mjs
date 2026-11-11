// Draws the concept art for the Brick Fuzz Pop plan (../plan.md): the brick
// catalog sheet, the field sheet, each kind of brick on its own and each of
// the fuzzball's states. It illustrates the plan and is not the game's code:
// the game will redraw this art itself.
//
// Run it with `node docs/archive/brick-fuzz-pop/art/make-art.mjs`. It needs
// nothing but Node, writes every file beside itself, and writes the same bytes
// each time.
//
// The art is flat, and drawn only with what the game's renderer has:
// rectangles, circles, rings, straight lines, polylines and polygons, in
// solid colors. The fuzzball's fur alone keeps its curves, as the game
// flattens them itself.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** @typedef {[number, number]} Point */

/**
 * @typedef {"red" | "orange" | "amber" | "green" | "teal" | "blue" | "violet" | "pink"} TintName
 */

/**
 * @typedef {object} Palette
 * @property {"dark" | "light"} id
 * @property {string} name
 * @property {string} panel What a sheet paints behind this palette's fields.
 * @property {string} page
 * @property {string} field
 * @property {string} fieldLine
 * @property {string} text
 * @property {string} muted
 * @property {string} accent
 * @property {string} danger
 * @property {string} warning
 * @property {string} steel
 * @property {Record<TintName, string>} tints
 */

/**
 * @typedef {object} Paint
 * @property {string} [fill]
 * @property {string} [stroke]
 * @property {number} [sw] The stroke's width.
 * @property {number} [rx] A rectangle's corner radius.
 * @property {"round" | "butt"} [cap]
 * @property {"round" | "miter"} [join]
 */

/**
 * @typedef {object} Type
 * @property {number} [size]
 * @property {number} [weight]
 * @property {string} [fill]
 * @property {"start" | "middle" | "end"} [anchor]
 * @property {number} [spacing] The letter spacing.
 */

/**
 * @typedef {object} Sheet
 * @property {number} width
 * @property {number} height
 * @property {string} body
 */

// ---------------------------------------------------------------- palettes

/** @type {Palette} */
const DARK = {
  id: "dark",
  name: "Midnight blue",
  panel: "#0e1a2b",
  page: "#0e1a2b",
  field: "#172741",
  fieldLine: "#24395c",
  text: "#e6edf7",
  muted: "#93a4bd",
  accent: "#4cc3ff",
  danger: "#ff8080",
  warning: "#fbbf24",
  steel: "#8a97ab",
  tints: {
    red: "#ec5b56",
    orange: "#e46612",
    amber: "#c38b0a",
    green: "#28a046",
    teal: "#169b97",
    blue: "#458cea",
    violet: "#a573e6",
    pink: "#e457a6",
  },
};

/** @type {Palette} */
const LIGHT = {
  id: "light",
  name: "Classic felt",
  panel: "#f1f3f5",
  page: "#ffffff",
  field: "#ffffff",
  fieldLine: "#e2e5e9",
  text: "#1b1f24",
  muted: "#5d6672",
  accent: "#2f7d4f",
  danger: "#c62828",
  warning: "#a84b06",
  steel: "#6b7480",
  tints: {
    red: "#d4322d",
    orange: "#b9530f",
    amber: "#936908",
    green: "#29803f",
    teal: "#167e7b",
    blue: "#256fd1",
    violet: "#8b55d2",
    pink: "#cb3087",
  },
};

const PALETTES = [DARK, LIGHT];
const WHITE = "#ffffff";
const BLACK = "#000000";
const FONT = "system-ui, sans-serif";

// ------------------------------------------------------------------ colors

/**
 * Returns a hex color's red, green and blue, each 0 to 255.
 *
 * @param {string} hex
 * @returns {number[]}
 */
function rgbOf(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/**
 * Returns color `a` mixed toward color `b` by `t`, from 0 to 1.
 *
 * @param {string} a
 * @param {string} b
 * @param {number} t
 * @returns {string}
 */
function mix(a, b, t) {
  const from = rgbOf(a);
  const to = rgbOf(b);
  return (
    "#" +
    from
      .map((v, i) =>
        Math.round(v + (to[i] - v) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/**
 * Returns the contrast between two colors, as WCAG measures it.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function contrast(a, b) {
  const [hi, lo] = [a, b]
    .map((hex) => {
      const [r, g, bl] = rgbOf(hex).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    })
    .sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// -------------------------------------------------------------- primitives

/**
 * Writes a number with at most `digits` decimals, and no trailing zeros.
 *
 * @param {number} n
 * @param {number} [digits]
 * @returns {string}
 */
function num(n, digits = 2) {
  const k = 10 ** digits;
  const v = Math.round(n * k) / k;
  return Object.is(v, -0) ? "0" : String(v);
}

/**
 * Escapes text for an SVG file.
 *
 * @param {string} s
 * @returns {string}
 */
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Writes an element's attributes, leaving out those that are undefined.
 *
 * @param {Record<string, string | number | undefined>} values
 * @returns {string}
 */
function attrs(values) {
  return Object.entries(values)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${typeof v === "number" ? num(v) : v}"`)
    .join("");
}

/**
 * Writes points as a `points` attribute's value.
 *
 * @param {Point[]} points
 * @returns {string}
 */
function pointList(points) {
  return points.map(([x, y]) => `${num(x)},${num(y)}`).join(" ");
}

/**
 * Draws a rectangle, rounded when the paint has a corner radius.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {Paint} paint
 * @returns {string}
 */
function rect(x, y, w, h, paint) {
  return `<rect${attrs({ x, y, width: w, height: h, rx: paint.rx, fill: paint.fill ?? "none", stroke: paint.stroke, "stroke-width": paint.sw })}/>`;
}

/**
 * Draws a circle: a disc when the paint fills it, a ring when it strokes it.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {Paint} paint
 * @returns {string}
 */
function circle(cx, cy, r, paint) {
  return `<circle${attrs({ cx, cy, r, fill: paint.fill ?? "none", stroke: paint.stroke, "stroke-width": paint.sw })}/>`;
}

/**
 * Draws a straight line, round-capped unless the paint says otherwise.
 *
 * @param {Point} a
 * @param {Point} b
 * @param {Paint} paint
 * @returns {string}
 */
function line(a, b, paint) {
  return `<line${attrs({ x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: paint.stroke, "stroke-width": paint.sw, "stroke-linecap": paint.cap ?? "round" })}/>`;
}

/**
 * Draws an open run of straight lines, round at its ends and corners unless
 * the paint says otherwise.
 *
 * @param {Point[]} points
 * @param {Paint} paint
 * @returns {string}
 */
function polyline(points, paint) {
  return `<polyline${attrs({ points: pointList(points), fill: "none", stroke: paint.stroke, "stroke-width": paint.sw, "stroke-linecap": paint.cap ?? "round", "stroke-linejoin": paint.join ?? "round" })}/>`;
}

/**
 * Draws a closed shape with straight sides.
 *
 * @param {Point[]} points
 * @param {Paint} paint
 * @returns {string}
 */
function polygon(points, paint) {
  return `<polygon${attrs({ points: pointList(points), fill: paint.fill ?? "none", stroke: paint.stroke, "stroke-width": paint.sw, "stroke-linejoin": paint.stroke === undefined ? undefined : (paint.join ?? "round") })}/>`;
}

/**
 * Writes a label or a caption.
 *
 * @param {number} x
 * @param {number} y The baseline.
 * @param {string} words
 * @param {Type} type
 * @returns {string}
 */
function text(x, y, words, type) {
  return `<text${attrs({ x, y, "font-family": FONT, "font-size": type.size ?? 14, "font-weight": type.weight, "text-anchor": type.anchor, "letter-spacing": type.spacing, fill: type.fill })}>${esc(words)}</text>`;
}

/**
 * Places a drawing made in a square box of `box` units at a size in pixels.
 *
 * @param {string} art
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {number} [box]
 * @returns {string}
 */
function place(art, x, y, size, box = 100) {
  return `<g transform="translate(${num(x)} ${num(y)}) scale(${num(size / box, 4)})">${art}</g>`;
}

// ---------------------------------------------------------------- geometry

/**
 * Returns degrees as radians.
 *
 * @param {number} degrees
 * @returns {number}
 */
function rad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Returns the point at an angle and a distance from a center, the angle
 * measured clockwise from the right, as the screen's axes run.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {number} degrees
 * @returns {Point}
 */
function polar(cx, cy, r, degrees) {
  return [cx + r * Math.cos(rad(degrees)), cy + r * Math.sin(rad(degrees))];
}

/**
 * Returns an arc as points, a curve's stand-in.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {number} from The angle it starts at, in degrees.
 * @param {number} to The angle it ends at.
 * @param {number} [steps]
 * @returns {Point[]}
 */
function arc(cx, cy, r, from, to, steps = 8) {
  return Array.from({ length: steps + 1 }, (_, i) =>
    polar(cx, cy, r, from + ((to - from) * i) / steps),
  );
}

/**
 * Returns points turned clockwise about a center.
 *
 * @param {Point[]} points
 * @param {number} degrees
 * @param {number} [cx]
 * @param {number} [cy]
 * @returns {Point[]}
 */
function turn(points, degrees, cx = 0, cy = 0) {
  const c = Math.cos(rad(degrees));
  const s = Math.sin(rad(degrees));
  return points.map(([x, y]) => [
    cx + (x - cx) * c - (y - cy) * s,
    cy + (x - cx) * s + (y - cy) * c,
  ]);
}

/**
 * Returns points scaled about the origin, then moved.
 *
 * @param {Point[]} points
 * @param {number} k
 * @param {number} dx
 * @param {number} dy
 * @returns {Point[]}
 */
function scaleMove(points, k, dx, dy) {
  return points.map(([x, y]) => [x * k + dx, y * k + dy]);
}

/**
 * Returns an ellipse as a polygon's points.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} rx
 * @param {number} ry
 * @param {number} degrees How far it is turned.
 * @returns {Point[]}
 */
function ellipse(cx, cy, rx, ry, degrees) {
  const steps = 16;
  /** @type {Point[]} */
  const points = Array.from({ length: steps }, (_, i) => {
    const a = (2 * Math.PI * i) / steps;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
  return turn(points, degrees, cx, cy);
}

/**
 * Returns a four-point spark as a polygon's points.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} outer The radius of its points.
 * @param {number} inner The radius of the notches between them.
 * @returns {Point[]}
 */
function spark(cx, cy, outer, inner) {
  return Array.from({ length: 8 }, (_, i) =>
    polar(cx, cy, i % 2 === 0 ? outer : inner, -90 + 45 * i),
  );
}

/**
 * Returns a diamond as a polygon's points.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} r From its middle to each point.
 * @returns {Point[]}
 */
function diamond(cx, cy, r) {
  return [
    [cx, cy - r],
    [cx + r, cy],
    [cx, cy + r],
    [cx - r, cy],
  ];
}

/**
 * Returns the outline of a run of lines drawn `half * 2` wide, its corners
 * mitered and its ends cut square, so a bold zigzag is one crisp polygon.
 *
 * @param {Point[]} points
 * @param {number} half
 * @returns {Point[]}
 */
function outline(points, half) {
  /** @type {(a: Point, b: Point) => Point} */
  const heading = (a, b) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
  };
  /** @type {Point[]} */
  const left = [];
  /** @type {Point[]} */
  const right = [];
  points.forEach((p, i) => {
    const before =
      i > 0 ? heading(points[i - 1], p) : heading(p, points[i + 1]);
    const after = i < points.length - 1 ? heading(p, points[i + 1]) : before;
    const along = heading([0, 0], [before[0] + after[0], before[1] + after[1]]);
    // The miter runs across the corner, longer the sharper the corner is.
    const reach = half / (along[0] * before[0] + along[1] * before[1]);
    left.push([p[0] - along[1] * reach, p[1] + along[0] * reach]);
    right.push([p[0] + along[1] * reach, p[1] - along[0] * reach]);
  });
  return [...left, ...right.reverse()];
}

/**
 * The lightning-bolt mark, about its middle, two units tall.
 *
 * @type {Point[]}
 */
const BOLT_MARK = [
  [-0.08, -1],
  [0.5, -1],
  [0.14, -0.2],
  [0.62, -0.2],
  [-0.3, 1],
  [-0.04, 0.12],
  [-0.56, 0.12],
];

/**
 * Draws the lightning-bolt mark.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} half Half its height.
 * @param {string} fill
 * @returns {string}
 */
function boltMark(cx, cy, half, fill) {
  return polygon(scaleMove(BOLT_MARK, half, cx, cy), { fill });
}

/**
 * The flame mark, about its middle, two units tall: a drop of fire, its tip
 * leaning.
 *
 * @type {Point[]}
 */
const FLAME_MARK = [
  [0.16, -1],
  [-0.1, -0.7],
  [-0.4, -0.36],
  [-0.58, -0.02],
  [-0.63, 0.3],
  [-0.54, 0.61],
  [-0.32, 0.85],
  [0, 0.96],
  [0.32, 0.85],
  [0.54, 0.61],
  [0.63, 0.3],
  [0.57, -0.02],
  [0.42, -0.28],
  [0.29, -0.52],
  [0.21, -0.78],
];

/**
 * Draws the flame mark, with a core of another color low in it.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} half Half its height.
 * @param {string} fill
 * @param {string} core
 * @returns {string}
 */
function flameMark(cx, cy, half, fill, core) {
  return (
    polygon(scaleMove(FLAME_MARK, half, cx, cy), { fill }) +
    polygon(scaleMove(FLAME_MARK, half * 0.44, cx, cy + half * 0.46), {
      fill: core,
    })
  );
}

// ---------------------------------------------------------------- fuzzball

/**
 * The fuzzball, as frontend/lib/style/src/fuzzball.ts (`FUZZBALL`) has it, on
 * its grid of 32 units.
 */
const FUZZ = {
  body: { cx: 16, cy: 17.2, r: 10.4 },
  fur: "M24.2 17.15Q25.93 17.34 27.44 19.45M23.92 19.31Q25.5 19.93 26.36 22.34M23.49 20.54Q25 21.43 25.51 23.99M22.81 21.77Q24.12 22.88 24.17 25.45M21.39 23.38Q22.45 24.9 21.88 27.54M20.44 24.09Q21.14 25.54 20.15 27.82M18.91 24.86Q19.38 26.67 17.94 28.95M16.67 25.37Q16.59 26.85 14.68 28.26M14.67 25.29Q14.16 27.16 11.72 28.48M13.32 24.95Q12.56 26.55 10.05 27.29M12.2 24.46Q11.35 25.66 8.99 25.83M10.49 23.28Q9.36 24.24 7.01 23.81M9.55 22.26Q8.19 23.08 5.86 22.29M8.71 20.95Q7.12 21.55 4.87 20.34M7.99 18.96Q6.12 19.17 4.06 17.4M7.8 17.18Q6.03 16.98 4.5 14.84M7.98 15.5Q6.28 14.93 5.21 12.52M8.49 13.9Q7.12 13.09 6.7 10.65M9.67 11.99Q8.29 10.6 8.37 7.82M10.77 10.89Q9.77 9.37 10.42 6.79M11.74 10.19Q11.1 8.75 12.16 6.54M13.27 9.47Q12.85 7.67 14.35 5.44M15.4 9.02Q15.43 6.42 17.7 3.93M17.2 9.09Q17.76 6.73 20.43 4.93M18.96 9.55Q19.93 7.61 22.75 6.65M19.67 9.87Q20.57 8.49 23.07 8.16M21.78 11.38Q23.11 10.33 25.62 10.78M22.9 12.77Q24.39 12.05 26.72 13.04M23.31 13.49Q24.97 12.86 27.3 14.07M24.07 15.76Q25.67 15.68 27.37 17.47",
  furWidth: 2.8,
  eyes: [
    { cx: 13.4, cy: 17, rx: 2.3, ry: 3 },
    { cx: 20.6, cy: 17, rx: 2.3, ry: 3 },
  ],
  glints: [
    { cx: 14.2, cy: 15.8, r: 0.85 },
    { cx: 21.4, cy: 15.8, r: 0.85 },
  ],
  ink: "#14171b",
  glint: "#ffffff",
};

/** Each strand of the fur: where it leaves the body, and its tip. */
const STRANDS = [
  ...FUZZ.fur.matchAll(/M([\d.]+) ([\d.]+)Q[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)/g),
].map((found) => found.slice(1).map(Number));

/** How far around the fuzzball each spark of a full charge sits, in degrees. */
const SPARK_ANGLES = [-58, 8, 62, 148, 212];

/**
 * Draws the fuzzball on its grid of 32 units. At charge 0 its fur is as
 * given; at 0.5 each strand is straight, 15% longer and leaning half way out;
 * at 1 the strands are spikes straight out from the body's middle, 30%
 * longer, with sparks around them.
 *
 * @param {string} color The body and the fur.
 * @param {0 | 0.5 | 1} [charge]
 * @param {string} [sparkColor] The sparks of a full charge.
 * @returns {string}
 */
function fuzzball(color, charge = 0, sparkColor = undefined) {
  const { body, eyes, glints, furWidth } = FUZZ;
  const furPaint = { stroke: color, sw: furWidth };
  let fur;
  if (charge === 0) {
    fur = `<path${attrs({ d: FUZZ.fur, fill: "none", stroke: color, "stroke-width": furWidth, "stroke-linecap": "round" })}/>`;
  } else {
    fur = STRANDS.map(([x0, y0, x1, y1]) => {
      const length = Math.hypot(x1 - x0, y1 - y0);
      const fromMiddle = Math.hypot(x0 - body.cx, y0 - body.cy);
      const out = [(x0 - body.cx) / fromMiddle, (y0 - body.cy) / fromMiddle];
      let lean = out;
      if (charge < 1) {
        const half = [out[0] + (x1 - x0) / length, out[1] + (y1 - y0) / length];
        const size = Math.hypot(half[0], half[1]);
        lean = [half[0] / size, half[1] / size];
      }
      const reach = length * (charge < 1 ? 1.15 : 1.3);
      return line(
        [x0, y0],
        [x0 + lean[0] * reach, y0 + lean[1] * reach],
        furPaint,
      );
    }).join("");
  }
  const sparks =
    charge === 1 && sparkColor !== undefined
      ? SPARK_ANGLES.map((degrees, i) => {
          const from = 16.4 + (i % 2) * 0.6;
          /** @type {Point[]} */
          const zigzag = [
            [from, -0.4],
            [from + 1.7, -1.5],
            [from + 1.5, 1.1],
            [from + 3.6, 0],
          ];
          return polyline(
            scaleMove(turn(zigzag, degrees), 1, body.cx, body.cy),
            { stroke: sparkColor, sw: 1 },
          );
        }).join("")
      : "";
  return (
    circle(body.cx, body.cy, body.r, { fill: color }) +
    fur +
    eyes
      .map((eye) => `<ellipse${attrs({ ...eye, fill: FUZZ.ink })}/>`)
      .join("") +
    glints.map((g) => circle(g.cx, g.cy, g.r, { fill: FUZZ.glint })).join("") +
    sparks
  );
}

/**
 * Returns a tongue of flame as a polygon's points, on the fuzzball's grid:
 * it rises from behind the body, swells, then leans as it narrows to its tip.
 *
 * @param {number} degrees The way it points, clockwise from the right.
 * @param {number} to How far from the body's middle its tip is.
 * @param {number} width
 * @param {number} lean How far its tip leans aside.
 * @returns {Point[]}
 */
function flame(degrees, to, width, lean) {
  const from = 11.5;
  const steps = 8;
  /** @type {Point[]} */
  const left = [];
  /** @type {Point[]} */
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const along = from + (to - from) * t;
    const half =
      (width / 2) * (1 - t) ** 1.2 * (0.7 + 0.65 * Math.sin(Math.PI * t));
    left.push([along, lean * t * t - half]);
    right.push([along, lean * t * t + half]);
  }
  return scaleMove(
    turn([...left, ...right.reverse().slice(1)], degrees),
    1,
    FUZZ.body.cx,
    FUZZ.body.cy,
  );
}

/**
 * The flames of a hot shot: which way each points, how far its tip is from
 * the body's middle, its width and its lean.
 */
const FLAMES = [
  [-129, 20, 8.6, 3],
  [-104, 24, 9.6, 1.2],
  [-78, 21.6, 9, -2.6],
  [-53, 19.2, 8.2, -3],
];

/**
 * Draws the hot shot on the fuzzball's grid: the fuzzball red-hot, its fur
 * on end, with tongues of flame behind it.
 *
 * @param {Palette} pal
 * @returns {string}
 */
function hotShot(pal) {
  return (
    FLAMES.map(([degrees, to, width, lean]) =>
      polygon(flame(degrees, to, width, lean), { fill: pal.warning }),
    ).join("") + fuzzball(pal.danger, 1)
  );
}

/**
 * Draws the triple shot on the fuzzball's grid: three small fuzzballs in a
 * row, one behind the other.
 *
 * @param {Palette} pal
 * @returns {string}
 */
function tripleShot(pal) {
  const k = 0.56;
  return [-12.5, 0, 12.5]
    .map(
      (dx) =>
        `<g transform="translate(${num(FUZZ.body.cx * (1 - k) + dx)} ${num(FUZZ.body.cy * (1 - k))}) scale(${k})">${fuzzball(pal.accent)}</g>`,
    )
    .join("");
}

// ------------------------------------------------------------------- tiles
// A tile is one square cell, drawn in a box of 100 units. A brick's body is
// a rounded square 4 in from the cell, its corners 14 round.

const BODY = { x: 4, y: 4, size: 92, r: 14, strip: 5, lip: 7 };

/** Where the marks on a chunky tile's face center. */
const FACE = { cx: 50, cy: 48 };

/**
 * Returns the lighter strip along a tile's top edge, which follows its
 * rounded corners.
 *
 * @returns {Point[]}
 */
function topStrip() {
  const { x, y, size, r, strip } = BODY;
  const right = x + size;
  return [
    [x, y + r + strip],
    ...arc(x + r, y + r, r, 180, 270),
    ...arc(right - r, y + r, r, 270, 360),
    [right, y + r + strip],
    ...arc(right - r, y + r + strip, r, 360, 270),
    ...arc(x + r, y + r + strip, r, 270, 180),
  ];
}

const TOP_STRIP = topStrip();

/**
 * Draws the chunky tile every solid brick starts from, in three flat shapes:
 * a darker lip along the bottom, the body, and a lighter strip along the top.
 *
 * @param {string} tint
 * @returns {string}
 */
function chunky(tint) {
  const { x, y, size, r, lip } = BODY;
  return (
    rect(x, y + lip, size, size - lip, {
      rx: r,
      fill: mix(tint, BLACK, 0.22),
    }) +
    rect(x, y, size, size - lip, { rx: r, fill: tint }) +
    polygon(TOP_STRIP, { fill: mix(tint, WHITE, 0.22) })
  );
}

/**
 * Where a die's pips sit, by the face's number, in steps from its middle.
 *
 * @type {Record<number, Point[]>}
 */
const DIE = {
  1: [[0, 0]],
  2: [
    [1, -1],
    [-1, 1],
  ],
  3: [
    [1, -1],
    [0, 0],
    [-1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

/**
 * Draws the hits a brick has left as a die's face, in the field's color, so
 * the pips look cut out of the brick.
 *
 * @param {Palette} pal
 * @param {number} hits
 * @param {number} [cx]
 * @param {number} [cy]
 * @param {number} [step] From the middle pip to the next.
 * @param {number} [r] A pip's radius.
 * @returns {string}
 */
function pips(pal, hits, cx = FACE.cx, cy = FACE.cy, step = 20, r = 6.6) {
  return (DIE[hits] ?? [])
    .map(([px, py]) =>
      circle(cx + px * step, cy + py * step, r, { fill: pal.field }),
    )
    .join("");
}

/**
 * Draws a crack: a short zigzag in from a tile's edge, in the field's color.
 *
 * @param {Palette} pal
 * @param {Point[]} points
 * @returns {string}
 */
function crack(pal, points) {
  return polyline(points, {
    stroke: pal.field,
    sw: 3.2,
    join: "miter",
    cap: "butt",
  });
}

/**
 * The cracks a tough brick gathers, one for each hit it has taken.
 *
 * @type {Point[][]}
 */
const TOUGH_CRACKS = [
  [
    [28, 3],
    [34, 13],
    [26, 20],
    [35, 31],
  ],
  [
    [97, 67],
    [85, 63],
    [80, 74],
    [68, 71],
  ],
];

/**
 * Draws a brick: it breaks at one hit, and carries no mark.
 *
 * @param {Palette} pal
 * @param {TintName} [tint]
 * @returns {string}
 */
function brick(pal, tint = "red") {
  return chunky(pal.tints[tint]);
}

/**
 * Draws a tough brick: pips for the hits it has left, and a crack for each
 * hit it has taken.
 *
 * @param {Palette} pal
 * @param {TintName} tint
 * @param {number} hits
 * @param {number} [taken]
 * @returns {string}
 */
function tough(pal, tint, hits, taken = 0) {
  return (
    chunky(pal.tints[tint]) +
    pips(pal, hits) +
    TOUGH_CRACKS.slice(0, taken)
      .map((points) => crack(pal, points))
      .join("")
  );
}

/**
 * Draws a steel brick, which never breaks: a bevel frame, four rivets in its
 * corners and two lines of sheen.
 *
 * @param {Palette} pal
 * @returns {string}
 */
function steel(pal) {
  const dark = mix(pal.steel, BLACK, 0.34);
  const sheen = { stroke: mix(pal.steel, WHITE, 0.5), sw: 4.6 };
  /** @type {Point[]} */
  const rivets = [
    [26, 25],
    [74, 25],
    [26, 68],
    [74, 68],
  ];
  return (
    chunky(pal.steel) +
    rect(14.5, 14, 71, 65.5, { rx: 7, stroke: dark, sw: 3.4 }) +
    rivets.map(([x, y]) => circle(x, y, 4, { fill: dark })).join("") +
    line([38, 57], [56, 39], sheen) +
    line([50, 61], [63, 48], sheen)
  );
}

/** @typedef {"bottom" | "left" | "top" | "right"} Side */

/**
 * How many quarter turns clockwise take the bottom face to each face.
 *
 * @type {Record<Side, number>}
 */
const QUARTER_TURNS = { bottom: 0, left: 1, top: 2, right: 3 };

/**
 * Returns a tile's points turned clockwise by quarter turns about its middle.
 *
 * @param {Point[]} points
 * @param {number} turns
 * @returns {Point[]}
 */
function quarterTurn(points, turns) {
  let turned = points;
  for (let i = 0; i < turns; i++) {
    turned = turned.map(([x, y]) => [100 - y, x]);
  }
  return turned;
}

/**
 * Draws a steel plate over one face of a brick: a gap that sets it off the
 * brick, a thick bar, two rivets and a row of teeth pointing outward.
 *
 * @param {Palette} pal
 * @param {Side} side
 * @returns {string}
 */
function plate(pal, side) {
  const turns = QUARTER_TURNS[side];
  /** @type {(x0: number, y0: number, x1: number, y1: number, paint: Paint) => string} */
  const box = (x0, y0, x1, y1, paint) => {
    const [a, b] = quarterTurn(
      [
        [x0, y0],
        [x1, y1],
      ],
      turns,
    );
    return rect(
      Math.min(a[0], b[0]),
      Math.min(a[1], b[1]),
      Math.abs(a[0] - b[0]),
      Math.abs(a[1] - b[1]),
      paint,
    );
  };
  const count = 6;
  const from = 9;
  const pitch = (100 - from * 2) / count;
  const teeth = Array.from({ length: count }, (_, i) => {
    const left = from + pitch * i + 1.2;
    const right = from + pitch * (i + 1) - 1.2;
    return polygon(
      quarterTurn(
        [
          [left, 90],
          [(left + right) / 2, 99.4],
          [right, 90],
        ],
        turns,
      ),
      { fill: pal.steel },
    );
  });
  const rivets = quarterTurn(
    [
      [14, 84],
      [86, 84],
    ],
    turns,
  );
  return (
    box(0, 73.5, 100, 100, { fill: pal.field }) +
    box(2, 77, 98, 91, { rx: 4, fill: pal.steel }) +
    teeth.join("") +
    rivets.map(([x, y]) => circle(x, y, 3.2, { fill: pal.field })).join("")
  );
}

/**
 * Draws a plated brick: a tough brick with a steel plate over each armored
 * face, its pips moved to the middle of what shows.
 *
 * @param {Palette} pal
 * @param {number} hits
 * @param {Side[]} [sides]
 * @returns {string}
 */
function plated(pal, hits, sides = ["bottom"]) {
  /** @type {(side: Side) => number} */
  const has = (side) => (sides.includes(side) ? 1 : 0);
  const cx = FACE.cx + (has("left") - has("right")) * 10;
  const cy = FACE.cy + (has("top") - has("bottom")) * 6.5 + has("top") * 2.5;
  const narrow = has("left") + has("right") === 2;
  return (
    chunky(pal.tints.orange) +
    pips(pal, hits, cx, cy, narrow ? 14.5 : 19, narrow ? 6 : 6.6) +
    sides.map((side) => plate(pal, side)).join("")
  );
}

/**
 * The cracks a shell brick gathers, each through its shell.
 *
 * @type {Point[][]}
 */
const SHELL_CRACKS = [
  [
    [68, 3],
    [61, 11],
    [69, 17],
    [63, 26],
    [68, 32],
  ],
];

/**
 * Draws a shell brick, which only a charge can hurt: a lighter shell around
 * a darker core, as a nut cut through, with a bolt in the core and small
 * pips under it.
 *
 * @param {Palette} pal
 * @param {number} hits
 * @param {number} [cracks]
 * @returns {string}
 */
function shell(pal, hits, cracks = 0) {
  const tint = pal.tints.teal;
  // The shell is the lighter of the two in both palettes. Whichever of them
  // would lose its contrast with the field stays the tint itself.
  const dark = pal.id === "dark";
  const shellColor = dark ? mix(tint, WHITE, 0.42) : tint;
  const core = dark ? tint : mix(tint, BLACK, 0.42);
  const withPips = hits > 1;
  const row = Array.from({ length: withPips ? hits : 0 }, (_, i) =>
    circle(50 + (i - (hits - 1) / 2) * 13.5, 65.5, 4.4, { fill: pal.field }),
  );
  return (
    chunky(shellColor) +
    rect(18, 18, 64, 57, { rx: 7, fill: core }) +
    boltMark(50, withPips ? 40 : 46.5, withPips ? 15 : 19, pal.field) +
    row.join("") +
    SHELL_CRACKS.slice(0, cracks)
      .map((points) => crack(pal, points))
      .join("")
  );
}

/**
 * Draws a moss brick, which grows a hit back each round: an earthy tile
 * under a scalloped cap of moss, with a two-leaf sprout cut out of the cap.
 *
 * @param {Palette} pal
 * @param {number} hits
 * @returns {string}
 */
function moss(pal, hits) {
  const green = pal.tints.green;
  const light = mix(green, WHITE, pal.id === "dark" ? 0.3 : 0.12);
  const shade = mix(green, BLACK, 0.38);
  const { x, y, size, r } = BODY;
  const capBottom = 27;
  /** @type {Point[]} */
  const cap = [
    [x, capBottom],
    ...arc(x + r, y + r, r, 180, 270),
    ...arc(x + size - r, y + r, r, 270, 360),
    [x + size, capBottom],
  ];
  const bump = 9.2;
  const bumps = Array.from(
    { length: 6 },
    (_, i) => x + bump + ((size - 2 * bump) * i) / 5,
  );
  return (
    chunky(pal.tints.amber) +
    bumps
      .map((bx) => circle(bx, capBottom + 3.4, bump, { fill: shade }))
      .join("") +
    polygon(cap, { fill: light }) +
    bumps.map((bx) => circle(bx, capBottom, bump, { fill: light })).join("") +
    line([50, 30], [50, 17], { stroke: pal.field, sw: 3.4 }) +
    polygon(ellipse(40.5, 13.2, 8.2, 4.4, 32), { fill: pal.field }) +
    polygon(ellipse(59.5, 13.2, 8.2, 4.4, -32), { fill: pal.field }) +
    pips(pal, hits, 50, 64.5, 15.5, 5.6)
  );
}

/**
 * Draws a bolt through the middle of a zapper's tile, an arrowhead at each
 * end, as polygons. Alone it is a lightning zigzag. Where two cross, their
 * shafts run straight, since two zigzags crossed make a pinwheel.
 *
 * @param {Palette} pal
 * @param {number} degrees How far it is turned from lying along the row.
 * @param {boolean} [straight]
 * @param {number} [k] How much longer it is, to reach a tile's corners.
 * @returns {string}
 */
function zapBolt(pal, degrees, straight = false, k = 1) {
  /** @type {Point[]} */
  const shaft = straight
    ? [
        [-28, 0],
        [28, 0],
      ]
    : [
        [-28, 3],
        [-4, -9],
        [4, 9],
        [28, -3],
      ];
  /** @type {Point[][]} */
  const shapes = [
    outline(shaft, 4.6),
    [
      [40, 0],
      [24, -12.5],
      [24, 12.5],
    ],
    [
      [-40, 0],
      [-24, -12.5],
      [-24, 12.5],
    ],
  ];
  return shapes
    .map((points) =>
      polygon(scaleMove(turn(points, degrees), k, 50, 50), {
        fill: pal.warning,
      }),
    )
    .join("");
}

/** @typedef {"row" | "column" | "cross" | "x"} ZapLines */

/**
 * Draws a zapper: a dark tile outlined in the warning color, with a bolt
 * along each line of bricks it zaps when it breaks.
 *
 * @param {Palette} pal
 * @param {ZapLines} lines
 * @returns {string}
 */
function zapper(pal, lines) {
  const tile = rect(6, 6, 88, 88, {
    rx: 12,
    fill: pal.fieldLine,
    stroke: pal.warning,
    sw: 4,
  });
  switch (lines) {
    case "row":
      return tile + zapBolt(pal, 0);
    case "column":
      return tile + zapBolt(pal, 90);
    case "cross":
      return (
        tile +
        zapBolt(pal, 0, true) +
        zapBolt(pal, 90, true) +
        polygon(diamond(50, 50, 15.5), { fill: pal.fieldLine }) +
        polygon(diamond(50, 50, 10), { fill: pal.text })
      );
    case "x":
      return tile + zapBolt(pal, 45, true, 1.2) + zapBolt(pal, -45, true, 1.2);
  }
}

/**
 * Draws a bomb: a round bomb cut out of a tile in the danger color, a spark
 * at the end of its fuse, and a dot toward each of the bricks around it that
 * the spark leaves room for.
 *
 * @param {Palette} pal
 * @returns {string}
 */
function bomb(pal) {
  const cx = 46;
  const cy = 56;
  /** @type {Point[]} */
  const around = [
    [-1, -1],
    [0, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  /** @type {Point[]} */
  const neck = [
    [-7, -5],
    [7, -5],
    [7, 5],
    [-7, 5],
  ];
  return (
    chunky(pal.danger) +
    around
      .map(([dx, dy]) =>
        circle(50 + dx * 33, 48 + dy * 31, 2.7, { fill: pal.field }),
      )
      .join("") +
    circle(cx, cy, 19.5, { fill: pal.field }) +
    polygon(scaleMove(turn(neck, -45), 1, cx + 15.2, cy - 15.2), {
      fill: pal.field,
    }) +
    polyline(
      [
        [63, 39],
        [67.5, 32],
        [72, 27.5],
      ],
      { stroke: pal.field, sw: 3.6 },
    ) +
    polyline(arc(cx, cy, 12.5, 196, 248, 6), { stroke: pal.danger, sw: 3.4 }) +
    polygon(spark(76.5, 23.5, 15, 6.4), { fill: pal.field }) +
    polygon(spark(76.5, 23.5, 10.5, 3.6), { fill: pal.warning })
  );
}

/**
 * Draws a bumper, which is round, not square: a disc in the accent color, a
 * ring cut out of it, a cap in its middle, and four ticks kicking outward.
 *
 * @param {Palette} pal
 * @returns {string}
 */
function bumper(pal) {
  const ticks = [45, 135, 225, 315].map((degrees) =>
    line(polar(50, 50, 43.5, degrees), polar(50, 50, 49.5, degrees), {
      stroke: pal.accent,
      sw: 5,
    }),
  );
  return (
    ticks.join("") +
    circle(50, 52, 37, { fill: mix(pal.accent, BLACK, 0.28) }) +
    circle(50, 48.5, 37, { fill: pal.accent }) +
    circle(50, 48.5, 24, { stroke: pal.field, sw: 7.5 }) +
    circle(50, 48.5, 10.5, { fill: mix(pal.accent, WHITE, 0.52) })
  );
}

/**
 * Draws a prism: a pale tile of glass, a faceted triangle, and three rays
 * leaving it, each in a tint of its own.
 *
 * @param {Palette} pal
 * @returns {string}
 */
function prism(pal) {
  /** @type {Point[]} */
  const triangle = [
    [50, 37],
    [24, 82],
    [76, 82],
  ];
  /** @type {[number, TintName][]} */
  const rays = [
    [-142, "red"],
    [-90, "amber"],
    [-38, "blue"],
  ];
  return (
    rect(5.5, 5.5, 89, 89, {
      rx: 12.5,
      fill: mix(pal.field, pal.text, 0.12),
      stroke: mix(pal.field, pal.text, 0.58),
      sw: 3,
    }) +
    rays
      .map(([degrees, tint]) =>
        line(polar(50, 41, 11, degrees), polar(50, 41, 27, degrees), {
          stroke: pal.tints[tint],
          sw: 5.4,
        }),
      )
      .join("") +
    polygon(triangle, {
      fill: mix(pal.field, pal.text, 0.3),
      stroke: pal.text,
      sw: 4,
    }) +
    triangle
      .map((corner) => line([50, 67], corner, { stroke: pal.text, sw: 2.6 }))
      .join("")
  );
}

/**
 * Draws a portal, which is not solid: a thick ring around a dark middle,
 * three spiral arms, and a badge on the ring that tells its pair from the
 * other, a dot for the first pair and a diamond for the second.
 *
 * @param {Palette} pal
 * @param {1 | 2} pair
 * @returns {string}
 */
function portal(pal, pair) {
  const tint = pal.tints[pair === 1 ? "violet" : "teal"];
  const bright = mix(tint, pal.text, 0.34);
  const arms = [0, 120, 240].map((from) =>
    polyline(
      Array.from({ length: 15 }, (_, i) =>
        polar(50, 50, 7.5 + (19.5 * i) / 14, from + (215 * i) / 14),
      ),
      { stroke: bright, sw: 4.4 },
    ),
  );
  const [bx, by] = polar(50, 50, 36, -45);
  return (
    circle(50, 50, 33, { fill: pal.page }) +
    arms.join("") +
    circle(50, 50, 36, { stroke: tint, sw: 10 }) +
    circle(bx, by, 13.5, { fill: pal.field }) +
    (pair === 1
      ? circle(bx, by, 8.4, { fill: bright })
      : polygon(diamond(bx, by, 10.4), { fill: bright }))
  );
}

/**
 * Draws a wool brick, which recharges the fuzzball: a knitted patch, three
 * rows of stitches, with a bolt badge in its top corner.
 *
 * @param {Palette} pal
 * @returns {string}
 */
function wool(pal) {
  const tint = pal.tints.pink;
  const yarn = { stroke: mix(tint, WHITE, 0.52), sw: 4 };
  const stitches = [29, 48.5, 68].flatMap((y) =>
    [18, 34, 50, 66, 82].map((x) =>
      polyline(
        [
          [x - 6.2, y - 6.5],
          [x, y + 6],
          [x + 6.2, y - 6.5],
        ],
        yarn,
      ),
    ),
  );
  return (
    chunky(tint) +
    stitches.join("") +
    circle(79, 21, 14.5, { fill: pal.field }) +
    boltMark(79, 21, 10, pal.warning)
  );
}

/**
 * Draws a cage: a steel frame with four bars, a friend behind them, and,
 * once it has taken a hit, a crack in the frame and one bar broken.
 *
 * @param {Palette} pal
 * @param {boolean} [hit]
 * @returns {string}
 */
function cage(pal, hit = false) {
  const k = 1.5;
  const friend = `<g transform="translate(${num(50 - FUZZ.body.cx * k)} ${num(50.5 - FUZZ.body.cy * k)}) scale(${k})">${fuzzball(pal.tints.pink)}</g>`;
  const bent = { stroke: pal.steel, sw: 5.6, cap: "butt", join: "miter" };
  const bars = [21.5, 38, 62, 78.5].map((x) =>
    hit && x === 62
      ? polyline(
          [
            [x, 19],
            [x, 30],
            [x + 8, 38.5],
          ],
          bent,
        ) +
        polyline(
          [
            [x, 81],
            [x, 72],
            [x - 7, 64],
          ],
          bent,
        )
      : rect(x - 2.8, 19, 5.6, 62, { fill: pal.steel }),
  );
  return (
    chunky(pal.steel) +
    rect(11, 20, 78, 60, { rx: 3, fill: mix(pal.field, pal.steel, 0.21) }) +
    friend +
    bars.join("") +
    (hit
      ? crack(pal, [
          [73, 3],
          [68, 9],
          [75, 13],
          [71, 20],
        ])
      : "")
  );
}

// ------------------------------------------------------------ the catalogs

/**
 * @typedef {object} Kind
 * @property {string} id
 * @property {string} name
 * @property {(pal: Palette) => string} draw
 */

/**
 * The 16 kinds of brick, as the catalog shows each.
 *
 * @type {Kind[]}
 */
const KINDS = [
  { id: "brick", name: "Brick", draw: (pal) => brick(pal) },
  { id: "tough", name: "Tough brick", draw: (pal) => tough(pal, "blue", 3) },
  { id: "steel", name: "Steel brick", draw: steel },
  { id: "plated", name: "Plated brick", draw: (pal) => plated(pal, 3) },
  { id: "shell", name: "Shell brick", draw: (pal) => shell(pal, 2) },
  { id: "moss", name: "Moss brick", draw: (pal) => moss(pal, 2) },
  { id: "row-zapper", name: "Row zapper", draw: (pal) => zapper(pal, "row") },
  {
    id: "column-zapper",
    name: "Column zapper",
    draw: (pal) => zapper(pal, "column"),
  },
  {
    id: "cross-zapper",
    name: "Cross zapper",
    draw: (pal) => zapper(pal, "cross"),
  },
  { id: "bomb", name: "Bomb", draw: bomb },
  { id: "x-zapper", name: "X zapper", draw: (pal) => zapper(pal, "x") },
  { id: "bumper", name: "Bumper", draw: bumper },
  { id: "prism", name: "Prism", draw: prism },
  { id: "portal", name: "Portal", draw: (pal) => portal(pal, 1) },
  { id: "wool", name: "Wool brick", draw: wool },
  { id: "cage", name: "Cage", draw: (pal) => cage(pal) },
];

/**
 * The states the sheet shows, each under its label.
 *
 * @type {[string, (pal: Palette) => string][]}
 */
const STATES = [
  ["tough, 2 hits", (pal) => tough(pal, "blue", 2)],
  ["tough, 3 hits", (pal) => tough(pal, "blue", 3)],
  ["tough, 4 hits", (pal) => tough(pal, "blue", 4)],
  ["tough, 5 hits", (pal) => tough(pal, "blue", 5)],
  ["tough, 6 hits", (pal) => tough(pal, "blue", 6)],
  ["4 hits, 2 taken", (pal) => tough(pal, "blue", 2, 2)],
  ["plate: bottom", (pal) => plated(pal, 4, ["bottom"])],
  ["plate: top", (pal) => plated(pal, 4, ["top"])],
  ["plate: left", (pal) => plated(pal, 4, ["left"])],
  ["plate: right", (pal) => plated(pal, 4, ["right"])],
  [
    "plate: bottom + sides",
    (pal) => plated(pal, 4, ["left", "right", "bottom"]),
  ],
  ["shell, 2 hits", (pal) => shell(pal, 2)],
  ["shell, 3 hits", (pal) => shell(pal, 3)],
  ["shell, cracked", (pal) => shell(pal, 2, 1)],
  ["moss, 3 hits", (pal) => moss(pal, 3)],
  ["moss, 1 hit", (pal) => moss(pal, 1)],
  ["cage, whole", (pal) => cage(pal)],
  ["cage, 1 hit taken", (pal) => cage(pal, true)],
  ["portal, pair 1", (pal) => portal(pal, 1)],
  ["portal, pair 2", (pal) => portal(pal, 2)],
];

/** @type {TintName[]} */
const TINT_NAMES = [
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
];

/**
 * The fuzzball's states, each with its file's name, its label, and how far
 * below the middle of its file its body sits: the three charges, then the
 * two shots the game hands out. A hot shot sits low, under its flames.
 *
 * @type {[string, string, (pal: Palette) => string, number][]}
 */
const FUZZBALL_STATES = [
  ["relaxed", "relaxed", (pal) => fuzzball(pal.accent), 0],
  ["half-charged", "half charged", (pal) => fuzzball(pal.accent, 0.5), 0],
  [
    "charged",
    "fully charged",
    (pal) => fuzzball(pal.accent, 1, pal.warning),
    0,
  ],
  ["hot-shot", "hot shot", hotShot, 2.5],
  ["triple-shot", "triple shot", tripleShot, 0],
];

// --------------------------------------------------------- the brick sheet

const SHEET_WIDTH = 1640;
const MARGIN = 48;
const CONTENT = SHEET_WIDTH - 2 * MARGIN;

/**
 * Draws one palette's panel of the brick sheet, from its own top: the
 * catalog, the states, the tints, the fuzzball and the small sizes.
 *
 * @param {Palette} pal
 * @returns {{ height: number, svg: string }}
 */
function bricksPanel(pal) {
  /** @type {string[]} */
  const out = [];
  let y = 0;
  /** @type {(x: number, top: number, w: number, h: number) => string} */
  const strip = (x, top, w, h) =>
    rect(x, top, w, h, {
      rx: 16,
      fill: pal.field,
      stroke: pal.fieldLine,
      sw: 1.5,
    });
  /** @type {(letter: string, words: string, x?: number) => void} */
  const header = (letter, words, x = MARGIN) => {
    out.push(
      text(x, y + 13, letter, { size: 13, weight: 700, fill: pal.text }),
      text(x + 20, y + 13, words, { size: 13, fill: pal.muted }),
    );
  };
  /** @type {(cx: number, baseline: number, words: string, size?: number, fill?: string) => string} */
  const label = (cx, baseline, words, size = 14, fill = pal.text) =>
    text(cx, baseline, words, { size, fill, anchor: "middle" });

  y += 62;
  out.push(
    text(MARGIN, y, pal.name, { size: 30, weight: 700, fill: pal.text }),
    text(
      SHEET_WIDTH - MARGIN,
      y,
      `Brick Fuzz Pop · brick catalog · ${pal.id} palette`,
      { size: 14, fill: pal.muted, anchor: "end" },
    ),
  );
  y += 34;

  // A: the catalog, two rows of eight.
  header("A", "The catalog: all 16 kinds at 96 px");
  y += 26;
  {
    const size = 96;
    const pitch = CONTENT / 8;
    const rowHeight = 150;
    const height = 30 + rowHeight * 2 - 6;
    out.push(strip(MARGIN, y, CONTENT, height));
    KINDS.forEach(({ name, draw }, i) => {
      const x = MARGIN + pitch * (i % 8) + (pitch - size) / 2;
      const top = y + 30 + Math.floor(i / 8) * rowHeight;
      out.push(
        place(draw(pal), x, top, size),
        label(x + size / 2, top + size + 24, name),
      );
    });
    y += height + 34;
  }

  // B: the states, two rows of ten.
  header("B", "States: hits left, cracks, plates, twins");
  y += 26;
  {
    const size = 80;
    const pitch = CONTENT / 10;
    const rowHeight = 132;
    const height = 28 + rowHeight * 2 - 6;
    out.push(strip(MARGIN, y, CONTENT, height));
    STATES.forEach(([name, draw], i) => {
      const x = MARGIN + pitch * (i % 10) + (pitch - size) / 2;
      const top = y + 28 + Math.floor(i / 10) * rowHeight;
      out.push(
        place(draw(pal), x, top, size),
        label(x + size / 2, top + size + 22, name, 13),
      );
    });
    y += height + 34;
  }

  // C: the eight tints, and D: the fuzzball, side by side.
  const tintsWidth = 664;
  const fuzzLeft = MARGIN + tintsWidth + 24;
  const fuzzWidth = CONTENT - tintsWidth - 24;
  const height = 176;
  header("C", "The eight tints");
  header("D", "The fuzzball: charges, shots, and friends", fuzzLeft);
  y += 26;
  {
    const size = 64;
    const pitch = tintsWidth / 8;
    out.push(strip(MARGIN, y, tintsWidth, height));
    TINT_NAMES.forEach((tint, i) => {
      const cx = MARGIN + pitch * i + pitch / 2;
      out.push(
        place(brick(pal, tint), cx - size / 2, y + 42, size),
        label(cx, y + 42 + size + 22, tint, 13),
        label(cx, y + 42 + size + 40, pal.tints[tint], 12, pal.muted),
      );
    });
  }
  {
    const wide = 122;
    const narrow = 72;
    out.push(strip(fuzzLeft, y, fuzzWidth, height));
    FUZZBALL_STATES.forEach(([, name, draw], i) => {
      const cx = fuzzLeft + 10 + wide * i + wide / 2;
      out.push(
        place(draw(pal), cx - 48, y + 30, 96, 32),
        label(cx, y + 148, name, 13),
      );
    });
    /** @type {TintName[]} */
    const friends = ["pink", "amber", "green"];
    const friendsLeft = fuzzLeft + 10 + wide * FUZZBALL_STATES.length + 6;
    friends.forEach((tint, i) => {
      out.push(
        place(
          fuzzball(pal.tints[tint]),
          friendsLeft + narrow * i + narrow / 2 - 32,
          y + 60,
          64,
          32,
        ),
      );
    });
    out.push(label(friendsLeft + narrow * 1.5, y + 148, "three friends", 13));
  }
  y += height + 34;

  // E: every kind at 36 px, each with its name beside it, so the longest
  // names have room.
  header("E", "Small sizes: all 16 kinds at 36 px");
  y += 26;
  {
    const size = 36;
    const pitch = CONTENT / 8;
    const rowHeight = 58;
    const stripHeight = 24 + rowHeight + size + 24;
    out.push(strip(MARGIN, y, CONTENT, stripHeight));
    KINDS.forEach(({ name, draw }, i) => {
      const x = MARGIN + pitch * (i % 8) + 24;
      const top = y + 24 + Math.floor(i / 8) * rowHeight;
      out.push(
        place(draw(pal), x, top, size),
        text(x + size + 14, top + size / 2 + 4.5, name, {
          size: 13,
          fill: pal.text,
        }),
      );
    });
    y += stripHeight;
  }
  return { height: y + 52, svg: out.join("\n") };
}

/**
 * Draws the brick sheet: a panel for each palette, one under the other.
 *
 * @returns {Sheet}
 */
function bricksSheet() {
  let y = 0;
  const body = PALETTES.map((pal) => {
    const { height, svg } = bricksPanel(pal);
    const panel =
      rect(0, y, SHEET_WIDTH, height, { fill: pal.panel }) +
      `\n<g transform="translate(0 ${y})">\n${svg}\n</g>`;
    y += height;
    return panel;
  }).join("\n");
  return { width: SHEET_WIDTH, height: y, body };
}

// --------------------------------------------------------- the field sheet
// The field is always upright: nine square columns, the floor along the
// bottom, the wall hanging from the ceiling. The mocks are drawn in each
// screen's own pixels, then set on the sheet at one scale.

const COLUMNS = 9;

/**
 * @typedef {object} Field
 * @property {number} cell A cell's side.
 * @property {number} rows How many rows of cells the screen shows.
 * @property {number} floor The floor band's height.
 * @property {number} lintel The height of the lintel over the ceiling, which
 *   every field has.
 * @property {string[]} wall What hangs from the ceiling, its top row first:
 *   `.` air, `o` a brick, a digit a tough brick with that many hits, `*` a
 *   bomb, `C` a cage, `W` a wool brick.
 * @property {(TintName | undefined)[]} tints Each row's tint, air having none.
 * @property {number} ballColumn The fuzzball's middle, in cells from the left.
 * @property {string} waiting What the marker in the lintel says.
 * @property {boolean} [hot] Whether the fuzzball on the floor is a hot shot.
 */

/**
 * The phone's field, as "The field" in the plan works out for 390 by 844: a
 * unit of 40, 17 rows deep, a floor band of 1.1 units and a lintel of 0.9
 * over the ceiling that says how much of the wall is still to come. The wall
 * is a stack of courses with a row of air between, and shots have eaten into
 * its lowest.
 *
 * @type {Field}
 */
const PHONE_FIELD = {
  cell: 40,
  rows: 17,
  floor: 44,
  lintel: 36,
  wall: [
    "4*44444*4",
    "444444444",
    ".........",
    "33W333W33",
    ".........",
    "3*33333*3",
    "22C222C22",
    ".........",
    "2*22o22*2",
    ".........",
    ".o2oo.o2o",
    "o.oo..ooo",
  ],
  tints: [
    "violet",
    "blue",
    undefined,
    "teal",
    undefined,
    "green",
    "amber",
    undefined,
    "orange",
    undefined,
    "red",
    "pink",
  ],
  ballColumn: 3.2,
  waiting: "24 rows waiting",
};

/**
 * The desktop window's field, as "The field" in the plan works out for 1280
 * by 800: a column of cells of 56, eleven rows deep, the least a field is,
 * a floor band of 0.6 units and a lintel of half a unit. Its wall has just
 * jumped, so the fuzzball on its floor is a hot shot.
 *
 * @type {Field}
 */
const DESKTOP_FIELD = {
  cell: 56,
  rows: 11,
  floor: 35,
  lintel: 28,
  wall: ["3*33C33*3", "333333333", ".........", "22W2222C2", "2.oo.oo2o"],
  tints: ["teal", "green", undefined, "amber", "orange"],
  ballColumn: 2.7,
  waiting: "24 rows waiting",
  hot: true,
};

/**
 * The six rows waiting above the desktop window's ceiling.
 *
 * @type {Pick<Field, "wall" | "tints">}
 */
const COMING_NEXT = {
  wall: [
    "5555W5555",
    ".........",
    "5*55555*5",
    "4C44444C4",
    ".........",
    "444*4*444",
  ],
  tints: ["pink", undefined, "red", "violet", undefined, "blue"],
};

/**
 * Returns how many rows a field's wall jumps, which is how many lie above
 * its jump line: a third of its rows, the floor's left out.
 *
 * @param {number} rows How many rows deep the field is.
 * @returns {number}
 */
function jumpRows(rows) {
  return Math.floor((rows - 1) / 3);
}

/** The aim, in degrees up from the floor. */
const AIM = 62;

/** How many charges the fuzzball holds, of five. */
const CHARGE = 3;

/** How far above the floor the fuzzball's middle is, in cells. */
const BALL_LIFT = 0.35;

/**
 * Draws the brick a cell of a wall holds, or nothing for air.
 *
 * @param {Palette} pal
 * @param {string} cell
 * @param {TintName | undefined} tint Its row's tint.
 * @returns {string | undefined}
 */
function wallBrick(pal, cell, tint) {
  if (cell === "*") return bomb(pal);
  if (cell === "C") return cage(pal);
  if (cell === "W") return wool(pal);
  if (tint === undefined) return undefined;
  if (cell === "o") return brick(pal, tint);
  if (/\d/.test(cell)) return tough(pal, tint, Number(cell));
  return undefined;
}

/**
 * Draws a wall's bricks, each in a cell of the given size.
 *
 * @param {Palette} pal
 * @param {Pick<Field, "wall" | "tints">} rows
 * @param {number} cell
 * @returns {string}
 */
function wallBricks(pal, { wall, tints }, cell) {
  return wall
    .flatMap((cells, row) =>
      [...cells].map((kind, column) => {
        const art = wallBrick(pal, kind, tints[row]);
        return art === undefined
          ? ""
          : place(art, column * cell, row * cell, cell);
      }),
    )
    .join("");
}

/**
 * Returns how many hits the brick in a cell takes to break.
 *
 * @param {string} cell
 * @returns {number}
 */
function hitsToBreak(cell) {
  if (/\d/.test(cell)) return Number(cell);
  return cell === "C" ? 2 : 1;
}

/**
 * Returns what the aim guide shows, in cells: the bricks the fuzzball would
 * punch through, spending a charge for each hit, then where it first bounces
 * and the way it leaves. It follows the fuzzball's middle, up and to the
 * right, and gives the fuzzball no width.
 *
 * @param {Field} field
 * @returns {{ from: Point, punched: Point[], bounce: Point, leaving: Point }}
 */
function aimGuide(field) {
  const heading = [Math.cos(rad(AIM)), -Math.sin(rad(AIM))];
  /** @type {Point} */
  const from = [field.ballColumn, field.rows - BALL_LIFT];
  let [x, y] = from;
  let column = Math.floor(x);
  let row = Math.floor(y);
  let charge = CHARGE;
  /** @type {Point[]} */
  const punched = [];
  for (;;) {
    const toSide = (Math.floor(x + 1e-9) + 1 - x) / heading[0];
    const toRow = (Math.ceil(y - 1e-9) - 1 - y) / heading[1];
    const sideways = toSide < toRow;
    const step = Math.min(toSide, toRow);
    x += heading[0] * step;
    y += heading[1] * step;
    if (sideways) column += 1;
    else row -= 1;
    const outside = column >= COLUMNS || row < 0;
    const cell = outside ? "#" : (field.wall[row]?.[column] ?? ".");
    if (cell === ".") continue;
    const hits = outside ? Infinity : hitsToBreak(cell);
    if (hits > charge) {
      return {
        from,
        punched,
        bounce: [x, y],
        leaving: sideways
          ? [-heading[0], heading[1]]
          : [heading[0], -heading[1]],
      };
    }
    charge -= hits;
    punched.push([column, row]);
  }
}

/**
 * Draws a dashed line across a field, each dash a line of its own.
 *
 * @param {number} width The field's width.
 * @param {number} y
 * @param {number} dash
 * @param {number} gap
 * @param {Paint} paint
 * @returns {string}
 */
function dashedLine(width, y, dash, gap, paint) {
  const count = Math.floor((width - gap) / (dash + gap));
  const from = (width - count * (dash + gap) + gap) / 2;
  return Array.from({ length: count }, (_, i) => {
    const x = from + i * (dash + gap);
    return line([x, y], [x + dash, y], paint);
  }).join("");
}

/**
 * @typedef {object} Scene
 * @property {number} width
 * @property {number} height
 * @property {string} svg
 * @property {number} jumpY Where the jump line is.
 * @property {number} dangerY Where the danger line is.
 * @property {number} floorY The middle of the floor band.
 * @property {Point} aimed A dot of the aim guide, well clear of the wall.
 * @property {Point} pip The first pip of the charge.
 */

/**
 * Draws a field in play, from the left end of its ceiling: the wall hanging
 * from the ceiling, the jump line a third of the way down, the danger line a
 * cell above the floor, the fuzzball on the floor with its charge, and the
 * aim guide, all sized by its cells. Its lintel lies above where it is drawn
 * from.
 *
 * @param {Palette} pal
 * @param {Field} field
 * @returns {Scene}
 */
function fieldScene(pal, field) {
  const { cell, rows, lintel } = field;
  const k = cell / 40;
  const width = COLUMNS * cell;
  const deep = rows * cell;
  const height = deep + field.floor;
  const band = { fill: mix(pal.field, pal.text, 0.13) };
  /** @type {string[]} */
  const out = [
    rect(0, 0, width, height, { fill: pal.field }),
    rect(0, deep, width, field.floor, band),
  ];

  // A dot at each cell's corner, so the grid can be counted.
  for (let column = 1; column < COLUMNS; column++) {
    for (let row = 1; row < rows; row++) {
      out.push(
        circle(column * cell, row * cell, 1.1 * k, { fill: pal.fieldLine }),
      );
    }
  }

  out.push(wallBricks(pal, field, cell));

  const jumpY = jumpRows(rows) * cell;
  const dangerY = deep - cell;
  out.push(
    dashedLine(width, jumpY, 14 * k, 8 * k, {
      stroke: pal.accent,
      sw: 2.4 * k,
    }),
    dashedLine(width, dangerY, 8 * k, 6 * k, { stroke: pal.danger, sw: 2 * k }),
  );

  // The aim guide: a bright outline on each brick it punches through, dots
  // to the first bounce, and a stub the way the fuzzball leaves.
  const guide = aimGuide(field);
  for (const [column, row] of guide.punched) {
    const inset = 0.9 * k;
    out.push(
      rect(
        column * cell + inset,
        row * cell + inset,
        cell - inset * 2,
        cell - inset * 2,
        { rx: 6.4 * k, stroke: pal.text, sw: 2.2 * k },
      ),
    );
  }
  const dot = { fill: pal.text };
  const ball = [guide.from[0] * cell, guide.from[1] * cell];
  const bounce = [guide.bounce[0] * cell, guide.bounce[1] * cell];
  const reach = Math.hypot(bounce[0] - ball[0], bounce[1] - ball[1]);
  const back = [(ball[0] - bounce[0]) / reach, (ball[1] - bounce[1]) / reach];
  /** @type {Point[]} */
  const dots = [];
  const clear = (field.hot ? 27 : 22) * k;
  for (let d = 0; d < reach - clear; d += 11.6 * k) {
    dots.push([bounce[0] + back[0] * d, bounce[1] + back[1] * d]);
  }
  out.push(...dots.map(([x, y]) => circle(x, y, 2.3 * k, dot)));
  /** @type {(distance: number, aside: number) => Point} */
  const leaving = (distance, aside) => [
    bounce[0] + (guide.leaving[0] * distance - guide.leaving[1] * aside) * k,
    bounce[1] + (guide.leaving[1] * distance + guide.leaving[0] * aside) * k,
  ];
  for (const distance of [10.5, 21]) {
    const [x, y] = leaving(distance, 0);
    out.push(circle(x, y, 2.3 * k, dot));
  }
  out.push(
    polygon([leaving(42, 0), leaving(27.5, 4.9), leaving(27.5, -4.9)], dot),
  );

  // The charge: five pips in an arc under the fuzzball, three of them lit.
  /** @type {Point[]} */
  const pipsAt = [-58, -29, 0, 29, 58].map((degrees) => [
    ball[0] + 20.5 * k * Math.sin(rad(degrees)),
    ball[1] + 20.5 * k * Math.cos(rad(degrees)),
  ]);
  out.push(
    ...pipsAt.map(([x, y], i) =>
      i < CHARGE
        ? circle(x, y, 3.1 * k, { fill: pal.warning })
        : circle(x, y, 2.5 * k, {
            fill: pal.field,
            stroke: pal.muted,
            sw: 1.2 * k,
          }),
    ),
    place(
      field.hot ? hotShot(pal) : fuzzball(pal.accent, 0.5),
      ball[0] - FUZZ.body.cx * k,
      ball[1] - FUZZ.body.cy * k,
      32 * k,
      32,
    ),
  );

  // The lintel over the ceiling, and the marker in it: how much of the wall
  // has yet to come down.
  const middle = -lintel / 2;
  const left = width / 2 - 56;
  out.push(
    rect(0, -lintel, width, lintel, band),
    line([0, 0], [width, 0], {
      stroke: pal.fieldLine,
      sw: 2,
      cap: "butt",
    }),
    ...[-0.5, 5.5].map((dy) =>
      polyline(
        [
          [left, middle + dy],
          [left + 5, middle + dy - 5],
          [left + 10, middle + dy],
        ],
        { stroke: pal.muted, sw: 2 },
      ),
    ),
    text(left + 18, middle + 4.5, field.waiting, {
      size: 13,
      fill: pal.text,
    }),
  );

  out.push(
    rect(0, -lintel, width, height + lintel, {
      stroke: pal.fieldLine,
      sw: 2,
    }),
  );
  return {
    width,
    height,
    svg: out.join("\n"),
    jumpY,
    dangerY,
    floorY: deep + field.floor / 2,
    aimed: dots[Math.round(dots.length * 0.62)],
    pip: pipsAt[0],
  };
}

/**
 * Draws a panel of the game's own: the bar, or one of the panels beside a
 * wide window's field.
 *
 * @param {Palette} pal
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function panel(pal, width, height) {
  return rect(0, 0, width, height, {
    rx: 14,
    fill: pal.field,
    stroke: pal.fieldLine,
    sw: 1.5,
  });
}

/**
 * Draws the game bar: the game's name and three figures. A phone's bar,
 * which sits under its field, is tighter, and has a fast-forward button.
 *
 * @param {Palette} pal
 * @param {number} width
 * @param {boolean} phone
 * @returns {{ height: number, svg: string }}
 */
function gameBar(pal, width, phone) {
  const height = phone ? 44 : 56;
  const middle = height / 2;
  const chip = { rx: 9, fill: pal.page };
  const chipWidth = phone ? 50 : 100;
  const chipHeight = phone ? 34 : 42;
  const gap = phone ? 5 : 10;
  const top = middle - chipHeight / 2;
  /** @type {string[]} */
  const out = [panel(pal, width, height)];
  let nameLeft = 14;
  if (!phone) {
    out.push(place(fuzzball(pal.accent), 14, middle - 15.5, 30, 32));
    nameLeft = 54;
  }
  out.push(
    text(nameLeft, middle + (phone ? 5.5 : 7), "Brick Fuzz Pop", {
      size: phone ? 16 : 20,
      weight: 700,
      fill: pal.text,
    }),
  );
  let right = width - (phone ? 5 : 8);
  if (phone) {
    // Fast-forward: two chevrons on a button.
    const size = 36;
    const cx = right - size / 2;
    out.push(
      rect(right - size, top, size, chipHeight, {
        ...chip,
        stroke: pal.fieldLine,
        sw: 1.5,
      }),
    );
    for (const dx of [-8, 1]) {
      out.push(
        polyline(
          [
            [cx + dx, middle - 6.5],
            [cx + dx + 6.5, middle],
            [cx + dx, middle + 6.5],
          ],
          { stroke: pal.text, sw: 2.6 },
        ),
      );
    }
    right -= size + gap;
  }
  const figures = [
    ["LEVEL", "18"],
    ["ROUNDS", "12"],
    ["SCORE", "4,380"],
  ];
  figures.forEach(([name, value], i) => {
    const fromRight = figures.length - i;
    const cx =
      right - fromRight * chipWidth - (fromRight - 1) * gap + chipWidth / 2;
    out.push(
      rect(cx - chipWidth / 2, top, chipWidth, chipHeight, chip),
      text(cx, top + (phone ? 12.5 : 15.5), name, {
        size: phone ? 8.5 : 11,
        weight: 600,
        fill: pal.muted,
        anchor: "middle",
        spacing: phone ? 0.5 : 0.9,
      }),
      text(cx, top + (phone ? 28 : 34.5), value, {
        size: phone ? 14.5 : 18,
        weight: 700,
        fill: pal.text,
        anchor: "middle",
      }),
    );
  });
  return { height, svg: out.join("\n") };
}

/**
 * Draws a small field for the picture of the jump: each row of bricks as a
 * bar, the jump line, and the fuzzball on the floor.
 *
 * @param {Palette} pal
 * @param {TintName[]} rows Each row's tint, from the ceiling down.
 * @param {boolean} hot Whether the fuzzball is a hot shot.
 * @returns {{ width: number, height: number, svg: string }}
 */
function smallField(pal, rows, hot) {
  const cell = 12;
  const width = COLUMNS * cell;
  const deep = DESKTOP_FIELD.rows * cell;
  const height = deep + 5;
  const size = 21;
  const overhang = 6;
  return {
    width,
    height,
    svg: [
      rect(0, 0, width, height, { fill: pal.page }),
      rect(0, deep, width, height - deep, {
        fill: mix(pal.field, pal.text, 0.13),
      }),
      ...rows.map((tint, row) =>
        rect(3, row * cell + 2.5, width - 6, cell - 5, {
          rx: 2.5,
          fill: pal.tints[tint],
        }),
      ),
      place(
        hot ? hotShot(pal) : fuzzball(pal.accent),
        width * 0.34 - (FUZZ.body.cx * size) / 32,
        deep - 7.5 - (FUZZ.body.cy * size) / 32,
        size,
        32,
      ),
      rect(0, 0, width, height, { stroke: pal.fieldLine, sw: 1.5 }),
      // The jump line runs past both sides, so it shows between the bars.
      `<g transform="translate(${-overhang} ${jumpRows(DESKTOP_FIELD.rows) * cell})">${dashedLine(
        width + overhang * 2,
        0,
        7,
        4,
        { stroke: pal.accent, sw: 2 },
      )}</g>`,
    ].join(""),
  };
}

/**
 * Draws the "Coming next" panel a wide window has left of its field: the six
 * rows waiting above the ceiling, how many rows are left, the level, and
 * what the jump is, with a picture of the wall before one and after.
 *
 * @param {Palette} pal
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function comingNextPanel(pal, width, height) {
  const edge = 22;
  const mini = 30;
  const title = { size: 19, weight: 700, fill: pal.text };
  const wellWidth = width - edge * 2;
  const wellHeight = COMING_NEXT.wall.length * mini + 16;
  const inset = (wellWidth - COLUMNS * mini) / 2;
  const under = 58 + wellHeight;
  const jumpTop = under + 88;
  const jump = jumpRows(DESKTOP_FIELD.rows);
  const before = smallField(pal, ["teal", "green", "amber"], false);
  const after = smallField(
    pal,
    ["violet", "blue", "pink", "teal", "green", "amber"],
    true,
  );
  const pictureTop = jumpTop + 126;
  const arrowY = pictureTop + before.height / 2;
  const arrowFrom = edge + before.width + 20;
  const arrowTo = width - edge - after.width - 20;
  return [
    panel(pal, width, height),
    text(edge, 40, "Coming next", title),
    rect(edge, 58, wellWidth, wellHeight, { rx: 10, fill: pal.page }),
    `<g transform="translate(${num(edge + inset)} 66)">${wallBricks(pal, COMING_NEXT, mini)}</g>`,
    text(edge, under + 34, "24 rows left", {
      size: 17,
      weight: 600,
      fill: pal.text,
    }),
    text(edge, under + 60, "Level 18 · Powder keg", {
      size: 15,
      fill: pal.muted,
    }),
    line([edge, jumpTop], [width - edge, jumpTop], {
      stroke: pal.fieldLine,
      sw: 1.5,
    }),
    text(edge, jumpTop + 40, "The jump", title),
    ...[
      "Clear everything under the dashed line",
      `and the wall jumps ${jump} rows.`,
      "The next shot is a hot shot.",
    ].map((row, i) =>
      text(edge, jumpTop + 68 + i * 21, row, { size: 14, fill: pal.muted }),
    ),
    `<g transform="translate(${edge} ${pictureTop})">${before.svg}</g>`,
    line([arrowFrom, arrowY], [arrowTo - 8, arrowY], {
      stroke: pal.muted,
      sw: 2.4,
    }),
    polygon(
      [
        [arrowTo, arrowY],
        [arrowTo - 10, arrowY - 6.5],
        [arrowTo - 10, arrowY + 6.5],
      ],
      { fill: pal.muted },
    ),
    `<g transform="translate(${num(width - edge - after.width)} ${pictureTop})">${after.svg}</g>`,
  ].join("\n");
}

/**
 * The kinds the "In this wall" panel explains, each in a few words.
 *
 * @type {[string, string, (pal: Palette) => string][]}
 */
const IN_THIS_WALL = [
  ["Tough brick", "a hit for each pip", (pal) => tough(pal, "amber", 3)],
  ["Bomb", "blasts the bricks around it", bomb],
  ["Wool brick", "recharges the fuzzball", wool],
  ["Cage", "frees a friend", (pal) => cage(pal)],
];

/**
 * Draws the "In this wall" panel a wide window has right of its field: the
 * kinds of brick in the wall, the crew of friends freed so far, and the
 * badge for the next shot, lit.
 *
 * @param {Palette} pal
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function inThisWallPanel(pal, width, height) {
  const edge = 22;
  const tile = 48;
  const rowHeight = 68;
  const title = { size: 19, weight: 700, fill: pal.text };
  const crewTop = 62 + IN_THIS_WALL.length * rowHeight + 20;
  const badgeTop = crewTop + 90;
  /** @type {TintName[]} */
  const crew = ["pink", "green"];
  return [
    panel(pal, width, height),
    text(edge, 40, "In this wall", title),
    ...IN_THIS_WALL.flatMap(([name, words, draw], i) => {
      const top = 62 + i * rowHeight;
      return [
        place(draw(pal), edge, top, tile),
        text(edge + tile + 14, top + 20, name, {
          size: 16,
          weight: 600,
          fill: pal.text,
        }),
        text(edge + tile + 14, top + 40, words, { size: 14, fill: pal.muted }),
      ];
    }),
    text(edge, crewTop + 14, "Crew", title),
    ...crew.map((tint, i) =>
      place(fuzzball(pal.tints[tint]), edge + i * 50, crewTop + 26, 44, 32),
    ),
    rect(edge, badgeTop, width - edge * 2, 44, { rx: 22, fill: pal.warning }),
    flameMark(edge + 34, badgeTop + 21, 13, pal.page, pal.warning),
    text(edge + 54, badgeTop + 28, "Next shot: Hot shot", {
      size: 16,
      weight: 700,
      fill: pal.page,
    }),
  ].join("\n");
}

/**
 * @typedef {object} Mock
 * @property {number} width
 * @property {number} height
 * @property {string} svg
 * @property {Point} field Where the left end of the field's ceiling is.
 * @property {Scene} scene
 */

/** How far a phone's bezel stands off its screen. */
const BEZEL = 16;

/**
 * Draws a phone held upright, 390 by 844: the field fills the screen's
 * width, its lintel at the top, and the game bar sits under the floor.
 *
 * @param {Palette} pal
 * @returns {Mock}
 */
function phoneMock(pal) {
  const width = 390;
  const height = 844;
  const scene = fieldScene(pal, PHONE_FIELD);
  const left = (width - scene.width) / 2;
  const top = PHONE_FIELD.lintel;
  const bar = gameBar(pal, scene.width, true);
  const under = top + scene.height;
  const barTop = under + (height - under - bar.height) / 2;
  return {
    width,
    height,
    svg: [
      rect(-BEZEL, -BEZEL, width + BEZEL * 2, height + BEZEL * 2, {
        rx: 46,
        stroke: pal.fieldLine,
        sw: 2.6,
      }),
      `<g transform="translate(${left} ${top})">\n${scene.svg}\n</g>`,
      `<g transform="translate(${left} ${num(barTop)})">\n${bar.svg}\n</g>`,
    ].join("\n"),
    field: [left, top],
    scene,
  };
}

/**
 * Draws a wide desktop window, 1280 by 800 under its title strip: the game
 * bar across the top, the field a column of big cells in the middle, and a
 * panel in the width left over on each side.
 *
 * @param {Palette} pal
 * @returns {Mock}
 */
function desktopMock(pal) {
  const width = 1280;
  const strip = 26;
  const edge = 12;
  const scene = fieldScene(pal, DESKTOP_FIELD);
  const bar = gameBar(pal, width - edge * 2, false);
  const top = strip + edge + bar.height + edge;
  const { lintel } = DESKTOP_FIELD;
  const fieldTop = top + lintel;
  const height = fieldTop + scene.height + edge;
  const fieldLeft = (width - scene.width) / 2;
  // A panel stands 12 px from the field, 320 wide at most; past it the page
  // shows.
  const sideWidth = Math.min(320, fieldLeft - edge * 2);
  const sideHeight = lintel + scene.height;
  const frame = { stroke: pal.fieldLine, sw: 2.6 };
  return {
    width,
    height,
    svg: [
      rect(0, 0, width, height, { ...frame, rx: 14 }),
      line([0, strip], [width, strip], { ...frame, cap: "butt" }),
      ...[0, 1, 2].map((i) =>
        circle(18 + i * 17, strip / 2, 4.6, { fill: pal.fieldLine }),
      ),
      `<g transform="translate(${edge} ${strip + edge})">\n${bar.svg}\n</g>`,
      `<g transform="translate(${fieldLeft - edge - sideWidth} ${top})">\n${comingNextPanel(pal, sideWidth, sideHeight)}\n</g>`,
      `<g transform="translate(${fieldLeft} ${fieldTop})">\n${scene.svg}\n</g>`,
      `<g transform="translate(${fieldLeft + scene.width + edge} ${top})">\n${inThisWallPanel(pal, sideWidth, sideHeight)}\n</g>`,
    ].join("\n"),
    field: [fieldLeft, fieldTop],
    scene,
  };
}

/** How big the mocks are drawn on the sheet, both alike. */
const MOCK_SCALE = 0.76;

/**
 * Draws the field sheet: the field in play on a phone held upright and in a
 * wide desktop window, both at one scale, each with its callouts.
 *
 * @returns {Sheet}
 */
function fieldSheet() {
  const pal = DARK;
  const k = MOCK_SCALE;
  /** @type {string[]} */
  const out = [];
  /**
   * Draws a callout: its words, and a leader from them to what they name.
   *
   * @type {(leader: Point[], words: string[], anchor: "start" | "middle" | "end", textAt: Point) => void}
   */
  const callout = (leader, words, anchor, textAt) => {
    const [x, y] = leader[leader.length - 1];
    out.push(
      polyline(leader, { stroke: pal.muted, sw: 1 }),
      circle(x, y, 2.4, { fill: pal.muted }),
      ...words.map((row, i) =>
        text(textAt[0], textAt[1] + i * 17, row, {
          size: 13,
          fill: pal.text,
          anchor,
        }),
      ),
    );
  };
  /** @type {(cx: number, baseline: number, title: string, screen: string) => void} */
  const caption = (cx, baseline, title, screen) => {
    out.push(
      text(cx, baseline, title, {
        size: 16,
        weight: 600,
        fill: pal.text,
        anchor: "middle",
      }),
      text(cx, baseline + 22, screen, {
        size: 13,
        fill: pal.muted,
        anchor: "middle",
      }),
    );
  };

  out.push(
    text(MARGIN, 60, "Brick Fuzz Pop: the field, always upright", {
      size: 30,
      weight: 700,
      fill: pal.text,
    }),
    text(
      SHEET_WIDTH - MARGIN,
      60,
      "Midnight blue · the field in play, on a phone and in a wide window",
      { size: 14, fill: pal.muted, anchor: "end" },
    ),
  );

  const top = 116;

  // The phone, its callouts in a column on its left.
  const phone = phoneMock(pal);
  const phoneX = 268;
  out.push(
    `<g transform="translate(${phoneX} ${top}) scale(${k})">\n${phone.svg}\n</g>`,
  );
  {
    const { scene } = phone;
    const words = phoneX - BEZEL * k - 26;
    const from = words + 8;
    const fieldLeft = phoneX + phone.field[0] * k;
    const edge = fieldLeft + 3;
    /** @type {(y: number) => number} */
    const down = (y) => top + (phone.field[1] + y) * k;
    /** @type {(target: Point, rows: string[], labelY?: number) => void} */
    const left = (target, rows, labelY = target[1]) => {
      callout([[from, labelY], target], rows, "end", [
        words,
        labelY + 4.5 - ((rows.length - 1) * 17) / 2,
      ]);
    };
    left(
      [edge, down(PHONE_FIELD.cell / 2)],
      ["each turn the wall", "steps down one row"],
    );
    left(
      [edge, down(scene.jumpY)],
      [
        "jump line: clear everything",
        "below it and the wall jumps",
        "a third of the screen, and",
        "the next shot is a hot shot",
      ],
    );
    left(
      [fieldLeft + scene.aimed[0] * k - 10, down(scene.aimed[1])],
      ["aim guide: shows punches", "and the first bounce"],
    );
    left(
      [edge, down(scene.dangerY)],
      ["danger line"],
      down(scene.dangerY) - 14,
    );
    left(
      [fieldLeft + scene.pip[0] * k - 8, down(scene.pip[1]) - 1],
      ["charge"],
      down(scene.pip[1]) - 15,
    );
    left([edge, down(scene.floorY)], ["floor"], down(scene.floorY) + 22);
  }
  const phoneBottom = top + (phone.height + BEZEL) * k;
  const captionAt = phoneBottom + 44;
  caption(
    phoneX + (phone.width * k) / 2,
    captionAt,
    "A phone held upright",
    "390 × 844: 9 × 17 cells under a lintel, the game bar under the floor",
  );

  // The desktop window, with a callout down each side of its field.
  const desktop = desktopMock(pal);
  const desktopX = Math.round(SHEET_WIDTH - MARGIN - desktop.width * k);
  out.push(
    `<g transform="translate(${desktopX} ${num(top - BEZEL * k)}) scale(${k})">\n${desktop.svg}\n</g>`,
  );
  const desktopBottom = top - BEZEL * k + desktop.height * k;
  {
    const { scene } = desktop;
    const fieldLeft = desktopX + desktop.field[0] * k;
    const fieldRight = fieldLeft + scene.width * k;
    const fieldTop = top - BEZEL * k + desktop.field[1] * k;
    const under = desktopBottom + 18;
    const jumpY = fieldTop + scene.jumpY * k;
    const dangerY = fieldTop + scene.dangerY * k;
    callout(
      [
        [fieldLeft - 4.5, under],
        [fieldLeft - 4.5, jumpY],
        [fieldLeft + 3, jumpY],
      ],
      ["jump line: under the top three rows,", "a third of the way down"],
      "start",
      [fieldLeft - 12, under + 18],
    );
    callout(
      [
        [fieldRight + 4.5, under],
        [fieldRight + 4.5, dangerY],
        [fieldRight - 3, dangerY],
      ],
      ["danger line"],
      "start",
      [fieldRight - 3, under + 18],
    );
  }
  caption(
    desktopX + (desktop.width * k) / 2,
    captionAt,
    "A wide desktop window",
    "1280 × 800: 9 × 11 big cells in a column under a lintel, a panel each side",
  );

  const height = Math.round(captionAt + 22 + 40);
  return {
    width: SHEET_WIDTH,
    height,
    body:
      rect(0, 0, SHEET_WIDTH, height, { fill: pal.page }) +
      "\n" +
      out.join("\n"),
  };
}

// ------------------------------------------------------------------ output

/**
 * Wraps a drawing as an SVG file.
 *
 * @param {number} width
 * @param {number} height
 * @param {string} title What the picture shows, for whoever cannot see it.
 * @param {string} body
 * @returns {string}
 */
function svgFile(width, height, title, body) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">\n` +
    `<title>${esc(title)}</title>\n${body}\n</svg>\n`
  );
}

/**
 * Wraps a tile, or anything drawn to fill a square, as a file of its own, 96
 * pixels square, with nothing behind it.
 *
 * @param {string} title
 * @param {string} art
 * @param {number} [box] The side of the square it was drawn in.
 * @returns {string}
 */
function tileFile(title, art, box = 100) {
  return svgFile(96, 96, title, place(art, 0, 0, 96, box));
}

/**
 * Sets a fuzzball drawn on its grid in a square 43 units across, which is
 * the room a full charge's sparks and a hot shot's flames need. Every
 * state's file is drawn at this one size, so one can stand in for another.
 *
 * @param {string} art
 * @param {number} drop How far below the square's middle its body sits.
 * @returns {string}
 */
function fuzzballTile(art, drop) {
  const box = 43;
  return `<g transform="translate(${num(box / 2 - FUZZ.body.cx)} ${num(box / 2 - FUZZ.body.cy + drop)})">${art}</g>`;
}

/**
 * Fails if a mark has too little contrast with what it sits on: 3 to 1, as
 * the plan asks of everything on the field.
 *
 * @param {Palette} pal
 * @returns {void}
 */
function checkContrast(pal) {
  const glass = mix(pal.field, pal.text, 0.12);
  /** @type {[string, string, string][]} */
  const pairs = [
    ...TINT_NAMES.map(
      /** @returns {[string, string, string]} */
      (tint) => [`${tint} on the field`, pal.tints[tint], pal.field],
    ),
    ["steel on the field", pal.steel, pal.field],
    ["accent on the field", pal.accent, pal.field],
    ["danger on the field", pal.danger, pal.field],
    ["warning on the field", pal.warning, pal.field],
    ["a zapper's bolt on its tile", pal.warning, pal.fieldLine],
    ["a prism's edge on the field", mix(pal.field, pal.text, 0.58), pal.field],
    ["a prism's red ray on its glass", pal.tints.red, glass],
    ["a prism's amber ray on its glass", pal.tints.amber, glass],
    ["a prism's blue ray on its glass", pal.tints.blue, glass],
  ];
  for (const [what, a, b] of pairs) {
    const ratio = contrast(a, b);
    if (ratio < 3) {
      throw new Error(`${pal.name}: ${what} is ${ratio.toFixed(2)} to 1`);
    }
  }
}

/**
 * Writes every file, beside this script.
 *
 * @returns {void}
 */
function main() {
  const here = import.meta.dirname;
  /** @type {(path: string, content: string) => void} */
  const write = (path, content) => {
    const file = join(here, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    console.log(`${path} (${Buffer.byteLength(content)} bytes)`);
  };

  PALETTES.forEach(checkContrast);

  const bricks = bricksSheet();
  write(
    "bricks.svg",
    svgFile(
      bricks.width,
      bricks.height,
      "Brick Fuzz Pop brick catalog: the 16 kinds of brick, their states, the eight tints and the fuzzball, in the Midnight blue and Classic felt palettes",
      bricks.body,
    ),
  );
  const field = fieldSheet();
  write(
    "field.svg",
    svgFile(
      field.width,
      field.height,
      "Brick Fuzz Pop field in play, always upright: on a phone, and in a wide desktop window with a panel on each side",
      field.body,
    ),
  );
  for (const pal of PALETTES) {
    for (const { id, name, draw } of KINDS) {
      write(
        `bricks/${pal.id}/${id}.svg`,
        tileFile(`${name}, ${pal.name}`, draw(pal)),
      );
    }
    for (const [id, name, draw, drop] of FUZZBALL_STATES) {
      write(
        `fuzzball/${pal.id}/${id}.svg`,
        tileFile(
          `The fuzzball, ${name}, ${pal.name}`,
          fuzzballTile(draw(pal), drop),
          43,
        ),
      );
    }
  }
}

main();
