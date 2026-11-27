// A move's timeline as its events add to it: a track for each piece on the
// board as the move starts and each it brings in, and the lists of what
// else it plays. Once every event is in, the draft lays each track's keys
// in the order they start, holds what the move plays to the design's
// limits, and hands back the timeline.

import type { FuzzballFace } from "@fz/style/fuzzball";
import { squareOf } from "../../rules/board/cells";
import type { Piece } from "../../rules/catalog/pieces";
import { rungCentsOf } from "../effects/ladder";
import type { GridShown } from "../run_state";
import type { FeelTuning } from "./feel";
import { limitFlashes, limitFluff, limitSounds } from "./limits";
import { lookAt, restingFace } from "./looks";
import type { Part } from "./part";
import type {
  Becomes,
  Channel,
  Effect,
  EndBeats,
  Faces,
  Key,
  Look,
  PieceTrack,
  SoundCue,
  SpriteTrack,
  Timeline,
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
}

/** Describes a glow a draft holds until the flashes' limit keeps it or drops it. */
type Glow = Extract<Part, { readonly what: "glow" }>;

/** Builds a move's timeline from the parts its events add. */
export class Draft {
  readonly #tracks = new Map<number, TrackDraft>();
  readonly #sprites: SpriteTrack[] = [];
  readonly #effects: Effect[] = [];
  readonly #glows: Glow[] = [];
  readonly #sounds: SoundCue[] = [];
  readonly #dim: Key[] = [];

  /** Starts a draft with a track for each piece on a board as it stands, at its square. */
  constructor(board: GridShown) {
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
        case "sound":
          this.#sounds.push({
            atMs: part.atMs,
            sound: part.sound,
            cents: part.rung === null ? 0 : rungCentsOf(part.rung),
            volume: part.volume,
          });
          break;
        case "dim":
          this.#dim.push(part.key);
          break;
        case "hold":
          heldMs = Math.max(heldMs, part.atMs);
          break;
      }
    }
    return heldMs;
  }

  /**
   * Returns the timeline the draft's parts make, each list in the order it
   * starts, and what the move plays held to the design's limits: its
   * flashes and glows, its loose bits and its sounds' gaps.
   */
  finish(restMs: number, end: EndBeats | null, feel: FeelTuning): Timeline {
    const effects = byStart(this.#effects);
    const flashes = limitFlashes(
      byStart<Effect | Glow>([
        ...effects.filter(({ what }) => what === "flash"),
        ...this.#glows,
      ]),
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
    return {
      pieces: Array.from(this.#tracks.values(), (track) =>
        finished(track, glows.get(track.id) ?? []),
      ),
      sprites,
      effects: limitFluff(
        effects.filter(
          (effect) => effect.what !== "flash" || flashes.includes(effect),
        ),
        sprites,
        feel,
      ),
      flights: [],
      counts: [],
      dust: [],
      marks: [],
      sounds: limitSounds(byStart(this.#sounds), feel),
      dim: byStart(this.#dim),
      restMs,
      end,
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
    faces: byStart(track.faces),
  };
}

/** Returns a list in the order its items start, those that start together in the order given. */
function byStart<T extends { readonly atMs: number }>(
  items: readonly T[],
): readonly T[] {
  return [...items].sort((a, b) => a.atMs - b.atMs);
}
