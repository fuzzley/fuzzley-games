// The page the uplift's sounds are heard on. It plays the takes the build
// wrote, as the plan would have the game play them (takes in turn, a little
// variation, panned by place, the small sounds ducked under the big, a
// limiter on it all), beside the sprite the game ships today.

import { CHAIN_CENTS } from "/sound/lib/music.mjs";

/** @typedef {{ family: string, about: string, level: string, loop: boolean, seconds: number, plays: string[], files: string[] }} Sound */
/** @typedef {{ t: number, s: string, detune?: number, pan?: number, gain?: number, loopFor?: number }} Cue */
/** @typedef {{ id: string, title: string, about: string, old: Cue[], new: Cue[] }} Scene */

const NOTES_KEY = "asteroid-breaker-uplift-audition-notes";

/**
 * What a sound of the uplift's can be marked, by the word kept for it. A
 * sound is good as it is until it is marked otherwise, so only what needs
 * work, or should go, needs a hand: the idea is right but the sound isn't
 * yet, or the game should go without this sound.
 *
 * @type {Record<string, string>}
 */
const MARKS = {
  keep: "good: use it",
  change: "needs work",
  drop: "don't use it",
};

/** The mark a sound has until it is given another. */
const GOOD = "keep";

/** The families whose sounds are tuned, so no play of them is detuned at random. */
const TUNED = new Set(["chain", "pickups", "stingers", "voice", "rescue", "beds"]);

/** The levels the plan varies and ducks: what is heard many times a second. */
const SMALL = new Set(["tick", "small"]);

const $ = (/** @type {string} */ id) =>
  /** @type {HTMLElement} */ (document.getElementById(id));
const checked = (/** @type {string} */ id) =>
  /** @type {HTMLInputElement} */ ($(id)).checked;

/** @type {Record<string, Sound>} */
let sounds = {};
/** @type {Record<string, { start: number, end: number, loop: boolean }>} */
let today = {};

/** @type {AudioContext | undefined} */
let context;
/** @type {{ quiet: GainNode, main: GainNode, volume: GainNode, limiter: DynamicsCompressorNode, phone: AudioNode[] } | undefined} */
let desk;
/** @type {Map<string, Promise<AudioBuffer>>} */
const buffers = new Map();
/** @type {Map<string, number>} */
const turns = new Map();
/** @type {Set<AudioScheduledSourceNode>} */
const playing = new Set();

/**
 * Returns the audio context and its desk, made at the first press: two
 * buses, the small sounds' and the rest's, a volume, what makes a phone's
 * speaker of it, and a limiter.
 */
function audio() {
  if (!context) {
    context = new AudioContext();
    const quiet = context.createGain();
    const main = context.createGain();
    const volume = context.createGain();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;
    // A phone's speaker: nothing much under 300 Hz, a lift near 5 kHz.
    const low1 = context.createBiquadFilter();
    low1.type = "highpass";
    low1.frequency.value = 300;
    const low2 = context.createBiquadFilter();
    low2.type = "highpass";
    low2.frequency.value = 300;
    const lift = context.createBiquadFilter();
    lift.type = "peaking";
    lift.frequency.value = 5000;
    lift.gain.value = 4;
    const top = context.createBiquadFilter();
    top.type = "lowpass";
    top.frequency.value = 10000;
    quiet.connect(volume);
    main.connect(volume);
    desk = { quiet, main, volume, limiter, phone: [low1, low2, lift, top] };
    wire();
  }
  void context.resume();
  return { context, desk: /** @type {NonNullable<typeof desk>} */ (desk) };
}

/** Wires the desk as the switches say. */
function wire() {
  if (!context || !desk) return;
  const { volume, limiter, phone } = desk;
  for (const node of [volume, limiter, ...phone]) node.disconnect();
  /** @type {AudioNode[]} */
  const line = [volume];
  if (checked("phone")) line.push(...phone);
  if (checked("limit")) line.push(limiter);
  line.push(context.destination);
  line.forEach((node, i) => {
    const next = line[i + 1];
    if (next) node.connect(next);
  });
  volume.gain.value = Number(/** @type {HTMLInputElement} */ ($("volume")).value);
}

/**
 * Returns a file's audio, decoded once.
 *
 * @param {string} url
 * @returns {Promise<AudioBuffer>}
 */
function buffer(url) {
  let loading = buffers.get(url);
  if (!loading) {
    loading = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`${url}: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => audio().context.decodeAudioData(data));
    buffers.set(url, loading);
  }
  return loading;
}

/**
 * Returns the next take of a sound, in turn, never the same twice running.
 *
 * @param {string} name
 * @param {number} [take] A take asked for by its number.
 * @returns {string | null} Its file's address, or null for a sound not built.
 */
function fileOf(name, take) {
  const sound = sounds[name];
  if (!sound) return null;
  const turn = take ?? ((turns.get(name) ?? -1) + 1) % sound.files.length;
  turns.set(name, turn);
  return `/assets/sound/${sound.files[turn]}`;
}

/**
 * Plays one of the uplift's sounds, as the plan has the game play it.
 *
 * @param {Cue} cue
 * @param {number} at The context's time to play it at.
 * @param {number} [take]
 * @returns {Promise<void>}
 */
async function playNew(cue, at, take) {
  const sound = sounds[cue.s];
  const url = fileOf(cue.s, take);
  if (!sound || !url) return;
  const { context: ctx, desk: d } = audio();
  const source = ctx.createBufferSource();
  source.buffer = await buffer(url);
  const vary = checked("vary") && SMALL.has(sound.level);
  source.detune.value =
    (cue.detune ?? 0) +
    (vary && !TUNED.has(sound.family) ? (Math.random() * 2 - 1) * 40 : 0);
  const level = ctx.createGain();
  level.gain.value =
    (cue.gain ?? 1) * (vary ? 10 ** (((Math.random() * 2 - 1) * 1.5) / 20) : 1);
  const place = ctx.createStereoPanner();
  place.pan.value = checked("pan") ? (cue.pan ?? 0) * 0.6 : 0;
  source.connect(level).connect(place).connect(SMALL.has(sound.level) ? d.quiet : d.main);
  const when = Math.max(at, ctx.currentTime);
  if (cue.loopFor !== undefined) {
    source.loop = true;
    level.gain.setValueAtTime(level.gain.value, when + cue.loopFor - 0.05);
    level.gain.linearRampToValueAtTime(0, when + cue.loopFor);
    source.start(when);
    source.stop(when + cue.loopFor);
  } else {
    source.start(when);
  }
  if (sound.level === "huge" && checked("duck")) {
    d.quiet.gain.setValueAtTime(1, when);
    d.quiet.gain.linearRampToValueAtTime(0.5, when + 0.02);
    d.quiet.gain.setValueAtTime(0.5, when + 0.25);
    d.quiet.gain.linearRampToValueAtTime(1, when + 0.4);
  }
  playing.add(source);
  source.onended = () => playing.delete(source);
}

/**
 * Plays one of today's sounds from the game's sprite, as the game does: no
 * takes, no variation, no place.
 *
 * @param {Cue} cue
 * @param {number} at
 * @returns {Promise<void>}
 */
async function playOld(cue, at) {
  const entry = today[cue.s];
  if (!entry) return;
  const { context: ctx, desk: d } = audio();
  const source = ctx.createBufferSource();
  source.buffer = await buffer("/today/sounds.wav");
  source.detune.value = cue.detune ?? 0;
  source.connect(d.main);
  const when = Math.max(at, ctx.currentTime);
  if (cue.loopFor !== undefined) {
    source.loop = true;
    source.loopStart = entry.start;
    source.loopEnd = entry.end;
    source.start(when, entry.start);
    source.stop(when + cue.loopFor);
  } else {
    source.start(when, entry.start, entry.end - entry.start);
  }
  playing.add(source);
  source.onended = () => playing.delete(source);
}

/** Stops everything that plays. */
function stopAll() {
  for (const source of playing) {
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
  }
  playing.clear();
  for (const button of document.querySelectorAll("button[aria-pressed='true']")) {
    button.setAttribute("aria-pressed", "false");
  }
  beds.clear();
}

/**
 * Plays a scene's cues, once their sounds are loaded.
 *
 * @param {Cue[]} cues
 * @param {boolean} old Whether they are today's.
 * @param {number} [after] Seconds from now to start.
 * @returns {Promise<number>} How long the cues run.
 */
async function playCues(cues, old, after = 0.12) {
  audio();
  await Promise.all(
    cues.map((cue) => {
      const url = old ? "/today/sounds.wav" : fileOf(cue.s, 0);
      return url ? buffer(url).catch(() => undefined) : undefined;
    }),
  );
  const start = audio().context.currentTime + after;
  for (const cue of cues) void (old ? playOld(cue, start + cue.t) : playNew(cue, start + cue.t));
  return Math.max(0, ...cues.map((cue) => cue.t + (cue.loopFor ?? 1))) + after;
}

// --- The scenes -----------------------------------------------------------

/** Returns evenly spaced cues of one sound. */
const burst = (
  /** @type {string} */ s,
  /** @type {number} */ count,
  /** @type {number} */ every,
  /** @type {number} */ from = 0,
  /** @type {Partial<Cue>} */ more = {},
) => Array.from({ length: count }, (_, i) => ({ t: from + i * every, s, ...more }));

/** A chain of stone breaks: when each comes, its size and where on the field. */
const CHAIN = [
  [0.0, "large", -0.6],
  [0.35, "medium", -0.4],
  [0.6, "medium", -0.2],
  [0.95, "small", -0.3],
  [1.15, "small", 0.0],
  [1.4, "small", 0.1],
  [1.75, "medium", 0.3],
  [2.0, "small", 0.4],
  [2.2, "small", 0.5],
  [2.55, "large", 0.2],
  [2.9, "medium", 0.0],
  [3.15, "small", -0.2],
  [3.4, "small", -0.5],
  [3.75, "small", -0.7],
];

/** @type {Scene[]} */
const SCENES = [
  {
    id: "gun",
    title: "The gun, three seconds",
    about: "Seven shots a second. Today it is one sample each time; the uplift takes five in turn and ends the burst with a tail.",
    old: burst("fired", 21, 0.143),
    new: [...burst("shot-gun", 21, 0.143), { t: 3.02, s: "shot-tail" }],
  },
  {
    id: "weapons",
    title: "Rapid, Spread and Lance",
    about: "Each weapon has a shot of its own. Today all three are the gun's tick.",
    old: [...burst("fired", 18, 0.07), ...burst("fired", 9, 0.143, 1.6), ...burst("fired", 7, 0.143, 3.2)],
    new: [...burst("shot-rapid", 18, 0.07), ...burst("shot-spread", 9, 0.143, 1.6), ...burst("shot-lance", 7, 0.143, 3.2)],
  },
  {
    id: "chain",
    title: "A chain of stone",
    about: "Fourteen breaks in four seconds. Today each is a semitone higher, to the eighth. The uplift lays a bell under each break that climbs the scale, runs the sparks up it, and chimes as the multiplier steps.",
    old: CHAIN.map(([t, size], i) => ({ t: Number(t), s: String(size), detune: Math.min(i * 100, 700) })),
    new: CHAIN.flatMap(([t, size, pan], i) => [
      { t: Number(t), s: `break-stone-${size}`, pan: Number(pan) },
      { t: Number(t) + 0.02, s: "chain-ping", detune: CHAIN_CENTS[Math.min(i, CHAIN_CENTS.length - 1)], pan: Number(pan) },
      { t: Number(t) + 0.22, s: "spark", detune: CHAIN_CENTS[Math.min(i, CHAIN_CENTS.length - 1)] - 1200, pan: Number(pan) * 0.5 },
      ...(size === "small" ? [] : [{ t: Number(t) + 0.3, s: "spark", detune: (CHAIN_CENTS[Math.min(i, CHAIN_CENTS.length - 1)] ?? 0) - 1000 }]),
      ...(i === 4 ? [{ t: Number(t) + 0.05, s: "chain-x2" }] : []),
      ...(i === 9 ? [{ t: Number(t) + 0.05, s: "chain-x3" }] : []),
    ]),
  },
  {
    id: "materials",
    title: "Five materials",
    about: "A large rock of each: stone, ice, crystal, iron (two hits ring off first), lodestone. Today four of the five are one thump.",
    old: [
      { t: 0, s: "large" },
      { t: 0.9, s: "large" },
      { t: 1.8, s: "large" },
      { t: 2.7, s: "rung" },
      { t: 3.1, s: "rung" },
      { t: 3.5, s: "large" },
      { t: 4.6, s: "large" },
    ],
    new: [
      { t: 0, s: "break-stone-large", pan: -0.5 },
      { t: 0.9, s: "break-ice-large", pan: -0.2 },
      { t: 1.8, s: "break-crystal-large", pan: 0 },
      { t: 2.7, s: "hit-iron", pan: 0.3 },
      { t: 3.1, s: "hit-iron", pan: 0.3 },
      { t: 3.5, s: "break-iron-large", pan: 0.3 },
      { t: 4.6, s: "break-lodestone-large", pan: 0.6 },
    ],
  },
  {
    id: "sizes",
    title: "Large, medium, small",
    about: "One stone broken down: a large rock, its two medium pieces, their four small ones.",
    old: [{ t: 0, s: "large" }, { t: 0.5, s: "medium" }, { t: 0.75, s: "medium" }, ...burst("small", 4, 0.2, 1.2)],
    new: [
      { t: 0, s: "break-stone-large" },
      { t: 0.5, s: "break-stone-medium", pan: -0.3 },
      { t: 0.75, s: "break-stone-medium", pan: 0.3 },
      ...burst("break-stone-small", 4, 0.2, 1.2),
    ],
  },
  {
    id: "blast",
    title: "A volatile chain",
    about: "Four volatile rocks set each other off, 90 ms apart, and the stones round them break.",
    old: [...burst("blast", 4, 0.09, 0.1), ...burst("medium", 3, 0.11, 0.25), ...burst("small", 4, 0.09, 0.5)],
    new: [
      { t: 0, s: "fuse-volatile" },
      { t: 0.1, s: "blast-volatile", pan: -0.3 },
      { t: 0.19, s: "blast-volatile-small", pan: 0 },
      { t: 0.28, s: "blast-volatile", pan: 0.3 },
      { t: 0.37, s: "blast-volatile-small", pan: 0.5 },
      { t: 0.3, s: "break-cluster" },
      ...burst("break-stone-medium", 2, 0.13, 0.3),
    ],
  },
  {
    id: "boulder",
    title: "The boulder",
    about: "Five hits held, then the sixth breaks it. Today all six are a large rock's thump.",
    old: burst("large", 6, 0.5),
    new: [...burst("hit-boulder", 5, 0.5), { t: 2.5, s: "break-boulder" }, { t: 4.3, s: "sector-clear" }, { t: 4.4, s: "voice-cheer" }],
  },
  {
    id: "zap",
    title: "A dash, a near miss, a zap",
    about: "A dash, with the fuzzball's whee. A rock passes close. Static fills, and the next dash is a zap that arcs to six rocks. Today a dash has one whoosh, and the Nova pickup's ring is the blast.",
    old: [{ t: 0, s: "dashed" }, { t: 3.4, s: "dashed" }, { t: 3.45, s: "blast" }],
    new: [
      { t: 0, s: "dash" },
      { t: 0.02, s: "voice-whee" },
      { t: 1.3, s: "near-miss", pan: 0.4 },
      { t: 1.36, s: "voice-eep" },
      { t: 2.3, s: "static-full" },
      { t: 3.4, s: "zap-dash" },
      ...Array.from({ length: 6 }, (_, i) => ({ t: 3.46 + i * 0.05, s: "zap-arc", pan: (i - 2.5) / 3 })),
      ...burst("break-stone-medium", 3, 0.07, 3.55),
      { t: 3.6, s: "break-ice-small" },
      { t: 5.9, s: "dash-ready" },
    ],
  },
  {
    id: "crew",
    title: "A hit, and two rescues",
    about: "The pod is hit and a fuzzball is knocked loose, then caught again. A stray drifts in and is caught. Today a hit is a ship lost, and a stray brought home is two notes.",
    old: [{ t: 0, s: "lost" }, { t: 5.2, s: "home" }],
    new: [
      { t: 0, s: "pod-hit" },
      { t: 0.04, s: "crew-loose" },
      { t: 0.1, s: "voice-ouch" },
      { t: 1.9, s: "crew-caught" },
      { t: 2.0, s: "voice-yay" },
      { t: 3.6, s: "stray-appear", pan: 0.7 },
      { t: 3.9, s: "voice-ooh", pan: 0.7 },
      { t: 5.2, s: "stray-catch" },
      { t: 5.3, s: "voice-yay" },
      { t: 6.4, s: "tow-twang" },
    ],
  },
  {
    id: "comet",
    title: "The comet",
    about: "Its warning, its crossing, and two rocks it smashes. Today the comet itself makes no sound.",
    old: [{ t: 0, s: "warned" }, { t: 2.1, s: "large" }, { t: 2.4, s: "medium" }],
    new: [
      { t: 0, s: "comet-warning", pan: -0.8 },
      { t: 1.5, s: "comet-pass" },
      { t: 2.1, s: "comet-smash", pan: 0 },
      { t: 2.4, s: "comet-smash", pan: 0.5 },
    ],
  },
  {
    id: "pickups",
    title: "Six pickups",
    about: "One drops and is caught, then each of the six is caught in turn, and an effect runs out. Today every catch is the same two notes.",
    old: [...burst("caught", 7, 0.9, 0.6)],
    new: [
      { t: 0, s: "pickup-drop" },
      { t: 0.6, s: "pickup-spread" },
      { t: 1.5, s: "pickup-rapid" },
      { t: 2.4, s: "pickup-lance" },
      { t: 3.3, s: "pickup-shield" },
      { t: 4.2, s: "pickup-magnet" },
      { t: 5.1, s: "pickup-slow" },
      { t: 6.2, s: "effect-end" },
      { t: 7.0, s: "pickup-fade" },
    ],
  },
  {
    id: "shield",
    title: "The Shield, a burr, the field slowed",
    about: "A Shield forms and is spent. A burr clings and a dash sheds it. Slow bends the field down and back.",
    old: [{ t: 0.6, s: "rung" }, { t: 2.4, s: "dashed" }],
    new: [
      { t: 0, s: "shield-up" },
      { t: 0.6, s: "shield-break" },
      { t: 1.6, s: "burr-cling" },
      { t: 1.9, s: "burr-cling" },
      { t: 2.4, s: "dash" },
      { t: 2.45, s: "burr-shed" },
      { t: 3.4, s: "slow-on" },
      { t: 5.0, s: "slow-off" },
    ],
  },
  {
    id: "wave",
    title: "A wave, start to end",
    about: "The first move, the engine held for two seconds, shots and breaks, the last rock, the tally counting up and the crew cheering.",
    old: [
      { t: 0.1, s: "thrust", loopFor: 2 },
      ...burst("fired", 14, 0.143, 0.6),
      { t: 1.0, s: "large" },
      { t: 1.5, s: "medium" },
      { t: 1.8, s: "small" },
      { t: 2.3, s: "small" },
      { t: 2.9, s: "cleared" },
    ],
    new: [
      { t: 0, s: "wave-start" },
      { t: 0.1, s: "thrust-start" },
      { t: 0.1, s: "thrust", loopFor: 2 },
      { t: 2.1, s: "thrust-stop" },
      ...burst("shot-gun", 14, 0.143, 0.6),
      { t: 1.0, s: "break-stone-large", pan: 0.4 },
      { t: 1.5, s: "break-stone-medium", pan: 0.2 },
      { t: 1.8, s: "break-stone-small", pan: 0.1 },
      { t: 2.3, s: "break-stone-small", pan: -0.2 },
      { t: 2.9, s: "wave-clear" },
      { t: 3.0, s: "voice-cheer" },
      ...Array.from({ length: 16 }, (_, i) => ({ t: 4.2 + i * 0.06, s: "tally-tick", detune: i * 50 })),
    ],
  },
  {
    id: "end",
    title: "The run ends, and a new best",
    about: "The pod is lost with no one in tow, and everyone floats home. Then what a new best would add.",
    old: [{ t: 0, s: "lost" }],
    new: [
      { t: 0, s: "pod-lost" },
      { t: 0.5, s: "voice-aww" },
      { t: 1.1, s: "crew-home" },
      { t: 2.0, s: "run-end" },
      { t: 4.4, s: "new-best" },
    ],
  },
  {
    id: "ui",
    title: "The start, a level, the menus",
    about: "A run begins. The sound held back for a progression system's level. Moving, choosing and going back in a menu, pausing and going on.",
    old: [],
    new: [
      { t: 0, s: "run-start" },
      { t: 0.2, s: "voice-hum" },
      { t: 1.6, s: "level-up" },
      ...burst("ui-move", 3, 0.25, 3.2),
      { t: 4.0, s: "ui-select" },
      { t: 4.5, s: "ui-back" },
      { t: 5.2, s: "pause" },
      { t: 6.0, s: "resume" },
    ],
  },
];

/** The beds, and the layers laid over them, with the gain each loops at. */
const BEDS = ["bed-inner-belt", "bed-iron-reach", "bed-storm", "bed-endless", "bed-pulse", "bed-shimmer"];
/** @type {Map<string, AudioBufferSourceNode>} */
const beds = new Map();

/**
 * Starts a bed's loop, or stops it.
 *
 * @param {string} name
 * @param {HTMLButtonElement} button
 */
async function toggleBed(name, button) {
  const held = beds.get(name);
  if (held) {
    held.stop();
    beds.delete(name);
    button.setAttribute("aria-pressed", "false");
    return;
  }
  const url = fileOf(name, 0);
  if (!url) return;
  const { context: ctx, desk: d } = audio();
  const source = ctx.createBufferSource();
  source.buffer = await buffer(url);
  source.loop = true;
  source.connect(d.main);
  source.start();
  beds.set(name, source);
  playing.add(source);
  button.setAttribute("aria-pressed", "true");
}

// --- The page -------------------------------------------------------------

/**
 * Returns an element.
 *
 * @param {string} tag
 * @param {Record<string, string>} [attributes]
 * @param {(Node | string)[]} [children]
 * @returns {HTMLElement}
 */
function el(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

/** @returns {Record<string, { mark?: string, note?: string }>} */
function readNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Shows the notes kept, as a table in markdown. */
function showNotes() {
  const notes = readNotes();
  const lines = Object.entries(notes)
    .filter(([, { mark, note }]) => (mark && mark !== GOOD) || note)
    .map(([name, { mark, note }]) => `| \`${name}\` | ${MARKS[mark ?? GOOD] ?? mark} | ${note ?? ""} |`);
  $("notes").textContent =
    lines.length === 0
      ? "Every sound is good to use as it is: nothing is marked otherwise, and nothing has a note."
      : [
          "Every sound not listed here is good to use as it is.",
          "",
          "| Sound | Mark | Note |",
          "| --- | --- | --- |",
          ...lines,
        ].join("\n");
}

/**
 * Keeps a mark or a note against a name.
 *
 * @param {string} name
 * @param {"mark" | "note"} what
 * @param {string} value
 */
function keep(name, what, value) {
  const notes = readNotes();
  notes[name] = { ...notes[name], [what]: value };
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  showNotes();
}

/**
 * Returns the controls a thing is marked with: keep, change or drop, and a
 * note.
 *
 * @param {string} name
 * @returns {HTMLElement[]}
 */
function markers(name) {
  const kept = readNotes()[name] ?? {};
  const mark = /** @type {HTMLSelectElement} */ (
    el("select", { "aria-label": `Mark ${name}` }, [
      ...Object.entries(MARKS).map(([value, label]) => el("option", { value }, [label])),
    ])
  );
  mark.value = kept.mark ?? GOOD;
  mark.classList.toggle("flagged", mark.value !== GOOD);
  mark.addEventListener("change", () => {
    mark.classList.toggle("flagged", mark.value !== GOOD);
    keep(name, "mark", mark.value);
  });
  const note = /** @type {HTMLInputElement} */ (
    el("input", { type: "text", placeholder: "a note", "aria-label": `A note on ${name}` })
  );
  note.value = kept.note ?? "";
  note.addEventListener("change", () => keep(name, "note", note.value));
  return [mark, note];
}

/** Draws the scenes. */
function drawScenes() {
  $("scenes").replaceChildren(
    ...SCENES.map((scene) => {
      const missing = [...new Set(scene.new.map((cue) => cue.s).filter((name) => !sounds[name]))];
      const button = (/** @type {string} */ label, /** @type {() => void} */ press, primary = false) => {
        const b = el("button", { type: "button", ...(primary ? { class: "primary" } : {}) }, [label]);
        b.addEventListener("click", press);
        return b;
      };
      return el("article", { class: "scene" }, [
        el("h3", {}, [scene.title]),
        el("p", {}, [scene.about]),
        el("div", { class: "buttons" }, [
          ...(scene.old.length > 0 ? [button("Today", () => void playCues(scene.old, true))] : []),
          button("Uplift", () => void playCues(scene.new, false), true),
          ...(scene.old.length > 0
            ? [
                button("Today, then uplift", async () => {
                  const length = await playCues(scene.old, true);
                  void playCues(scene.new, false, length + 0.5);
                }),
              ]
            : []),
          ...markers(`scene: ${scene.title}`),
        ]),
        ...(missing.length > 0 ? [el("p", { class: "missing" }, [`Not built yet: ${missing.join(", ")}`])] : []),
      ]);
    }),
  );
}

/** Draws the beds. */
function drawBeds() {
  $("beds").replaceChildren(
    ...BEDS.filter((name) => sounds[name]).map((name) => {
      const button = /** @type {HTMLButtonElement} */ (
        el("button", { type: "button", "aria-pressed": "false" }, ["Play"])
      );
      button.addEventListener("click", () => void toggleBed(name, button));
      return el("article", { class: "bed" }, [
        el("h3", {}, [name]),
        el("p", {}, [sounds[name]?.about ?? ""]),
        el("div", { class: "buttons" }, [button, ...markers(name)]),
      ]);
    }),
  );
}

/** Draws every sound, by family. */
function drawFamilies() {
  /** @type {Map<string, [string, Sound][]>} */
  const families = new Map();
  for (const [name, sound] of Object.entries(sounds)) {
    families.set(sound.family, [...(families.get(sound.family) ?? []), [name, sound]]);
  }
  $("families").replaceChildren(
    ...[...families].flatMap(([family, list]) => [
      el("h3", {}, [`${family} (${list.length})`]),
      el("img", { class: "sheet", src: `/sound/sheets/${family}.png`, alt: `The spectrum of each take of the ${family} family`, loading: "lazy" }),
      el("table", {}, [
        el("thead", {}, [el("tr", {}, ["Sound", "Takes", "Level", "What it is", "Mark", "Note"].map((h) => el("th", {}, [h])))]),
        el(
          "tbody",
          {},
          list.map(([name, sound]) => {
            const [mark, note] = markers(name);
            return el("tr", {}, [
              el("td", { class: "name" }, [name]),
              el(
                "td",
                { class: "takes" },
                sound.files.map((_, take) => {
                  const b = el("button", { type: "button", class: "take", "aria-label": `Play ${name}, take ${take + 1}` }, [`${take + 1}`]);
                  b.addEventListener("click", () =>
                    void playNew({ t: 0, s: name, ...(sound.loop ? { loopFor: sound.seconds * 2 } : {}) }, 0, take),
                  );
                  return b;
                }),
              ),
              el("td", {}, [sound.level]),
              el("td", { class: "about" }, [sound.about]),
              el("td", {}, [/** @type {HTMLElement} */ (mark)]),
              el("td", {}, [/** @type {HTMLElement} */ (note)]),
            ]);
          }),
        ),
      ]),
    ]),
  );
}

for (const id of ["limit", "phone"]) $(id).addEventListener("change", wire);
$("volume").addEventListener("input", wire);
$("stop").addEventListener("click", stopAll);
$("copy").addEventListener("click", () => void navigator.clipboard.writeText($("notes").textContent ?? ""));
$("clear").addEventListener("click", () => {
  localStorage.removeItem(NOTES_KEY);
  showNotes();
  drawScenes();
  drawBeds();
  drawFamilies();
});

const [manifest, sprite] = await Promise.all([
  fetch("/assets/sound/sounds.json").then((response) => response.json()),
  fetch("/today/sounds.json").then((response) => response.json()),
]);
sounds = manifest.sounds;
today = sprite.spritemap;
const takes = Object.values(sounds).reduce((sum, sound) => sum + sound.files.length, 0);
$("status").textContent = `${Object.keys(sounds).length} sounds, ${takes} takes; today's ${Object.keys(today).length}.`;
drawScenes();
drawBeds();
drawFamilies();
showNotes();
