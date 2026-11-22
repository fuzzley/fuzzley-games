#!/usr/bin/env node
/**
 * Draws the aimed serve's mocks over the game's own screenshots.
 *
 *   node docs/archive/bug-reports-and-aimed-serve/mocks/make-mocks.mjs [--keep-shots] [--check <folder>]
 *
 * It reads `shots/` and `shots.json`, which `capture.mjs` wrote, and writes
 * beside itself `aim-ready.webp`, `aim-aiming.webp`, `aim-steep.webp`,
 * `aim-phone.webp` and `aim-sheet.webp`, the four side by side with a
 * caption under each, set in the page's font by a headless Chrome. The
 * guide is traced and drawn here, not by the game: a ball's circle moved
 * in a straight line from where it waits on the paddle until it first
 * meets a wall or a brick, turned there as a mirror turns it, and run on 3
 * units. Once the mocks are written it deletes the captures' PNGs, unless
 * `--keep-shots` is given.
 *
 * `--check <folder>` writes there, instead of the mocks, each capture with
 * a dot on the ball's middle and on every standing brick's corners, where
 * the field's units put them, and a crop of each about the ball and a
 * brick, four times over, to see that they land where the game drew them.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  BALL_RADIUS,
  BRICKS_TOP,
  BRICK_HEIGHT,
  BRICK_WIDTH,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_TOP,
} from "../../../../frontend/games/brick-breaker/src/rules/tuning.ts";
import {
  withChrome,
  withPage,
} from "../../../../frontend/lib/dev/src/chrome.ts";

/** @typedef {{x: number, y: number}} Point */
/** @typedef {{left: number, top: number, right: number, bottom: number}} Box */
/** @typedef {[column: number, row: number]} Brick */

/**
 * What `capture.mjs` says of a shot.
 *
 * @typedef {object} Shot
 * @property {string} name
 * @property {{width: number, height: number, deviceScaleFactor: number}} viewport
 * @property {string} field The field's left, top, width and height on the canvas, in CSS px.
 * @property {{left: number, top: number}} canvas Where the canvas lies on the page, in CSS px.
 * @property {number} across The field's width, in units.
 * @property {number} down The field's height, in units.
 * @property {string} text The palette's text color.
 * @property {string} page The page's background color.
 * @property {string} font The page's font family.
 */

/**
 * Where a shot's field lies on its page, in CSS px, and where the ball
 * waits on it, in units.
 *
 * @typedef {object} Layout
 * @property {number} left The field's left edge on the page.
 * @property {number} top The field's top edge on the page, the top wall's inside.
 * @property {number} unit A field unit.
 * @property {number} paddleTop Where the paddle's top lies, in units.
 * @property {Point} ball Where the ball's middle waits, in units.
 */

/**
 * What a ball moving from a place first meets: how far it goes, the way
 * it turns from, and what it meets, a wall or a brick.
 *
 * @typedef {object} Contact
 * @property {number} distance How far the ball's middle goes, in units.
 * @property {Point} normal The way out of what it meets, a unit long.
 * @property {{wall: "left" | "top" | "right"} | {brick: Brick, corner: boolean}} met
 */

/**
 * A guide traced from the ball: the aim, the first contact and where its
 * middle is then, the way it turns, and how far it runs after the turn.
 *
 * @typedef {object} Guide
 * @property {Point} from
 * @property {Point} aim
 * @property {Contact} first
 * @property {Point} turn
 * @property {Point} turned
 * @property {number} after
 */

/**
 * A mock: the capture it draws over, and the aim it draws the guide at,
 * if any, with the finger that drags it on a phone.
 *
 * @typedef {object} Mock
 * @property {string} file
 * @property {string} shot
 * @property {number} [degrees] The aim, from straight up, positive to the right.
 * @property {boolean} [finger] Whether a finger's ring shows where it drags from.
 * @property {string} caption What the sheet says under it.
 */

const MOCKS = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(MOCKS, "../../../../frontend");
const SHOTS_FOLDER = join(MOCKS, "shots");
const sharp = createRequire(join(FRONTEND, "package.json"))("sharp");
const FONT = join(
  FRONTEND,
  "node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2",
);

/** The guide's dots, in units: how wide, how far apart, and the first's distance from the ball's middle. */
const DOT = { width: 0.25, spacing: 1, first: 1 };

/** How far the guide runs past its turn, in units. */
const AFTER_TURN = 3;

/**
 * The outline on the brick the guide first meets, in CSS px, as Brick Fuzz
 * Pop draws its guide's: its width, how far in from the brick's cell its
 * middle lies (the brick is drawn 1 in from its cell, so its outer edge
 * lies half a pixel inside the brick), and its corners' radius.
 */
const OUTLINE = { width: 2, inset: 2.5, corner: 2.5 };

/**
 * The finger that drags the aim on a phone, in CSS px: its ring's width
 * across, its line's width and its opacity, where it pressed below the
 * paddle, and where the design asks it to lie: above the paddle, and left
 * of the ball.
 */
const FINGER = {
  across: 44,
  line: 3,
  opacity: 0.4,
  pressedBelow: 40,
  above: 90,
  left: 40,
};

/** How near to nothing a distance along the aim is, so a trace from a contact doesn't meet it again. */
const EPSILON = 1e-9;

/** The WebP quality the mocks are written at. */
const QUALITY = 85;

/** @type {readonly Mock[]} */
const MOCKS_TO_MAKE = [
  {
    file: "aim-ready.webp",
    shot: "desktop-ready",
    caption: "Ready: the card adds “Hold to aim.”",
  },
  {
    file: "aim-aiming.webp",
    shot: "desktop-aiming",
    degrees: -35,
    caption: "Held, aimed 35° left: the card hides.",
  },
  {
    file: "aim-steep.webp",
    shot: "desktop-aiming",
    degrees: 12,
    caption: "Aimed 12° right, nearly straight up.",
  },
  {
    file: "aim-phone.webp",
    shot: "phone-aiming",
    degrees: -25,
    finger: true,
    caption: "Phone: a finger dragged up from under the paddle aims 25° left.",
  },
];

/**
 * Returns where a shot's field lies on its page and where its ball waits,
 * and throws unless its height in units and its width give the same unit.
 *
 * @param {Shot} shot
 * @returns {Layout}
 */
function layoutOf(shot) {
  const [x = NaN, y = NaN, width = NaN, height = NaN] = shot.field
    .split(" ")
    .map(Number);
  const unit = width / shot.across;
  if (
    shot.across !== FIELD_WIDTH ||
    Math.abs(height / shot.down - unit) > 1e-6
  ) {
    throw new Error(
      `${shot.name}: the field ${shot.field} isn't ${String(shot.across)} by ${String(shot.down)} units.`,
    );
  }
  const paddleTop = PADDLE_TOP + shot.down - FIELD_HEIGHT;
  return {
    left: shot.canvas.left + x,
    top: shot.canvas.top + y,
    unit,
    paddleTop,
    ball: { x: FIELD_WIDTH / 2, y: paddleTop - BALL_RADIUS },
  };
}

/**
 * Returns where a place on the field lies on the page, in CSS px.
 *
 * @param {Layout} layout
 * @param {Point} place In units.
 * @returns {Point}
 */
function onPage(layout, { x, y }) {
  return { x: layout.left + x * layout.unit, y: layout.top + y * layout.unit };
}

/**
 * Returns a brick's box, in units.
 *
 * @param {Brick} brick
 * @returns {Box}
 */
function boxOf([column, row]) {
  const left = column * BRICK_WIDTH;
  const top = BRICKS_TOP + row * BRICK_HEIGHT;
  return { left, top, right: left + BRICK_WIDTH, bottom: top + BRICK_HEIGHT };
}

/**
 * Returns what a ball moving in a straight line from a place first meets of
 * the left, top and right walls and the bricks, or null for nothing.
 *
 * A brick is a box: the ball meets one of its sides, or a corner, where it
 * turns about the line from the corner to its middle.
 *
 * @param {Point} from The ball's middle, in units.
 * @param {Point} way The way it moves, a unit long.
 * @param {readonly Brick[]} bricks
 * @returns {Contact | null}
 */
function firstContact(from, way, bricks) {
  /** @type {Contact | null} */
  let first = null;
  /**
   * @param {number} distance
   * @param {Point} normal
   * @param {Contact["met"]} met
   * @returns {void}
   */
  const meet = (distance, normal, met) => {
    const towards = way.x * normal.x + way.y * normal.y < 0;
    if (
      towards &&
      distance > EPSILON &&
      (!first || distance < first.distance)
    ) {
      first = { distance, normal, met };
    }
  };
  const r = BALL_RADIUS;
  if (way.x < 0) meet((r - from.x) / way.x, { x: 1, y: 0 }, { wall: "left" });
  if (way.x > 0) {
    meet(
      (FIELD_WIDTH - r - from.x) / way.x,
      { x: -1, y: 0 },
      { wall: "right" },
    );
  }
  if (way.y < 0) meet((r - from.y) / way.y, { x: 0, y: 1 }, { wall: "top" });
  for (const brick of bricks) {
    const box = boxOf(brick);
    const sides = [
      { across: false, at: box.bottom + r, normal: { x: 0, y: 1 } },
      { across: false, at: box.top - r, normal: { x: 0, y: -1 } },
      { across: true, at: box.left - r, normal: { x: -1, y: 0 } },
      { across: true, at: box.right + r, normal: { x: 1, y: 0 } },
    ];
    for (const { across, at, normal } of sides) {
      const toward = across ? way.x : way.y;
      if (toward === 0) continue;
      const distance = (at - (across ? from.x : from.y)) / toward;
      const along = across
        ? from.y + distance * way.y
        : from.x + distance * way.x;
      const [least, most] = across
        ? [box.top, box.bottom]
        : [box.left, box.right];
      if (along >= least && along <= most) {
        meet(distance, normal, { brick, corner: false });
      }
    }
    for (const corner of [
      { x: box.left, y: box.top },
      { x: box.right, y: box.top },
      { x: box.left, y: box.bottom },
      { x: box.right, y: box.bottom },
    ]) {
      const fx = from.x - corner.x;
      const fy = from.y - corner.y;
      const half = fx * way.x + fy * way.y;
      const left = half * half - (fx * fx + fy * fy - r * r);
      if (left < 0) continue;
      const distance = -half - Math.sqrt(left);
      const normal = {
        x: (fx + distance * way.x) / r,
        y: (fy + distance * way.y) / r,
      };
      meet(distance, normal, { brick, corner: true });
    }
  }
  return first;
}

/**
 * Returns the guide from the ball at an aim: to where the ball first meets
 * a wall or a brick, turned there, and on {@link AFTER_TURN} units, or to
 * what it meets next where that is nearer.
 *
 * @param {Point} from The ball's middle, in units.
 * @param {number} degrees From straight up, positive to the right.
 * @param {readonly Brick[]} bricks
 * @returns {Guide}
 */
function traceGuide(from, degrees, bricks) {
  const turn = (degrees * Math.PI) / 180;
  const aim = { x: Math.sin(turn), y: -Math.cos(turn) };
  const first = firstContact(from, aim, bricks);
  if (!first)
    throw new Error(`The guide at ${String(degrees)}° meets nothing.`);
  const at = {
    x: from.x + first.distance * aim.x,
    y: from.y + first.distance * aim.y,
  };
  const facing = aim.x * first.normal.x + aim.y * first.normal.y;
  const turned = {
    x: aim.x - 2 * facing * first.normal.x,
    y: aim.y - 2 * facing * first.normal.y,
  };
  const next = firstContact(at, turned, bricks);
  return {
    from,
    aim,
    first,
    turn: at,
    turned,
    after: Math.min(AFTER_TURN, next?.distance ?? AFTER_TURN),
  };
}

/**
 * Returns where the guide's dots lie, in units: {@link DOT}'s spacing apart
 * along its path, round its turn.
 *
 * @param {Guide} guide
 * @returns {Point[]}
 */
function dotsOf(guide) {
  /** @type {Point[]} */
  const dots = [];
  const length = guide.first.distance + guide.after;
  for (let along = DOT.first; along <= length + EPSILON; along += DOT.spacing) {
    const past = along - guide.first.distance;
    dots.push(
      past <= 0
        ? {
            x: guide.from.x + along * guide.aim.x,
            y: guide.from.y + along * guide.aim.y,
          }
        : {
            x: guide.turn.x + past * guide.turned.x,
            y: guide.turn.y + past * guide.turned.y,
          },
    );
  }
  return dots;
}

/**
 * Returns what a guide meets first, in words.
 *
 * @param {Contact["met"]} met
 * @returns {string}
 */
function metInWords(met) {
  if ("wall" in met) return `the ${met.wall} wall`;
  const [column, row] = met.brick;
  return `the brick at column ${String(column)}, row ${String(row)}${met.corner ? ", on its corner" : ""}`;
}

/**
 * Returns what a guide does, in words, for the sheet's caption.
 *
 * @param {Guide} guide
 * @returns {string}
 */
function guideInWords(guide) {
  const met = guide.first.met;
  const turns =
    "wall" in met
      ? `The guide turns off the ${met.wall} wall.`
      : "The guide turns off the first brick it meets, outlined.";
  return guide.after < AFTER_TURN
    ? `${turns.slice(0, -1)}, and stops at the next.`
    : turns;
}

/**
 * Returns the SVG of what a mock draws over its capture, in CSS px, at the
 * capture's device pixels: the guide's dots, the outline on the brick it
 * first meets, and a finger's ring where one drags it.
 *
 * @param {Shot} shot
 * @param {Layout} layout
 * @param {Guide} guide
 * @param {boolean} finger
 * @returns {string}
 */
function guideSvg(shot, layout, guide, finger) {
  const { unit } = layout;
  const ink = shot.text;
  const parts = [];
  if (finger) {
    const ring = fingerAt(layout, guide.aim);
    parts.push(
      `<circle cx="${n(ring.x)}" cy="${n(ring.y)}" r="${n(FINGER.across / 2 - FINGER.line / 2)}" fill="${ink}" fill-opacity="0.1" stroke="${ink}" stroke-opacity="${String(FINGER.opacity)}" stroke-width="${String(FINGER.line)}"/>`,
    );
  }
  if ("brick" in guide.first.met) {
    const box = boxOf(guide.first.met.brick);
    const corner = onPage(layout, { x: box.left, y: box.top });
    parts.push(
      `<rect x="${n(corner.x + OUTLINE.inset)}" y="${n(corner.y + OUTLINE.inset)}" width="${n(BRICK_WIDTH * unit - 2 * OUTLINE.inset)}" height="${n(BRICK_HEIGHT * unit - 2 * OUTLINE.inset)}" rx="${String(OUTLINE.corner)}" fill="none" stroke="${ink}" stroke-width="${String(OUTLINE.width)}"/>`,
    );
  }
  for (const dot of dotsOf(guide)) {
    const at = onPage(layout, dot);
    parts.push(
      `<circle cx="${n(at.x)}" cy="${n(at.y)}" r="${n((DOT.width / 2) * unit)}" fill="${ink}"/>`,
    );
  }
  return svgOver(shot, parts);
}

/**
 * Returns where a finger dragging the aim lies, in CSS px: on the line from
 * where it pressed, under the ball below the paddle, along the aim, as near
 * as that line comes to where the design asks it to be.
 *
 * @param {Layout} layout
 * @param {Point} aim A unit long.
 * @returns {Point}
 */
function fingerAt(layout, aim) {
  const ball = onPage(layout, layout.ball);
  const paddleTop = layout.top + layout.paddleTop * layout.unit;
  const paddleFoot = paddleTop + PADDLE_HEIGHT * layout.unit;
  const pressed = { x: ball.x, y: paddleFoot + FINGER.pressedBelow };
  const asked = { x: ball.x - FINGER.left, y: paddleTop - FINGER.above };
  const along = (asked.x - pressed.x) * aim.x + (asked.y - pressed.y) * aim.y;
  return { x: pressed.x + along * aim.x, y: pressed.y + along * aim.y };
}

/**
 * Returns an SVG the size of a shot's capture, its lengths in CSS px.
 *
 * @param {Shot} shot
 * @param {string[]} parts
 * @returns {string}
 */
function svgOver(shot, parts) {
  const { width, height, deviceScaleFactor: scale } = shot.viewport;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width * scale)}" height="${String(height * scale)}" viewBox="0 0 ${String(width)} ${String(height)}">${parts.join("")}</svg>`;
}

/**
 * Returns a length written for an SVG, to a hundredth.
 *
 * @param {number} length
 * @returns {string}
 */
function n(length) {
  return String(Math.round(length * 100) / 100);
}

/**
 * Writes, for each capture, the capture with a dot on the ball's middle and
 * on every standing brick's corners, and crops of it about the ball and
 * about a brick, four times over.
 *
 * @param {Record<string, Shot>} shots
 * @param {readonly Brick[]} bricks
 * @param {string} folder
 * @returns {Promise<void>}
 */
async function writeChecks(shots, bricks, folder) {
  await mkdir(folder, { recursive: true });
  for (const shot of Object.values(shots)) {
    const layout = layoutOf(shot);
    const marks = [layout.ball];
    for (const brick of bricks) {
      const box = boxOf(brick);
      marks.push(
        { x: box.left, y: box.top },
        { x: box.right, y: box.top },
        { x: box.left, y: box.bottom },
        { x: box.right, y: box.bottom },
      );
    }
    const svg = svgOver(
      shot,
      marks.map((mark) => {
        const at = onPage(layout, mark);
        return `<circle cx="${n(at.x)}" cy="${n(at.y)}" r="1" fill="#ff00ff"/>`;
      }),
    );
    const marked = await sharp(join(SHOTS_FOLDER, `${shot.name}.png`))
      .composite([{ input: Buffer.from(svg) }])
      .png()
      .toBuffer();
    await writeFile(join(folder, `${shot.name}.png`), marked);
    const scale = shot.viewport.deviceScaleFactor;
    const crops = {
      ball: onPage(layout, layout.ball),
      brick: onPage(layout, { x: 8, y: BRICKS_TOP + 11 }),
    };
    for (const [name, about] of Object.entries(crops)) {
      const side = Math.round(3 * layout.unit * scale);
      await sharp(marked)
        .extract({
          left: Math.round(about.x * scale - side / 2),
          top: Math.round(about.y * scale - side / 2),
          width: side,
          height: side,
        })
        .resize(side * 4, side * 4, { kernel: "nearest" })
        .png()
        .toFile(join(folder, `${shot.name}-${name}.png`));
    }
  }
}

/**
 * Returns the sheet's page: the mocks side by side, each a given height,
 * with a caption under each, in the page's font and colors.
 *
 * @param {Shot} shot A shot whose page's font and colors the sheet takes.
 * @param {{image: Buffer, width: number, caption: string}[]} figures
 * @param {number} height
 * @returns {Promise<string>}
 */
async function sheetHtml(shot, figures, height) {
  const font = (await readFile(FONT)).toString("base64");
  const shown = figures
    .map(
      ({ image, width, caption }) =>
        `<figure style="width: ${String(width)}px"><img src="data:image/webp;base64,${image.toString("base64")}" width="${String(width)}" height="${String(height)}" alt=""><figcaption>${caption}</figcaption></figure>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Figtree Variable"; font-weight: 100 900; src: url(data:font/woff2;base64,${font}) format("woff2"); }
html, body { margin: 0; background: ${shot.page}; color: ${shot.text}; font-family: ${shot.font}; }
.sheet { display: inline-flex; gap: 24px; padding: 24px; align-items: flex-start; }
figure { margin: 0; }
img { display: block; border-radius: 6px; outline: 1px solid color-mix(in srgb, ${shot.text} 20%, transparent); }
figcaption { margin-top: 12px; font-size: 18px; line-height: 1.35; }
</style></head><body><div class="sheet">${shown}</div></body></html>`;
}

/**
 * Writes the sheet's page into a page, waits for its font and pictures, and
 * returns its size, in CSS px. It runs in the page, so it uses nothing from
 * this module.
 *
 * @param {string} html
 * @returns {Promise<{width: number, height: number}>}
 */
async function showSheet(html) {
  document.open();
  document.write(html);
  document.close();
  await document.fonts.ready;
  await Promise.all([...document.images].map((image) => image.decode()));
  const sheet = document.querySelector(".sheet")?.getBoundingClientRect();
  return {
    width: Math.ceil(sheet?.width ?? 0),
    height: Math.ceil(sheet?.height ?? 0),
  };
}

/**
 * Writes the sheet: the mocks side by side at a reduced size, each a given
 * height, with their captions, as a headless Chrome sets them.
 *
 * @param {Shot} shot A shot whose page's font and colors the sheet takes.
 * @param {{file: string, caption: string}[]} made
 * @returns {Promise<void>}
 */
async function writeSheet(shot, made) {
  const height = 540;
  const figures = [];
  for (const { file, caption } of made) {
    const resized = sharp(join(MOCKS, file)).resize({ height });
    const { data, info } = await resized
      .webp({ quality: 95 })
      .toBuffer({ resolveWithObject: true });
    figures.push({ image: data, width: info.width, caption });
  }
  const html = await sheetHtml(shot, figures, height);
  const width = figures.reduce((sum, { width: each }) => sum + each + 24, 24);
  const png = await withChrome({ name: "bb-aimed-serve-sheet" }, (devtools) =>
    withPage(
      devtools,
      { width, height: 900, deviceScaleFactor: 1 },
      async (page) => {
        const size = await page.evaluate(showSheet, html);
        const { data } = await page.send("Page.captureScreenshot", {
          format: "png",
          clip: {
            x: 0,
            y: 0,
            width: size.width,
            height: size.height,
            scale: 1,
          },
        });
        return Buffer.from(data, "base64");
      },
    ),
  );
  await sharp(png)
    .webp({ quality: QUALITY, smartSubsample: true })
    .toFile(join(MOCKS, "aim-sheet.webp"));
}

const { values } = parseArgs({
  options: {
    "keep-shots": { type: "boolean", default: false },
    check: { type: "string" },
  },
});
/** @type {{bricks: Brick[], shots: Record<string, Shot>}} */
const described = JSON.parse(await readFile(join(MOCKS, "shots.json"), "utf8"));
const { bricks, shots } = described;

if (values.check !== undefined) {
  await writeChecks(shots, bricks, resolve(values.check));
  console.log(`Wrote the checks to ${resolve(values.check)}.`);
} else {
  const made = [];
  for (const mock of MOCKS_TO_MAKE) {
    const shot = shots[mock.shot];
    if (!shot) throw new Error(`shots.json has no ${mock.shot}.`);
    const layout = layoutOf(shot);
    /** @type {{input: Buffer}[]} */
    const over = [];
    let caption = mock.caption;
    if (mock.degrees !== undefined) {
      const guide = traceGuide(layout.ball, mock.degrees, bricks);
      over.push({
        input: Buffer.from(guideSvg(shot, layout, guide, mock.finger ?? false)),
      });
      const met = metInWords(guide.first.met);
      caption += ` ${guideInWords(guide)}`;
      console.log(
        `${mock.file}: at ${String(mock.degrees)}°, meets ${met} after ${guide.first.distance.toFixed(2)} units, at ${guide.turn.x.toFixed(2)}, ${guide.turn.y.toFixed(2)}; runs on ${guide.after.toFixed(2)}.`,
      );
      if (mock.finger) {
        const ring = fingerAt(layout, guide.aim);
        const ball = onPage(layout, layout.ball);
        const paddleTop = layout.top + layout.paddleTop * layout.unit;
        console.log(
          `  finger at ${(ball.x - ring.x).toFixed(1)} CSS px left of the ball, ${(paddleTop - ring.y).toFixed(1)} above the paddle.`,
        );
      }
    }
    await sharp(join(SHOTS_FOLDER, `${shot.name}.png`))
      .composite(over)
      .webp({ quality: QUALITY, smartSubsample: true })
      .toFile(join(MOCKS, mock.file));
    made.push({ file: mock.file, caption });
  }
  const first = shots[MOCKS_TO_MAKE[0]?.shot ?? ""];
  if (first) await writeSheet(first, made);
  if (!values["keep-shots"]) {
    await rm(SHOTS_FOLDER, { recursive: true, force: true });
  }
}
