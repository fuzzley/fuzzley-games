// How a level ends, on its last move's timeline: once a move clears it,
// the win sounds, the board cheers its biggest but with Less motion, and
// the encore plays each spare move to its own sound, a plain fuzzball
// given a special's fur and set off, its waves played as a move's; then
// the Cleared card, each star it earned lit a beat apart with its note.
// Once a move runs out with goals left, the loss sounds and the Out of
// moves card shows.

import { itemAt } from "@fz/core/records";
import type { Outcome, Wind } from "../../rules/board/board";
import type { EncoreRecord, SpareMove } from "../../rules/move/record";
import type { SoundName } from "../effects/sounds";
import type { MovePlayed } from "./after_waves";
import { isMadeId, pieceMadeOf } from "./board_after";
import type { Draft } from "./draft";
import { BIGGEST_CHEER, cheered } from "./events/cheer";
import type { FeelTuning } from "./feel";
import { type Part, cue, facing, moves, sets } from "./part";
import { everyStanding } from "./standing";
import type { EndBeats } from "./timeline";
import { type WavePlayed, playWave } from "./wave";

/** Describes a level a move clears: what its encore did, and how many stars it earned. */
export interface Cleared {
  readonly encore: EncoreRecord;
  /** From 1 to 3. */
  readonly stars: number;
}

/** Describes how a level's last move ends: when the board is at rest, and the level's end. */
export interface LevelEnd {
  readonly restMs: number;
  /** The level's end, or null for a move after which it plays on. */
  readonly end: EndBeats | null;
}

/** The note each star the Cleared card lights plays, in order. */
const STAR_SOUNDS = [
  "star-1",
  "star-2",
  "star-3",
] as const satisfies readonly SoundName[];

/**
 * Adds the parts of a level's end after a move to its draft, from when the
 * move lets the board rest, the wind blowing as it left it, and returns
 * when the board rests at last and the level's end beats.
 *
 * @throws {RangeError} for a move that clears its level given no encore,
 *   or a spare move whose first blast is no special a fuzzball is made.
 */
export function playLevelEnd(
  draft: Draft,
  outcome: Outcome,
  cleared: Cleared | null,
  { blows, ...played }: MovePlayed,
  feel: FeelTuning,
): LevelEnd {
  switch (outcome) {
    case "playing":
      return { restMs: played.endMs, end: null };
    case "over":
      draft.add([cue("lose", played.endMs + feel.loseSoundAfterMs)]);
      return {
        restMs: played.endMs,
        end: {
          cardMs: played.endMs + feel.overCardAfterMs,
          starsMs: [],
          hurriedFromMs: null,
        },
      };
    case "cleared": {
      if (cleared === null) {
        throw new RangeError("A move that clears its level needs its encore.");
      }
      const hurriedFromMs = played.endMs;
      draft.hurries(hurriedFromMs);
      draft.add([
        cue("win", played.endMs + feel.winSoundAfterMs),
        ...(draft.motion === "less"
          ? []
          : cheered(
              BIGGEST_CHEER,
              played.endMs,
              everyStanding(played.grid),
              feel,
            )),
      ]);
      let encored: WavePlayed = {
        endMs: played.endMs + feel.encoreAfterMs,
        grid: played.grid,
      };
      for (const spare of cleared.encore.spares) {
        encored = playSpare(draft, spare, encored, blows, feel);
      }
      const cardMs = encored.endMs + feel.clearedCardAfterMs;
      const starsMs = STAR_SOUNDS.slice(0, cleared.stars).map(
        (_, star) => cardMs + feel.starsAfterMs + (star + 1) * feel.starGapMs,
      );
      draft.add(
        starsMs.map((atMs, star) => cue(itemAt(STAR_SOUNDS, star), atMs)),
      );
      return {
        restMs: encored.endMs,
        end: { cardMs, starsMs, hurriedFromMs },
      };
    }
  }
}

/** Adds the parts of a spare move, from when the board may go on, and returns when it may go on after it and how it is left. */
function playSpare(
  draft: Draft,
  spare: SpareMove,
  played: WavePlayed,
  blows: Wind,
  feel: FeelTuning,
): WavePlayed {
  draft.add(specialGiven(spare, played.endMs, feel));
  let { endMs, grid } = played;
  endMs += feel.encoreSpareMs;
  for (const wave of spare.waves) {
    ({ endMs, grid } = playWave(draft, wave, grid, blows, endMs, feel));
  }
  return { endMs, grid };
}

/** Returns the parts of a spare move's fuzzball given the fur of the special it makes from a moment, to the encore's sound, its second fur growing in as it glows, wide-eyed. */
function specialGiven(
  spare: SpareMove,
  atMs: number,
  feel: FeelTuning,
): readonly Part[] {
  const blast = itemAt(itemAt(spare.waves, 0).blasts, 0);
  if (!isMadeId(blast.what) || blast.piece === null || blast.kind === null) {
    throw new RangeError(
      `A spare move sets off ${blast.what}, which no fuzzball is made.`,
    );
  }
  const id = blast.piece;
  return [
    cue("encore", atMs),
    {
      what: "becomes",
      piece: id,
      atMs,
      drawn: pieceMadeOf(blast.what, id, blast.kind),
    },
    facing(id, atMs, "eep"),
    ...sets(id, atMs, { furIn: 0 }),
    ...moves(id, atMs, feel.encoreFurMs, "back", { furIn: 1 }),
    {
      what: "glow",
      piece: id,
      atMs,
      ms: feel.encoreGlowMs,
      amount: feel.encoreGlow,
    },
  ];
}
