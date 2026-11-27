// The timeline a move plays as, built from its record before it plays: a
// track for each piece and each loose sprite, the effects it spawns, the
// flights to the goals, the goals' counts, the dust swept, the waves'
// marks, the sound cues and the board's dimming, each at a time in
// milliseconds from the tap, and when the board comes to rest. The scene
// samples it at each frame's time and draws what it finds, so a frame is a
// time, the same on every run. Places are in squares, in the screen's
// frame, from the board's top left corner to a square's middle.

import type { Shift } from "@fz/core/motion";
import type { FuzzballFace } from "@fz/style/fuzzball";
import type { Wind } from "../../rules/board/board";
import type { DustLayers } from "../../rules/catalog/elements";
import type { KindId } from "../../rules/catalog/kinds";
import type { Piece } from "../../rules/catalog/pieces";
import type { FrameName, Times } from "../art/frame_names";
import type { SoundName } from "../effects/sounds";

/** Every easing a key moves by, the sketch's: a straight line, out, in, in and out, a little past and back, and a spring that rings. */
export const EASINGS = [
  "linear",
  "out",
  "in",
  "in-out",
  "back",
  "spring",
] as const satisfies readonly string[];

/** An easing, such as "spring". */
export type Easing = (typeof EASINGS)[number];

/**
 * Every number of a sprite's look a track moves: its place, a lean off it,
 * its scale across and down, its turn in radians, how faded it is, how far
 * its fur stands on end, where its eyes look, its white glow, how far its
 * second fur has grown in, how far above the others it draws, and how hard
 * it wobbles side to side, as a head shakes, which sampling folds into its
 * lean.
 */
export const CHANNELS = [
  "x",
  "y",
  "leanX",
  "leanY",
  "scaleX",
  "scaleY",
  "rotation",
  "fade",
  "lift",
  "lookX",
  "lookY",
  "glow",
  "furIn",
  "raise",
  "wobble",
] as const satisfies readonly string[];

/** A number of a sprite's look, such as "scaleY". */
export type Channel = (typeof CHANNELS)[number];

/** Describes a place on the board, in squares. */
export interface Place {
  readonly x: number;
  readonly y: number;
}

/** Describes a number of a sprite's look moving, from wherever it stands as the key starts. */
export interface Key {
  readonly atMs: number;
  /** How long it takes, 0 to jump. */
  readonly ms: number;
  readonly to: number;
  readonly easing: Easing;
}

/** Describes every number of a sprite's look as it stands, before its track's keys move it. */
export type Look = Readonly<Record<Channel, number>>;

/** Describes the keys of each number of a sprite's look a track moves, in the order they start. */
export type Keys = Readonly<Partial<Record<Channel, readonly Key[]>>>;

/** Describes a piece's look changing at a moment, as a special's second fur comes or a brick loses a layer. */
export interface Becomes {
  readonly atMs: number;
  readonly piece: Piece;
}

/** Describes a fuzzball's eyes taking a face at a moment. */
export interface Faces {
  readonly atMs: number;
  readonly face: FuzzballFace;
}

/** Describes how a piece moves and looks through a move, from when it shows until it is gone. */
export interface PieceTrack {
  /** The piece's id. */
  readonly id: number;
  /** When it shows, 0 for a piece on the board at the tap. */
  readonly fromMs: number;
  /** When it is gone, or null for one still on the board at rest. */
  readonly untilMs: number | null;
  /** What it is drawn as as it shows. */
  readonly drawn: Piece;
  readonly look: Look;
  readonly face: FuzzballFace;
  readonly keys: Keys;
  /** Each change of what it is drawn as, in order. */
  readonly becomes: readonly Becomes[];
  /** Each face its eyes take, in order. */
  readonly faces: readonly Faces[];
}

/** Describes what a loose sprite draws: a frame, or a copy of a piece with a face, as a wisp's three copies are. */
export type LooseDrawn =
  | { readonly what: "frame"; readonly frame: FrameName }
  | {
      readonly what: "copy";
      readonly piece: Piece;
      readonly face: FuzzballFace;
    };

/** Describes a loose sprite, one that is no piece on the board, such as a brick's cushion knocked off, a cage's bar or a wisp's copy. */
export interface SpriteTrack {
  readonly drawn: LooseDrawn;
  readonly fromMs: number;
  readonly untilMs: number;
  readonly look: Look;
  readonly keys: Keys;
}

/** Describes a color an effect is drawn in: a kind's ink, the frizzball's, or white. */
export type Ink = KindId | "frizzball" | "white";

/** Describes an effect the move spawns, which plays out by itself from its moment. */
export type Effect =
  /** Tufts flying from a place and drifting down. */
  | {
      readonly what: "fluff";
      readonly atMs: number;
      readonly at: Place;
      readonly tuft: FrameName;
      readonly count: number;
      /** How hard they fly, 1 for a fuzzball hopping off. */
      readonly power: number;
    }
  /** A thin ring spreading from a place. */
  | {
      readonly what: "ring";
      readonly atMs: number;
      readonly ms: number;
      readonly at: Place;
      /** How far across it spreads to, in squares. */
      readonly radius: number;
      readonly ink: Ink;
    }
  /** A dasher's streak running from a place to another. */
  | {
      readonly what: "streak";
      readonly atMs: number;
      readonly ms: number;
      readonly from: Place;
      readonly to: Place;
      readonly ink: Ink;
    }
  /** A frizzball's bolt of static leaping from a place to another. */
  | {
      readonly what: "bolt";
      readonly atMs: number;
      readonly ms: number;
      readonly from: Place;
      readonly to: Place;
    }
  /** A soft white disc where a puffer or a frizzball goes off. */
  | {
      readonly what: "flash";
      readonly atMs: number;
      readonly ms: number;
      readonly at: Place;
      readonly radius: number;
    }
  /** The board shaking, its size in pixels, which sampling folds into the board's shake. */
  | { readonly what: "shake"; readonly atMs: number; readonly px: number }
  /** A line of wind crossing the board the way the wind blows, as the wind turns. */
  | {
      readonly what: "gust-line";
      readonly atMs: number;
      readonly ms: number;
      readonly at: Place;
      readonly blows: Wind;
    };

/** Describes a fuzzball's copy flying from the board to its goal on the bar. */
export interface Flight {
  readonly atMs: number;
  readonly ms: number;
  readonly drawn: Piece;
  readonly from: Place;
  /** The goal's place in the level's list. */
  readonly goal: number;
}

/** Describes a goal's count changing as a flight lands, or as the board's count of it falls. */
export interface GoalCount {
  readonly atMs: number;
  /** The goal's place in the level's list. */
  readonly goal: number;
  /** What it still asks for, 0 once met. */
  readonly left: number;
}

/** Describes a square's dust changing as it is swept. */
export interface DustChange {
  readonly atMs: number;
  readonly at: Place;
  readonly layers: DustLayers;
}

/** Describes a wave's mark, from "×2" to "×9", showing over the board; a wave past the 9th shows none. */
export interface WaveMark {
  readonly atMs: number;
  readonly at: Place;
  readonly times: Times;
}

/** Describes a sound played at a moment. */
export interface SoundCue {
  readonly atMs: number;
  readonly sound: SoundName;
  /** How far it is tuned from its own pitch, in cents, as a wave's note climbs the ladder. */
  readonly cents: number;
  /** How loud it plays, 1 at its own loudness. */
  readonly volume: number;
}

/** Describes the beats a level's end keeps after its last move: its card, and each star lit on it. */
export interface EndBeats {
  readonly cardMs: number;
  /** When each star the card shows lights, in order. */
  readonly starsMs: readonly number[];
  /**
   * The earliest moment a tap hurries the rest of the timeline at the
   * feel's `hurriedPace`, as the flashes from it are kept a gap at that
   * pace apart, a tap before it hurrying nothing; or null where no tap
   * does, as after a move that runs out.
   */
  readonly hurriedFromMs: number | null;
}

/** Describes everything a move plays as, each at its time from the tap. */
export interface Timeline {
  readonly pieces: readonly PieceTrack[];
  readonly sprites: readonly SpriteTrack[];
  readonly effects: readonly Effect[];
  readonly flights: readonly Flight[];
  readonly counts: readonly GoalCount[];
  readonly dust: readonly DustChange[];
  readonly marks: readonly WaveMark[];
  readonly sounds: readonly SoundCue[];
  /** The keys of how far the board dims, from 0 for not at all, as it does under a frizzball going off. */
  readonly dim: readonly Key[];
  /** When everything has landed and the board is at rest. */
  readonly restMs: number;
  /** The level's end, after a move that cleared it or ran out of moves; else null. */
  readonly end: EndBeats | null;
}

/**
 * Describes a track as sampled at a moment, a record the scene keeps for
 * each sprite and the sampling writes into, so a frame makes no records.
 */
export interface Sampled extends Record<Channel, number> {
  /** Whether it shows at the moment. */
  shown: boolean;
  face: FuzzballFace;
  /** What a piece's sprite is drawn as at the moment, or null for a loose sprite, which draws what its track does. */
  drawn: Piece | null;
}

/** Describes the board as sampled at a moment, beside its sprites, a record the scene keeps and the sampling writes into. */
export interface SampledBoard {
  /** How far it dims, from 0 for not at all. */
  dim: number;
  /** How far it is shaken from its place, in pixels, the larger shake holding where two meet. */
  shake: Shift;
}
