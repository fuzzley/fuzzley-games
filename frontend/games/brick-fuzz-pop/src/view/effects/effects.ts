import { FrameSounds } from "@fz/core/frame_sounds";
import type { FlightEvent, TurnOff } from "../../rules/flight/events";
import type { Boon } from "../../rules/shot";
import { AT_ONCE } from "../../rules/tuning";

/** The game's twenty sounds, in the order the sprite holds them. */
export const SOUNDS = [
  "notch",
  "release",
  "boon",
  "knock",
  "strike",
  "break",
  "punch",
  "clank",
  "zap",
  "blast",
  "bump",
  "portal",
  "cage",
  "land",
  "yawn",
  "step",
  "jump",
  "danger",
  "chime",
  "lost",
] as const;

/** A sound's name, such as "zap". */
export type SoundName = (typeof SOUNDS)[number];

/** How far a broken brick's sound rises for each brick the round broke before it, in cents: a semitone. */
export const BREAK_STEP_CENTS = 100;

/** The most a round raises a broken brick's sound, in cents: an octave. */
export const BREAK_MOST_CENTS = 1200;

/**
 * Names a flourish the scene plays: a struck brick's swell, a broken one's
 * shards, a punch's streak, a zap's bolt, a blast's ring, a freed friend's
 * hop, the jump line's flash, the fuzzball's flare into its boon and a lost
 * level's shake. Each moves, so none plays where motion isn't welcome.
 */
export type Flourish =
  | "swell"
  | "shards"
  | "streak"
  | "bolt"
  | "ring"
  | "hop"
  | "flash"
  | "flare"
  | "shake";

/** Says what an event calls for: the flourishes it plays, and its sound. */
export interface EventEffects {
  readonly flourishes: readonly Flourish[];
  /** Its sound, or null; a sound plays with motion or without. */
  readonly sound: SoundName | null;
}

/**
 * Names a moment of a level beyond its flights' events: a notch of charge,
 * the wall's step and its jump, a brick come over the danger line, and the
 * level cleared or lost.
 */
export type Beat = "notch" | "step" | "jump" | "danger" | "cleared" | "lost";

/** No flourish at all. */
const NONE: readonly Flourish[] = [];

/** Returns what an event calls for: its sound, and the flourishes it plays where motion is welcome. */
function calling(
  sound: SoundName | null,
  flourishes: readonly Flourish[] = NONE,
): EventEffects {
  return { flourishes, sound };
}

/** What an event calls for that the scene plays nothing of. */
const QUIET = calling(null);

/** What each beat calls for. */
const BEAT_EFFECTS: Readonly<Record<Beat, EventEffects>> = {
  notch: calling("notch"),
  step: calling("step"),
  jump: calling("jump", ["flash", "flare"]),
  danger: calling("danger"),
  cleared: calling("chime"),
  lost: calling("lost", ["shake"]),
};

/** What a turn off each thing calls for: a brick's face or corner nothing, as the strike on it speaks for it. */
const TURN_EFFECTS: Readonly<Record<TurnOff, EventEffects>> = {
  side: calling("knock"),
  ceiling: calling("knock"),
  face: QUIET,
  corner: QUIET,
  bumper: calling("bump"),
};

/** What a shot's release calls for, without a boon. */
const RELEASE = calling("release");

/** What the release of a shot that carries a boon calls for. */
const BOON_RELEASE = calling("boon");

/** What a strike calls for that wears a brick which holds. */
const HELD = calling("strike", ["swell"]);

/**
 * What a strike calls for that takes no hit: steel, a plate, or a shell a
 * plain fuzzball can't open, which swells as any struck brick does.
 */
const UNHURT = calling("clank", ["swell"]);

/** What a charged fuzzball's strike calls for that breaks a brick and flies on through it, unturned. */
const PUNCH = calling("punch", ["streak"]);

/** What a broken brick calls for. */
const BREAK = calling("break", ["shards"]);

/** What a zap along a row, a column or the diagonals calls for. */
const ZAP = calling("zap", ["bolt"]);

/** What a bomb's blast calls for. */
const BLAST = calling("blast", ["ring"]);

/** What a fuzzball through a portal calls for. */
const PORTAL = calling("portal");

/** What a friend freed from its cage calls for. */
const FREE = calling("cage", ["hop"]);

/** What a bored fuzzball's yawn calls for. */
const YAWN = calling("yawn");

/** What a fuzzball's landing calls for. */
const LAND = calling("land");

/** A fuzzball's turn off something. */
type Turn = Extract<FlightEvent, { kind: "turn" }>;

/** A fuzzball's strike on a brick. */
type Strike = Extract<FlightEvent, { kind: "strike" }>;

/**
 * Reads a round's flight an event at a time, in the flight's order, and says
 * what each calls for.
 *
 * A strike's effects hang on the turns before it: a charged fuzzball that
 * breaks a brick and flies on unturned punches through it, where a plain
 * one turns off it, and a bumper's kick speaks for the strike on it. At one
 * moment a fuzzball's turns come before its strikes, so only the events
 * before a strike, read in order, tell which it is; a turn within
 * `AT_ONCE` of a strike is at its moment, as the flight meets contacts.
 */
export class FlightEffects {
  private boon: Boon | null = null;
  /** The last turn read in this flight, or null before its first. */
  private lastTurn: Readonly<Turn> | null = null;

  /** Starts on a round's flight, whose shot carries a boon or none, forgetting the last one's turns. */
  begin(boon: Boon | null): void {
    this.boon = boon;
    this.lastTurn = null;
  }

  /** Returns what the flight's next event calls for. */
  effectsOf(event: Readonly<FlightEvent>): EventEffects {
    switch (event.kind) {
      case "launch":
        if (event.role !== "player") return QUIET;
        return this.boon === null ? RELEASE : BOON_RELEASE;
      case "turn":
        this.lastTurn = event;
        return TURN_EFFECTS[event.off];
      case "strike":
        return this.strikeEffects(event);
      case "break":
        return BREAK;
      case "zap":
        return event.pattern === "blast" ? BLAST : ZAP;
      case "portal":
        return PORTAL;
      case "free":
        return FREE;
      case "yawn":
        return YAWN;
      case "land":
        return LAND;
      case "recharge":
      case "split":
        return QUIET;
    }
  }

  /** Returns what a strike calls for, by what it took off its brick and whether its fuzzball turned then. */
  private strikeEffects(strike: Readonly<Strike>): EventEffects {
    const turn = this.lastTurn;
    const turned =
      turn !== null &&
      turn.ball === strike.ball &&
      Math.abs(strike.at - turn.at) <= AT_ONCE;
    if (turned && turn.off === "bumper") return QUIET;
    if (strike.took === 0) return UNHURT;
    if (strike.left > 0) return HELD;
    // The brick broke, and its break speaks for it but for a punch.
    return turned ? QUIET : PUNCH;
  }
}

/** Returns what a beat calls for. */
export function beatEffectsOf(beat: Beat): EventEffects {
  return BEAT_EFFECTS[beat];
}

/**
 * Returns how far an event's sound is raised, in cents: a broken brick's by
 * a semitone for each brick the round broke before it, up to an octave,
 * which rewards a long round by ear; any other's not at all.
 */
export function detuneOf(event: Readonly<FlightEvent>): number {
  return event.kind === "break" ? breakDetune(event.streak) : 0;
}

/** Returns how far the round's `streak`th broken brick's sound is raised, in cents. */
export function breakDetune(streak: number): number {
  return Math.min((streak - 1) * BREAK_STEP_CENTS, BREAK_MOST_CENTS);
}

/** Returns what gathers a frame's sounds, so each of {@link SOUNDS} plays once a frame at most, at the most it rose. */
export function createFrameSounds(): FrameSounds<SoundName> {
  return new FrameSounds(SOUNDS);
}

/** Returns the flourishes an event's effects play: all of them where motion is welcome, else none. */
export function flourishesOf(
  effects: EventEffects,
  motion: boolean,
): readonly Flourish[] {
  return motion ? effects.flourishes : NONE;
}
