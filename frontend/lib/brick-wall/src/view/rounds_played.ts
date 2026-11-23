// What a wall game's play of its rounds is to its round's driver: where a
// round stands, what a frame of it came to, and the moves the driver makes
// on it. The play is the game's own, in its view, and plays each frame as
// its game asks.

/** Names where a round stands: aimed, its flight played back, or the wall settling after it. */
export type RoundPhase = "aiming" | "flying" | "settling";

/** Names the card over a level's end: Cleared, or the result of a run that ended. */
export type LevelCard = "cleared" | "result";

/** Describes where a wall game's play of its rounds stands: where a round starts, `N`, and a round played, `D`. */
export interface PlayState<N, D> {
  /** Where the round aimed, or in play, started. */
  readonly start: N;
  /** The round in play once it is released, until the next is aimed; else null. */
  readonly round: D | null;
  readonly phase: RoundPhase;
  /** The points the round in play's flight has played back so far. */
  readonly scored: number;
}

/** Describes what a frame of a wall game's play of its rounds came to, over a round played, `D`. */
export interface FrameChange<D> {
  /** The round whose wall the frame brought to rest, after which the next may be aimed; else null. */
  readonly settled: D | null;
  /** The card whose wait the frame ran out, after a round that cleared or lost the level; else null. */
  readonly opens: LevelCard | null;
}

/**
 * Describes a wall game's play of its rounds as its round's driver reads
 * and moves it: where a round starts, `N`, and a round played, `D`. The
 * game plays it on by a frame's time itself, as its driver asks.
 */
export interface RoundsPlayed<N, D> extends PlayState<N, D> {
  /** The moment of the round in play's flight the playback has reached, in field units. */
  readonly moment: number;
  /** Aims a round from where it starts, leaving any round in play and any card's wait. */
  aim(start: N): void;
  /** Starts playing back the round released from the start aimed, its whole flight decided. */
  release(round: D): void;
  /** Lands the flight in play at once, at the next frame played. */
  skip(): void;
}
