/**
 * Draws Fuzz Flux's pieces as lists of flat shapes, for the art sheets, the
 * mocks and the feel sketch alike.
 *
 * A shape's path is SVG path data, which a browser's `Path2D` reads too, so
 * one description feeds both an SVG file and a canvas.
 */

/**
 * @typedef {'blue' | 'red' | 'amber' | 'green' | 'violet' | 'pink'} KindId
 * @typedef {'dasher-h' | 'dasher-v' | 'puffer' | 'wisp'} SpecialId
 * @typedef {'open' | 'blink' | 'happy' | 'wide' | 'sleepy' | 'asleep' | 'cross'} EyeLook
 * @typedef {'ink' | 'aura' | 'shade' | 'eye' | 'glint' | 'spark' | 'field'
 *   | 'well' | 'text' | 'muted' | 'steel' | 'steelDark' | 'steelLight'
 *   | 'felt1' | 'felt1Side' | 'felt2' | 'felt2Side' | 'felt3' | 'felt3Side'
 *   | 'felt4' | 'felt4Side' | 'dust' | 'dustDeep' | 'burr'
 *   | 'burrDark' | 'frizz' | 'frizzEye' | 'frizzPupil' | 'sleepy'
 *   | 'sleepyDark' | 'accent' | 'warning' | 'danger' | 'panel' | 'line'
 *   | 'page' | 'tunnelA' | 'tunnelB'} Role
 */

/**
 * A flat shape: a filled path, a stroked one, a circle or an ellipse.
 * @typedef {object} Shape
 * @property {'fill' | 'stroke' | 'circle' | 'ellipse'} k
 * @property {string} [d] Path data, for a fill or a stroke.
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} [r]
 * @property {number} [rx]
 * @property {number} [ry]
 * @property {number} [w] A stroke's width.
 * @property {Role | string} c A palette role, or a color written out.
 * @property {number} [o] Opacity, where it is not 1.
 */

/**
 * A palette: the colors the game draws in, by role, and the six kinds' inks.
 * @typedef {object} Palette
 * @property {string} id
 * @property {string} name
 * @property {boolean} dark
 * @property {Record<string, string>} roles
 * @property {Record<KindId, string>} inks
 */

/** The six kinds in the order a level's colors are counted in. */
export const KIND_IDS = /** @type {const} */ ([
  "blue",
  "red",
  "amber",
  "green",
  "violet",
  "pink",
]);

/** What a player is told each kind is: its color and the cut of its fur. */
export const KIND_NAMES = /** @type {Record<KindId, string>} */ ({
  blue: "Blue, round",
  red: "Red, spiky",
  amber: "Yellow, top-knot",
  green: "Green, curly",
  violet: "Purple, fringed",
  pink: "Pink, two tufts",
});

/** The radius of a fuzzball's body, in a cell 100 units wide. */
export const R = 29;

/** @type {Palette} */
export const DARK = {
  id: "dark",
  name: "Midnight blue",
  dark: true,
  roles: {
    page: "#0e1a2b",
    panel: "#172741",
    line: "#24395c",
    field: "#132238",
    well: "#1c2f4f",
    text: "#e6edf7",
    muted: "#93a4bd",
    accent: "#4cc3ff",
    warning: "#fbbf24",
    danger: "#ff8080",
    eye: "#14171b",
    glint: "#ffffff",
    spark: "#ffe066",
    steel: "#8a97ab",
    steelDark: "#6c7685",
    steelLight: "#a4aebd",
    felt1: "#dccaa8",
    felt1Side: "#b5a283",
    felt2: "#c0a482",
    felt2Side: "#9a8163",
    felt3: "#a07f6c",
    felt3Side: "#7c6153",
    felt4: "#7a6260",
    felt4Side: "#5b4847",
    dust: "#3b5078",
    dustDeep: "#5d76a3",
    burr: "#a98445",
    burrDark: "#6f5628",
    frizz: "#eef3fa",
    frizzEye: "#14171b",
    frizzPupil: "#14171b",
    sleepy: "#9fb0c9",
    sleepyDark: "#7688a3",
    tunnelA: "#bb9cec",
    tunnelB: "#78c5c3",
  },
  inks: {
    blue: "#4cc3ff",
    red: "#f4635e",
    amber: "#f7ae1d",
    green: "#42c773",
    violet: "#a97bf0",
    pink: "#f06bb2",
  },
};

/** @type {Palette} */
export const LIGHT = {
  id: "light",
  name: "Classic felt",
  dark: false,
  roles: {
    page: "#f3f4f6",
    panel: "#ffffff",
    line: "#e2e5e9",
    field: "#e9ecf1",
    well: "#dbe0e8",
    text: "#1b1f24",
    muted: "#5d6672",
    accent: "#2f7d4f",
    warning: "#a84b06",
    danger: "#c62828",
    eye: "#14171b",
    glint: "#ffffff",
    spark: "#c77700",
    steel: "#6b7480",
    steelDark: "#535a64",
    steelLight: "#8c939c",
    felt1: "#c6ad86",
    felt1Side: "#a38b66",
    felt2: "#a88a66",
    felt2Side: "#866c4d",
    felt3: "#866a55",
    felt3Side: "#69513f",
    felt4: "#614a43",
    felt4Side: "#483631",
    dust: "#c3cbd8",
    dustDeep: "#9ba7ba",
    burr: "#7a5c22",
    burrDark: "#4f3b14",
    frizz: "#39414d",
    frizzEye: "#ffffff",
    frizzPupil: "#14171b",
    sleepy: "#7f8a9a",
    sleepyDark: "#626c7a",
    tunnelA: "#8b55d2",
    tunnelB: "#167e7b",
  },
  inks: {
    blue: "#256fd1",
    red: "#d4322d",
    amber: "#c78a00",
    green: "#29803f",
    violet: "#8b55d2",
    pink: "#cb3087",
  },
};

export const PALETTES = { dark: DARK, light: LIGHT };

/**
 * Returns a small seeded generator of numbers in [0, 1), so that a kind's fur
 * is drawn the same way every time.
 * @param {number} seed
 * @returns {() => number}
 */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rounds a coordinate to two places, which keeps the files small.
 * @param {number} n
 * @returns {number}
 */
export function f(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Mixes two colors written as #rrggbb.
 * @param {string} a
 * @param {string} b
 * @param {number} t How much of `b`, from 0 to 1.
 * @returns {string}
 */
export function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return (
    "#" +
    pa
      .map((v, i) =>
        Math.round(v + (pb[i] - v) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/**
 * Returns the color a role or a written color stands for, for one kind in one
 * palette.
 * @param {Palette} palette
 * @param {KindId | null} kind
 * @param {Role | string} role
 * @returns {string}
 */
export function colorOf(palette, kind, role) {
  if (role.startsWith("#")) return role;
  const ink = kind ? palette.inks[kind] : palette.roles.text;
  if (role === "ink") return ink;
  // An aura stands off the field as well as off its fuzzball: lighter than the
  // ink on a dark field, darker on a light one.
  if (role === "aura") {
    return palette.dark ? mix(ink, "#ffffff", 0.5) : mix(ink, "#000000", 0.38);
  }
  if (role === "shade") return mix(ink, "#000000", palette.dark ? 0.28 : 0.3);
  return palette.roles[role] ?? ink;
}

/**
 * Returns a point at an angle and a distance from the origin.
 * @param {number} angle In radians, clockwise from the positive x axis.
 * @param {number} radius
 * @returns {[number, number]}
 */
function polar(angle, radius) {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

/**
 * Returns the path of one strand of fur, a curve from the body out to its tip.
 * @param {number} angle
 * @param {number} from The radius it leaves the body at.
 * @param {number} to The radius of its tip.
 * @param {number} bend How far round the tip is carried, in radians.
 * @returns {string}
 */
function strand(angle, from, to, bend) {
  const [x0, y0] = polar(angle, from);
  const [cx, cy] = polar(angle + bend * 0.35, (from + to) / 2);
  const [x1, y1] = polar(angle + bend, to);
  return `M${f(x0)} ${f(y0)}Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}`;
}

/**
 * Returns a ring of short fur, the coat every kind but the curly one wears.
 * @param {object} o
 * @param {number} o.count
 * @param {number} o.reach The tips' radius, in body radii.
 * @param {number} o.vary How much the tips' radius varies, in body radii.
 * @param {number} o.bend
 * @param {number} o.seed
 * @param {number} [o.lift] 0 at rest to 1 with the fur on end.
 * @param {number} [o.from] The first angle, where the ring is not whole.
 * @param {number} [o.to] The last angle.
 * @returns {Shape}
 */
function coat({ count, reach, vary, bend, seed, lift = 0, from, to }) {
  const rand = rng(seed);
  const whole = from === undefined || to === undefined;
  const a0 = whole ? 0 : from;
  const span = whole ? Math.PI * 2 : to - from;
  const parts = [];
  for (let i = 0; i < count; i++) {
    const step = whole ? i / count : i / (count - 1);
    const angle = a0 + span * step + (rand() - 0.5) * (span / count) * 0.5;
    const tip = R * (reach + (rand() - 0.5) * vary) * (1 + lift * 0.22);
    parts.push(strand(angle, R * 0.78, tip, bend * (1 - lift)));
  }
  return { k: "stroke", d: parts.join(""), c: "ink", w: R * 0.27 };
}

/**
 * Returns the fur of one kind, the part of a fuzzball drawn behind its body.
 * @param {KindId} kind
 * @param {number} [lift] 0 at rest to 1 with the fur on end.
 * @returns {Shape[]}
 */
export function fur(kind, lift = 0) {
  switch (kind) {
    case "blue":
      return [
        coat({ count: 27, reach: 1.2, vary: 0.14, bend: 0.2, seed: 11, lift }),
      ];
    case "red": {
      // Twelve points, long and short in turn, straight and sharp.
      const parts = [];
      const n = 12;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const tip = R * (i % 2 === 0 ? 1.5 : 1.26) * (1 + lift * 0.14);
        const half = (Math.PI / n) * 0.86;
        const [ax, ay] = polar(angle - half, R * 0.9);
        const [bx, by] = polar(angle + half, R * 0.9);
        const [tx, ty] = polar(angle, tip);
        parts.push(`M${f(ax)} ${f(ay)}L${f(tx)} ${f(ty)}L${f(bx)} ${f(by)}Z`);
      }
      return [
        { k: "fill", d: parts.join(""), c: "ink" },
        { k: "stroke", d: parts.join(""), c: "ink", w: R * 0.08 },
      ];
    }
    case "amber": {
      // A short coat under a top-knot that curls over to one side.
      const knot = [
        strand(-Math.PI / 2 - 0.13, R * 0.7, R * 1.5, 0.42),
        strand(-Math.PI / 2, R * 0.7, R * 1.86, 0.4),
        strand(-Math.PI / 2 + 0.13, R * 0.7, R * 1.62, 0.5),
      ].join("");
      return [
        coat({
          count: 24,
          reach: 1.13,
          vary: 0.08,
          bend: 0.16,
          seed: 23,
          lift,
        }),
        { k: "stroke", d: knot, c: "ink", w: R * 0.26 * (1 + lift * 0.1) },
      ];
    }
    case "green": {
      // Nine curls, a scalloped edge like a sheep's.
      const shapes = [];
      const n = 9;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const [x, y] = polar(angle, R * (0.88 + lift * 0.1));
        shapes.push(
          /** @type {Shape} */ ({
            k: "circle",
            x: f(x),
            y: f(y),
            r: f(R * (0.36 + lift * 0.03)),
            c: "ink",
          }),
        );
      }
      return shapes;
    }
    case "violet": {
      // A short coat over the top and a long fringe hanging under it.
      const rand = rng(41);
      const parts = [];
      const n = 7;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x0 = R * (-0.78 + 1.56 * t);
        const y0 = R * (0.18 + 0.42 * Math.sin(t * Math.PI));
        const length = R * (0.74 + 0.36 * Math.sin(t * Math.PI) + rand() * 0.1);
        const splay = (t - 0.5) * R * (0.34 + lift * 0.5);
        parts.push(
          `M${f(x0)} ${f(y0)}Q${f(x0 + splay * 0.3)} ${f(y0 + length * 0.6)} ${f(x0 + splay)} ${f(y0 + length * (1 - lift * 0.12))}`,
        );
      }
      return [
        coat({
          count: 15,
          reach: 1.13,
          vary: 0.08,
          bend: 0.14,
          seed: 37,
          lift,
          from: Math.PI * 0.98,
          to: Math.PI * 2.02,
        }),
        { k: "stroke", d: parts.join(""), c: "ink", w: R * 0.3 },
      ];
    }
    case "pink": {
      // A short coat and two tufts, one each side of the crown.
      const tufts = [-1, 1]
        .map((side) => {
          const a = -Math.PI / 2 + side * 0.56;
          return [
            strand(a - side * 0.15, R * 0.7, R * 1.46, -side * 0.04),
            strand(a, R * 0.7, R * 1.8, side * 0.05),
            strand(a + side * 0.15, R * 0.7, R * 1.52, side * 0.12),
          ].join("");
        })
        .join("");
      return [
        coat({
          count: 24,
          reach: 1.13,
          vary: 0.08,
          bend: 0.16,
          seed: 53,
          lift,
        }),
        { k: "stroke", d: tufts, c: "ink", w: R * 0.27 * (1 + lift * 0.1) },
      ];
    }
    default:
      throw new Error(`No fur for ${kind}`);
  }
}

/**
 * Returns how far a kind's body sits from its cell's center, so that the
 * whole fuzzball, fur and all, looks centered.
 * @param {KindId} kind
 * @returns {[number, number]}
 */
export function seat(kind) {
  if (kind === "amber") return [0, R * 0.24];
  if (kind === "violet") return [0, -R * 0.22];
  if (kind === "pink") return [0, R * 0.22];
  return [0, 0];
}

/**
 * Returns a fuzzball's body, the disc its fur grows from.
 * @param {Role | string} [c]
 * @returns {Shape[]}
 */
export function body(c = "ink") {
  return [{ k: "circle", x: 0, y: 0, r: R, c }];
}

/**
 * Returns a fuzzball's eyes.
 * @param {EyeLook} [look]
 * @param {number} [dx] Where it looks, from -1 at the far left to 1.
 * @param {number} [dy] Where it looks, from -1 at the top to 1.
 * @param {{ white: Role | string, pupil: Role | string } | null} [inverted]
 *   For a fuzzball too dark for dark eyes: the colors of its eyes' whites and
 *   their pupils.
 * @returns {Shape[]}
 */
export function eyes(look = "open", dx = 0, dy = 0, inverted = null) {
  const ex = R * 0.35;
  const ey = -R * 0.02;
  const ox = dx * R * 0.13;
  const oy = dy * R * 0.11;
  const eye = inverted ? inverted.white : "eye";
  /** @type {Shape[]} */
  const shapes = [];
  for (const side of [-1, 1]) {
    const x = side * ex + ox;
    const y = ey + oy;
    if (look === "blink") {
      shapes.push({
        k: "stroke",
        d: `M${f(x - R * 0.2)} ${f(y)}L${f(x + R * 0.2)} ${f(y)}`,
        c: eye,
        w: R * 0.11,
      });
    } else if (look === "happy") {
      shapes.push({
        k: "stroke",
        d: `M${f(x - R * 0.2)} ${f(y + R * 0.1)}Q${f(x)} ${f(y - R * 0.26)} ${f(x + R * 0.2)} ${f(y + R * 0.1)}`,
        c: eye,
        w: R * 0.12,
      });
    } else if (look === "asleep") {
      shapes.push({
        k: "stroke",
        d: `M${f(x - R * 0.2)} ${f(y - R * 0.02)}Q${f(x)} ${f(y + R * 0.22)} ${f(x + R * 0.2)} ${f(y - R * 0.02)}`,
        c: eye,
        w: R * 0.11,
      });
    } else if (look === "cross") {
      shapes.push({
        k: "stroke",
        d: `M${f(x - side * R * 0.2)} ${f(y - R * 0.16)}L${f(x + side * R * 0.16)} ${f(y)}L${f(x - side * R * 0.2)} ${f(y + R * 0.16)}`,
        c: eye,
        w: R * 0.11,
      });
    } else {
      const grow = look === "wide" ? 1.18 : 1;
      shapes.push({
        k: "ellipse",
        x: f(x),
        y: f(y),
        rx: f(R * 0.22 * grow),
        ry: f(R * 0.29 * grow),
        c: eye,
      });
      if (inverted) {
        shapes.push({
          k: "ellipse",
          x: f(x + dx * R * 0.05),
          y: f(y + dy * R * 0.06),
          rx: f(R * 0.12),
          ry: f(R * 0.17),
          c: inverted.pupil,
        });
      }
      shapes.push({
        k: "circle",
        x: f(x + R * 0.077 + ox * 0.2),
        y: f(y - R * 0.115 + oy * 0.2),
        r: f(R * (look === "wide" ? 0.1 : 0.082)),
        c: "glint",
      });
      if (look === "sleepy") {
        // A lid in the body's ink over the top half of the eye.
        shapes.push({
          k: "fill",
          d: `M${f(x - R * 0.3)} ${f(y - R * 0.36)}H${f(x + R * 0.3)}V${f(y - R * 0.02)}H${f(x - R * 0.3)}Z`,
          c: inverted ? "frizz" : "ink",
        });
      }
    }
  }
  return shapes;
}

/**
 * Returns what a special fuzzball wears behind its own fur, which says what
 * it does when it is set off.
 * @param {SpecialId} special
 * @returns {Shape[]}
 */
export function aura(special) {
  if (special === "dasher-h" || special === "dasher-v") {
    // Fur combed out into streamers along the line it will dash down, and an
    // arrowhead past each end.
    const parts = [];
    for (const side of [-1, 1]) {
      const base = side === 1 ? 0 : Math.PI;
      for (const [spread, reach, half] of [
        [0, 1.9, 0.27],
        [0.5, 1.56, 0.2],
        [-0.5, 1.56, 0.2],
      ]) {
        const angle = base + spread;
        const [ax, ay] = polar(angle - half, R * 0.9);
        const [bx, by] = polar(angle + half, R * 0.9);
        const [tx, ty] = polar(angle, R * reach);
        parts.push(`M${f(ax)} ${f(ay)}L${f(tx)} ${f(ty)}L${f(bx)} ${f(by)}Z`);
      }
    }
    const d = parts.join("");
    /** @type {Shape[]} */
    const shapes = [
      { k: "fill", d, c: "aura" },
      { k: "stroke", d, c: "aura", w: R * 0.1 },
    ];
    return special === "dasher-v" ? shapes.map((s) => turned(s)) : shapes;
  }
  if (special === "puffer") {
    // A second coat, twice as deep, standing straight out all round.
    const parts = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + 0.2;
      parts.push(strand(angle, R * 0.8, R * (i % 2 === 0 ? 1.62 : 1.48), 0));
    }
    return [{ k: "stroke", d: parts.join(""), c: "aura", w: R * 0.36 }];
  }
  if (special === "wisp") {
    // A dandelion's parachute: a stem and a fan of fine hairs with a bead at
    // each tip.
    const top = -R * 1.02;
    const hub = -R * 1.5;
    const hairs = [];
    /** @type {Shape[]} */
    const beads = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (i - (n - 1) / 2) * 0.36;
      const [x, y] = polar(angle, R * 0.82);
      hairs.push(`M0 ${f(hub)}L${f(x)} ${f(hub + y)}`);
      beads.push({
        k: "circle",
        x: f(x),
        y: f(hub + y),
        r: f(R * 0.085),
        c: "aura",
      });
    }
    return [
      {
        k: "stroke",
        d: `M0 ${f(top + R * 0.2)}L0 ${f(hub)}`,
        c: "aura",
        w: R * 0.12,
      },
      { k: "stroke", d: hairs.join(""), c: "aura", w: R * 0.085 },
      ...beads,
    ];
  }
  throw new Error(`No aura for ${special}`);
}

/**
 * Returns a shape turned a quarter turn, for a dasher that runs up and down.
 * @param {Shape} shape
 * @returns {Shape}
 */
function turned(shape) {
  if (!shape.d) return shape;
  const d = shape.d.replace(
    /(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
    (_, x, y) => `${f(-Number(y))} ${f(Number(x))}`,
  );
  return { ...shape, d };
}

/**
 * Returns the sparks that stand about a frizzball, each a small zigzag.
 * @param {number} [count]
 * @param {number} [reach] Their distance from the center, in body radii.
 * @param {number} [turn] How far round the ring is turned, in radians.
 * @returns {Shape[]}
 */
export function sparks(count = 4, reach = 1.78, turn = 0.5) {
  const parts = [];
  const s = R * 0.2;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + turn;
    // Each is a bolt that points away from the fuzzball, three strokes long.
    const points = [
      [-s * 1.1, -s * 0.5],
      [-s * 0.1, s * 0.45],
      [s * 0.1, -s * 0.45],
      [s * 1.1, s * 0.5],
    ].map(([along, across]) => {
      const [x, y] = polar(angle, R * reach + along);
      const [ox, oy] = polar(angle + Math.PI / 2, across);
      return `${f(x + ox)} ${f(y + oy)}`;
    });
    parts.push(`M${points.join("L")}`);
  }
  return [{ k: "stroke", d: parts.join(""), c: "spark", w: R * 0.13 }];
}

/**
 * Returns the frizzball: a fuzzball of no color with its fur on end and
 * static around it, the site's own look for a fuzzball fully charged.
 * @param {Palette} palette
 * @param {EyeLook} [look]
 * @param {number} [turn] How far round its sparks stand, which a view moves.
 * @returns {Shape[]}
 */
export function frizzball(palette, look = "wide", turn = 0.62) {
  const n = 18;
  const strands = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    strands.push(strand(angle, R * 0.78, R * (i % 2 === 0 ? 1.52 : 1.3), 0));
  }
  const inverted = palette.dark
    ? null
    : { white: "frizzEye", pupil: "frizzPupil" };
  return [
    ...sparks(4, 1.86, turn),
    { k: "stroke", d: strands.join(""), c: "frizz", w: R * 0.24 },
    ...body("frizz"),
    ...eyes(look, 0, 0, inverted),
  ];
}

/**
 * Returns the path of a rectangle with rounded corners.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 * @returns {string}
 */
export function rrect(x, y, w, h, r) {
  return `M${f(x + r)} ${f(y)}H${f(x + w - r)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)}V${f(y + h - r)}Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)}H${f(x + r)}Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)}V${f(y + r)}Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)}Z`;
}

/**
 * Returns a square of the board, the well a fuzzball sits in, about its center.
 * @param {number} [dust] Layers of dust on it.
 * @returns {Shape[]}
 */
export function square(dust = 0) {
  /** @type {Shape[]} */
  const shapes = [{ k: "fill", d: rrect(-47, -47, 94, 94, 17), c: "well" }];
  if (dust > 0) {
    // Dust is a paler square with a scuffed edge and specks, more of them when thick.
    shapes.push({
      k: "fill",
      d: rrect(-47, -47, 94, 94, 17),
      c: dust > 1 ? "dustDeep" : "dust",
    });
    const rand = rng(77 + dust);
    const count = dust > 1 ? 13 : 7;
    for (let i = 0; i < count; i++) {
      shapes.push({
        k: "circle",
        x: f((rand() - 0.5) * 74),
        y: f((rand() - 0.5) * 74),
        r: f(2.2 + rand() * (dust > 1 ? 3.2 : 2)),
        c: dust > 1 ? "dust" : "dustDeep",
      });
    }
  }
  return shapes;
}

/**
 * Returns the path of a pad: a rounded box whose sides bow out a little, as a
 * stuffed thing's do.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 * @param {number} [bow]
 * @returns {string}
 */
export function pad(x, y, w, h, r, bow = 2) {
  const x1 = x + w;
  const y1 = y + h;
  const mx = x + w / 2;
  const my = y + h / 2;
  return (
    `M${f(x + r)} ${f(y)}Q${f(mx)} ${f(y - bow)} ${f(x1 - r)} ${f(y)}` +
    `Q${f(x1)} ${f(y)} ${f(x1)} ${f(y + r)}Q${f(x1 + bow)} ${f(my)} ${f(x1)} ${f(y1 - r)}` +
    `Q${f(x1)} ${f(y1)} ${f(x1 - r)} ${f(y1)}Q${f(mx)} ${f(y1 + bow)} ${f(x + r)} ${f(y1)}` +
    `Q${f(x)} ${f(y1)} ${f(x)} ${f(y1 - r)}Q${f(x - bow)} ${f(my)} ${f(x)} ${f(y + r)}` +
    `Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)}Z`
  );
}

/** How many layers the thickest brick has. */
export const BRICK_LAYERS = 4;

/**
 * A layer of a brick as it lies in its square: which layer it is, counted
 * from the bottom, where its middle is, and how wide and how tall it is.
 * @typedef {object} BrickLayer
 * @property {number} level 1 for the bottom layer, up to 4.
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */

/**
 * Returns where a brick's layers lie. They share the square between them, so
 * each is plumper the fewer are left.
 * @param {number} hits 1 to 4.
 * @returns {BrickLayer[]} From the bottom layer up.
 */
export function brickLayers(hits) {
  const n = Math.max(1, Math.min(BRICK_LAYERS, Math.round(hits)));
  const gap = 1.6;
  const h = (88 - gap * (n - 1)) / n;
  /** @type {BrickLayer[]} */
  const layers = [];
  for (let level = 1; level <= n; level++) {
    layers.push({
      level,
      x: n === 1 ? 0 : [0, -1.2, 1.4, -1][level - 1],
      y: 44 - (level - 0.5) * h - (level - 1) * gap,
      w: 87 - (level - 1) * 2.6,
      h,
    });
  }
  return layers;
}

/**
 * Returns one layer of a brick about its own middle: a cushion of felt, plump,
 * shaded underneath and tufted with a button.
 * @param {number} level 1 for the bottom layer, up to 4.
 * @param {number} w
 * @param {number} h
 * @returns {Shape[]}
 */
export function brickLayer(level, w, h) {
  const face = `felt${level}`;
  const side = `felt${level}Side`;
  const r = Math.min(h * 0.42, 15);
  const bow = Math.min(2.6, h / 10);
  const under = Math.max(3.5, Math.min(8, h * 0.18));
  const top = -h / 2;
  const mid = -under / 2;
  const button = Math.max(2.4, Math.min(5, h * 0.15));
  const reach = button + Math.max(4, Math.min(10, h * 0.26));
  const pinch = Math.max(1.6, Math.min(2.8, h * 0.1));
  const ear = Math.max(2.2, Math.min(4.4, h * 0.13));
  const shine = Math.max(1.6, Math.min(3, h * 0.1));
  return [
    // Its corners pinch out into little ears, as a cushion's do.
    {
      k: "circle",
      x: f(-w / 2 + 1.5),
      y: f(h / 2 - ear * 0.9),
      r: f(ear),
      c: side,
    },
    {
      k: "circle",
      x: f(w / 2 - 1.5),
      y: f(h / 2 - ear * 0.9),
      r: f(ear),
      c: side,
    },
    {
      k: "circle",
      x: f(-w / 2 + 1.5),
      y: f(top + ear * 0.9),
      r: f(ear),
      c: face,
    },
    {
      k: "circle",
      x: f(w / 2 - 1.5),
      y: f(top + ear * 0.9),
      r: f(ear),
      c: face,
    },
    { k: "fill", d: pad(-w / 2, top, w, h, r, bow), c: side },
    { k: "fill", d: pad(-w / 2, top, w, h - under, r, bow), c: face },
    {
      k: "stroke",
      d: `M${f(-w / 2 + r + 1)} ${f(top + shine * 1.5)}Q0 ${f(top + shine * 1.5 - bow)} ${f(w / 2 - r - 1)} ${f(top + shine * 1.5)}`,
      c: "#ffffff",
      w: f(shine),
      o: 0.2,
    },
    {
      k: "stroke",
      d: `M${f(-reach)} ${f(mid)}L${f(reach)} ${f(mid)}`,
      c: side,
      w: f(pinch),
    },
    { k: "circle", x: 0, y: f(mid), r: f(button), c: side },
  ];
}

/**
 * Returns a brick: a pile of felt cushions, one for each hit it has left, each
 * a shade of a color no fuzzball wears, darkest on top.
 * @param {number} hits 1 to 4.
 * @returns {Shape[]}
 */
export function brick(hits) {
  return brickLayers(hits).flatMap((layer) =>
    brickLayer(layer.level, layer.w, layer.h).map((s) =>
      moved(s, layer.x, layer.y),
    ),
  );
}

/**
 * Returns a cage, drawn over the friend it holds.
 * @returns {Shape[]}
 */
export function cage() {
  const bars = [-24, -8, 8, 24].map((x) => `M${x} -40V40`).join("");
  return [
    { k: "stroke", d: rrect(-41, -41, 82, 82, 13), c: "steelDark", w: 9 },
    { k: "stroke", d: bars, c: "steel", w: 6.5 },
    { k: "stroke", d: rrect(-41, -41, 82, 82, 13), c: "steelLight", w: 3.4 },
  ];
}

/**
 * Returns a burr's hold on a fuzzball: a ring of thorns round it.
 * @returns {Shape[]}
 */
export function burr() {
  const n = 22;
  const points = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = polar(
      (i / n) * Math.PI * 2,
      R * (i % 2 === 0 ? 1.74 : 1.42),
    );
    points.push(`${f(x)} ${f(y)}`);
  }
  const d = `M${points.join("L")}Z`;
  return [
    { k: "stroke", d, c: "burrDark", w: R * 0.27 },
    { k: "stroke", d, c: "burr", w: R * 0.13 },
  ];
}

/**
 * Returns a sleepyhead: a pale fuzzball in a nightcap with its eyes shut.
 * @param {EyeLook} [look]
 * @returns {Shape[]}
 */
export function sleepy(look = "asleep") {
  const coat = coat2();
  const cap = `M${f(-R * 0.86)} ${f(-R * 0.5)}Q${f(-R * 0.1)} ${f(-R * 1.9)} ${f(R * 1.16)} ${f(-R * 1.36)}Q${f(R * 0.6)} ${f(-R * 0.9)} ${f(R * 0.86)} ${f(-R * 0.5)}Z`;
  /** @type {Shape[]} */
  const shapes = [
    coat,
    { k: "circle", x: 0, y: 0, r: R, c: "sleepy" },
    { k: "fill", d: cap, c: "sleepyDark" },
    {
      k: "stroke",
      d: `M${f(-R * 0.9)} ${f(-R * 0.48)}Q0 ${f(-R * 0.86)} ${f(R * 0.9)} ${f(-R * 0.48)}`,
      c: "frizz",
      w: R * 0.24,
    },
    { k: "circle", x: f(R * 1.2), y: f(-R * 1.34), r: f(R * 0.22), c: "frizz" },
  ];
  return [
    ...shapes,
    ...eyes(look, 0, 0.9).map((s) => moved(s, 0, R * 0.12)),
  ].map((s) => moved(s, 0, R * 0.2));
}

/**
 * Returns a sleepyhead's coat, short and drooping.
 * @returns {Shape}
 */
function coat2() {
  const rand = rng(91);
  const parts = [];
  const n = 22;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.1;
    const droop = Math.sin(angle) > 0 ? 0.08 : -0.02;
    parts.push(
      strand(
        angle,
        R * 0.78,
        R * (1.14 + droop + rand() * 0.06),
        Math.cos(angle) > 0 ? 0.22 : -0.22,
      ),
    );
  }
  return { k: "stroke", d: parts.join(""), c: "sleepy", w: R * 0.27 };
}

/**
 * Returns a whole fuzzball of one kind, seated in its cell.
 * @param {KindId} kind
 * @param {object} [o]
 * @param {EyeLook} [o.look]
 * @param {number} [o.dx]
 * @param {number} [o.dy]
 * @param {number} [o.lift]
 * @param {SpecialId | null} [o.special]
 * @returns {Shape[]}
 */
export function fuzzball(
  kind,
  { look = "open", dx = 0, dy = 0, lift = 0, special = null } = {},
) {
  const [sx, sy] = special ? specialSeat(kind, special) : seat(kind);
  const scale = special === "wisp" ? 0.8 : special ? 0.86 : 1;
  const own = [...fur(kind, lift), ...body(), ...eyes(look, dx, dy)];
  const behind = special ? aura(special) : [];
  return [...behind, ...own].map((s) => moved(s, sx, sy, scale));
}

/**
 * Returns where a special fuzzball's body sits, its aura counted in.
 * @param {KindId} kind
 * @param {SpecialId} special
 * @returns {[number, number]}
 */
function specialSeat(kind, special) {
  const [x, y] = seat(kind);
  if (special === "wisp") return [x, R * 0.42];
  return [x * 0.86, y * 0.6];
}

/**
 * Returns a shape moved and scaled about the origin.
 * @param {Shape} s
 * @param {number} tx
 * @param {number} ty
 * @param {number} [scale]
 * @returns {Shape}
 */
export function moved(s, tx, ty, scale = 1) {
  /** @type {Shape} */
  const out = { ...s };
  if (s.d) {
    out.d = s.d.replace(
      /(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
      (_, x, y) => `${f(Number(x) * scale + tx)} ${f(Number(y) * scale + ty)}`,
    );
    // A lid's path uses H and V, which take one number each.
    out.d = out.d
      .replace(/H(-?\d+(?:\.\d+)?)/g, (_, x) => `H${f(Number(x) * scale + tx)}`)
      .replace(
        /V(-?\d+(?:\.\d+)?)/g,
        (_, y) => `V${f(Number(y) * scale + ty)}`,
      );
  }
  if (s.x !== undefined) out.x = f(s.x * scale + tx);
  if (s.y !== undefined) out.y = f(s.y * scale + ty);
  if (s.r !== undefined) out.r = f(s.r * scale);
  if (s.rx !== undefined) out.rx = f(s.rx * scale);
  if (s.ry !== undefined) out.ry = f(s.ry * scale);
  if (s.w !== undefined) out.w = f(s.w * scale);
  return out;
}

/**
 * Returns shapes as SVG markup, colored for one kind in one palette.
 * @param {Shape[]} shapes
 * @param {Palette} palette
 * @param {KindId | null} [kind]
 * @returns {string}
 */
export function svg(shapes, palette, kind = null) {
  return shapes
    .map((s) => {
      const c = colorOf(palette, kind, s.c);
      const o = s.o === undefined ? "" : ` opacity="${s.o}"`;
      if (s.k === "circle") {
        return `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${c}"${o}/>`;
      }
      if (s.k === "ellipse") {
        return `<ellipse cx="${s.x}" cy="${s.y}" rx="${s.rx}" ry="${s.ry}" fill="${c}"${o}/>`;
      }
      if (s.k === "stroke") {
        return `<path d="${s.d}" fill="none" stroke="${c}" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round"${o}/>`;
      }
      return `<path d="${s.d}" fill="${c}"${o}/>`;
    })
    .join("");
}
