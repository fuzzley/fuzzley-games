// Rickashay's sound lab, which its dev server alone serves, at sound-lab/
// (`@fz/dev/sound-lab`, in vite.config.ts): the sprite the scene will play,
// the rally's eleven notes one after another, and moments of a round played
// as the game plays them, at a flight's pace, each strike on the note its
// rally has reached, to tune the sounds by at the feel gate.

import {
  type LabCue,
  type LabScene,
  type LabSound,
  mountSoundLab,
} from "@fz/dev/sound-lab-page";
import { FLIGHT_RULES, RALLY_MARKS, bounceRally } from "../src/rules/tuning";
import spritemap from "../src/scene/sounds/sounds.json";
import spriteUrl from "../src/scene/sounds/sounds.wav?url";
import {
  RALLY_CENTS,
  SOUNDS,
  type SoundName,
  rallyCentsOf,
} from "../src/view/effects/sounds";

const { bored, hatchHolds, boltTurns } = FLIGHT_RULES;

/** What plays each sound in the game, as `tools/build-sounds.mjs` describes its recipe. */
const PLAYS: Readonly<Record<SoundName, string>> = {
  release: "A shot released.",
  "hot-release": "A hot shot released, after a round whose wall jumped.",
  knock: "The fuzzball turning off a side wall or the ceiling.",
  strike:
    "Each strike, on the note the flight's rally has reached: a step of the five-note scale a strike, C4, D4, E4, G4, A4, C5, D5, E5, G5, A5, then C6 from the eleventh on.",
  break: "A strike that breaks its brick, over the strike's note.",
  clank: "The fuzzball turning off steel.",
  ring: "The fuzzball turning off a ramp.",
  thud: "A hatch holding the fuzzball up.",
  swing: "The hatches swinging open, at the hold that leaves none.",
  spring: "A spring brick breaking, which gives the flight a floor bounce.",
  gem: "A gem struck.",
  portal: "The fuzzball through a portal and out of its twin.",
  plate:
    "A turn off a plated face, or off a lock still shut, where a strike takes nothing.",
  bolt: `A bolt sliding back on every lock, every ${String(boltTurns)} turns of a flight, while a lock is still shut.`,
  unlock: "A lock opening, as its last bolt slides back.",
  earn: "A floor bounce earned, by the rally or a spring brick: a chord on the note the rally has reached, raised as the strike is. Alone, it plays on C4, the first strike's note.",
  spend: "A floor bounce spent: the fuzzball turning off the floor.",
  land: "The fuzzball landing, its flight over.",
  yawn: "A bored fuzzball's yawn, before it drops to the floor.",
  step: "The wall coming down a row.",
  jump: "The wall jumping.",
  danger: "A brick standing over the danger line.",
  chime: "A level cleared.",
  lost: "A level lost.",
  call: 'The "Rickashay!" call, as a flight reaches the level\'s rally mark.',
};

/**
 * A flight's speeds at Normal, in units a second, as the design's "The feel,
 * in numbers" sets them: from the release, then from its strikes at each of
 * `RALLY_MARKS`. The view's playback will hold them; until it does, the lab
 * keeps this copy.
 */
const SPEEDS = [14, 17, 20, 24] as const satisfies readonly number[];

/** How many times its speed a flight flies from its last strike, dashing home, as the design sets it. */
const DASH = 3;

/** How far apart the rally's notes are played in "The rally's notes", in seconds. */
const NOTE_GAP_S = 0.25;

/** The rally mark of the level "The call" is played on, the strike its call comes at. */
const LEVEL_RALLY_MARK = 15;

/** How long a bored fuzzball takes to drop to the floor in "A bored fuzzball", in seconds: a guess, as nothing sets it yet. */
const DROP_S = 0.8;

/** How long a scene waits after the cue before its next shot is released, in seconds, the player aiming meanwhile. */
const AIM_S = 1;

/** The breath between the chime's end and the lost level's sound in "The wall and a level's end", in seconds. */
const LOST_GAP_S = 1;

/** How long the chime lasts, in seconds, as the sprite holds it. */
const CHIME_S = spritemap.spritemap.chime.end - spritemap.spritemap.chime.start;

/** Describes a sound a scene's flight makes, by how far it has flown since its release. */
interface FlightCue {
  /** How far the flight has flown, in units. */
  readonly flown: number;
  readonly cue: Omit<LabCue<SoundName>, "at">;
  /** The rally of the strike whose note it is, which sets the flight's pace; absent for any other sound. */
  readonly rally?: number;
}

/** Describes where a flight's pace changes, in units flown: at each of `RALLY_MARKS` it reaches, and at its last strike, or at neither. */
interface Pace {
  readonly marks: readonly number[];
  readonly lastStrike: number | null;
}

/** Returns a flight's speed at a point of it, in units a second. */
function speedAt(flown: number, { marks, lastStrike }: Pace): number {
  // Past the last speed, the flight keeps it.
  const passed = Math.min(
    marks.filter((at) => at <= flown).length,
    SPEEDS.length - 1,
  );
  const speed = SPEEDS[passed] ?? SPEEDS[0];
  return lastStrike !== null && flown >= lastStrike ? DASH * speed : speed;
}

/** Returns how long a flight takes to fly some units from its release, in seconds, at its pace. */
function secondsTo(flown: number, pace: Pace): number {
  const changes = [
    ...pace.marks,
    ...(pace.lastStrike === null ? [] : [pace.lastStrike]),
  ]
    .filter((at) => at < flown)
    .sort((a, b) => a - b);
  let seconds = 0;
  let from = 0;
  for (const to of [...changes, flown]) {
    seconds += (to - from) / speedAt(from, pace);
    from = to;
  }
  return seconds;
}

/**
 * Returns a flight's sounds released at a moment, each at the moment the
 * game plays it, as the flight quickens at its strikes at each of
 * `RALLY_MARKS` and dashes home from its last.
 */
function flight(at: number, cues: readonly FlightCue[]): LabCue<SoundName>[] {
  const strikes = cues.filter(({ rally }) => rally !== undefined);
  const pace: Pace = {
    marks: RALLY_MARKS.flatMap(
      (mark) => strikes.find(({ rally }) => rally === mark)?.flown ?? [],
    ),
    lastStrike:
      strikes.length === 0
        ? null
        : Math.max(...strikes.map(({ flown }) => flown)),
  };
  return cues.map(({ flown, cue }) => ({
    ...cue,
    at: at + secondsTo(flown, pace),
  }));
}

/** Returns the moment the last of some cues plays. */
function lastOf(cues: readonly LabCue<SoundName>[]): number {
  return Math.max(...cues.map(({ at }) => at));
}

/** Returns a sound a flight makes some units from its release, where across the field it is, or across it all. */
function heard(flown: number, sound: SoundName, x?: number): FlightCue {
  return { flown, cue: x === undefined ? { sound } : { sound, x } };
}

/** Returns whether a flight earns a floor bounce at a rally, as the design's ladder has it. */
function earnsAt(rally: number): boolean {
  let bounce = 1;
  while (bounceRally(bounce, FLIGHT_RULES) < rally) bounce++;
  return bounceRally(bounce, FLIGHT_RULES) === rally;
}

/**
 * Returns a strike at a rally, some units into a flight, on the note the
 * rally has reached, with the break over it for one that breaks its brick,
 * and the chord of the floor bounce it earns, where it earns one.
 */
function struck(
  flown: number,
  rally: number,
  x: number,
  broke = false,
): FlightCue[] {
  const detune = rallyCentsOf(rally);
  return [
    { flown, rally, cue: { sound: "strike", detune, x } },
    ...(broke ? [{ flown, cue: { sound: "break" as const, x } }] : []),
    ...(earnsAt(rally)
      ? [{ flown, cue: { sound: "earn" as const, detune, x } }]
      : []),
  ];
}

/** Describes a run of strikes for {@link strikes}. */
interface Strikes {
  /** How far the flight has flown at the run's first strike, in units. */
  readonly from: number;
  /** The rally of the run's first strike. */
  readonly first: number;
  readonly count: number;
  /** The flight between two strikes, in units. */
  readonly gap: number;
  /** Where across the field the run starts and ends, from -1 to 1. */
  readonly fromX: number;
  readonly toX: number;
}

/**
 * Returns a run of strikes, one every gap of flight, each on the note its
 * rally has reached, every other one breaking its brick, across the field
 * from one place to another.
 */
function strikes({
  from,
  first,
  count,
  gap,
  fromX,
  toX,
}: Strikes): FlightCue[] {
  return Array.from({ length: count }, (_, i) => {
    const x = fromX + ((toX - fromX) * i) / Math.max(count - 1, 1);
    const rally = first + i;
    return struck(from + i * gap, rally, x, rally % 2 === 0);
  }).flat();
}

/** Returns how far a run of strikes has flown at its strike of a rally, in units. */
function flownAt({ from, first, gap }: Strikes, rally: number): number {
  return from + (rally - first) * gap;
}

/** The first run of strikes of "A long flight", to a rally of 12, a floor bounce earned on its way. */
const LONG_FIRST: Strikes = {
  from: 5,
  first: 1,
  count: 12,
  gap: 3,
  fromX: -0.8,
  toX: 0.8,
};

/** The second run of "A long flight", after the bounce is spent, to a rally of 26. */
const LONG_SECOND: Strikes = {
  from: 44,
  first: 13,
  count: 14,
  gap: 3,
  fromX: 0.6,
  toX: -0.6,
};

/** The strikes of "The call", past the level's rally mark. */
const CALLED: Strikes = {
  from: 4,
  first: 1,
  count: LEVEL_RALLY_MARK + 2,
  gap: 2.5,
  fromX: -0.7,
  toX: 0.7,
};

/** The bolts of the lock in "A lock". */
const LOCK_BOLTS = 3;

/** How far a flight has flown between two turns in "A lock", in units. */
const TURN_GAP = 3;

/**
 * Returns what "A lock"'s flight meets at a turn: the lock, broken, at the
 * turn after its last bolt; the lock still shut at the turn after its
 * first; and by turns a side wall and a brick.
 */
function lockMet(turn: number, rally: number): FlightCue[] {
  const flown = turn * TURN_GAP;
  if (turn === LOCK_BOLTS * boltTurns + 1) {
    return struck(flown, rally, 0, true);
  }
  if (turn === boltTurns + 1) return [heard(flown, "plate", 0)];
  if (turn % 2 === 1) {
    return [heard(flown, "knock", turn % 4 === 1 ? -1 : 1)];
  }
  return struck(flown, rally, turn % 4 === 2 ? -0.3 : 0.3, turn % 4 === 0);
}

/**
 * Returns a turn of "A lock"'s flight: what it meets, then a bolt drawn at
 * every `boltTurns`th turn, the lock opening with its last.
 */
function lockTurn(turn: number, rally: number): FlightCue[] {
  const flown = turn * TURN_GAP;
  return [
    ...lockMet(turn, rally),
    ...(turn % boltTurns === 0 ? [heard(flown, "bolt")] : []),
    ...(turn === LOCK_BOLTS * boltTurns ? [heard(flown, "unlock", 0)] : []),
  ];
}

/** The turns of "A lock", each turn that strikes striking the next rally. */
const LOCK_TURNS: readonly FlightCue[] = (() => {
  const turns: FlightCue[] = [];
  let rally = 1;
  for (let turn = 1; turn <= LOCK_BOLTS * boltTurns + 1; turn++) {
    const cues = lockTurn(turn, rally);
    if (cues.some((cue) => cue.rally !== undefined)) rally++;
    turns.push(...cues);
  }
  return turns;
})();

/** The holds of "The hatches": before each, a strike; the last swinging the hatches open. */
const HOLDS: readonly FlightCue[] = Array.from(
  { length: hatchHolds },
  (_, i) => {
    const flown = 8 * (i + 1);
    return [
      ...struck(flown - 4, i + 1, -0.4 + 0.4 * i, i % 2 === 0),
      heard(flown, "thud", 0.2 - 0.2 * i),
      ...(i === hatchHolds - 1 ? [heard(flown, "swing")] : []),
    ];
  },
).flat();

/** The flight of "A short flight". */
const SHORT = flight(0, [
  heard(0, "release"),
  heard(4, "knock", -1),
  ...struck(8, 1, -0.4),
  ...struck(12, 2, 0.2, true),
  heard(16, "knock", 0.4),
  ...struck(20, 3, 0.6, true),
  heard(27, "land", 0.3),
]);

/** The flight of "A hot shot", released after the jump. */
const HOT = flight(0.3 + AIM_S, [
  heard(0, "hot-release"),
  ...[1, 2, 3, 4].flatMap((rally) =>
    struck(2 + 3 * rally, rally, -0.6 + 0.3 * rally, true),
  ),
  heard(20, "spend", 0.2),
  ...struck(26, 5, -0.1, true),
  ...struck(30, 6, 0.3),
  heard(36, "land", 0.3),
]);

/** The flight of "A bored fuzzball", which strikes nothing. */
const BORED = flight(0, [
  heard(0, "release"),
  ...Array.from({ length: Math.floor(bored / 9) }, (_, i) =>
    heard(6 + 9 * i, i % 2 === 0 ? "knock" : "clank", i % 2 === 0 ? -1 : 1),
  ),
  heard(bored, "yawn", 0.2),
]);

/** The last shot of "The wall and a level's end", released after the danger line's warning. */
const LAST_SHOT = flight(0.6 + AIM_S, [
  heard(0, "release"),
  ...struck(6, 1, 0.3, true),
  heard(12, "land", 0),
]);

const SCENES: readonly LabScene<SoundName>[] = [
  {
    name: "The rally's notes",
    what: `The strike on each of the rally's ${String(RALLY_CENTS.length)} notes in turn, as the first to the eleventh strike of a flight play it: C4, D4, E4, G4, A4, C5, D5, E5, G5, A5 and C6.`,
    cues: RALLY_CENTS.map((detune, i) => ({
      at: i * NOTE_GAP_S,
      sound: "strike",
      detune,
    })),
  },
  {
    name: "A short flight",
    what: "Released, the fuzzball knocks off a side wall, strikes a tough brick that holds, breaks a brick, knocks off the ceiling, breaks another and dashes home to land, and the wall steps down.",
    cues: [...SHORT, { at: lastOf(SHORT) + 0.3, sound: "step" }],
  },
  {
    name: "A long flight",
    what: `Bricks struck every 3 units of flight, every other one broken, each strike a step higher, the flight quickening at the ${String(RALLY_MARKS[0])}th and ${String(RALLY_MARKS[1])}th: a floor bounce earned at a rally of ${String(bounceRally(1, FLIGHT_RULES))}, a chord on A5, and spent at the floor, then the strikes go on, holding at C6, a second bounce is earned at ${String(bounceRally(2, FLIGHT_RULES))}, on C6, and it dashes home.`,
    cues: flight(0, [
      heard(0, "release"),
      ...strikes(LONG_FIRST),
      heard(21.5, "knock", 1),
      heard(36.5, "knock", -1),
      heard(41, "spend", 0.5),
      ...strikes(LONG_SECOND),
      heard(flownAt(LONG_SECOND, 26) + 6, "land", 0),
    ]),
  },
  {
    name: "The call",
    what: `A flight reaching its level's rally mark, ${String(LEVEL_RALLY_MARK)} here: the "Rickashay!" call's chord over the ${String(LEVEL_RALLY_MARK)}th strike, and the flight flies on.`,
    cues: flight(0, [
      heard(0, "release"),
      ...strikes(CALLED),
      heard(flownAt(CALLED, LEVEL_RALLY_MARK), "call"),
      heard(flownAt(CALLED, CALLED.count) + 6, "land", 0.2),
    ]),
  },
  {
    name: "The hatches",
    what: `The fuzzball strikes a brick, comes down on the hatches' bar and is held up, ${String(hatchHolds)} times, the last hold swinging the hatches open; it falls through and lands.`,
    cues: flight(0, [
      heard(0, "release"),
      ...HOLDS,
      heard(8 * hatchHolds + 6, "land", -0.2),
    ]),
  },
  {
    name: "Steel, a ramp and a plate",
    what: "The fuzzball turns off steel, off a ramp and off a plated face, which takes nothing, breaks a brick, turns off steel again and lands.",
    cues: flight(0, [
      heard(0, "release"),
      heard(5, "clank", -0.5),
      heard(10, "ring", 0.3),
      heard(15, "plate", 0.6),
      ...struck(20, 1, 0.1, true),
      heard(25, "clank", -0.7),
      heard(31, "land", -0.4),
    ]),
  },
  {
    name: "A lock",
    what: `A lock of ${String(LOCK_BOLTS)} bolts: a bolt slides back every ${String(boltTurns)} turns, the fuzzball turns off the lock while it is shut, the last bolt opens it at turn ${String(LOCK_BOLTS * boltTurns)}, and the next turn breaks it.`,
    cues: flight(0, [
      heard(0, "release"),
      ...LOCK_TURNS,
      heard((LOCK_BOLTS * boltTurns + 1) * TURN_GAP + 6, "land", 0.3),
    ]),
  },
  {
    name: "A spring brick, a gem and a portal",
    what: "A spring brick broken gives a floor bounce, its chord on the first strike's note; a gem struck; through a portal; a brick broken; the bounce spent at the floor; another strike, and the landing.",
    cues: flight(0, [
      heard(0, "release"),
      ...struck(6, 1, -0.4, true),
      heard(6, "spring", -0.4),
      { flown: 6, cue: { sound: "earn", detune: rallyCentsOf(1), x: -0.4 } },
      ...struck(12, 2, 0.3, true),
      heard(12, "gem", 0.3),
      heard(17, "portal", 0.5),
      ...struck(22, 3, -0.2, true),
      heard(28, "spend", 0),
      ...struck(34, 4, 0.4),
      heard(40, "land", 0.4),
    ]),
  },
  {
    name: "A hot shot",
    what: "The last round's fuzzball lands and the wall jumps; the next shot goes out hot, holding a floor bounce, breaks four bricks, spends its bounce at the floor, breaks another, strikes one more and lands.",
    cues: [
      { at: 0, sound: "land", x: 0.1 },
      { at: 0.3, sound: "jump" },
      ...HOT,
    ],
  },
  {
    name: "A bored fuzzball",
    what: `A fuzzball that strikes nothing for ${String(bored)} units, turning off the walls and steel: it yawns and drops to the floor.`,
    cues: [...BORED, { at: lastOf(BORED) + DROP_S, sound: "land", x: 0.2 }],
  },
  {
    name: "The wall and a level's end",
    what: "The wall steps over the danger line; the next shot breaks the level's last brick and lands, and the level is cleared. Then a lost level's sound, for its own.",
    cues: [
      { at: 0, sound: "land", x: -0.4 },
      { at: 0.3, sound: "step" },
      { at: 0.6, sound: "danger" },
      ...LAST_SHOT,
      { at: lastOf(LAST_SHOT) + 0.3, sound: "chime" },
      {
        at: lastOf(LAST_SHOT) + 0.3 + CHIME_S + LOST_GAP_S,
        sound: "lost",
      },
    ],
  },
];

const sounds: readonly LabSound<SoundName>[] = SOUNDS.map((name) => ({
  name,
  plays: PLAYS[name],
}));

mountSoundLab({
  game: "Rickashay",
  sprite: {
    url: spriteUrl,
    spritemap,
  },
  sounds,
  scenes: SCENES,
});
