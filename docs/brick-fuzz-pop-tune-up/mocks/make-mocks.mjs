#!/usr/bin/env node
/**
 * Draws the tune-up's mocks over the game's own screenshots.
 *
 *   node docs/brick-fuzz-pop-tune-up/mocks/make-mocks.mjs
 *
 * It reads `shots/` and `shots.json`, which `capture.mjs` wrote, and writes
 * beside itself: `charge-*.png`, a thumb over the field as the game is and
 * with each second place for the charge, and `charge-sheet.png`, all of
 * them side by side; `controls-sheet.png`, the bar as it is and as the
 * tune-up would have it, cut from the game's own buttons; and `wool.png`, a
 * plain fuzzball meeting wool before and after. Nothing here needs the game
 * running.
 *
 * Every length is in CSS pixels, as the phone's window has them, and each
 * picture is drawn at the screenshots' two device pixels to one.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {{x: number, y: number}} Point */
/** @typedef {{left: number, top: number, width: number, height: number}} Box */

/**
 * The colors a mock draws the gauge in, as the game's palette has them.
 *
 * @typedef {object} Inks
 * @property {string} plate The gauge's plate, the lintel's and the band's color.
 * @property {string} rim The plate's rim.
 * @property {string} on A lit pip, the meter's.
 * @property {string} off An unlit pip's ring, the meter's.
 * @property {string} field The field, an unlit pip's middle.
 */

/**
 * What `capture.mjs` says of a shot.
 *
 * @typedef {object} Shot
 * @property {{width: number, height: number, deviceScaleFactor: number}} viewport
 * @property {string} theme
 * @property {number} depth
 * @property {number} degrees
 * @property {number} charge
 * @property {string} field The field's box: its left, its top, its width and its height.
 * @property {{x: number, y: number, width: number, height: number} | null} bar The bar's box, in CSS pixels from the window's corner.
 * @property {number} waitingX Where the fuzzball waits across the field, in units.
 */

const MOCKS = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(MOCKS, "../../../frontend");
const sharp = createRequire(join(FRONTEND, "package.json"))("sharp");

/** How many device pixels the screenshots have to a CSS pixel. */
const RATIO = 2;

/** How many cells the field is across. */
const COLUMNS = 9;

/** How thick the floor's band is on the phone's window, in units, its thickest. */
const BAND = 1.1;

/** A fuzzball's radius, in units. */
const RADIUS = 0.25;

/** How wide the mocks' thumb is: about 17 mm on a phone 390 CSS pixels across. */
const THUMB = 104;

/** How far the gauge's pips lie from the touch: about 12 mm, clear of the thumb's tip. */
const GAUGE_REACH = 74;

/** Where each pip lies about the gauge's middle, in degrees, in the order they light. */
const GAUGE_DEGREES = [-44, -22, 0, 22, 44];

/** A gauge pip's radius: twice the meter's. */
const GAUGE_PIP = 6.5;

/** How near the field's sides, its ceiling and its floor a pip's middle may come. */
const GAUGE_ROOM = 16;

/** @type {Record<string, Inks>} */
const INKS = {
  midnight: {
    plate: "#324159",
    rim: "#5d6f8c",
    on: "#fbbf24",
    off: "#8d9db6",
    field: "#172741",
  },
  classic: {
    plate: "#e1e2e3",
    rim: "#9aa1ab",
    on: "#a84b06",
    off: "#646c78",
    field: "#ffffff",
  },
};

/** The mocks' own inks: a note's box, its text and its line, and the sheets' paper. */
const NOTE = { box: "#0d1828", text: "#f8fafc", line: "#4cc2ff" };
const PAPER = "#0b1220";

/**
 * Returns where a shot's field lies and where its fuzzball waits.
 *
 * @param {Shot} shot
 * @returns {{field: Box, unit: number, ceiling: number, floor: number, ball: Point}}
 */
function layoutOf(shot) {
  const [left = 0, top = 0, width = 0, height = 0] = shot.field
    .split(" ")
    .map(Number);
  const unit = width / COLUMNS;
  const floor = top + height - Math.floor(BAND * unit);
  return {
    field: { left, top, width, height },
    unit,
    ceiling: floor - shot.depth * unit,
    floor,
    ball: { x: left + shot.waitingX * unit, y: floor - RADIUS * unit },
  };
}

/**
 * Returns the place a way along a shot's aim from its fuzzball.
 *
 * @param {Point} ball
 * @param {number} degrees The aim, from the floor on the right.
 * @param {number} along How far, in CSS pixels.
 * @returns {Point}
 */
function alongAim(ball, degrees, along) {
  const turn = (degrees * Math.PI) / 180;
  return {
    x: ball.x + along * Math.cos(turn),
    y: ball.y - along * Math.sin(turn),
  };
}

/**
 * Returns where the gauge's pips lie about a touch, the gauge turned some
 * degrees from straight over it.
 *
 * @param {Point} touch
 * @param {number} turned
 * @returns {Point[]}
 */
function pipsAt(touch, turned) {
  return GAUGE_DEGREES.map((degrees) => {
    const turn = ((degrees + turned) * Math.PI) / 180;
    return {
      x: touch.x + GAUGE_REACH * Math.sin(turn),
      y: touch.y - GAUGE_REACH * Math.cos(turn),
    };
  });
}

/**
 * Returns a place on the outer rim of the gauge's plate, for a note to
 * point at without covering a pip.
 *
 * @param {Point} touch
 * @param {number} degrees From the gauge's middle.
 * @param {number} turned
 * @returns {Point}
 */
function rimAt(touch, degrees, turned) {
  const turn = ((degrees + turned) * Math.PI) / 180;
  return {
    x: touch.x + (GAUGE_REACH + 13) * Math.sin(turn),
    y: touch.y - (GAUGE_REACH + 13) * Math.cos(turn),
  };
}

/**
 * Returns how far the gauge turns from straight over a touch, in degrees:
 * the least turn toward the field's middle that leaves every pip inside the
 * field, under its ceiling, which is the rule the plan gives the game.
 *
 * @param {Point} touch
 * @param {ReturnType<typeof layoutOf>} layout
 * @returns {number}
 */
function gaugeTurn(touch, { field, ceiling, floor }) {
  const toward = touch.x > field.left + field.width / 2 ? -1 : 1;
  for (let turn = 0; turn <= 180; turn++) {
    const fits = pipsAt(touch, toward * turn).every(
      ({ x, y }) =>
        x >= field.left + GAUGE_ROOM &&
        x <= field.left + field.width - GAUGE_ROOM &&
        y >= ceiling + GAUGE_ROOM &&
        y <= floor - GAUGE_ROOM,
    );
    if (fits) return toward * turn;
  }
  return 0;
}

/**
 * Returns the gauge over a touch as SVG: a plate in an arc, and five pips
 * on it, lit as far as the charge.
 *
 * @param {Point} touch
 * @param {number} lit
 * @param {number} turned
 * @param {Inks} inks
 * @returns {string}
 */
function gauge(touch, lit, turned, inks) {
  const pips = pipsAt(touch, turned);
  const [first, last] = [pips[0], pips[pips.length - 1]];
  if (!first || !last) return "";
  const arc = `M${String(first.x)} ${String(first.y)} A${String(GAUGE_REACH)} ${String(GAUGE_REACH)} 0 0 1 ${String(last.x)} ${String(last.y)}`;
  return [
    `<path d="${arc}" fill="none" stroke="${inks.rim}" stroke-width="27" stroke-linecap="round"/>`,
    `<path d="${arc}" fill="none" stroke="${inks.plate}" stroke-width="24" stroke-linecap="round"/>`,
    ...pips.map(({ x, y }, at) =>
      at < lit
        ? `<circle cx="${String(x)}" cy="${String(y)}" r="${String(GAUGE_PIP)}" fill="${inks.on}"/>`
        : `<circle cx="${String(x)}" cy="${String(y)}" r="${String(GAUGE_PIP - 1)}" fill="${inks.field}" stroke="${inks.off}" stroke-width="2"/>`,
    ),
  ].join("");
}

/**
 * Returns a gauge fixed in the lintel as SVG, at its right end: the
 * alternative the plan weighs.
 *
 * @param {ReturnType<typeof layoutOf>} layout
 * @param {number} lit
 * @param {Inks} inks
 * @returns {string}
 */
function lintelGauge({ field, ceiling }, lit, inks) {
  const y = (field.top + ceiling) / 2;
  const right = field.left + field.width - 16;
  return GAUGE_DEGREES.map((_, at) => {
    const x = right - (GAUGE_DEGREES.length - 1 - at) * 15;
    return at < lit
      ? `<circle cx="${String(x)}" cy="${String(y)}" r="5.5" fill="${inks.on}"/>`
      : `<circle cx="${String(x)}" cy="${String(y)}" r="4.5" fill="${inks.field}" stroke="${inks.off}" stroke-width="2"/>`;
  }).join("");
}

/**
 * Returns a thumb pressed at a touch as SVG, reaching in from a place off
 * the screen, with the touch marked on it.
 *
 * @param {Point} touch
 * @param {Point} from Where the hand is, off the screen.
 * @returns {string}
 */
function thumb(touch, from) {
  const length = Math.hypot(from.x - touch.x, from.y - touch.y);
  const turn = (Math.atan2(from.y - touch.y, from.x - touch.x) * 180) / Math.PI;
  const half = THUMB / 2;
  return [
    `<g transform="translate(${String(touch.x)} ${String(touch.y)}) rotate(${String(turn)})">`,
    `<rect x="${String(-half)}" y="${String(-half)}" width="${String(length + half)}" height="${String(THUMB)}" rx="${String(half)}" fill="#c9ada0" fill-opacity="0.9" stroke="#6f574d" stroke-width="1.5"/>`,
    `<rect x="${String(-half + 9)}" y="-21" width="46" height="42" rx="19" fill="#ffffff" fill-opacity="0.2"/>`,
    "</g>",
    `<circle cx="${String(touch.x)}" cy="${String(touch.y)}" r="5" fill="none" stroke="#3b2a24" stroke-opacity="0.6" stroke-width="1.5"/>`,
  ].join("");
}

/**
 * Returns a note as SVG: lines of text in a box, with a line from the box
 * to what it is about, if it is about a place.
 *
 * @param {Point} at The box's top left.
 * @param {readonly string[]} lines
 * @param {Point} [about]
 * @returns {string}
 */
function note(at, lines, about) {
  const width = Math.max(...lines.map((line) => line.length)) * 6.6 + 20;
  const height = lines.length * 17 + 13;
  const anchor = about && {
    x: Math.min(Math.max(about.x, at.x + 8), at.x + width - 8),
    y: about.y < at.y ? at.y : at.y + height,
  };
  return [
    about && anchor
      ? `<line x1="${String(anchor.x)}" y1="${String(anchor.y)}" x2="${String(about.x)}" y2="${String(about.y)}" stroke="${NOTE.line}" stroke-width="1.5"/><circle cx="${String(about.x)}" cy="${String(about.y)}" r="3" fill="${NOTE.line}"/>`
      : "",
    `<rect x="${String(at.x)}" y="${String(at.y)}" width="${String(width)}" height="${String(height)}" rx="6" fill="${NOTE.box}" fill-opacity="0.94" stroke="${NOTE.line}" stroke-width="1"/>`,
    ...lines.map(
      (line, row) =>
        `<text x="${String(at.x + 10)}" y="${String(at.y + 19 + row * 17)}" font-family="Inter, sans-serif" font-size="12.5" fill="${NOTE.text}">${line}</text>`,
    ),
  ].join("");
}

/**
 * Writes a shot with a drawing over it, and returns the picture.
 *
 * @param {string} name The mock's name.
 * @param {string} shotName The shot it is drawn over.
 * @param {Shot} shot
 * @param {string} drawing SVG, in the window's CSS pixels.
 * @returns {Promise<Buffer>}
 */
async function drawOver(name, shotName, shot, drawing) {
  const { width, height } = shot.viewport;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width * RATIO)}" height="${String(height * RATIO)}" viewBox="0 0 ${String(width)} ${String(height)}">${drawing}</svg>`;
  const picture = await sharp(join(MOCKS, "shots", `${shotName}.png`))
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
  await sharp(picture).toFile(join(MOCKS, `${name}.png`));
  console.log(`${name}.png`);
  return picture;
}

/**
 * Returns a sheet's paper with pictures and a drawing on it, as a PNG.
 *
 * @param {number} width In device pixels.
 * @param {number} height In device pixels.
 * @param {ReadonlyArray<{input: Buffer, left: number, top: number}>} pictures
 * @param {string} drawing SVG over the pictures, in device pixels.
 * @param {string} [under] SVG under the pictures.
 * @returns {Promise<Buffer>}
 */
function sheet(width, height, pictures, drawing, under = "") {
  const svg = (/** @type {string} */ body) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}">${body}</svg>`,
    );
  return sharp({
    create: { width, height, channels: 4, background: PAPER },
  })
    .composite([
      { input: svg(under), top: 0, left: 0 },
      ...pictures,
      { input: svg(drawing), top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
}

/**
 * Returns a line of a sheet's text as SVG.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} text
 * @param {{size?: number, weight?: number, fill?: string}} [style]
 * @returns {string}
 */
function words(x, y, text, { size = 15, weight = 400, fill = "#cbd5e1" } = {}) {
  return `<text x="${String(x)}" y="${String(y)}" font-family="Inter, sans-serif" font-size="${String(size)}" font-weight="${String(weight)}" fill="${fill}">${text}</text>`;
}

/** @type {Record<string, Shot>} */
const SHOTS = JSON.parse(await readFile(join(MOCKS, "shots.json"), "utf8"));

/**
 * Returns a shot `capture.mjs` described, or throws.
 *
 * @param {string} name
 * @returns {Shot}
 */
function shotOf(name) {
  const shot = SHOTS[name];
  if (!shot) throw new Error(`No shot ${name}: run capture.mjs first.`);
  return shot;
}

// ---- The charge: a thumb over the field, and each second place for it ----

const dark = shotOf("phone-dark");
const layout = layoutOf(dark);
const inks = INKS.midnight;
if (!inks || !INKS.classic) throw new Error("No inks.");
/** Where a right hand is, off the phone's screen. */
const hand = { x: dark.viewport.width + 80, y: dark.viewport.height + 120 };
/** A pointed press along the aim, a comfortable reach up the field. */
const pointed = alongAim(layout.ball, dark.degrees, 150);
/** A pull back's press, and where the thumb has dragged it for the shot's charge: half a unit, and nine tenths more a notch. */
const pressed = { x: 232, y: 520 };
const pulled = alongAim(
  pressed,
  dark.degrees + 180,
  (0.5 + 0.9 * dark.charge) * layout.unit,
);

/** @type {{name: string, title: string, about: string, picture: Buffer}[]} */
const panels = [];

panels.push({
  name: "charge-1-today",
  title: "Today",
  about: "The thumb that aims hides the fuzzball and its meter.",
  picture: await drawOver(
    "charge-1-today",
    "phone-dark",
    dark,
    [
      thumb(pointed, hand),
      note(
        { x: 24, y: 610 },
        [
          "Point and hold: the charge climbs a notch",
          "each quarter second, up to five and back.",
          "Its meter, five pips under the fuzzball,",
          "is under the thumb.",
        ],
        layout.ball,
      ),
    ].join(""),
  ),
});

panels.push({
  name: "charge-2-gauge",
  title: "Recommended: a gauge over the fingertip",
  about: "Five larger pips ride over the touch, for fingers only.",
  picture: await drawOver(
    "charge-2-gauge",
    "phone-dark",
    dark,
    [
      thumb(pointed, hand),
      gauge(pointed, dark.charge, gaugeTurn(pointed, layout), inks),
      note(
        { x: 24, y: 610 },
        [
          "The same five pips, twice the size, on a",
          "plate 74 px over the touch: where the eye",
          "already is. The meter under the fuzzball",
          "stays as it is.",
        ],
        rimAt(pointed, -52, 0),
      ),
    ].join(""),
  ),
});

panels.push({
  name: "charge-3-gauge-pull-back",
  title: "… and with Pull back",
  about: "The drag ends on the fuzzball; the gauge follows the thumb.",
  picture: await drawOver(
    "charge-3-gauge-pull-back",
    "phone-dark",
    dark,
    [
      `<line x1="${String(pressed.x)}" y1="${String(pressed.y)}" x2="${String(pulled.x)}" y2="${String(pulled.y)}" stroke="#f8fafc" stroke-width="2" stroke-dasharray="5 5"/>`,
      `<circle cx="${String(pressed.x)}" cy="${String(pressed.y)}" r="6" fill="none" stroke="#f8fafc" stroke-width="2"/>`,
      thumb(pulled, hand),
      gauge(pulled, dark.charge, gaugeTurn(pulled, layout), inks),
      note(
        { x: 24, y: 540 },
        ["Pressed here,", "pulled back", "three notches."],
        pressed,
      ),
    ].join(""),
  ),
});

const steep = shotOf("phone-dark-steep");
const steepLayout = layoutOf(steep);
/** A pointed press high in the field, where a gauge straight over it would cross the ceiling. */
const high = alongAim(
  steepLayout.ball,
  steep.degrees,
  (steepLayout.ball.y - steepLayout.ceiling - 70) /
    Math.sin((steep.degrees * Math.PI) / 180),
);
const highTurn = gaugeTurn(high, steepLayout);
panels.push({
  name: "charge-4-gauge-ceiling",
  title: "… and near the ceiling",
  about: "With no room over the touch, the gauge turns aside.",
  picture: await drawOver(
    "charge-4-gauge-ceiling",
    "phone-dark-steep",
    steep,
    [
      thumb(high, hand),
      gauge(high, steep.charge, highTurn, inks),
      note(
        { x: 24, y: 200 },
        [
          "It turns the least it must, toward the",
          `field's middle (here ${String(Math.abs(highTurn))}°), so every pip`,
          "stays inside the field, under the ceiling.",
        ],
        rimAt(high, -52, highTurn),
      ),
    ].join(""),
  ),
});

panels.push({
  name: "charge-5-lintel",
  title: "Alternative: a fixed gauge in the lintel",
  about: "Never covered, but far from where the eye is.",
  picture: await drawOver(
    "charge-5-lintel",
    "phone-dark",
    dark,
    [
      thumb(pointed, hand),
      lintelGauge(layout, dark.charge, inks),
      note({ x: 24, y: 610 }, [
        "The pips sit at the lintel's right end,",
        "a field away from the thumb: a glance up",
        "for each notch, four notches a second.",
      ]),
      note({ x: 196, y: 96 }, ["The gauge, in the lintel."], {
        x: layout.field.left + layout.field.width - 46,
        y: layout.ceiling + 2,
      }),
    ].join(""),
  ),
});

const light = shotOf("phone-light");
const lightLayout = layoutOf(light);
const lightPointed = alongAim(lightLayout.ball, light.degrees, 150);
panels.push({
  name: "charge-6-gauge-light",
  title: "The gauge in the light palette",
  about: "The plate takes the band's color, the pips the meter's.",
  picture: await drawOver(
    "charge-6-gauge-light",
    "phone-light",
    light,
    [
      thumb(lightPointed, hand),
      gauge(
        lightPointed,
        light.charge,
        gaugeTurn(lightPointed, lightLayout),
        INKS.classic,
      ),
    ].join(""),
  ),
});

{
  // Three panels a row, each at one device pixel to a CSS pixel, under its title.
  const { width, height } = dark.viewport;
  const [gap, head, across] = [28, 64, 3];
  const sheetWidth = across * width + (across + 1) * gap;
  const rows = Math.ceil(panels.length / across);
  const sheetHeight = rows * (height + head + gap) + gap;
  /** @type {{input: Buffer, left: number, top: number}[]} */
  const pictures = [];
  /** @type {string[]} */
  const drawing = [];
  for (const [at, panel] of panels.entries()) {
    const left = gap + (at % across) * (width + gap);
    const top = gap + Math.floor(at / across) * (height + head + gap);
    pictures.push({
      input: await sharp(panel.picture).resize(width, height).toBuffer(),
      left,
      top: top + head,
    });
    drawing.push(
      words(left, top + 22, `${String(at + 1)}. ${panel.title}`, {
        size: 17,
        weight: 600,
        fill: "#f8fafc",
      }),
      words(left, top + 46, panel.about, { size: 13.5 }),
    );
  }
  await sharp(
    await sheet(sheetWidth, sheetHeight, pictures, drawing.join("")),
  ).toFile(join(MOCKS, "charge-sheet.png"));
  console.log("charge-sheet.png");
}

// ---- The controls: the bar as it is, and as the tune-up would have it ----

{
  /** The Drop and Fast-forward icons' drawings, on the icons' grid of 24. */
  const ICONS = {
    fast: '<path d="M4 6.5v11l8-5.5zM12 6.5v11l8-5.5z"/>',
    drop: '<path d="M5.5 4.25h13l-6.5 11z"/><rect x="5.5" y="16.5" width="13" height="3.25" rx="1"/>',
    skip: '<path d="M4.25 5.5v13l11-6.5z"/><rect x="16.5" y="5.5" width="3.25" height="13" rx="1"/>',
  };
  /** @type {{shot: string, title: string, about: string[]}[]} */
  const ROWS = [
    {
      shot: "phone-dark",
      title: "Today, aiming",
      about: [
        "Fast-forward and Skip are dimmed until a",
        "flight is in the air.",
      ],
    },
    {
      shot: "bar-today-flying",
      title: "Today, a flight in the air",
      about: [
        "Fast-forward lasts for this flight only;",
        "Skip jumps to the flight's end.",
      ],
    },
    {
      shot: "bar-tuned-waiting",
      title: "Tune-up, aiming, speed as usual",
      about: [
        "Fast-forward is a switch, live at any time.",
        "Drop waits for a flight, as Skip did.",
      ],
    },
    {
      shot: "bar-tuned-waiting-fast",
      title: "Tune-up, aiming, Fast-forward switched on",
      about: [
        "It stays on from flight to flight, and from",
        "visit to visit, until it is switched off.",
      ],
    },
    {
      shot: "bar-tuned-flying-fast",
      title: "Tune-up, a flight in the air, Fast-forward on",
      about: [
        "Drop brings every fuzzball in the air",
        "straight down to the floor, where it is.",
      ],
    },
    {
      shot: "bar-tuned-flying-fast-light",
      title: "… in the light palette",
      about: ["The same buttons, the game's own styles."],
    },
  ];
  const [gap, textWidth, rowHeight] = [40, 600, 150];
  const phone = shotOf("phone-dark");
  const barWidth = phone.viewport.width * RATIO;
  const barHeight = (phone.bar?.height ?? 60) * RATIO;
  const sheetWidth = gap + textWidth + barWidth + gap;
  const desktop = shotOf("bar-tuned-flying-fast-desktop");
  const desktopCut = {
    left: 780 * RATIO,
    top: 0,
    width: 500 * RATIO,
    height: (desktop.bar?.height ?? 73) * RATIO,
  };
  const iconsTop = gap + (ROWS.length + 1) * rowHeight + 20;
  const sheetHeight = iconsTop + 250;
  /** @type {{input: Buffer, left: number, top: number}[]} */
  const pictures = [];
  /** @type {string[]} */
  const drawing = [];
  for (const [at, row] of ROWS.entries()) {
    const top = gap + at * rowHeight;
    const shot = shotOf(row.shot);
    pictures.push({
      input: await sharp(join(MOCKS, "shots", `${row.shot}.png`))
        .extract({
          left: 0,
          top: (shot.bar?.y ?? 0) * RATIO,
          width: barWidth,
          height: barHeight,
        })
        .toBuffer(),
      left: gap + textWidth,
      top,
    });
    drawing.push(
      words(gap, top + 34, row.title, {
        size: 24,
        weight: 600,
        fill: "#f8fafc",
      }),
      ...row.about.map((line, index) =>
        words(gap, top + 66 + index * 26, line, { size: 19 }),
      ),
    );
  }
  const desktopTop = gap + ROWS.length * rowHeight;
  pictures.push({
    input: await sharp(
      join(MOCKS, "shots", "bar-tuned-flying-fast-desktop.png"),
    )
      .extract(desktopCut)
      .resize(barWidth)
      .toBuffer(),
    left: gap + textWidth,
    top: desktopTop,
  });
  drawing.push(
    words(gap, desktopTop + 34, "… and on a desktop", {
      size: 24,
      weight: 600,
      fill: "#f8fafc",
    }),
    words(
      gap,
      desktopTop + 66,
      "The bar's right end, at the top of the page.",
      {
        size: 19,
      },
    ),
  );
  /**
   * Returns an icon drawn large as SVG, on a tile, with its name under it.
   *
   * @param {number} left
   * @param {string} icon
   * @param {string} name
   * @param {string} about
   * @returns {string}
   */
  const tile = (left, icon, name, about) =>
    [
      `<rect x="${String(left)}" y="${String(iconsTop)}" width="150" height="150" rx="24" fill="#1c2940" stroke="#324159" stroke-width="2"/>`,
      `<g transform="translate(${String(left + 15)} ${String(iconsTop + 15)}) scale(5)" fill="#f8fafc">${icon}</g>`,
      words(left, iconsTop + 184, name, {
        size: 21,
        weight: 600,
        fill: "#f8fafc",
      }),
      words(left, iconsTop + 212, about, { size: 17 }),
    ].join("");
  drawing.push(
    tile(gap, ICONS.skip, "skip", "Today's, retired with Skip."),
    tile(
      gap + 380,
      ICONS.drop,
      "drop",
      "New in @fz/ui: Skip's, turned down onto the floor.",
    ),
    tile(
      gap + 980,
      ICONS.fast,
      "fast-forward",
      "Kept, for the Fast-forward switch.",
    ),
  );
  await sharp(
    await sheet(sheetWidth, sheetHeight, pictures, drawing.join("")),
  ).toFile(join(MOCKS, "controls-sheet.png"));
  console.log("controls-sheet.png");
}

// ---- Wool: a plain fuzzball meeting it, before and after ----

{
  /** A cell's side in the phone's shots, in device pixels, and where the cells start. */
  const cell = layout.unit * RATIO;
  const origin = { x: layout.field.left * RATIO, y: layout.ceiling * RATIO };
  /**
   * Returns a brick cut from a shot, by its column and its row.
   *
   * @param {string} shot
   * @param {number} column
   * @param {number} row
   * @returns {Promise<Buffer>}
   */
  const brick = (shot, column, row) =>
    sharp(join(MOCKS, "shots", `${shot}.png`))
      .extract({
        left: Math.round(origin.x + column * cell),
        top: Math.round(origin.y + row * cell),
        width: Math.round(cell),
        height: Math.round(cell),
      })
      .toBuffer();
  // Bricks the guide's outline isn't on, in either shot.
  const wool = await brick("phone-dark-steep", 4, 0);
  const gold = await brick("phone-dark", 0, 0);
  const red = await brick("phone-dark", 1, 10);
  // Each panel: a row of air, two rows of two-hit bricks, a row with the
  // wool in its middle, and air under them down to the floor.
  const [gap, head, columns, rows, wallTop] = [48, 84, 6, 8.2, 1];
  const side = Math.round(cell);
  const panelWidth = columns * side;
  const panelHeight = Math.round(rows * side);
  const sheetWidth = 2 * panelWidth + 3 * gap;
  const sheetHeight = head + panelHeight + 176;
  /** The column the wool is in. */
  const woolColumn = 2;
  /** @type {{input: Buffer, left: number, top: number}[]} */
  const pictures = [];
  /** @type {string[]} */
  const drawing = [];
  /** @type {string[]} */
  const fields = [];
  /**
   * Returns a fuzzball as SVG: a ball in the fuzzball's blue, with eyes,
   * ringed in the meter's lit color if it is charged, and a word beside it.
   *
   * @param {Point} at
   * @param {boolean} charged
   * @param {string} word
   * @returns {string}
   */
  const fuzzball = (at, charged, word) =>
    [
      charged
        ? `<circle cx="${String(at.x)}" cy="${String(at.y)}" r="29" fill="none" stroke="${inks.on}" stroke-width="5" stroke-dasharray="6 7"/>`
        : "",
      `<circle cx="${String(at.x)}" cy="${String(at.y)}" r="20" fill="#4cc2ff"/>`,
      `<circle cx="${String(at.x - 6)}" cy="${String(at.y - 2)}" r="4" fill="#0d1828"/>`,
      `<circle cx="${String(at.x + 6)}" cy="${String(at.y - 2)}" r="4" fill="#0d1828"/>`,
      words(at.x + 40, at.y + 7, word, {
        size: 20,
        weight: 600,
        fill: charged ? inks.on : "#f8fafc",
      }),
    ].join("");
  /**
   * Returns a fuzzball's way as SVG: a line through places, an arrowhead at
   * its end.
   *
   * @param {readonly Point[]} places
   * @returns {string}
   */
  const way = (places) => {
    const [before, end] = places.slice(-2);
    if (!before || !end) return "";
    const turn = Math.atan2(end.y - before.y, end.x - before.x);
    const wing = (/** @type {number} */ by) =>
      `${String(end.x - 22 * Math.cos(turn + by))} ${String(end.y - 22 * Math.sin(turn + by))}`;
    return [
      `<polyline points="${places.map(({ x, y }) => `${String(x)},${String(y)}`).join(" ")}" fill="none" stroke="#f8fafc" stroke-width="5" stroke-linejoin="round" stroke-dasharray="2 12" stroke-linecap="round"/>`,
      `<path d="M${wing(0.45)} L${String(end.x)} ${String(end.y)} L${wing(-0.45)}" fill="none" stroke="#f8fafc" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    ].join("");
  };
  /**
   * Returns the mark of a brick broken as SVG, over its cell: the field, in
   * a dashed outline, and the charge the fuzzball carries out of it, if one
   * is given.
   *
   * @param {number} left
   * @param {number} top
   * @param {number} [charge]
   * @param {boolean} [onLeft] Whether the charge is written at the cell's left, clear of a way through its right.
   * @returns {string}
   */
  const broken = (left, top, charge, onLeft = false) =>
    [
      `<rect x="${String(left)}" y="${String(top)}" width="${String(side)}" height="${String(side)}" fill="${inks.field}"/>`,
      `<rect x="${String(left + 6)}" y="${String(top + 6)}" width="${String(side - 12)}" height="${String(side - 12)}" rx="12" fill="none" stroke="#8d9db6" stroke-width="3" stroke-dasharray="8 8"/>`,
      charge === undefined
        ? ""
        : `<text x="${String(onLeft ? left + 14 : left + side - 28)}" y="${String(top + 50)}" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="${inks.on}">${String(charge)}</text>`,
    ].join("");
  for (const [at, tuned] of [false, true].entries()) {
    const left = gap + at * (panelWidth + gap);
    const top = head;
    fields.push(
      `<rect x="${String(left)}" y="${String(top)}" width="${String(panelWidth)}" height="${String(panelHeight)}" fill="${inks.field}"/>`,
    );
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < columns; column++) {
        const isWool = row === 2 && column === woolColumn;
        pictures.push({
          input: isWool ? wool : row === 2 ? red : gold,
          left: left + column * side,
          top: top + (wallTop + row) * side,
        });
      }
    }
    const woolLeft = left + woolColumn * side;
    const under = top + (wallTop + 3) * side;
    const floor = top + panelHeight - 30;
    /** Where the fuzzball leaves the floor, and where it meets the wool's face from under it. */
    // Steep enough that the line it came by stays in the wool's column
    // through the bricks behind it.
    const start = { x: woolLeft + 1.31 * side, y: floor };
    const meets = { x: woolLeft + 0.78 * side, y: under + 20 };
    /** @type {string[]} */
    const after = [];
    if (tuned) {
      // On through the wool and the two bricks behind it, two hits each,
      // along the line it came by.
      const slope = (meets.x - start.x) / (meets.y - start.y);
      const out = { x: meets.x + slope * (top + 34 - meets.y), y: top + 34 };
      after.push(
        broken(woolLeft, under - side, 5, true),
        broken(woolLeft, under - 2 * side, 3),
        broken(woolLeft, under - 3 * side, 1),
        way([start, out]),
        fuzzball({ x: out.x + 84, y: top + 44 }, true, "charge 1"),
      );
    } else {
      // Off the wool's face and back down, the new charge with it.
      const home = { x: 2 * meets.x - start.x, y: floor };
      after.push(
        broken(woolLeft, under - side),
        way([start, meets, home]),
        fuzzball(
          {
            x: meets.x + 0.55 * (home.x - meets.x) - 2,
            y: meets.y + 0.55 * (home.y - meets.y),
          },
          true,
          "",
        ),
        words(left + 44, meets.y + 0.55 * (floor - meets.y) + 7, "charge 5", {
          size: 20,
          weight: 600,
          fill: inks.on,
        }),
      );
    }
    after.push(
      fuzzball(
        {
          x: start.x + 0.22 * (meets.x - start.x),
          y: start.y + 0.22 * (meets.y - start.y),
        },
        false,
        "plain",
      ),
    );
    drawing.push(
      after.join(""),
      words(left, 50, tuned ? "Tune-up" : "Today", {
        size: 30,
        weight: 600,
        fill: "#f8fafc",
      }),
      ...(tuned
        ? [
            "Wool charges the fuzzball as it arrives, so even",
            "a plain one breaks it and flies on through, at",
            "full charge: 5 out of the wool, then 3, then 1,",
            "through the two-hit bricks behind it.",
          ]
        : [
            "A plain fuzzball breaks the wool, bounces off",
            "it, and only then is charged. The charge goes",
            "back the way it came, toward the floor, and is",
            "spent only on what it happens to meet there.",
          ]
      ).map((line, index) =>
        words(left, head + panelHeight + 40 + index * 30, line, { size: 20 }),
      ),
    );
  }
  await sharp(
    await sheet(
      sheetWidth,
      sheetHeight,
      pictures,
      drawing.join(""),
      fields.join(""),
    ),
  ).toFile(join(MOCKS, "wool.png"));
  console.log("wool.png");
}
