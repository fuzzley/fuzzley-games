// What an event adds to a move's timeline, each a part the builder lays
// into its tracks and lists: a key, a face, a face again or a new look for
// a piece, a piece shown or gone, a loose sprite, an effect, a glow the flashes'
// limit may drop, a fuzzball gathered or something else a goal counts, a
// square's dust swept, a wave's mark, a sound, the board's dimming, a
// moment the board waits for before it goes on, and the moment the wind
// turns.

import type { FuzzballFace } from "@fz/style/fuzzball";
import type { KindId } from "../../rules/catalog/kinds";
import type { Fuzzball, Piece } from "../../rules/catalog/pieces";
import { FRAMES } from "../art/frame_names";
import type { LadderedSound } from "../effects/ladder";
import type { SoundName } from "../effects/sounds";
import type { Counts } from "./flights";
import {
  CHANNELS,
  type Channel,
  type DustChange,
  type Easing,
  type Effect,
  type Key,
  type Look,
  type Place,
  type SpriteTrack,
  type WaveMark,
} from "./timeline";

/** Describes a part of a move's timeline that an event adds. */
export type Part =
  /** A key that moves a number of a piece's look. */
  | {
      readonly what: "key";
      readonly piece: number;
      readonly channel: Channel;
      readonly key: Key;
    }
  /** A piece's eyes taking a face. */
  | {
      readonly what: "face";
      readonly piece: number;
      readonly atMs: number;
      readonly face: FuzzballFace;
    }
  /** A piece's eyes taking a face again at a moment, unless they took another after a moment, as a cheer's happy eyes rest. */
  | {
      readonly what: "face-again";
      readonly piece: number;
      readonly atMs: number;
      readonly face: FuzzballFace;
      readonly sinceMs: number;
    }
  /** A piece drawn as another from a moment, as a fuzzball made special is. */
  | {
      readonly what: "becomes";
      readonly piece: number;
      readonly atMs: number;
      readonly drawn: Piece;
    }
  /** A piece that shows from a moment, with its own look and face, as one let in at the top does. */
  | {
      readonly what: "shows";
      readonly piece: Piece;
      readonly atMs: number;
      readonly look: Look;
      readonly face: FuzzballFace;
    }
  /** A piece gone from a moment. */
  | { readonly what: "leaves"; readonly piece: number; readonly atMs: number }
  | { readonly what: "sprite"; readonly sprite: SpriteTrack }
  | { readonly what: "effect"; readonly effect: Effect }
  /** A piece glowing white for a while, which the flashes' limit counts and may drop. */
  | {
      readonly what: "glow";
      readonly piece: number;
      readonly atMs: number;
      readonly ms: number;
      /** How white it glows as it starts, 1 for all white. */
      readonly amount: number;
    }
  /** A fuzzball gathered from a place, whose copy flies to the goal of its kind where that goal still asks for it. */
  | {
      readonly what: "gathered";
      readonly atMs: number;
      readonly piece: Fuzzball;
      readonly at: Place;
    }
  /** Something a goal counts at once, with no flight, where the goal still asks for it. */
  | { readonly what: "counted"; readonly atMs: number; readonly counts: Counts }
  | { readonly what: "dust"; readonly change: DustChange }
  | { readonly what: "mark"; readonly mark: WaveMark }
  /** A sound at its own pitch. */
  | {
      readonly what: "sound";
      readonly atMs: number;
      readonly sound: SoundName;
      readonly rung: null;
      readonly volume: number;
    }
  /** A sound that climbs the move's ladder of notes, on a rung of it. */
  | {
      readonly what: "sound";
      readonly atMs: number;
      readonly sound: LadderedSound;
      /** Its rung on the ladder, from 0 for the first wave's. */
      readonly rung: number;
      readonly volume: number;
    }
  /** A key of how far the board dims. */
  | { readonly what: "dim"; readonly key: Key }
  /** A moment the board waits for before it goes on, such as a hop far enough through that it may fall. */
  | { readonly what: "hold"; readonly atMs: number }
  /** The moment the wind turns, as the gust that turns it sets in. */
  | { readonly what: "wind-turns"; readonly atMs: number };

/** Describes a part that cues a sound, at its own pitch or on a rung of the ladder. */
export type SoundPart = Extract<Part, { readonly what: "sound" }>;

/** Returns the parts that move a piece's look to new numbers over a while, a key a number, each from where it stands as the key starts. */
export function moves(
  piece: number,
  atMs: number,
  ms: number,
  easing: Easing,
  to: Partial<Look>,
): readonly Part[] {
  const parts: Part[] = [];
  for (const channel of CHANNELS) {
    const value = to[channel];
    if (value !== undefined) {
      parts.push({
        what: "key",
        piece,
        channel,
        key: { atMs, ms, to: value, easing },
      });
    }
  }
  return parts;
}

/** Returns the parts that set a piece's look to new numbers at a moment. */
export function sets(
  piece: number,
  atMs: number,
  to: Partial<Look>,
): readonly Part[] {
  return moves(piece, atMs, 0, "linear", to);
}

/** Returns the part that gives a piece's eyes a face at a moment. */
export function facing(piece: number, atMs: number, face: FuzzballFace): Part {
  return { what: "face", piece, atMs, face };
}

/** Returns the part that gives a piece's eyes a face again at a moment, unless they took another after a moment. */
export function facingAgain(
  piece: number,
  atMs: number,
  face: FuzzballFace,
  sinceMs: number,
): Part {
  return { what: "face-again", piece, atMs, face, sinceMs };
}

/** Returns the part that cues a sound at a moment, as loud as a share of its own loudness. */
export function cue(sound: SoundName, atMs: number, volume = 1): SoundPart {
  return { what: "sound", atMs, sound, rung: null, volume };
}

/** Returns the part that cues a sound at a moment on a rung of the move's ladder of notes, from 0 for the first wave's, as loud as a share of its own loudness. */
export function noteCue(
  sound: LadderedSound,
  atMs: number,
  rung: number,
  volume = 1,
): SoundPart {
  return { what: "sound", atMs, sound, rung, volume };
}

/** Returns the part that spawns an effect. */
export function spawns(effect: Effect): Part {
  return { what: "effect", effect };
}

/** Returns the part that throws tufts of a kind's fur from a place, or none for no kind, as the frizzball's fur has no tufts. */
export function tuftsOf(
  kind: KindId | null,
  atMs: number,
  at: Place,
  count: number,
  power: number,
): readonly Part[] {
  return kind === null
    ? []
    : [
        spawns({
          what: "fluff",
          atMs,
          at,
          tuft: FRAMES.tuft(kind),
          count,
          power,
        }),
      ];
}
