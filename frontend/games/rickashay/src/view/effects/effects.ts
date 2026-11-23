// What each moment of a round calls for, as the design's "Flourishes" and
// "Sound" give them: the flourishes the scene plays where motion is
// welcome, each where it plays, and the sounds it plays with motion or
// without, a strike's note and a floor bounce's chord climbing with the
// rally. A flight's are worked out whole as it is released, from the wall
// it starts on and the level's rally mark, so playing it back makes
// nothing.

import { fieldRowOf } from "@fz/brick-wall/rules/grid";
import { FrameSounds } from "@fz/core/frame_sounds";
import type { KindId } from "../../rules/catalog/kinds";
import type {
  Flight,
  FlightEvent,
  RoundStart,
} from "../../rules/flight/events";
import { RALLY_MARKS } from "../../rules/tuning";
import type { Beat } from "../run_state";
import { SOUNDS, type SoundName, rallyCentsOf } from "./sounds";

/** Names a flourish the scene plays, and where. Each moves, so none plays where motion isn't welcome. */
export type Flourish =
  | {
      /** A struck brick that holds swells and settles. */
      readonly kind: "swell";
      readonly cell: number;
    }
  | {
      /** A broken brick bursts into shards of its color. */
      readonly kind: "shards";
      readonly cell: number;
    }
  | {
      /** A ramp the fuzzball turns off flashes along its long face. */
      readonly kind: "flash";
      readonly cell: number;
    }
  | {
      /** A plated face, or a lock still shut, sparks as it turns the fuzzball and takes nothing. */
      readonly kind: "spark";
      readonly cell: number;
    }
  | {
      /** A hatch's bar dips under a hold and loses a dot. */
      readonly kind: "dip";
      readonly cell: number;
    }
  | {
      /** Every hatch in the field swings down at once. */
      readonly kind: "swing";
    }
  | {
      /** A portal draws the fuzzball in. */
      readonly kind: "draw-in";
      readonly cell: number;
    }
  | {
      /** A portal's twin lets the fuzzball out. */
      readonly kind: "let-out";
      readonly cell: number;
    }
  | {
      /** Every lock's bolts in the field slide a slot. */
      readonly kind: "slide";
    }
  | {
      /** A ring leaves the fuzzball at a strike of each of `RALLY_MARKS`, as its fur lifts. */
      readonly kind: "ring";
    }
  | {
      /** A floor bounce spent kicks its spring and throws the fuzzball up with a puff. */
      readonly kind: "kick";
    }
  | {
      /** The fuzzball dashing home from its last strike leaves a streak until it lands. */
      readonly kind: "streak";
    }
  | {
      /** The jump line flashes as the wall jumps. */
      readonly kind: "jump-line";
    }
  | {
      /** The waiting fuzzball flares into a hot shot as the wall's jump makes the next shot hot. */
      readonly kind: "flare";
    }
  | {
      /** A lost level shakes the field. */
      readonly kind: "shake";
    };

/** A flourish's kind, such as "dip". */
export type FlourishKind = Flourish["kind"];

/** Describes a sound a moment calls for. */
export interface Cue {
  readonly sound: SoundName;
  /** How far it is raised, in cents. */
  readonly detune: number;
}

/** Says what a moment calls for: the flourishes it plays, and its sounds. */
export interface EventEffects {
  /** Its flourishes, which play only where motion is welcome. */
  readonly flourishes: readonly Flourish[];
  /** Its sounds, which play with motion or without. */
  readonly sounds: readonly Cue[];
}

/** No flourish, and no sound. */
const NONE: readonly never[] = [];

/** What a moment calls for that the scene plays nothing of, an event skipped among them. */
export const QUIET: EventEffects = { flourishes: NONE, sounds: NONE };

/** Returns a sound, raised by nothing. */
function cue(sound: SoundName): Cue {
  return { sound, detune: 0 };
}

/** Returns what a moment calls for: its sounds, and the flourishes it plays where motion is welcome. */
function calling(
  sounds: readonly SoundName[],
  flourishes: readonly Flourish[] = NONE,
): EventEffects {
  return { flourishes, sounds: sounds.map(cue) };
}

/** What each beat calls for. */
const BEAT_EFFECTS = {
  release: calling(["release"]),
  "hot-release": calling(["hot-release"]),
  step: calling(["step"]),
  jump: calling(["jump"], [{ kind: "jump-line" }, { kind: "flare" }]),
  danger: calling(["danger"]),
  cleared: calling(["chime"]),
  lost: calling(["lost"], [{ kind: "shake" }]),
} as const satisfies Readonly<Record<Beat, EventEffects>>;

/** What a turn off a side wall or the ceiling calls for. */
const KNOCK = calling(["knock"]);

/** What a floor bounce spent calls for. */
const SPEND = calling(["spend"], [{ kind: "kick" }]);

/** What the hatches swinging open call for. */
const SWING = calling(["swing"], [{ kind: "swing" }]);

/** What a bolt drawn calls for, while every lock it slides stays shut. */
const BOLT = calling(["bolt"], [{ kind: "slide" }]);

/** What a bolt drawn calls for that opens a lock. */
const UNLOCK = calling(["bolt", "unlock"], [{ kind: "slide" }]);

/** What a bored fuzzball's yawn calls for. */
const YAWN = calling(["yawn"]);

/** What the landing calls for. */
const LAND = calling(["land"]);

/** A flight's turn. */
type Turn = Extract<FlightEvent, { readonly kind: "turn" }>;

/** A flight's strike. */
type Strike = Extract<FlightEvent, { readonly kind: "strike" }>;

/**
 * Returns what each of a flight's events calls for, in the flight's order,
 * as the wall it starts on and the level's rally mark say: worked out once,
 * as it is released.
 */
export function flightEffects(
  start: RoundStart,
  flight: Flight,
  rallyMark: number,
): readonly EventEffects[] {
  const { events } = flight;
  const kindAt = (cell: number): KindId | undefined =>
    start.wall.bricks[cell]?.kind;
  let lastStrike = -1;
  events.forEach(({ kind }, index) => {
    if (kind === "strike") lastStrike = index;
  });
  // The rally the flight has reached, which a floor bounce's chord is on.
  let rally = 0;
  return events.map((event, index): EventEffects => {
    switch (event.kind) {
      case "turn":
        return turnEffects(event, kindAt);
      case "strike":
        rally = event.rally;
        return strikeEffects(
          event,
          kindAt(event.cell),
          index === lastStrike,
          rallyMark,
        );
      case "shielded":
        return calling(["plate"], [{ kind: "spark", cell: event.cell }]);
      case "bounce-earned":
        return {
          flourishes: NONE,
          sounds: [{ sound: "earn", detune: rallyCentsOf(rally) }],
        };
      case "bounce-spent":
        return SPEND;
      case "hold":
        return calling(["thud"], [{ kind: "dip", cell: event.cell }]);
      case "hatches-open":
        return SWING;
      case "bolt":
        return opensLock(start, event.drawn) ? UNLOCK : BOLT;
      case "teleport":
        return calling(
          ["portal"],
          [
            { kind: "draw-in", cell: event.from },
            { kind: "let-out", cell: event.to },
          ],
        );
      case "bored":
        return YAWN;
      case "guard":
        // A guard no flight should meet, which the design gives no sound.
        return QUIET;
      case "land":
        return LAND;
    }
  });
}

/**
 * Returns what a turn calls for: a side wall's or the ceiling's knock, and
 * steel's clank and a ramp's ring and flash for each it met; a brick that
 * takes hits, or shields the fuzzball, speaks for itself, as a hatch does
 * through its hold, at its bar's flat or an end, and the floor through the
 * bounce spent there.
 */
function turnEffects(
  turn: Turn,
  kindAt: (cell: number) => KindId | undefined,
): EventEffects {
  if (turn.off === "wall" || turn.off === "ceiling") return KNOCK;
  const sounds: SoundName[] = [];
  const flourishes: Flourish[] = [];
  for (const cell of turn.cells) {
    const kind = kindAt(cell);
    const sound = kind === undefined ? null : turnSoundOf(kind);
    if (sound !== null && !sounds.includes(sound)) sounds.push(sound);
    if (kind === "ramp") flourishes.push({ kind: "flash", cell });
  }
  return sounds.length === 0 ? QUIET : calling(sounds, flourishes);
}

/**
 * Returns the sound a brick of a kind makes as the fuzzball turns off it,
 * steel's clank or a ramp's ring, or null for one that speaks through its
 * strike, its shielding or its hold.
 */
function turnSoundOf(kind: KindId): SoundName | null {
  switch (kind) {
    case "steel":
      return "clank";
    case "ramp":
      return "ring";
    case "hatch":
    case "brick":
    case "tough":
    case "spring":
    case "gem":
    case "portal":
    case "plated":
    case "moss":
    case "lock":
      return null;
  }
}

/**
 * Returns what a strike calls for: its note, raised with the rally as
 * `rallyCentsOf()` says, and a brick broken's burst or a brick that holds'
 * swell; a gem's own sound, and a spring brick's as it breaks; a ring at
 * each of `RALLY_MARKS`; the "Rickashay!" call at the level's rally mark;
 * and the dash's streak from the flight's last strike.
 */
function strikeEffects(
  strike: Strike,
  kind: KindId | undefined,
  last: boolean,
  rallyMark: number,
): EventEffects {
  const { cell, broke, rally } = strike;
  const sounds: Cue[] = [{ sound: "strike", detune: rallyCentsOf(rally) }];
  const flourishes: Flourish[] = [
    broke ? { kind: "shards", cell } : { kind: "swell", cell },
  ];
  if (broke) sounds.push(cue("break"));
  if (kind === "gem") sounds.push(cue("gem"));
  if (kind === "spring" && broke) sounds.push(cue("spring"));
  if (rally === rallyMark) sounds.push(cue("call"));
  if (RALLY_MARKS.some((mark) => mark === rally)) {
    flourishes.push({ kind: "ring" });
  }
  if (last) flourishes.push({ kind: "streak" });
  return { flourishes, sounds };
}

/**
 * Returns whether the bolts drawn so far open a lock in the field: one of
 * as many bolts, shut till now, as a lock is broken only once it is open.
 */
function opensLock(start: RoundStart, drawn: number): boolean {
  const { wall, depth } = start;
  return wall.bricks.some(
    (brick, cell) =>
      brick?.kind === "lock" &&
      brick.tint === drawn &&
      fieldRowOf(wall, cell) < depth,
  );
}

/** Returns what a beat of a round calls for. */
export function beatEffectsOf(beat: Beat): EventEffects {
  return BEAT_EFFECTS[beat];
}

/** Returns whether a moment's effects call "Rickashay!", as a flight reaches the level's rally mark. */
export function callsOut(effects: EventEffects): boolean {
  return effects.sounds.some(({ sound }) => sound === "call");
}

/** Returns the flourishes a moment's effects play: all of them where motion is welcome, else none. */
export function flourishesOf(
  effects: EventEffects,
  motion: boolean,
): readonly Flourish[] {
  return motion ? effects.flourishes : NONE;
}

/** Returns what gathers a frame's sounds, so each of `SOUNDS` plays once a frame at most, at the most it rose. */
export function createFrameSounds(): FrameSounds<SoundName> {
  return new FrameSounds(SOUNDS);
}
