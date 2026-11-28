// A move's timeline as its events add to it: a track for each piece on the
// board as the move starts and each it brings in, and the lists of what
// else it plays. Once every event is in, the draft lays each track's keys
// in the order they start, sends what the goals count to them, keeps what
// Less motion keeps where the player asks for it, holds what the move
// plays to the design's limits, and hands back the timeline.

import type { FuzzballFace } from "@fz/style/fuzzball";
import { squareOf } from "../../rules/board/cells";
import type { Piece } from "../../rules/catalog/pieces";
import { onRung } from "../effects/ladder";
import type { GoalShown, GridShown } from "../run_state";
import { byStart } from "./by_start";
import type { FeelTuning } from "./feel";
import { type Claim, flightsOf } from "./flights";
import { type Motion, withLessMotion } from "./less_motion";
import {
  type Pools,
  limitFlashes,
  limitFluff,
  limitMarks,
  limitPooledEffects,
  limitSounds,
} from "./limits";
import { lookAt, restingFace } from "./looks";
import type { Part, SoundPart } from "./part";
import type {
  Becomes,
  Channel,
  DustChange,
  Effect,
  EndBeats,
  Faces,
  Key,
  Look,
  PieceTrack,
  SoundCue,
  SpriteTrack,
  Timeline,
  WaveMark,
} from "./timeline";

/** Describes a piece's track as the draft builds it. */
interface TrackDraft {
  readonly id: number;
  readonly fromMs: number;
  untilMs: number | null;
  readonly drawn: Piece;
  readonly look: Look;
  readonly face: FuzzballFace;
  readonly keys: Map<Channel, Key[]>;
  readonly becomes: Becomes[];
  readonly faces: Faces[];
  readonly facesAgain: FaceAgain[];
}

/** Describes a face a piece's eyes take again, as a draft holds it until it knows whether another came between. */
type FaceAgain = Extract<Part, { readonly what: "face-again" }>;

/** Describes a glow a draft holds until the flashes' limit keeps it or drops it. */
type Glow = Extract<Part, { readonly what: "glow" }>;

/** Builds a move's timeline from the parts its events add. */
export class Draft {
  readonly #tracks = new Map<number, TrackDraft>();
  readonly #sprites: SpriteTrack[] = [];
  readonly #effects: Effect[] = [];
  readonly #glows: Glow[] = [];
  readonly #claims: Claim[] = [];
  readonly #dust: DustChange[] = [];
  readonly #marks: WaveMark[] = [];
  readonly #sounds: SoundPart[] = [];
  readonly #dim: Key[] = [];
  readonly #goals: readonly GoalShown[];
  #hurriedFromMs = Infinity;
  #windTurnsMs: number | null = null;

  /**
   * Starts a draft with a track for each piece on a board as it stands, at
   * its square, the goals as they stand counting what it gathers, in a
   * motion the player sets.
   */
  constructor(
    board: GridShown,
    goals: readonly GoalShown[],
    /** The motion the move plays in, by which the draft keeps its effects and flights and each event plays its own version. */
    readonly motion: Motion,
  ) {
    this.#goals = goals;
    board.squares.forEach((square, index) => {
      const piece = square?.piece ?? null;
      if (piece !== null) {
        this.#show(piece, 0, lookAt(squareOf(index, board.width)), null);
      }
    });
  }

  /**
   * Adds the parts an event plays, and returns the latest moment they hold
   * the board until, or -Infinity where they hold it for none.
   *
   * @throws {Error} for a part of a piece the draft has no track for, or a
   *   piece shown twice.
   */
  add(parts: readonly Part[]): number {
    let heldMs = -Infinity;
    for (const part of parts) {
      switch (part.what) {
        case "key":
          this.#keysOf(part.piece, part.channel).push(part.key);
          break;
        case "face":
          this.#track(part.piece).faces.push({
            atMs: part.atMs,
            face: part.face,
          });
          break;
        case "face-again":
          this.#track(part.piece).facesAgain.push(part);
          break;
        case "becomes":
          this.#track(part.piece).becomes.push({
            atMs: part.atMs,
            piece: part.drawn,
          });
          break;
        case "shows":
          this.#show(part.piece, part.atMs, part.look, part.face);
          break;
        case "leaves": {
          const track = this.#track(part.piece);
          track.untilMs = Math.min(track.untilMs ?? Infinity, part.atMs);
          break;
        }
        case "sprite":
          this.#sprites.push(part.sprite);
          break;
        case "effect":
          this.#effects.push(part.effect);
          break;
        case "glow":
          // Its piece is held to having a track now, as a key's is, though
          // its keys wait on the flashes' limit.
          this.#track(part.piece);
          this.#glows.push(part);
          break;
        case "gathered":
        case "counted":
          this.#claims.push(part);
          break;
        case "dust":
          this.#dust.push(part.change);
          break;
        case "mark":
          this.#marks.push(part.mark);
          break;
        case "sound":
          this.#sounds.push(part);
          break;
        case "dim":
          this.#dim.push(part.key);
          break;
        case "hold":
          heldMs = Math.max(heldMs, part.atMs);
          break;
        case "wind-turns":
          this.#windTurnsMs = part.atMs;
          break;
      }
    }
    return heldMs;
  }

  /**
   * Has the flashes from a moment on keep their gap at the hurried pace, as
   * a tap may hurry the encore and the level's end by.
   */
  hurries(fromMs: number): void {
    this.#hurriedFromMs = Math.min(this.#hurriedFromMs, fromMs);
  }

  /**
   * Returns the timeline the draft's parts make, each list in the order it
   * starts, the flights and counts of what the goals count, and what the
   * move plays held to the design's limits: its flashes and glows, its
   * loose bits, its flights and its sounds' gaps; and to a scene's pools,
   * with the moment the wind turns, where a part turns it.
   */
  finish(
    restMs: number,
    end: EndBeats | null,
    feel: FeelTuning,
    pools: Pools,
  ): Timeline {
    const less = this.motion === "less";
    const effects = less
      ? withLessMotion(byStart(this.#effects), feel)
      : byStart(this.#effects);
    const flashes = limitFlashes(
      byStart<Effect | Glow>([
        ...effects.filter(({ what }) => what === "flash"),
        ...(less ? [] : this.#glows),
      ]),
      this.#hurriedFromMs,
      feel,
    );
    const glows = new Map<number, readonly Key[]>();
    for (const flash of flashes) {
      if (flash.what === "glow") {
        glows.set(flash.piece, [
          ...(glows.get(flash.piece) ?? []),
          { atMs: flash.atMs, ms: 0, to: flash.amount, easing: "linear" },
          { atMs: flash.atMs, ms: flash.ms, to: 0, easing: "out" },
        ]);
      }
    }
    const sprites = [...this.#sprites].sort((a, b) => a.fromMs - b.fromMs);
    const { flights, counts, sounds } = flightsOf(
      this.#claims,
      this.#goals,
      less ? 0 : feel.mostFlights,
      feel,
    );
    return {
      pieces: Array.from(this.#tracks.values(), (track) =>
        finished(track, glows.get(track.id) ?? []),
      ),
      sprites,
      effects: limitPooledEffects(
        limitFluff(
          effects.filter(
            (effect) => effect.what !== "flash" || flashes.includes(effect),
          ),
          sprites,
          feel,
        ),
        pools,
      ),
      flights,
      counts,
      dust: byStart(this.#dust),
      marks: limitMarks(byStart(this.#marks), pools, feel),
      sounds: limitSounds(byStart([...this.#sounds, ...sounds]), feel).map(
        playedAs,
      ),
      dim: byStart(this.#dim),
      restMs,
      end,
      ...(this.#windTurnsMs === null ? {} : { windTurnsMs: this.#windTurnsMs }),
    };
  }

  /** Adds a piece's track, from a moment, as it looks then. */
  #show(
    piece: Piece,
    fromMs: number,
    look: Look,
    face: FuzzballFace | null,
  ): void {
    if (this.#tracks.has(piece.id)) {
      throw new Error(`Piece ${String(piece.id)} shows twice in a move.`);
    }
    this.#tracks.set(piece.id, {
      id: piece.id,
      fromMs,
      untilMs: null,
      drawn: piece,
      look,
      face: face ?? restingFace(piece),
      keys: new Map(),
      becomes: [],
      faces: [],
      facesAgain: [],
    });
  }

  /** Returns a piece's track. */
  #track(piece: number): TrackDraft {
    const track = this.#tracks.get(piece);
    if (track === undefined) {
      throw new Error(`No piece ${String(piece)} is on the board in a move.`);
    }
    return track;
  }

  /** Returns the keys of a number of a piece's look, to add to. */
  #keysOf(piece: number, channel: Channel): Key[] {
    const keys = this.#track(piece).keys;
    const ofChannel = keys.get(channel) ?? [];
    keys.set(channel, ofChannel);
    return ofChannel;
  }
}

/** Returns the cue a sound part plays as: a sound on a rung of the ladder plays the take nearest it, tuned by the cents between. */
function playedAs(part: SoundPart): SoundCue {
  const { sound, cents } =
    part.rung === null
      ? { sound: part.sound, cents: 0 }
      : onRung(part.sound, part.rung);
  return { atMs: part.atMs, sound, cents, volume: part.volume };
}

/** Returns a piece's track as the timeline has it, its glows kept by the flashes' limit among its keys, each list in the order it starts. */
function finished(track: TrackDraft, glows: readonly Key[]): PieceTrack {
  const keys = new Map<Channel, readonly Key[]>(track.keys);
  if (glows.length > 0) {
    keys.set("glow", [...(keys.get("glow") ?? []), ...glows]);
  }
  return {
    id: track.id,
    fromMs: track.fromMs,
    untilMs: track.untilMs,
    drawn: track.drawn,
    look: track.look,
    face: track.face,
    keys: Object.fromEntries(
      Array.from(keys, ([channel, ofChannel]) => [channel, byStart(ofChannel)]),
    ),
    becomes: byStart(track.becomes),
    faces: byStart([
      ...track.faces,
      ...track.facesAgain.filter(
        ({ atMs, sinceMs }) =>
          !track.faces.some((face) => face.atMs > sinceMs && face.atMs <= atMs),
      ),
    ]).map(({ atMs, face }) => ({ atMs, face })),
  };
}
