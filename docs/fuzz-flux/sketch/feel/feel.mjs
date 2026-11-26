/**
 * Plays Fuzz Flux's draft levels in a page, with the design's motion, effects
 * and sounds: a throwaway sketch to feel the design by, not the game's code.
 *
 * The rules play a move whole and hand back a record; everything here is the
 * playing of that record, at the timings "The feel, in numbers" gives.
 */

/** @import { EyeLook, KindId, SpecialId } from '../../art/fuzz.mjs' */
/** @import { Piece, Record as Move, State, Step } from '../engine.mjs' */

import {
  PALETTES,
  R,
  aura,
  body,
  brick,
  brickLayer,
  brickLayers,
  burr,
  cage,
  colorOf,
  eyes,
  frizzball,
  fur,
  seat,
  sleepy,
  square,
} from "../../art/fuzz.mjs";
import { SETS, allLevels } from "../../levels/drafts.mjs";
import {
  born,
  chirp,
  note,
  pop,
  puff,
  SOUNDS,
  zap,
} from "../../sound/sounds.mjs";
import { SR } from "../../sound/synth.mjs";
import {
  canSwap,
  deal,
  encore,
  findBunches,
  legalMoves,
  play,
  swapWorks,
} from "../engine.mjs";

/** The design's timings, in milliseconds. */
export const T = {
  swap: 140,
  refuse: 240,
  huddle: 110,
  pop: 130,
  merge: 110,
  born: 420,
  fallWait: 70,
  lane: 16,
  stack: 12,
  land: 240,
  waveGap: 90,
  dashCell: 30,
  puffIn: 140,
  puffRing: 45,
  wisp: 480,
  arc: 40,
  frizzHold: 160,
  pair: 300,
  ghost: 480,
  quicken: 0.06,
  quickest: 0.7,
};

const LINES = {
  bunch: "Swap 2 fuzzballs to line up 3 of a kind.",
  dasher:
    "Line up 4 to make a dasher. It clears the row or column its fur points along.",
  wisp: "Make a square of 4 to get a wisp. It floats to a square you need.",
  puffer:
    "Line up 5 in an L or a T to make a puffer. Swap it to clear the squares around it.",
  frizzball:
    "Line up 5 to make a frizzball. Swap it with a fuzzball to gather all of that kind.",
  pair: "Swap 2 special fuzzballs with each other.",
  dust: "Line up 3 on dusty squares to dust them off.",
  brick: "Line up 3 next to a brick to break it.",
  "thick brick":
    "Thick bricks have 2 or 3 layers. Line up 3 next to one to knock a layer off.",
  cage: "Line up a caged fuzzball with 2 of its kind to free it.",
  sleepyhead:
    "Get each sleepyhead to the bottom row. Clear the fuzzballs under it.",
  burr: "You can't swap a fuzzball with a burr. Line up 3 next to it to brush the burr off.",
  wind: "The wind is blowing. Fuzzballs fall the way it blows.",
  "turning wind": "The wind turns every few moves. Watch the arrow.",
};

const tuned =
  /** @type {{ FUZZ_FLUX_TUNED?: Record<number, object> }} */ (globalThis)
    .FUZZ_FLUX_TUNED ?? {};
const levels = allLevels().map((level) => ({
  ...level,
  ...(tuned[level.id] ?? {}),
}));

const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("board")
);
const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
const $ = (/** @type {string} */ id) =>
  /** @type {HTMLElement} */ (document.getElementById(id));

const settings = {
  sound: true,
  fast: false,
  calm: matchMedia("(prefers-reduced-motion: reduce)").matches,
  light: false,
};
let palette = PALETTES.dark;

// ---------------------------------------------------------------- sound

/** @type {AudioContext | null} */
let audio = null;
/** @type {Map<string, AudioBuffer>} */
const buffers = new Map();

/**
 * Makes a buffer the page can play from a recipe's samples.
 * @param {string} name
 * @param {Float32Array} samples
 */
function keep(name, samples) {
  if (!audio) return;
  const buffer = audio.createBuffer(1, samples.length, SR);
  buffer.copyToChannel(/** @type {Float32Array<ArrayBuffer>} */ (samples), 0);
  buffers.set(name, buffer);
}

/** Starts the sound on a player's first touch, and makes every sound, a few at a time. */
function wakeSound() {
  if (audio) {
    if (audio.state === "suspended") void audio.resume();
    return;
  }
  audio = new AudioContext({ sampleRate: SR });
  /** @type {(() => void)[]} */
  const jobs = [];
  for (const sound of SOUNDS) jobs.push(() => keep(sound.id, sound.make()));
  for (let step = 0; step < 10; step++) {
    for (const size of [3, 4, 5])
      jobs.push(() => keep(`note-${step}-${size}`, note(step, size, step % 3)));
    jobs.push(
      () => keep(`pop-${step}`, pop(step)),
      () => keep(`zap-${step}`, zap(step)),
    );
  }
  for (const what of /** @type {const} */ ([
    "dasher",
    "puffer",
    "wisp",
    "frizz",
  ]))
    jobs.push(() => keep(`born-${what}`, born(what)));
  for (const tier of [1, 2, 3, 4])
    jobs.push(() => keep(`chirp-${tier}`, chirp(tier)));
  jobs.push(() => keep("big-puff", puff(true)));
  // The first few matter most, so they are made at once.
  for (const job of jobs.splice(0, 12)) job();
  const more = () => {
    for (const job of jobs.splice(0, 6)) job();
    if (jobs.length) setTimeout(more, 0);
  };
  setTimeout(more, 0);
}

/** @type {Map<string, number>} */
const lastPlayed = new Map();
/** @type {{ name: string, when: number, level: number }[] | null} Every sound asked for, where a capture wants them. */
let heard = null;

/**
 * Plays a sound at a moment of the view's clock.
 * @param {string} name
 * @param {number} [when] The view's time, in ms.
 * @param {number} [level]
 * @param {number} [gap] The least ms between two plays of it.
 */
function sfx(name, when = now, level = 1, gap = 0) {
  if (gap > 0) {
    const last = lastPlayed.get(name) ?? -1e9;
    if (when - last < gap) return;
    lastPlayed.set(name, when);
  }
  heard?.push({ name, when, level });
  if (!audio || !settings.sound) return;
  const buffer = buffers.get(name);
  if (!buffer) return;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const volume = audio.createGain();
  volume.gain.value = level;
  source.connect(volume).connect(audio.destination);
  source.start(audio.currentTime + Math.max(0, when - now) / 1000 / speed());
}

// ---------------------------------------------------------------- the clock

let now = 0;
/** @type {{ t: number, fn: () => void }[]} */
let timers = [];
/** @type {{ o: any, p: string, from: number | null, to: number, t0: number, d: number, e: (u: number) => number, dead?: boolean }[]} */
let tweens = [];

const ease = {
  lin: (/** @type {number} */ u) => u,
  out: (/** @type {number} */ u) => 1 - (1 - u) ** 3,
  in: (/** @type {number} */ u) => u * u,
  inOut: (/** @type {number} */ u) =>
    u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2,
  back: (/** @type {number} */ u) =>
    1 + 2.4 * (u - 1) ** 3 + 1.4 * (u - 1) ** 2,
  spring: (/** @type {number} */ u) =>
    1 - Math.cos(u * Math.PI * 3.2) * Math.exp(-u * 5.2),
};

/** Whether the level's last flourish is being hurried through. */
let rush = false;

/** Returns how fast the view's clock runs against the wall's. */
function speed() {
  return (settings.fast ? 1.6 : 1) * (rush ? 4 : 1);
}

/**
 * Does something at a moment of the view's clock.
 * @param {number} t
 * @param {() => void} fn
 */
function at(t, fn) {
  timers.push({ t, fn });
}

/**
 * Moves an object's numbers to new values over a while.
 * @param {any} o
 * @param {Record<string, number>} to
 * @param {number} d Milliseconds.
 * @param {(u: number) => number} [e]
 * @param {number} [t0] When it starts; now, if left out.
 */
function tween(o, to, d, e = ease.out, t0 = now) {
  for (const p of Object.keys(to)) {
    tweens = tweens.filter((w) => !(w.o === o && w.p === p && w.t0 >= t0));
    tweens.push({ o, p, from: null, to: to[p], t0, d: Math.max(1, d), e });
  }
}

/**
 * Moves the clock on and does what has come due.
 * @param {number} dt Milliseconds of the wall's clock.
 */
function tick(dt) {
  now += dt * speed();
  if (timers.some((timer) => timer.t <= now)) {
    const due = timers
      .filter((timer) => timer.t <= now)
      .sort((p, q) => p.t - q.t);
    timers = timers.filter((timer) => timer.t > now);
    for (const timer of due) timer.fn();
  }
  for (const w of tweens) {
    if (now < w.t0) continue;
    if (w.dead) continue;
    if (w.from === null) {
      w.from = w.o[w.p];
      for (const older of tweens)
        if (
          older !== w &&
          older.o === w.o &&
          older.p === w.p &&
          older.from !== null
        )
          older.dead = true;
    }
    const u = Math.min(1, (now - w.t0) / w.d);
    w.o[w.p] =
      /** @type {number} */ (w.from) +
      (w.to - /** @type {number} */ (w.from)) * w.e(u);
  }
  tweens = tweens.filter((w) => !w.dead && now < w.t0 + w.d);
}

// ---------------------------------------------------------------- the board's sprites

/**
 * What the view draws for one piece.
 * @typedef {object} Sprite
 * @property {number} id
 * @property {string} t
 * @property {number} k
 * @property {string | null} sp
 * @property {boolean} cage
 * @property {boolean} burr
 * @property {number} hp
 * @property {number} x In squares, on the screen.
 * @property {number} y
 * @property {number} px How far a push has it off its place, in squares.
 * @property {number} py
 * @property {number} sx
 * @property {number} sy
 * @property {number} rot
 * @property {number} a Its opacity.
 * @property {number} lift
 * @property {number} lx Where it looks.
 * @property {number} ly
 * @property {string} eye
 * @property {number} z
 * @property {number} blink The view's time of its next blink.
 * @property {boolean} gone
 * @property {number} flash
 * @property {number} auraIn
 * @property {number} shake
 * @property {boolean} [falling] Whether it is on its way in from over the board's edge.
 * @property {number} [left] A brick's layers once every hit already on its way has landed.
 * @property {import('../../art/fuzz.mjs').BrickLayer[]} [pads] A brick's layers as they are drawn, on their way to their places.
 */

/** @type {State} */
let state;
/** @type {Map<number, Sprite>} */
let sprites = new Map();
/** @type {{ dust: number, puff: number }[]} */
let squares = [];
let level = levels[0];
let attempt = 0;
let locked = false;
/** @type {number[]} What the bar shows each goal still needs. */
let shown = [];
/** @type {number[]} How many gathered fuzzballs are on their way to each goal. */
let flying = [];
/** @type {{ a: number, b: number } | null} */
let queued = null;
let lastMove = 0;
let cols = 8;
let rows = 8;
let size = 40;
let ox = 0;
let oy = 0;
let shakeAmount = 0;
let dim = 0;
let windLean = { x: 0, y: 0 };
/** The quarter turns the drawing reads a dasher's way by. */
let viewRot = 0;
/** The wind arrow's angle, in degrees. */
let arrowTurn = 0;

/**
 * Where the engine's board stands on the screen, for one turn of the wind.
 * @typedef {object} Space
 * @property {number} w The engine's width.
 * @property {number} h
 * @property {number} rot
 * @property {boolean} upright Whether the engine's across is the screen's across.
 * @property {(x: number, y: number) => { x: number, y: number }} grid
 * @property {(i: number) => { x: number, y: number }} map
 */

/**
 * Returns the space of a board turned as the wind has it.
 * @param {number} w The engine's width.
 * @param {number} h
 * @param {number} rot
 * @returns {Space}
 */
function spaceOf(w, h, rot) {
  const grid = mapper(w, h, rot);
  return {
    w,
    h,
    rot,
    upright: rot % 2 === 0,
    grid,
    map: (i) => grid(i % w, Math.floor(i / w)),
  };
}

/**
 * Returns a function from the engine's squares to the screen's, for a board
 * turned as the wind has it; a row above the engine's board is where new
 * fuzzballs come in from.
 * @param {number} w The engine's width.
 * @param {number} h
 * @param {number} rot
 * @returns {(x: number, y: number) => { x: number, y: number }}
 */
function mapper(w, h, rot) {
  return (x, y) => {
    let cw = w;
    let ch = h;
    for (let t = 0; t < rot; t++) {
      const px = y;
      const py = cw - 1 - x;
      x = px;
      y = py;
      const s = ch;
      ch = cw;
      cw = s;
    }
    return { x, y };
  };
}

/** Returns the mapper for the board as it now stands. */
function here() {
  return spaceOf(state.w, state.h, state.rot).map;
}

/**
 * Returns the engine's square for a square of the screen, or -1.
 * @param {number} x
 * @param {number} y
 * @returns {number}
 */
function engineAt(x, y) {
  const map = here();
  for (let i = 0; i < state.piece.length; i++) {
    const at2 = map(i);
    if (at2.x === x && at2.y === y) return state.open[i] ? i : -1;
  }
  return -1;
}

/**
 * Makes a sprite for a piece of the engine's.
 * @param {import('../engine.mjs').Piece} p
 * @param {number} x
 * @param {number} y
 * @returns {Sprite}
 */
function spriteOf(p, x, y) {
  return {
    id: p.id,
    t: p.t,
    k: p.k,
    sp: p.sp,
    cage: p.cage,
    burr: p.burr,
    hp: p.hp,
    x,
    y,
    px: 0,
    py: 0,
    sx: 1,
    sy: 1,
    rot: 0,
    a: 1,
    lift: 0,
    lx: 0,
    ly: 0,
    eye: "open",
    z: 0,
    blink: now + 800 + Math.random() * 5000,
    gone: false,
    flash: 0,
    auraIn: 1,
    shake: 0,
  };
}

/** Sets every sprite to what the rules say stands on the board, keeping the ones already there. */
function sync() {
  const map = here();
  /** @type {Map<number, Sprite>} */
  const next = new Map();
  for (let i = 0; i < state.piece.length; i++) {
    const p = state.piece[i];
    if (!p) continue;
    const { x, y } = map(i);
    const old = sprites.get(p.id);
    const s = old && !old.gone ? old : spriteOf(p, x, y);
    Object.assign(s, {
      t: p.t,
      k: p.k,
      sp: p.sp,
      cage: p.cage,
      burr: p.burr,
      hp: p.hp,
      left: p.hp,
      x,
      y,
      px: 0,
      py: 0,
      sx: 1,
      sy: 1,
      rot: 0,
      a: 1,
      lift: 0,
      z: 0,
      falling: false,
      eye:
        s.eye === "happy" || s.eye === "wide" || s.eye === "cross"
          ? "open"
          : s.eye,
      lx: 0,
      ly: 0,
    });
    next.set(p.id, s);
  }
  sprites = next;
  squares = [];
  const grid = mapper(state.w, state.h, state.rot);
  for (let i = 0; i < state.piece.length; i++) {
    const at2 = grid(i % state.w, Math.floor(i / state.w));
    squares[at2.y * cols + at2.x] = {
      dust: state.open[i] ? state.dust[i] : -1,
      puff: 0,
    };
  }
  shown = state.left.map((n, goal) => Math.max(0, n) + (flying[goal] ?? 0));
  drawBar();
}

// ---------------------------------------------------------------- effects

/** @type {{ kind: string, x: number, y: number, vx: number, vy: number, r: number, c: string, life: number, age: number, spin: number, rot: number, len: number, level?: number, w?: number, h?: number }[]} */
let bits = [];
/** @type {{ kind: string, x: number, y: number, r0: number, r1: number, t0: number, d: number, c: string, w: number, x2?: number, y2?: number, seed?: number }[]} */
let marks = [];
/** @type {{ s: Sprite, x0: number, y0: number, x1: number, y1: number, t0: number, d: number, bend: number, done: () => void }[]} */
let ghosts = [];

/**
 * Throws loose fluff out from a square.
 * @param {number} x
 * @param {number} y
 * @param {string} c
 * @param {number} count
 * @param {number} [power]
 */
function fluff(x, y, c, count, power = 1) {
  const n = Math.round(count * (settings.calm ? 0.25 : 1));
  if (bits.length > 420) return;
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.7 + Math.random() * 1.9) * power;
    bits.push({
      kind: "tuft",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      r: 0.045 + Math.random() * 0.05,
      c: i % 3 === 0 ? colorOf(palette, null, "frizz") : c,
      life: 420 + Math.random() * 380,
      age: 0,
      spin: (Math.random() - 0.5) * 9,
      rot: angle,
      len: 0.08 + Math.random() * 0.1,
    });
  }
}

/**
 * Returns a brick's layers as the view draws them, laid afresh where there
 * are not as many of them as the brick has left.
 * @param {Sprite} s
 * @returns {import('../../art/fuzz.mjs').BrickLayer[]}
 */
function padsOf(s) {
  const n = Math.max(1, s.hp);
  if (!s.pads || s.pads.length !== n) s.pads = brickLayers(n);
  return s.pads;
}

/**
 * Knocks the top layer off a brick: the cushion tumbles away in a puff of its
 * own fluff, and the ones under it spring up into the room it leaves.
 * @param {Sprite} s
 * @param {number} x The brick's square.
 * @param {number} y
 */
function knock(s, x, y) {
  const pads = padsOf(s);
  if (pads.length < 2) return;
  const top = /** @type {import('../../art/fuzz.mjs').BrickLayer} */ (
    pads.pop()
  );
  s.hp = pads.length;
  const color = colorOf(palette, null, `felt${top.level}`);
  const side = s.id % 2 ? 1 : -1;
  bits.push({
    kind: "pad",
    x: x + top.x / 100,
    y: y + top.y / 100,
    vx: settings.calm ? 0 : side * (1.2 + Math.random() * 0.8),
    vy: settings.calm ? -0.6 : -3.3,
    r: 0,
    c: color,
    life: settings.calm ? 260 : 480,
    age: 0,
    spin: settings.calm ? 0 : side * (2 + Math.random() * 2),
    rot: 0,
    len: 0,
    level: top.level,
    w: top.w,
    h: top.h,
  });
  fluff(x, y + top.y / 100, color, 6, 0.85);
  // The pile ducks under the blow, then plumps up to fill its square again.
  const next = brickLayers(pads.length);
  pads.forEach((pad, n) => {
    const { x: px, y: py, w, h } = next[n];
    tween(
      pad,
      { x: px, y: py, w, h },
      settings.calm ? 180 : 440,
      settings.calm ? ease.out : ease.spring,
    );
  });
  if (settings.calm) return;
  s.sy = 0.84;
  s.sx = 1.07;
  tween(s, { sx: 1, sy: 1 }, 320, ease.spring);
  s.shake = 0.5;
  tween(s, { shake: 0 }, 200, ease.out);
}

/**
 * Bursts a brick's last layer into fluff, its button flying, and counts the
 * brick.
 * @param {Sprite} s
 * @param {number} x The brick's square.
 * @param {number} y
 */
function burst(s, x, y) {
  const color = colorOf(palette, null, "felt1");
  s.gone = true;
  fluff(x, y, color, 16, 1.3);
  fluff(x, y, colorOf(palette, null, "felt1Side"), 5, 0.8);
  bits.push({
    kind: "button",
    x,
    y: y - 0.04,
    vx: (s.id % 2 ? 1 : -1) * (0.5 + Math.random() * 0.9),
    vy: -4.4,
    r: 0.055,
    c: colorOf(palette, null, "felt1Side"),
    life: 640,
    age: 0,
    spin: 0,
    rot: 0,
    len: 0,
  });
  ring(x, y, 0.85, color);
  bumpGoal("brick");
}

/**
 * Draws a ring spreading from a square.
 * @param {number} x
 * @param {number} y
 * @param {number} r1 In squares.
 * @param {string} c
 * @param {number} [t0]
 * @param {number} [d]
 */
function ring(x, y, r1, c, t0 = now, d = 280) {
  marks.push({ kind: "ring", x, y, r0: 0.25, r1, t0, d, c, w: 0.09 });
}

let lastFlash = -1e9;

/**
 * Flashes a soft disc of light, never more than 3 times a second.
 * @param {number} x
 * @param {number} y
 * @param {number} r In squares.
 * @param {string} c
 */
function flash(x, y, r, c) {
  if (settings.calm || now - lastFlash < 350) return;
  lastFlash = now;
  marks.push({ kind: "flash", x, y, r0: r, r1: 0, t0: now, d: 110, c, w: 0 });
}

/**
 * Shakes the board, where motion is welcome.
 * @param {number} amount In px.
 */
function shake(amount) {
  if (!settings.calm) shakeAmount = Math.max(shakeAmount, amount);
}

/**
 * Lights a sprite white for a moment, where motion is welcome and under the
 * same limit as a flash.
 * @param {Sprite} s
 * @param {number} amount From 0 to 1.
 * @param {number} d Milliseconds.
 */
function glow(s, amount, d) {
  if (settings.calm || now - lastFlash < 350) return;
  lastFlash = now;
  s.flash = amount;
  tween(s, { flash: 0 }, d, ease.out);
}

/**
 * Returns the color of a sprite's fur.
 * @param {Sprite} s
 * @returns {string}
 */
function inkOf(s) {
  if (s.t === "frizz") return colorOf(palette, null, "frizz");
  if (s.t === "sleepy") return colorOf(palette, null, "sleepy");
  if (s.t === "brick")
    return colorOf(palette, null, `felt${Math.max(1, Math.min(4, s.hp))}`);
  return palette.inks[
    /** @type {keyof typeof palette.inks} */ (level.kinds[s.k])
  ];
}

/**
 * Throws a cage's bars off a fuzzball, and counts the cage.
 * @param {Sprite} s
 */
function openCage(s) {
  s.cage = false;
  for (let n = 0; n < 5; n++)
    bits.push({
      kind: "bar",
      x: s.x + (n - 2) * 0.16,
      y: s.y,
      vx: (n - 2) * 0.9,
      vy: -2.2 - Math.random(),
      r: 0.035,
      c: colorOf(palette, null, "steel"),
      life: 560,
      age: 0,
      spin: (n - 2) * 5,
      rot: 0,
      len: 0.36,
    });
  bumpGoal("cage");
}

/**
 * Plays a fuzzball's hop off the board: a swell, a happy look, a fade, and
 * fluff left behind; if a goal counts its kind, a small one flies to the bar.
 * @param {Sprite} s
 * @param {number} t
 * @param {number} wave
 * @param {boolean} [quiet] Whether a blast, not a bunch, took it.
 */
function hop(s, t, wave, quiet = false) {
  if (s.cage) sfx("cage", t - 70);
  at(t - (quiet ? 40 : 0), () => {
    s.eye = quiet ? "wide" : "happy";
    s.z = 2;
  });
  at(t - 70, () => {
    if (s.cage) openCage(s);
    if (s.burr) {
      s.burr = false;
      fluff(s.x, s.y, colorOf(palette, null, "burr"), 6);
    }
  });
  at(t, () => {
    s.eye = "happy";
    tween(s, { sx: 1.42, sy: 1.42, lift: 1 }, T.pop, ease.out);
    tween(s, { a: 0 }, T.pop * 0.75, ease.in, now + T.pop * 0.3);
    fluff(s.x, s.y, inkOf(s), 5 + Math.min(6, wave), 1 + wave * 0.06);
    ring(s.x, s.y, 0.75, inkOf(s), now, 220);
    const goal = state.goals.findIndex(
      (g) => g.type === "gather" && g.kind === s.k,
    );
    if (s.t === "fuzz" && goal >= 0 && shown[goal] - flying[goal] > 0)
      fly(s, goal);
  });
  at(t + T.pop + 10, () => {
    s.gone = true;
  });
}

/**
 * Sends a small copy of a gathered fuzzball to its goal in the bar.
 * @param {Sprite} s
 * @param {number} goal
 */
function fly(s, goal) {
  flying[goal]++;
  const landed = () => {
    flying[goal]--;
    if (shown[goal] > 0) shown[goal]--;
    drawBar(goal);
    sfx("tick", now, 1, 30);
  };
  const inAir = ghosts.length;
  if (settings.calm || inAir > 14) {
    at(now + 200, landed);
    return;
  }
  const el = $(`goal-${goal}`).getBoundingClientRect();
  const board = canvas.getBoundingClientRect();
  const x1 = (el.left + el.width / 2 - board.left - ox) / size - 0.5;
  const y1 = (el.top + el.height / 2 - board.top - oy) / size - 0.5;
  const copy = { ...s, sx: 0.9, sy: 0.9, a: 1, lift: 0.4, eye: "happy", z: 5 };
  ghosts.push({
    s: copy,
    x0: s.x,
    y0: s.y,
    x1,
    y1,
    t0: now + 40 + (inAir % 6) * 35,
    d: T.ghost,
    bend: (Math.random() - 0.5) * 2.4,
    done: landed,
  });
}

// ---------------------------------------------------------------- playing a record

/**
 * Plays one wave of a move and returns when the board is next at rest.
 * @param {Step} step
 * @param {number} t0
 * @param {Space} space
 * @returns {number}
 */
function playStep(step, t0, space) {
  const { map, grid } = space;
  const wave = Math.max(0, step.n - 1);
  const rung = Math.min(9, wave);
  // Each wave a move sets off plays a little quicker than the one before.
  const q = Math.max(T.quickest, 1 - T.quicken * wave);
  let tPop = t0;
  let last = t0;

  if (step.bunches.length > 0) {
    tPop = t0 + T.huddle * q;
    step.bunches.forEach((bunch, order) => {
      const cells = bunch.cells.map(map);
      const cx = cells.reduce((sum, c) => sum + c.x, 0) / cells.length;
      const cy = cells.reduce((sum, c) => sum + c.y, 0) / cells.length;
      const members = step.hits.filter(
        (h) =>
          h.src === -1 &&
          bunch.cells.includes(h.i) &&
          (h.what === "gather" || h.what === "born"),
      );
      const keeper = bunch.born ? map(bunch.keeper) : null;
      // They see one another, and huddle.
      at(t0, () => {
        for (const h of members) {
          const s = sprites.get(h.id);
          if (!s) continue;
          const to = keeper ?? { x: cx, y: cy };
          const dx = to.x - s.x;
          const dy = to.y - s.y;
          const far = Math.hypot(dx, dy) || 1;
          s.lx = dx / far;
          s.ly = dy / far;
          s.eye = "wide";
          tween(
            s,
            {
              x: s.x + (dx / far) * 0.07,
              y: s.y + (dy / far) * 0.07,
              sx: 0.93,
              sy: 0.93,
            },
            T.huddle * q,
            ease.out,
          );
        }
      });
      const when = tPop + order * 50;
      sfx(
        `note-${Math.min(9, rung + order)}-${Math.min(5, Math.max(3, bunch.cells.length))}`,
        when,
        order === 0 ? 1 : 0.7,
      );
      let n = 0;
      for (const h of members) {
        const s = sprites.get(h.id);
        if (!s) continue;
        if (h.what === "born") continue;
        sfx(`pop-${Math.min(9, rung + n)}`, when + 50 + n * 30, 0.8);
        n++;
        if (keeper && !settings.calm) {
          // The rest of the bunch runs into the one that stays.
          at(when, () => {
            s.eye = "happy";
            s.z = 2;
            tween(
              s,
              { x: keeper.x, y: keeper.y, sx: 0.5, sy: 0.5 },
              T.merge,
              ease.in,
            );
            tween(s, { a: 0 }, T.merge * 0.5, ease.in, now + T.merge * 0.5);
            fluff(s.x, s.y, inkOf(s), 3);
            const goal = state.goals.findIndex(
              (g) => g.type === "gather" && g.kind === s.k,
            );
            if (goal >= 0 && shown[goal] - flying[goal] > 0) fly(s, goal);
          });
          at(when + T.merge, () => (s.gone = true));
        } else hop(s, when + n * 12, wave);
      }
      if (bunch.born) {
        const s =
          sprites.get(bunch.bornId) ??
          members
            .map((h) => sprites.get(h.id))
            .find((m) => m && m.x === keeper?.x && m.y === keeper?.y);
        const what =
          bunch.born === "frizz"
            ? "frizz"
            : bunch.born.startsWith("dash")
              ? "dasher"
              : bunch.born === "puff"
                ? "puffer"
                : "wisp";
        sfx(`born-${what}`, when + 60);
        at(when + T.merge - 20, () => {
          const k = keeper ?? { x: cx, y: cy };
          let made = s;
          if (!made || made.gone || made.id !== bunch.bornId) {
            made = spriteOf(
              {
                id: bunch.bornId,
                t: "fuzz",
                k: bunch.kind,
                sp: null,
                cage: false,
                burr: false,
                hp: 0,
              },
              k.x,
              k.y,
            );
            sprites.set(made.id, made);
          }
          Object.assign(made, {
            x: k.x,
            y: k.y,
            a: 1,
            gone: false,
            cage: false,
            burr: false,
            z: 3,
            eye: "wide",
            lx: 0,
            ly: 0,
            flash: 0,
            auraIn: 0,
            sx: 1.5,
            sy: 1.5,
            lift: 1,
          });
          if (bunch.born === "frizz")
            Object.assign(made, { t: "frizz", k: -1, sp: null });
          else made.sp = bunch.born;
          tween(made, { sx: 1, sy: 1 }, T.born, ease.spring);
          tween(made, { lift: 0 }, 260, ease.out);
          glow(made, 1, 260);
          tween(made, { auraIn: 1 }, 300, ease.back);
          ring(k.x, k.y, 1.5, colorOf(palette, null, "frizz"), now, 380);
          ring(k.x, k.y, 1.0, inkOf(made), now + 60, 320);
          fluff(k.x, k.y, inkOf(made), 14, 1.4);
          if (bunch.born === "frizz") {
            shake(5);
            dim = 0.4;
            tween(view, { dim: 0 }, 500, ease.in, now + 200);
            for (const other of sprites.values()) {
              if (other === made || other.gone) continue;
              other.lx = Math.sign(k.x - other.x) * 0.9;
              other.ly = Math.sign(k.y - other.y) * 0.9;
              other.eye = "wide";
              at(now + 620, () => {
                if (!other.gone && other.eye === "wide")
                  Object.assign(other, { eye: "open", lx: 0, ly: 0 });
              });
            }
          } else shake(2.5);
          at(now + 560, () => {
            made.z = 0;
            if (made.eye === "wide") made.eye = "open";
          });
        });
        last = Math.max(last, when + T.merge + 180);
      }
      last = Math.max(last, when + n * 12 + T.pop * 0.6);
      if (step.n >= 2)
        at(when, () =>
          marks.push({
            kind: "wave",
            x: cx,
            y: cy - 0.5,
            r0: step.n,
            r1: 0,
            t0: now,
            d: 620,
            c: colorOf(palette, null, "text"),
            w: 0,
          }),
        );
    });
    const tier = { 3: 1, 5: 2, 7: 3, 9: 4 }[step.n];
    if (tier) {
      sfx(`chirp-${tier}`, tPop + 90);
      at(tPop + 90, () => cheer(tier));
    }
  }

  // When each blast starts, and when it reaches each square.
  /** @type {number[]} */
  const starts = [];
  /** @type {((rank: number) => number)[]} */
  const reach = [];
  step.blasts.forEach((b, n) => {
    const paired =
      (b.after === -1 &&
        ["cross", "bigcross", "bigpuff", "wisp3", "frizz-frizz"].some(
          (w) => b.what === w,
        )) ||
      (b.after === -1 &&
        (b.what.startsWith("wisp-") || b.what.startsWith("frizz-")));
    const tb =
      b.after === -1 ? tPop + (paired ? T.pair : 20) : reach[b.after](b.wait);
    starts[n] = tb;
    const count = b.cells.length;
    const arc = Math.min(T.arc, 700 / Math.max(1, count));
    if (b.what === "frizz") reach[n] = () => tb + count * arc + T.frizzHold;
    else if (b.what.startsWith("frizz-") && b.what !== "frizz-frizz")
      reach[n] = (rank) => tb + count * arc + 200 + rank * 90;
    else if (b.what === "frizz-frizz")
      reach[n] = (rank) => tb + 260 + rank * 26;
    else if (b.what.startsWith("wisp"))
      reach[n] = (rank) => tb + T.wisp + (rank - 1) * 90;
    else if (b.what.includes("puff"))
      reach[n] = (rank) => tb + T.puffIn + rank * T.puffRing;
    else reach[n] = (rank) => tb + 40 + rank * T.dashCell;
    if (paired) sfx("pair", tPop);
    const uncounted =
      b.after === -1 &&
      b.id >= 0 &&
      !step.hits.some((h) => h.id === b.id && h.what === "gather");
    at(tb, () => {
      // A special the move itself set off was gathered without a strike.
      const s = sprites.get(b.id);
      const goal =
        s && uncounted && !paired && s.t === "fuzz"
          ? state.goals.findIndex((g) => g.type === "gather" && g.kind === s.k)
          : -1;
      if (goal >= 0) bumpGoal("gather", goal);
      blast(b, space, arc);
    });
    blastSound(b, tb, count, arc, rung);
    last = Math.max(last, reach[n](b.what.includes("puff") ? 2 : 1));
  });

  // What each strike did.
  let hops = 0;
  for (const h of step.hits) {
    if (h.what === "born") continue;
    if (h.src === -1 && h.what === "gather") continue;
    const t =
      h.src === -1 ? tPop + 40 : h.src === -2 ? -1 : reach[h.src](h.rank);
    if (t < 0) continue;
    last = Math.max(last, t);
    const c = map(h.i);
    const s = sprites.get(h.id);
    if (h.what === "gather" && s) {
      hop(s, t, wave, true);
      if (hops++ < 14) sfx(`pop-${Math.min(9, rung + (hops % 6))}`, t, 0.6, 10);
    } else if (h.what === "dust") {
      sfx("dust", t, 1, 40);
      at(t, () => {
        const sq = squares[c.y * cols + c.x];
        sq.dust = h.dustLeft ?? 0;
        sq.puff = 1;
        tween(sq, { puff: 0 }, 320, ease.out);
        bumpGoal("dust");
      });
    } else if (h.what === "knock" && s) {
      // Each layer has a note of its own, a step higher the fewer are left.
      s.left = (s.left ?? s.hp) - 1;
      sfx(`knock-${Math.max(1, Math.min(3, s.left))}`, t, 1, 30);
      at(t, () => knock(s, c.x, c.y));
    } else if (h.what === "break" && s) {
      sfx("break", t, 1, 30);
      at(t, () => {
        if (!settings.calm) tween(s, { sx: 1.14, sy: 1.14 }, 70, ease.out);
      });
      at(t + 70, () => burst(s, c.x, c.y));
    } else if (h.what === "uncage" && s) {
      sfx("cage", t);
      sfx("yip", t + 140);
      at(t, () => {
        openCage(s);
        s.eye = "happy";
        tween(s, { sy: 1.25, sx: 0.85 }, 110, ease.out);
        tween(s, { sy: 1, sx: 1 }, 260, ease.spring, now + 110);
        at(now + 500, () => (s.eye = "open"));
      });
    } else if (h.what === "unburr" && s) {
      sfx("burr-off", t, 1, 30);
      at(t, () => {
        s.burr = false;
        fluff(c.x, c.y, colorOf(palette, null, "burr"), 7);
        s.eye = "happy";
        at(now + 400, () => (s.eye = "open"));
      });
    } else if (h.what === "ruffle" && s) {
      at(t, () => {
        s.shake = 0.6;
        tween(s, { shake: 0 }, 300, ease.out);
      });
    }
  }
  // Then the fall, a lane at a time, each a little after the one before.
  const tf = last + T.fallWait * q;
  let rest = tf;
  /** @type {Map<number, number>} */
  const perLane = new Map();
  const lanes = [...new Set(step.falls.map((f) => f.lane))].sort(
    (p, q) => p - q,
  );
  for (const fall of step.falls) {
    const nth = perLane.get(fall.lane) ?? 0;
    perLane.set(fall.lane, nth + 1);
    const points = fall.path.map((i, n) => {
      if (i >= 0) return map(i);
      const first = fall.path[n + 1];
      return grid(
        first % space.w,
        -1 - (fall.spawn ? countSpawnsBefore(step, fall) : 0),
      );
    });
    let far = 0;
    for (let n = 1; n < points.length; n++)
      far += Math.hypot(
        points[n].x - points[n - 1].x,
        points[n].y - points[n - 1].y,
      );
    const start = tf + (lanes.indexOf(fall.lane) * T.lane + nth * T.stack) * q;
    const d = (80 + 70 * far ** 0.7) * q;
    let s = sprites.get(fall.id);
    if (!s) {
      s = spriteOf(
        {
          id: fall.id,
          t: "fuzz",
          k: fall.kind,
          sp: null,
          cage: false,
          burr: false,
          hp: 0,
        },
        points[0].x,
        points[0].y,
      );
      s.a = 0;
      sprites.set(fall.id, s);
    }
    const sprite = s;
    const down = grid(0, 1);
    const zero = grid(0, 0);
    const gx = down.x - zero.x;
    const gy = down.y - zero.y;
    at(start, () => {
      sprite.a = 1;
      sprite.falling = fall.spawn;
      sprite.lx = gx * 0.8;
      sprite.ly = gy * 0.8;
      const run = { u: 0 };
      tween(run, { u: 1 }, d, (u) => u ** 1.8);
      const follow = () => {
        let left = run.u * far;
        for (let n = 1; n < points.length; n++) {
          const seg = Math.hypot(
            points[n].x - points[n - 1].x,
            points[n].y - points[n - 1].y,
          );
          if (left <= seg || n === points.length - 1) {
            const u = seg ? Math.min(1, left / seg) : 1;
            sprite.x = points[n - 1].x + (points[n].x - points[n - 1].x) * u;
            sprite.y = points[n - 1].y + (points[n].y - points[n - 1].y) * u;
            break;
          }
          left -= seg;
        }
        // It stretches the way it falls, more the faster it goes.
        const speed = Math.min(1, run.u * 1.4);
        sprite.sx =
          1 - 0.1 * speed * Math.abs(gy) + 0.08 * speed * Math.abs(gx);
        sprite.sy =
          1 - 0.1 * speed * Math.abs(gx) + 0.08 * speed * Math.abs(gy);
        if (run.u < 1) at(now + 1, follow);
      };
      follow();
    });
    at(start + d, () => {
      const end = points[points.length - 1];
      Object.assign(sprite, {
        x: end.x,
        y: end.y,
        lx: 0,
        ly: 0,
        falling: false,
      });
      // It lands: squashed against what it fell on, then up and settled.
      const wide = {
        sx: 1 + 0.16 * Math.abs(gy) - 0.18 * Math.abs(gx),
        sy: 1 + 0.16 * Math.abs(gx) - 0.18 * Math.abs(gy),
      };
      tween(sprite, wide, 60, ease.out);
      tween(sprite, { sx: 1, sy: 1 }, T.land - 60, ease.spring, now + 60);
      if (sprite.t !== "sleepy") sprite.blink = now + 20;
      sfx("land", now, 0.7 + Math.min(0.3, far * 0.06), 60);
    });
    rest = Math.max(rest, start + d);
  }
  for (const h of step.hits) {
    if (h.what !== "bed") continue;
    const s = sprites.get(h.id);
    if (!s) continue;
    sfx("bed", rest + 20);
    at(rest + 20, () => {
      s.z = 3;
      tween(s, { y: s.y + 1.3, a: 0, sx: 0.8, sy: 0.8 }, 520, ease.in);
      bumpGoal("sleepy");
      at(now + 540, () => (s.gone = true));
    });
    rest += 300;
  }
  return step.falls.length ? rest + T.waveGap * q : last + 150;
}

/**
 * Returns how many fuzzballs came into a fall's lane before it in a wave, so
 * that those let in together stand in a stack over the board.
 * @param {Step} step
 * @param {import('../engine.mjs').Fall} fall
 * @returns {number}
 */
function countSpawnsBefore(step, fall) {
  let n = 0;
  for (const other of step.falls) {
    if (other === fall) break;
    if (other.spawn && other.lane === fall.lane) n++;
  }
  return n;
}

/**
 * Takes one off what the bar shows a goal still needs.
 * @param {string} type
 * @param {number} [which] The goal, where its type alone does not say.
 */
function bumpGoal(type, which) {
  const goal = which ?? state.goals.findIndex((g) => g.type === type);
  if (goal < 0) return;
  if (shown[goal] > 0) shown[goal]--;
  drawBar(goal);
}

/**
 * Has every fuzzball on the board hop for joy, higher by the tier.
 * @param {number} tier
 */
function cheer(tier) {
  if (settings.calm) return;
  for (const s of sprites.values()) {
    if (s.gone || s.t === "brick" || s.t === "sleepy" || s.cage) continue;
    const wait = (s.x + s.y) * 22;
    s.eye = "happy";
    tween(
      s,
      { sy: 1 + 0.07 * tier, sx: 1 - 0.04 * tier },
      90,
      ease.out,
      now + wait,
    );
    tween(s, { sy: 1, sx: 1 }, 220, ease.spring, now + wait + 90);
    at(now + wait + 420, () => {
      if (s.eye === "happy" && !s.gone) s.eye = "open";
    });
  }
}

/**
 * Plays a special fuzzball going off.
 * @param {import('../engine.mjs').Blast} b
 * @param {Space} space
 * @param {number} arc
 */
function blast(b, space, arc) {
  const { map, upright } = space;
  const c = map(b.i);
  const s = sprites.get(b.id);
  const ink =
    b.kind >= 0
      ? palette.inks[
          /** @type {keyof typeof palette.inks} */ (level.kinds[b.kind])
        ]
      : colorOf(palette, null, "frizz");
  const white = colorOf(palette, null, "frizz");
  const beam = (
    /** @type {boolean} */ across,
    /** @type {number} */ off = 0,
  ) => {
    for (const way of [1, -1]) {
      marks.push({
        kind: "streak",
        x: c.x + (across ? 0 : off),
        y: c.y + (across ? off : 0),
        x2: across ? way : 0,
        y2: across ? 0 : way,
        r0: 0,
        r1: 0,
        t0: now + 40,
        d: (Math.max(cols, rows) + 4) * T.dashCell,
        c: ink,
        w: 0.5,
      });
    }
  };
  const wide = (/** @type {string} */ what) => (what === "dash-h") === upright;
  if (b.what === "dash-h" || b.what === "dash-v") {
    beam(wide(b.what));
    shake(3);
    if (s && !s.gone) {
      s.z = 4;
      const along = wide(b.what);
      tween(
        s,
        { sx: along ? 2.4 : 0.5, sy: along ? 0.5 : 2.4, a: 0 },
        170,
        ease.out,
      );
      at(now + 180, () => (s.gone = true));
    }
  } else if (b.what === "cross" || b.what === "bigcross") {
    for (const off of b.what === "cross" ? [0] : [-1, 0, 1]) {
      beam(true, off);
      beam(false, off);
    }
    shake(b.what === "cross" ? 4 : 7);
    ring(c.x, c.y, 2.2, white, now, 360);
    if (s && !s.gone) s.gone = true;
  } else if (b.what === "puff" || b.what === "bigpuff") {
    const far = b.what === "puff" ? 2.6 : 4.6;
    if (s && !s.gone) {
      // It breathes in, and everything near leans toward it.
      s.z = 4;
      s.eye = "cross";
      tween(s, { sx: 0.72, sy: 0.72 }, T.puffIn, ease.inOut);
      for (const other of sprites.values()) {
        const d = Math.hypot(other.x - c.x, other.y - c.y);
        if (
          other === s ||
          other.gone ||
          d > far ||
          other.t === "brick" ||
          other.a < 0.5
        )
          continue;
        tween(
          other,
          {
            px: ((c.x - other.x) / (d || 1)) * 0.08,
            py: ((c.y - other.y) / (d || 1)) * 0.08,
          },
          T.puffIn,
          ease.inOut,
        );
        tween(other, { px: 0, py: 0 }, 200, ease.spring, now + T.puffIn);
      }
    }
    at(now + T.puffIn, () => {
      if (s && !s.gone) {
        tween(s, { sx: 2.4, sy: 2.4, a: 0, lift: 1 }, 160, ease.out);
        at(now + 170, () => (s.gone = true));
      }
      ring(c.x, c.y, far, white, now, 340);
      ring(c.x, c.y, far * 0.7, ink, now + 50, 340);
      fluff(
        c.x,
        c.y,
        ink,
        b.what === "puff" ? 26 : 44,
        b.what === "puff" ? 2 : 2.8,
      );
      flash(c.x, c.y, far * 0.8, white);
      shake(b.what === "puff" ? 6 : 10);
      // What the blast leaves standing is pushed back, and springs home.
      for (const other of sprites.values()) {
        const d = Math.hypot(other.x - c.x, other.y - c.y);
        if (
          other.gone ||
          d < 0.1 ||
          d > far + 1.6 ||
          other.t === "brick" ||
          other.a < 0.5
        )
          continue;
        const push = 0.12 * (1 - d / (far + 1.6));
        tween(
          other,
          {
            px: ((other.x - c.x) / d) * push,
            py: ((other.y - c.y) / d) * push,
          },
          70,
          ease.out,
        );
        tween(other, { px: 0, py: 0 }, 260, ease.spring, now + 70);
      }
    });
  } else if (b.what.startsWith("wisp")) {
    (b.targets ?? []).forEach((target, n) => {
      const to = map(target);
      const from = map(b.from ?? b.i);
      const copy = s
        ? { ...s, sp: "wisp", a: 1, z: 6, eye: "happy", gone: false }
        : spriteOf(
            {
              id: -1,
              t: "fuzz",
              k: b.kind,
              sp: "wisp",
              cage: false,
              burr: false,
              hp: 0,
            },
            from.x,
            from.y,
          );
      ghosts.push({
        s: copy,
        x0: from.x,
        y0: from.y,
        x1: to.x,
        y1: to.y,
        t0: now + n * 90,
        d: T.wisp,
        bend: n % 2 ? 1.6 : -1.6,
        done: () => {
          fluff(to.x, to.y, ink, 8);
          ring(to.x, to.y, 0.9, white);
        },
      });
    });
    if (s) s.gone = true;
  } else if (b.what === "frizz-frizz") {
    if (s) s.gone = true;
    dim = 0.5;
    tween(view, { dim: 0 }, 700, ease.in, now + 200);
    ring(c.x, c.y, Math.max(cols, rows) * 1.2, white, now + 200, 620);
    ring(
      c.x,
      c.y,
      Math.max(cols, rows),
      colorOf(palette, null, "spark"),
      now + 260,
      620,
    );
    shake(10);
  } else if (b.what.startsWith("frizz")) {
    // Static leaps to each in turn, and they stand frizzed until the last.
    dim = 0.34;
    if (s) {
      s.z = 6;
      s.lift = 1;
      tween(s, { sx: 1.25, sy: 1.25 }, 200, ease.back);
    }
    const gives = b.what === "frizz" ? null : b.what.slice(6);
    b.cells.forEach((cell, n) => {
      const to = map(cell);
      at(now + n * arc, () => {
        marks.push({
          kind: "bolt",
          x: c.x,
          y: c.y,
          x2: to.x,
          y2: to.y,
          r0: 0,
          r1: 0,
          t0: now,
          d: 200,
          c: colorOf(palette, null, "spark"),
          w: 0.07,
          seed: n,
        });
        const hit = [...sprites.values()].find(
          (o) => !o.gone && o.x === to.x && o.y === to.y,
        );
        if (!hit) return;
        hit.eye = "wide";
        tween(hit, { lift: 1 }, 90, ease.out);
        if (gives) {
          hit.sp = gives === "dash" ? (n % 2 ? "dash-v" : "dash-h") : gives;
          hit.auraIn = 0;
          tween(hit, { auraIn: 1 }, 220, ease.back);
        }
      });
    });
    const end = b.cells.length * arc + T.frizzHold;
    at(now + end, () => {
      tween(view, { dim: 0 }, 260, ease.out);
      if (s && !s.gone) {
        tween(s, { sx: 2, sy: 2, a: 0 }, 180, ease.out);
        at(now + 190, () => (s.gone = true));
        fluff(c.x, c.y, white, 20, 2);
      }
      ring(c.x, c.y, 3.4, white, now, 420);
      flash(c.x, c.y, 1.6, white);
      shake(b.what === "frizz" ? 6 : 4);
    });
  }
}

/**
 * Lines up a blast's sounds.
 * @param {import('../engine.mjs').Blast} b
 * @param {number} tb
 * @param {number} count
 * @param {number} arc
 * @param {number} rung
 */
function blastSound(b, tb, count, arc, rung) {
  if (b.what.startsWith("dash") || b.what === "cross" || b.what === "bigcross")
    sfx("dash", tb, b.what === "bigcross" ? 1 : 0.9, 60);
  if (b.what === "puff" || b.what === "bigcross") sfx("puff", tb, 1, 80);
  if (b.what === "bigpuff") sfx("big-puff", tb);
  if (b.what.startsWith("wisp")) sfx("wisp", tb);
  if (b.what.startsWith("frizz")) {
    if (b.what === "frizz-frizz") {
      sfx("frizz", tb + 200);
      sfx("big-puff", tb + 240, 0.7);
      return;
    }
    for (let n = 0; n < Math.min(count, 18); n++)
      sfx(
        `zap-${Math.min(9, rung + Math.floor((n * 9) / Math.max(1, count - 1)))}`,
        tb + n * arc,
      );
    sfx("frizz", tb + count * arc + T.frizzHold - 20);
  }
}

/**
 * Plays everything a move did, then gives the board back to the player.
 * @param {Move} record
 * @param {{ w: number, h: number, rot: number }} before
 * @param {number} t0
 */
function playRecord(record, before, t0) {
  const space = spaceOf(before.w, before.h, before.rot);
  const { map } = space;
  let t = t0;
  for (const step of record.steps) t = playStep(step, t, space);
  if (record.burr) {
    const burred = record.burr;
    const s = sprites.get(burred.id);
    sfx("burr-spread", t);
    at(t, () => {
      const from = map(burred.from);
      const to = map(burred.to);
      const copy = spriteOf(
        { id: -2, t: "burr", k: -1, sp: null, cage: false, burr: true, hp: 0 },
        from.x,
        from.y,
      );
      ghosts.push({
        s: copy,
        x0: from.x,
        y0: from.y,
        x1: to.x,
        y1: to.y,
        t0: now,
        d: 240,
        bend: 0.5,
        done: () => {
          if (s) {
            s.burr = true;
            s.eye = "cross";
            tween(s, { sx: 0.86, sy: 0.86 }, 80, ease.out);
            tween(s, { sx: 1, sy: 1 }, 220, ease.spring, now + 80);
          }
        },
      });
    });
    t += 320;
  }
  if (record.gust) {
    const gust = record.gust;
    const after = spaceOf(state.w, state.h, gust.rot);
    sfx("gust", t);
    at(t, () => {
      // The engine turns a dasher with its board, so that it still dashes the same way on the screen.
      if ((gust.rot - before.rot) % 2 !== 0) {
        for (const s of sprites.values())
          if (s.sp === "dash-h" || s.sp === "dash-v")
            s.sp = s.sp === "dash-h" ? "dash-v" : "dash-h";
      }
      setWind(gust.rot);
      // The gust crosses the board: each fuzzball leans with it in turn, and springs back.
      for (const s of sprites.values()) {
        if (s.t === "brick" || s.cage || settings.calm) continue;
        const wait =
          (s.x * windLean.x + s.y * windLean.y + Math.max(cols, rows)) * 26;
        tween(
          s,
          { px: windLean.x * 0.16, py: windLean.y * 0.16 },
          110,
          ease.out,
          now + wait,
        );
        tween(s, { px: 0, py: 0 }, 320, ease.spring, now + wait + 110);
        tween(s, { lift: 0.8 }, 110, ease.out, now + wait);
        tween(s, { lift: 0 }, 300, ease.out, now + wait + 110);
      }
      for (let n = 0; n < 16; n++)
        marks.push({
          kind: "gust",
          x: Math.random() * cols,
          y: Math.random() * rows,
          r0: 0,
          r1: 0,
          t0: now + Math.random() * 300,
          d: 520,
          c: colorOf(palette, null, "muted"),
          w: 0.05,
        });
    });
    t += 520;
    for (const step of gust.steps) t = playStep(step, t, after);
  }
  if (record.shuffle) {
    const moves = record.shuffle.perm;
    const map3 = here();
    sfx("shuffle", t);
    at(t, () => {
      for (const m of moves) {
        const s = sprites.get(m.id);
        if (!s) continue;
        const to = map3(m.to);
        tween(s, { sx: 0.7, sy: 0.7 }, 140, ease.out);
        tween(s, { x: to.x, y: to.y }, 380, ease.inOut, now + 60);
        tween(s, { sx: 1, sy: 1 }, 260, ease.spring, now + 380);
      }
    });
    t += 700;
  }
  at(t, () => {
    sync();
    locked = false;
    lastMove = now;
    drawBar();
    if (record.won) return win();
    if (record.lost) return lose();
    if (state.moves === 5) sfx("low");
    if (queued) {
      const q = queued;
      queued = null;
      trySwap(q.a, q.b);
    }
  });
}

/**
 * Tries a move: the squares are the engine's, and the same square twice sets
 * a special off where it stands.
 * @param {number} a
 * @param {number} b
 */
function trySwap(a, b) {
  if (locked) {
    queued = { a, b };
    return;
  }
  const map = here();
  const sa = state.piece[a]
    ? sprites.get(/** @type {Piece} */ (state.piece[a]).id)
    : null;
  const sb = state.piece[b]
    ? sprites.get(/** @type {Piece} */ (state.piece[b]).id)
    : null;
  select(-1);
  hintOff();
  if (a === b) {
    const p = state.piece[a];
    if (!p || !(p.sp || p.t === "frizz") || !canSwap(state, a)) return;
  } else if (
    !sa ||
    !sb ||
    !canSwap(state, a) ||
    !canSwap(state, b) ||
    !swapWorks(state, a, b)
  ) {
    // No bunch: they lean at each other, shake their heads, and go back.
    sfx("refuse");
    for (const [s, other] of [
      [sa, sb],
      [sb, sa],
    ]) {
      if (!s || !other || s.t === "brick") continue;
      s.eye = "cross";
      tween(
        s,
        { px: (other.x - s.x) * 0.32, py: (other.y - s.y) * 0.32 },
        90,
        ease.out,
      );
      tween(s, { px: 0, py: 0 }, T.refuse - 90, ease.spring, now + 90);
      s.shake = 0.5;
      tween(s, { shake: 0 }, T.refuse, ease.out);
      at(now + 380, () => (s.eye = "open"));
    }
    return;
  }
  locked = true;
  const before = { w: state.w, h: state.h, rot: state.rot };
  const both =
    a !== b &&
    sa &&
    sb &&
    (sa.sp || sa.t === "frizz") &&
    (sb.sp || sb.t === "frizz");
  const record = /** @type {Move} */ (play(state, a, b, true));
  let t0 = now + 30;
  if (a !== b && sa && sb) {
    sfx("swap");
    const pa = map(a);
    const pb = map(b);
    sa.z = 2;
    tween(sa, { x: pb.x, y: pb.y }, T.swap, ease.back);
    if (both) {
      // The one left to be seen is the frizzball, if there is one.
      const stays = sb.t === "frizz" && sa.t !== "frizz" ? sb : sa;
      const goes = stays === sa ? sb : sa;
      const moved = sa.id;
      at(now + T.swap, () => {
        goes.gone = true;
        sprites.delete(goes.id);
        sprites.delete(stays.id);
        stays.id = moved;
        sprites.set(moved, stays);
        for (const s of [sa, sb]) {
          const goal =
            s.t === "fuzz"
              ? state.goals.findIndex(
                  (g) => g.type === "gather" && g.kind === s.k,
                )
              : -1;
          if (goal >= 0) bumpGoal("gather", goal);
        }
        ring(pb.x, pb.y, 1.1, colorOf(palette, null, "frizz"), now, T.pair);
        fluff(pb.x, pb.y, inkOf(goes), 10, 1.2);
        stays.lift = 1;
        stays.z = 4;
        tween(stays, { sx: 1.3, sy: 1.3 }, T.pair, ease.inOut);
      });
    } else tween(sb, { x: pa.x, y: pa.y }, T.swap, ease.back);
    t0 = now + T.swap;
  }
  $("moves").textContent = String(state.moves);
  playRecord(record, before, t0);
}

// ---------------------------------------------------------------- drawing

/** @type {Map<string, Path2D>} */
const paths = new Map();
/** @type {Map<string, import('../../art/fuzz.mjs').Shape[]>} */
const cache = new Map();
const view = {
  get dim() {
    return dim;
  },
  set dim(v) {
    dim = v;
  },
};

/**
 * Draws flat shapes, in a cell 100 units wide about the origin.
 * @param {import('../../art/fuzz.mjs').Shape[]} shapes
 * @param {string | null} kind
 */
function paint(shapes, kind) {
  const alpha = ctx.globalAlpha;
  for (const s of shapes) {
    const c = colorOf(palette, /** @type {KindId | null} */ (kind), s.c);
    ctx.globalAlpha = alpha * (s.o ?? 1);
    if (s.k === "circle") {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(
        /** @type {number} */ (s.x),
        /** @type {number} */ (s.y),
        /** @type {number} */ (s.r),
        0,
        7,
      );
      ctx.fill();
    } else if (s.k === "ellipse") {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(
        /** @type {number} */ (s.x),
        /** @type {number} */ (s.y),
        /** @type {number} */ (s.rx),
        /** @type {number} */ (s.ry),
        0,
        0,
        7,
      );
      ctx.fill();
    } else {
      const d = /** @type {string} */ (s.d);
      let path = paths.get(d);
      if (!path) paths.set(d, (path = new Path2D(d)));
      if (s.k === "stroke") {
        ctx.strokeStyle = c;
        ctx.lineWidth = /** @type {number} */ (s.w);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke(path);
      } else {
        ctx.fillStyle = c;
        ctx.fill(path);
      }
    }
  }
  ctx.globalAlpha = alpha;
}

/**
 * Returns shapes made once and kept.
 * @param {string} key
 * @param {() => import('../../art/fuzz.mjs').Shape[]} make
 */
function once(key, make) {
  let shapes = cache.get(key);
  if (!shapes) cache.set(key, (shapes = make()));
  return shapes;
}

/**
 * Draws one sprite, its square 100 units wide.
 * @param {Sprite} s
 */
function drawSprite(s) {
  if (s.a <= 0.01) return;
  ctx.save();
  const wobble = s.shake ? Math.sin(now / 18) * s.shake * 0.07 : 0;
  ctx.translate(
    ox + (s.x + s.px + 0.5 + wobble) * size,
    oy + (s.y + s.py + 0.5) * size,
  );
  ctx.scale((size / 100) * s.sx, (size / 100) * s.sy);
  ctx.rotate(s.rot);
  ctx.globalAlpha = s.a;
  if (s.t === "brick") {
    // A pile stands on the floor of its square, so that is where it squashes to.
    ctx.translate(0, (44 * (1 - s.sy)) / s.sy);
    for (const pad of padsOf(s)) {
      const w = Math.round(pad.w * 2) / 2;
      const h = Math.round(pad.h * 2) / 2;
      ctx.save();
      ctx.translate(pad.x, pad.y);
      paint(
        once(`pad${pad.level}:${w}:${h}`, () => brickLayer(pad.level, w, h)),
        null,
      );
      ctx.restore();
    }
  } else if (s.t === "burr") {
    ctx.scale(0.5, 0.5);
    paint(once("burr", burr), null);
  } else if (s.t === "sleepy") {
    const breathe = 1 + Math.sin(now / 700 + s.id) * 0.025;
    ctx.scale(1 / breathe, breathe);
    paint(
      once("sleepy", () => sleepy()),
      null,
    );
  } else if (s.t === "frizz") {
    ctx.scale(0.84, 0.84);
    const turn = Math.floor(now / 110) % 6;
    paint(
      once(`frizz${turn}${palette.id}${s.eye === "happy" ? "h" : ""}`, () =>
        frizzball(
          palette,
          s.eye === "happy" ? "happy" : "wide",
          0.3 + turn * 0.52,
        ),
      ),
      null,
    );
  } else {
    const kind = level.kinds[s.k];
    const small = s.sp ? (s.sp === "wisp" ? 0.8 : 0.86) : s.burr ? 0.82 : 1;
    if (s.burr) paint(once("burr", burr), null);
    const [bx, by] = seat(/** @type {KindId} */ (kind));
    ctx.translate(
      bx * small,
      s.sp === "wisp" ? R * 0.42 : by * (s.sp ? 0.6 : 1),
    );
    ctx.scale(small, small);
    if (s.sp) {
      ctx.save();
      const sway = s.sp === "wisp" ? Math.sin(now / 420 + s.id) * 0.07 : 0;
      const pulse =
        s.sp === "puff" ? 1 + Math.sin(now / 380 + s.id) * 0.045 : 1;
      ctx.rotate(sway);
      ctx.scale(s.auraIn * pulse, s.auraIn * pulse);
      const across = (s.sp === "dash-h") === (viewRot % 2 === 0);
      const worn =
        s.sp === "puff"
          ? "puffer"
          : s.sp === "wisp"
            ? "wisp"
            : across
              ? "dasher-h"
              : "dasher-v";
      paint(
        once(`aura${worn}`, () => aura(/** @type {SpecialId} */ (worn))),
        kind,
      );
      ctx.restore();
    }
    // The fur trails a little behind the body, and leans with the wind.
    const level2 = Math.round(Math.max(0, Math.min(1, s.lift)) * 3);
    ctx.save();
    ctx.translate(
      -s.lx * 2.2 + windLean.x * 4.5,
      -s.ly * 2.2 + windLean.y * 4.5,
    );
    paint(
      once(`fur${kind}${level2}`, () =>
        fur(/** @type {KindId} */ (kind), level2 / 3),
      ),
      kind,
    );
    ctx.restore();
    paint(
      once("body", () => body()),
      kind,
    );
    const blink = now > s.blink && now < s.blink + 110;
    if (now > s.blink + 110) s.blink = now + 2600 + Math.random() * 5200;
    const look =
      s.burr && s.eye === "open"
        ? "sleepy"
        : blink && s.eye === "open"
          ? "blink"
          : s.eye;
    const qx = Math.round(s.lx * 4) / 4;
    const qy = Math.round(s.ly * 4) / 4;
    paint(
      once(`eyes${look}${qx},${qy}`, () =>
        eyes(/** @type {EyeLook} */ (look), qx, qy),
      ),
      kind,
    );
    if (s.flash > 0.01) {
      ctx.globalAlpha = s.a * s.flash * 0.85;
      ctx.fillStyle = colorOf(palette, null, "frizz");
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.3, 0, 7);
      ctx.fill();
    }
    if (s.cage) {
      ctx.globalAlpha = s.a;
      ctx.scale(1 / small, 1 / small);
      ctx.translate(-bx * small, -by);
      paint(once("cage", cage), null);
    }
  }
  ctx.restore();
}

/** Draws a frame. */
function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  if (shakeAmount > 0.05) {
    ctx.translate(
      (Math.random() - 0.5) * shakeAmount,
      (Math.random() - 0.5) * shakeAmount,
    );
    shakeAmount *= 0.86;
  }
  // The squares, and the dust on them.
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const sq = squares[y * cols + x];
      if (!sq || sq.dust < 0) continue;
      ctx.save();
      ctx.translate(ox + (x + 0.5) * size, oy + (y + 0.5) * size);
      ctx.scale(size / 100, size / 100);
      paint(
        once(`sq${sq.dust}`, () => square(sq.dust)),
        null,
      );
      if (sq.puff > 0.01) {
        ctx.globalAlpha = sq.puff * 0.7;
        ctx.fillStyle = colorOf(palette, null, "dustDeep");
        ctx.beginPath();
        ctx.arc(0, 0, 30 + (1 - sq.puff) * 40, 0, 7);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  // Where sleepyheads leave: a quilt along the bottom.
  if (state.bed.some((b) => b)) {
    ctx.fillStyle = colorOf(palette, null, "sleepyDark");
    for (let x = 0; x < cols; x++) {
      ctx.beginPath();
      ctx.roundRect(
        ox + x * size + size * 0.08,
        oy + rows * size + size * 0.1,
        size * 0.84,
        size * 0.22,
        size * 0.1,
      );
      ctx.fill();
    }
  }
  if (keys.on) {
    ctx.strokeStyle = colorOf(palette, null, "text");
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(
      ox + keys.x * size + 2,
      oy + keys.y * size + 2,
      size - 4,
      size - 4,
      size * 0.2,
    );
    ctx.stroke();
  }
  const list = [...sprites.values()]
    .filter((s) => !s.gone)
    .sort((p, q) => p.z - q.z || p.y - q.y);
  const incoming = list.filter((s) => s.falling);
  if (incoming.length > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      ox - size * 0.04,
      oy - size * 0.04,
      cols * size + size * 0.08,
      rows * size + size * 0.08,
    );
    ctx.clip();
    for (const s of incoming) drawSprite(s);
    ctx.restore();
  }
  for (const s of incoming) s.a = -s.a;
  if (dim > 0.01) {
    for (const s of list) if (s.z < 1 && s.lift < 0.5) drawSprite(s);
    ctx.fillStyle = colorOf(palette, null, "page");
    ctx.globalAlpha = dim;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    for (const s of list) if (!(s.z < 1 && s.lift < 0.5)) drawSprite(s);
  } else for (const s of list) drawSprite(s);
  for (const s of incoming) s.a = -s.a;

  // Marks: rings, beams, bolts, flashes, gusts and the wave's number.
  marks = marks.filter((m) => now < m.t0 + m.d);
  for (const m of marks) {
    if (now < m.t0) continue;
    const u = (now - m.t0) / m.d;
    const px = ox + (m.x + 0.5) * size;
    const py = oy + (m.y + 0.5) * size;
    ctx.save();
    if (m.kind === "ring") {
      ctx.globalAlpha = (1 - u) ** 1.5 * 0.9;
      ctx.strokeStyle = m.c;
      ctx.lineWidth = m.w * size * (1 - u * 0.6);
      ctx.beginPath();
      ctx.arc(px, py, (m.r0 + (m.r1 - m.r0) * ease.out(u)) * size, 0, 7);
      ctx.stroke();
    } else if (m.kind === "flash" && !settings.calm) {
      ctx.globalAlpha = (1 - u) * 0.55;
      ctx.fillStyle = m.c;
      ctx.beginPath();
      ctx.arc(px, py, m.r0 * size, 0, 7);
      ctx.fill();
    } else if (m.kind === "streak") {
      // A head that runs a square every 30 ms, and the fur it trails, thinning behind it.
      const dx = /** @type {number} */ (m.x2);
      const dy = /** @type {number} */ (m.y2);
      const run = ((now - m.t0) / T.dashCell) * size;
      ctx.beginPath();
      ctx.rect(
        ox - size * 0.3,
        oy - size * 0.3,
        (cols + 0.6) * size,
        (rows + 0.6) * size,
      );
      ctx.clip();
      ctx.lineCap = "round";
      const tail = 7;
      for (let n = tail; n >= 0; n--) {
        const near = Math.max(0, run - n * size * 0.42);
        const far = Math.max(0, run - (n + 1.2) * size * 0.42);
        ctx.globalAlpha = 0.85 * (1 - n / (tail + 1)) ** 1.3;
        ctx.strokeStyle = n < 2 ? colorOf(palette, null, "frizz") : m.c;
        ctx.lineWidth = m.w * size * (1 - n / (tail + 2));
        ctx.beginPath();
        ctx.moveTo(px + dx * far, py + dy * far);
        ctx.lineTo(px + dx * near, py + dy * near);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = colorOf(palette, null, "frizz");
      ctx.beginPath();
      ctx.arc(px + dx * run, py + dy * run, m.w * size * 0.5, 0, 7);
      ctx.fill();
    } else if (m.kind === "bolt") {
      const x2 = ox + ((m.x2 ?? 0) + 0.5) * size;
      const y2 = oy + ((m.y2 ?? 0) + 0.5) * size;
      const jag = Math.floor(now / 45) + /** @type {number} */ (m.seed);
      ctx.globalAlpha = 1 - u * u;
      for (const [color, width] of /** @type {[string, number][]} */ ([
        [m.c, m.w * size * 1.9],
        [colorOf(palette, null, "frizz"), m.w * size * 0.8],
      ])) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px, py);
        const parts = 5;
        for (let n = 1; n < parts; n++) {
          const r = Math.sin(jag * 12.9898 + n * 78.233) * 43758.5453;
          const off = (r - Math.floor(r) - 0.5) * size * 0.5;
          const bx = px + ((x2 - px) * n) / parts;
          const by = py + ((y2 - py) * n) / parts;
          const len = Math.hypot(x2 - px, y2 - py) || 1;
          ctx.lineTo(
            bx + (-(y2 - py) / len) * off,
            by + ((x2 - px) / len) * off,
          );
        }
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else if (m.kind === "gust") {
      ctx.globalAlpha = Math.sin(u * Math.PI) * 0.6;
      ctx.strokeStyle = m.c;
      ctx.lineWidth = m.w * size;
      ctx.lineCap = "round";
      ctx.beginPath();
      const far = size * (1.2 + u * 2.4);
      ctx.moveTo(px + windLean.x * far * 0.4, py + windLean.y * far * 0.4);
      ctx.lineTo(px + windLean.x * far, py + windLean.y * far);
      ctx.stroke();
    } else if (m.kind === "wave") {
      ctx.globalAlpha = u < 0.2 ? u / 0.2 : (1 - u) / 0.8;
      ctx.fillStyle = m.c;
      ctx.font = `700 ${Math.round(size * (0.42 + 0.03 * Math.min(8, m.r0)) * (1 + 0.3 * (1 - ease.spring(Math.min(1, u * 3)))))}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`×${m.r0}`, px, py - u * size * 0.5);
    }
    ctx.restore();
  }

  // Loose fluff, cage bars, and a brick's cushions and buttons.
  for (const b of bits) {
    const u = b.age / b.life;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - u) * 1.8);
    ctx.translate(ox + (b.x + 0.5) * size, oy + (b.y + 0.5) * size);
    ctx.rotate(b.rot);
    if (b.kind === "tuft") {
      ctx.strokeStyle = b.c;
      ctx.lineWidth = b.r * size * (1 - u * 0.5);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-b.len * size * 0.5, 0);
      ctx.quadraticCurveTo(0, -b.len * size * 0.4, b.len * size * 0.5, 0);
      ctx.stroke();
    } else if (b.kind === "bar") {
      ctx.fillStyle = b.c;
      ctx.fillRect(
        -b.r * size,
        -b.len * size,
        b.r * size * 2,
        b.len * size * 2,
      );
    } else if (b.kind === "pad") {
      // Out from under the pile's weight, a cushion plumps up as it goes.
      const plump = 1 + 0.7 * ease.out(Math.min(1, b.age / 180));
      const level = b.level ?? 1;
      const w = Math.round((b.w ?? 80) * 2) / 2;
      const h = Math.round(Math.min(46, (b.h ?? 20) * plump) * 2) / 2;
      const shrink = (size / 100) * (1 - u * 0.2);
      ctx.scale(shrink, shrink);
      paint(
        once(`pad${level}:${w}:${h}`, () => brickLayer(level, w, h)),
        null,
      );
    } else {
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.arc(0, 0, b.r * size, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  }

  // Fuzzballs on their way to the bar, wisps in flight, a burr hopping across.
  ghosts = ghosts.filter((g) => {
    if (now < g.t0) return true;
    const u = Math.min(1, (now - g.t0) / g.d);
    const e = ease.inOut(u);
    const nx = -(g.y1 - g.y0);
    const ny = g.x1 - g.x0;
    const len = Math.hypot(nx, ny) || 1;
    const arc = Math.sin(e * Math.PI) * g.bend * 0.5;
    g.s.x = g.x0 + (g.x1 - g.x0) * e + (nx / len) * arc;
    g.s.y =
      g.y0 +
      (g.y1 - g.y0) * e +
      (ny / len) * arc -
      Math.sin(e * Math.PI) * 0.35;
    if (g.s.sp !== "wisp" && g.s.t !== "burr") g.s.sx = g.s.sy = 0.9 - 0.45 * e;
    drawSprite(g.s);
    if (u >= 1) g.done();
    return u < 1;
  });
  ctx.restore();
  if (touch.show && touch.down > 0.01) {
    ctx.globalAlpha = touch.down * 0.55;
    ctx.fillStyle = colorOf(palette, null, "text");
    ctx.beginPath();
    ctx.arc(touch.x, touch.y, size * 0.26, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/**
 * Moves the loose bits on.
 * @param {number} dt Milliseconds of the wall's clock.
 */
function drift(dt) {
  const s = (dt / 1000) * speed();
  for (const b of bits) {
    b.age += dt * speed();
    b.x += b.vx * s;
    b.y += b.vy * s;
    if (b.kind === "tuft") {
      // Fluff is light: it slows fast and drifts down, swaying.
      b.vx *= 1 - 3.2 * s;
      b.vy = b.vy * (1 - 3.2 * s) + 1.1 * s;
      b.x += Math.sin(b.age / 90 + b.rot) * 0.2 * s;
    } else b.vy += 9 * s;
    b.rot += b.spin * s;
  }
  bits = bits.filter((b) => b.age < b.life);
}

// ---------------------------------------------------------------- the bar and the cards

/**
 * Returns a small picture as an inline SVG.
 * @param {import('../../art/fuzz.mjs').Shape[]} shapes
 * @param {string | null} kind
 * @param {number} px
 */
function icon(shapes, kind, px) {
  const body2 = shapes
    .map((s) => {
      const c = colorOf(palette, /** @type {KindId | null} */ (kind), s.c);
      const o = s.o === undefined ? "" : ` opacity="${s.o}"`;
      if (s.k === "circle")
        return `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${c}"${o}/>`;
      if (s.k === "ellipse")
        return `<ellipse cx="${s.x}" cy="${s.y}" rx="${s.rx}" ry="${s.ry}" fill="${c}"${o}/>`;
      if (s.k === "stroke")
        return `<path d="${s.d}" fill="none" stroke="${c}" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round"${o}/>`;
      return `<path d="${s.d}" fill="${c}"${o}/>`;
    })
    .join("");
  return `<svg width="${px}" height="${px}" viewBox="-50 -50 100 100" aria-hidden="true">${body2}</svg>`;
}

/**
 * Returns the picture a goal is shown by.
 * @param {State['goals'][number]} g
 * @param {number} px
 * @returns {string}
 */
function goalIcon(g, px) {
  if (g.type === "gather") {
    const kind = level.kinds[g.kind];
    const [, sy] = seat(/** @type {KindId} */ (kind));
    return icon(
      [...fur(/** @type {KindId} */ (kind)), ...body(), ...eyes()],
      kind,
      px,
    ).replace('viewBox="-50 -50 100 100"', `viewBox="-50 ${-50 - sy} 100 100"`);
  }
  if (g.type === "dust") return icon(square(2), null, px);
  if (g.type === "brick") return icon(brick(1), null, px);
  if (g.type === "cage") return icon(cage(), null, px);
  return icon(sleepy(), null, px);
}

/**
 * Draws the bar's goals and moves.
 * @param {number} [bumped] A goal to give a bump.
 */
function drawBar(bumped = -1) {
  const el = $("goals");
  if (el.childElementCount !== state.goals.length) {
    el.innerHTML = state.goals
      .map(
        (g, n) =>
          `<span class="goal" id="goal-${n}">${goalIcon(g, 30)}<b id="count-${n}"></b></span>`,
      )
      .join("");
  }
  state.goals.forEach((g, n) => {
    const count = $(`count-${n}`);
    count.textContent = shown[n] > 0 ? String(shown[n]) : "✓";
    $(`goal-${n}`).classList.toggle("done", shown[n] <= 0);
    if (n === bumped) {
      const goal = $(`goal-${n}`);
      goal.classList.remove("bump");
      void goal.offsetWidth;
      goal.classList.add("bump");
      if (shown[n] === 0) sfx("goal", now, 1, 200);
    }
  });
  $("moves").textContent = String(state.moves);
  $("moves").classList.toggle("low", state.moves <= 5);
  const wind = $("wind");
  wind.hidden = !level.wind;
  if (level.wind) {
    // The arrow turns the short way round, so its angle runs on past a full turn.
    const to = /** @type {number} */ ([0, 270, 180, 90].at(state.rot));
    arrowTurn += ((((to - arrowTurn) % 360) + 540) % 360) - 180;
    wind.style.setProperty("--turn", `${arrowTurn}deg`);
    $("wind-in").textContent = state.gust ? `turns in ${state.gust.wait}` : "";
  }
}

/**
 * Sets the way the wind leans the fur.
 * @param {number} rot The quarter turns the board has made.
 */
function setWind(rot) {
  viewRot = rot;
  const blowing = !!level.wind;
  windLean = blowing
    ? [
        { x: 0, y: 1 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: -1, y: 0 },
      ][rot]
    : { x: 0, y: 0 };
  drawBar();
}

/**
 * Shows a card over the board.
 * @param {string} html
 */
function card(html) {
  $("card").innerHTML = html;
  $("veil").hidden = false;
}

/** Starts a level on its next deal. */
function start(
  /** @type {number} */ id,
  /** @type {boolean} */ sameDeal = false,
) {
  const chosen = levels.find((l) => l.id === id) ?? levels[0];
  if (!sameDeal) attempt++;
  const deals = chosen.deals?.length ? chosen.deals : [1, 2, 3];
  begin(chosen, deals[attempt % deals.length]);
}

/**
 * Starts a level on one deal.
 * @param {(typeof levels)[number]} chosen
 * @param {number} seed
 */
function begin(chosen, seed) {
  level = chosen;
  state = deal(level, seed);
  flying = state.goals.map(() => 0);
  $("goals").innerHTML = "";
  rush = false;
  cols = level.board[0].length;
  rows = level.board.length;
  sprites = new Map();
  bits = [];
  marks = [];
  ghosts = [];
  timers = [];
  tweens = [];
  locked = false;
  queued = null;
  dim = 0;
  layout();
  setWind(state.rot);
  sync();
  // They drop in, a column at a time.
  for (const s of sprites.values()) {
    const y = s.y;
    s.y = y - rows - 1;
    s.falling = true;
    const wait = s.x * 28 + (rows - y) * 16;
    tween(s, { y }, 300, ease.in, now + wait);
    at(now + wait + 300, () => (s.falling = false));
    tween(s, { sy: 0.82, sx: 1.14 }, 60, ease.out, now + wait + 300);
    tween(s, { sy: 1, sx: 1 }, 220, ease.spring, now + wait + 360);
  }
  $("level").textContent = level.id > 0 ? `Level ${level.id}` : "";
  $("name").textContent = level.name;
  $("line").textContent = level.brings
    ? (LINES[/** @type {keyof typeof LINES} */ (level.brings)] ?? "")
    : "";
  $("veil").hidden = true;
  lastMove = now + 900;
  hintOff();
  if (level.hint) at(now + 1100, () => showHint(level.hint));
}

/** Plays the spare moves' flourish, then shows the stars. */
function win() {
  locked = true;
  sfx("win", now + 150);
  cheer(4);
  const spare = state.moves;
  const stars =
    1 +
    (spare >= (level.stars?.[1] ?? 99) ? 1 : 0) +
    (spare >= (level.stars?.[2] ?? 99) ? 1 : 0);
  const space = spaceOf(state.w, state.h, state.rot);
  const runs = encore(state, true);
  let t = now + 900;
  let left = spare;
  for (const steps of runs) {
    const first = steps[0]?.blasts[0];
    const s = first ? sprites.get(first.id) : null;
    sfx("encore", t);
    const count = --left;
    at(t, () => {
      $("moves").textContent = String(count);
      if (!s || !first) return;
      // A spare move gives a fuzzball a special's fur, and it goes off.
      s.sp = first.what;
      s.auraIn = 0;
      s.eye = "wide";
      tween(s, { auraIn: 1 }, 200, ease.back);
      glow(s, 0.8, 220);
    });
    t += 230;
    for (const step of steps) t = playStep(step, t, space);
  }
  at(t + 200, () => {
    sync();
    const marks2 = [1, 2, 3]
      .map((n) => `<span class="star ${n <= stars ? "on" : ""}">★</span>`)
      .join("");
    card(
      `<h2>Level ${level.id} cleared!</h2><p class="stars">${marks2}</p><p>${spare} ${spare === 1 ? "move" : "moves"} to spare.</p><p><button data-do="next">Next level</button> <button data-do="again">Play again</button></p>`,
    );
    for (let n = 1; n <= stars; n++) sfx(`star-${n}`, now + 200 + n * 340);
  });
}

/** Shows the card for a level lost. */
function lose() {
  locked = true;
  sfx("lose", now + 100);
  at(now + 500, () =>
    card(
      `<h2>Out of moves</h2><p>${state.goals
        .map((g, n) =>
          shown[n] > 0 ? `${goalIcon(g, 26)} ${shown[n]} left` : "",
        )
        .filter(Boolean)
        .join(
          " &nbsp; ",
        )}</p><p><button data-do="again">Try again</button> <button data-do="levels">Choose a level</button></p>`,
    ),
  );
}

/** Shows the list of levels. */
function chooser() {
  card(
    `<h2>Choose a level</h2>${SETS.map(
      (set, n) =>
        `<h3>${set.name}</h3><p class="grid">${levels
          .filter((l) => l.set === set.id)
          .map(
            (l) =>
              `<button data-level="${l.id}" title="${l.name}">${l.id}</button>`,
          )
          .join("")}</p>`,
    ).join("")}<p><button data-do="close">Close</button></p>`,
  );
}

// ---------------------------------------------------------------- hints, glances and input

const keys = { on: false, x: 0, y: 0, held: false };
let picked = -1;
/** @type {{ x: number, y: number, id: number } | null} */
let drag = null;
/** Where the screen is touched, which a capture draws. */
const touch = { show: false, x: 0, y: 0, down: 0 };

/** Stops the hint's hopping. */
function hintOff() {
  $("hand").hidden = true;
}

/**
 * Shows a move worth making: its fuzzballs hop, twice.
 * @param {number[][] | undefined} [move] A level's own first move, in the screen's squares.
 */
function showHint(move) {
  if (locked) return;
  let a = -1;
  let b = -1;
  if (move) {
    a = engineAt(move[0][0], move[0][1]);
    b = engineAt(move[1][0], move[1][1]);
  } else {
    let best = -1;
    for (const m of legalMoves(state)) {
      const pa = state.piece[m.a];
      const pb = state.piece[m.b];
      state.piece[m.a] = pb;
      state.piece[m.b] = pa;
      const worth =
        findBunches(state, m.a, m.b).reduce(
          (sum, bunch) => sum + bunch.cells.length + (bunch.makes ? 3 : 0),
          0,
        ) + (pa?.sp || pb?.sp ? 2 : 0);
      state.piece[m.a] = pa;
      state.piece[m.b] = pb;
      if (worth > best) {
        best = worth;
        a = m.a;
        b = m.b;
      }
    }
  }
  if (a < 0 || b < 0) return;
  sfx("hint");
  const map = here();
  for (const [i, other] of [
    [a, b],
    [b, a],
  ]) {
    const p = state.piece[i];
    const s = p ? sprites.get(p.id) : null;
    if (!s) continue;
    const to = map(other);
    s.lx = to.x - s.x;
    s.ly = to.y - s.y;
    for (const wait of [0, 260]) {
      tween(s, { sy: 1.16, sx: 0.9 }, 90, ease.out, now + wait);
      tween(s, { sy: 1, sx: 1 }, 170, ease.spring, now + wait + 90);
    }
    at(now + 900, () => Object.assign(s, { lx: 0, ly: 0 }));
  }
  if (move) {
    const hand = $("hand");
    const pa = map(a);
    const pb = map(b);
    hand.hidden = false;
    hand.style.setProperty("--x0", `${ox + (pa.x + 0.5) * size}px`);
    hand.style.setProperty("--y0", `${oy + (pa.y + 0.5) * size}px`);
    hand.style.setProperty("--x1", `${ox + (pb.x + 0.5) * size}px`);
    hand.style.setProperty("--y1", `${oy + (pb.y + 0.5) * size}px`);
  }
  lastMove = now;
}

/**
 * Picks a square's fuzzball up, or puts down the one held.
 * @param {number} i The engine's square, or -1.
 */
function select(i) {
  const old =
    picked >= 0 && state.piece[picked]
      ? sprites.get(/** @type {Piece} */ (state.piece[picked]).id)
      : null;
  if (old) {
    tween(old, { sx: 1, sy: 1 }, 160, ease.spring);
    old.z = 0;
  }
  for (const s of sprites.values())
    if (s.eye === "open") Object.assign(s, { lx: 0, ly: 0 });
  picked = i;
  if (i < 0) return;
  const p = state.piece[i];
  const s = p ? sprites.get(p.id) : null;
  if (!s) return;
  sfx("pick");
  s.z = 1;
  tween(s, { sx: 1.14, sy: 1.14 }, 120, ease.back);
  // Those it could bunch with look its way.
  const map = here();
  const w = state.w;
  for (const j of [i - 1, i + 1, i - w, i + w]) {
    if (
      j < 0 ||
      j >= state.piece.length ||
      (Math.abs(j - i) === 1 && Math.floor(j / w) !== Math.floor(i / w))
    )
      continue;
    if (!canSwap(state, j) || !swapWorks(state, i, j)) continue;
    const pj = state.piece[j];
    state.piece[i] = pj;
    state.piece[j] = p;
    for (const bunch of findBunches(state, i, j)) {
      for (const cell of bunch.cells) {
        const q = state.piece[cell];
        const other = q && q !== p ? sprites.get(q.id) : null;
        if (!other) continue;
        const from = map(cell === i ? j : cell);
        other.lx = Math.max(-1, Math.min(1, s.x - from.x));
        other.ly = Math.max(-1, Math.min(1, s.y - from.y));
      }
    }
    state.piece[i] = p;
    state.piece[j] = pj;
  }
}

/**
 * Returns the screen's square under a pointer.
 * @param {PointerEvent} e
 * @returns {{ x: number, y: number }}
 */
function squareAt(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.floor((e.clientX - rect.left - ox) / size),
    y: Math.floor((e.clientY - rect.top - oy) / size),
  };
}

canvas.addEventListener("pointerdown", (e) => {
  wakeSound();
  keys.on = false;
  Object.assign(touch, { x: e.offsetX, y: e.offsetY, down: 1 });
  // A tap hurries the level's last flourish along.
  if (state.won) rush = true;
  const at2 = squareAt(e);
  const i =
    at2.x >= 0 && at2.x < cols && at2.y >= 0 && at2.y < rows
      ? engineAt(at2.x, at2.y)
      : -1;
  if (i < 0 || !$("veil").hidden) return select(-1);
  canvas.setPointerCapture(e.pointerId);
  if (picked >= 0 && picked !== i) {
    const a = here()(picked);
    if (Math.abs(a.x - at2.x) + Math.abs(a.y - at2.y) === 1)
      return trySwap(picked, i);
  } else if (picked === i) return trySwap(i, i);
  if (!canSwap(state, i)) return select(-1);
  select(i);
  drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
});
canvas.addEventListener("pointermove", (e) => {
  Object.assign(touch, { x: e.offsetX, y: e.offsetY });
  if (!drag || drag.id !== e.pointerId || picked < 0) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  // A swipe is read once it is 0.4 of a square long, along whichever way it leans most.
  if (Math.max(Math.abs(dx), Math.abs(dy)) < size * 0.4) return;
  const from = here()(picked);
  const to =
    Math.abs(dx) > Math.abs(dy)
      ? { x: from.x + Math.sign(dx), y: from.y }
      : { x: from.x, y: from.y + Math.sign(dy) };
  drag = null;
  const j =
    to.x >= 0 && to.x < cols && to.y >= 0 && to.y < rows
      ? engineAt(to.x, to.y)
      : -1;
  if (j >= 0) trySwap(picked, j);
  else select(-1);
});
canvas.addEventListener("pointerup", () => {
  drag = null;
  tween(touch, { down: 0 }, 160, ease.out);
});

addEventListener("keydown", (e) => {
  wakeSound();
  const step = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }[e.key];
  if (step) {
    e.preventDefault();
    const nx = Math.max(0, Math.min(cols - 1, keys.x + step[0]));
    const ny = Math.max(0, Math.min(rows - 1, keys.y + step[1]));
    if (keys.held && picked >= 0) {
      const j = engineAt(nx, ny);
      keys.held = false;
      if (j >= 0 && j !== picked) trySwap(picked, j);
      else select(-1);
    } else Object.assign(keys, { x: nx, y: ny });
    keys.on = true;
  } else if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    if (!$("veil").hidden) return;
    const i = engineAt(keys.x, keys.y);
    if (keys.held && picked === i) {
      keys.held = false;
      trySwap(i, i);
    } else if (i >= 0 && canSwap(state, i)) {
      select(i);
      keys.held = true;
    }
    keys.on = true;
  } else if (e.key === "Escape") {
    keys.held = false;
    select(-1);
  } else if (e.key === "h" || e.key === "H") showHint();
});

document.addEventListener("click", (e) => {
  wakeSound();
  const el = /** @type {HTMLElement} */ (e.target).closest("button");
  if (!el) return;
  sfx("button");
  const act = el.dataset.do;
  if (el.dataset.level) start(Number(el.dataset.level));
  else if (act === "levels") chooser();
  else if (act === "close") $("veil").hidden = true;
  else if (act === "next") start(level.id < levels.length ? level.id + 1 : 1);
  else if (act === "again") start(level.id);
  else if (act === "restart") start(level.id, true);
  else if (act === "hint") showHint();
  else if (act === "sound") settings.sound = !settings.sound;
  else if (act === "fast") settings.fast = !settings.fast;
  else if (act === "calm") settings.calm = !settings.calm;
  else if (act === "light") {
    settings.light = !settings.light;
    palette = settings.light ? PALETTES.light : PALETTES.dark;
    cache.clear();
    document.body.classList.toggle("light", settings.light);
    $("goals").innerHTML = "";
    drawBar();
  }
  showSettings();
});

/** Marks each setting's button as pressed or not. */
function showSettings() {
  for (const key of /** @type {const} */ (["sound", "fast", "calm", "light"])) {
    document
      .querySelector(`[data-do="${key}"]`)
      ?.setAttribute("aria-pressed", String(settings[key]));
  }
}
showSettings();

/** Fits the board to the page. */
function layout() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * devicePixelRatio);
  canvas.height = Math.round(h * devicePixelRatio);
  size = Math.floor(Math.min((w - 12) / cols, (h - 24) / (rows + 0.4)));
  ox = Math.round((w - size * cols) / 2);
  oy = Math.round((h - size * (rows + 0.3)) / 2);
}
addEventListener("resize", layout);

let lastFrame = performance.now();
/** Whether the clock waits to be stepped by hand, which a capture does. */
let held = false;
/**
 * Runs a frame.
 * @param {number} time The page's clock, in ms.
 */
function frame(time) {
  const dt = held ? 0 : Math.min(50, time - lastFrame);
  lastFrame = time;
  tick(dt);
  drift(dt);
  if (!locked && $("veil").hidden && now - lastMove > 7000 && !level.hint)
    showHint();
  draw();
  requestAnimationFrame(frame);
}

// Whatever a test wants to see or do.
Object.assign(globalThis, {
  fuzzFlux: {
    start,
    begin,
    trySwap,
    listen: () => (heard = []),
    sprites: () => [...sprites.values()].filter((sprite) => !sprite.gone),
    showTouches: () => (touch.show = true),
    skip: (/** @type {number} */ a, /** @type {number} */ b) => {
      play(state, a, b);
      setWind(state.rot);
      sync();
    },
    where: (/** @type {number} */ x, /** @type {number} */ y) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + ox + (x + 0.5) * size,
        y: rect.top + oy + (y + 0.5) * size,
        size,
        left: rect.left + ox,
        top: rect.top + oy,
        cols,
        rows,
      };
    },
    heard: () => heard,
    now: () => now,
    levels,
    state: () => state,
    legal: () => legalMoves(state),
    busy: () => locked,
    settings,
    hold: (/** @type {boolean} */ on) => (held = on),
    step: (/** @type {number} */ ms) => {
      for (let left = ms; left > 0; left -= 8) {
        tick(Math.min(8, left));
        drift(Math.min(8, left));
      }
      draw();
    },
  },
});

start(Number(new URLSearchParams(location.search).get("level")) || 1, true);
requestAnimationFrame(frame);
