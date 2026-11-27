// A move's record as the screen shows it. The rules play a move in the
// board's own frame, which the wind turns, and hand its record back in the
// screen's: every square where the screen shows it, a bunch's squares in
// their order there, and a dasher's way the way it runs on the screen. A
// fall's lane alone stays the frame's, as its refills are counted.

import { isKeyOf } from "@fz/core/records";
import type { Game } from "../board/board";
import { DASHERS_TURNED, onScreen } from "../board/orientation";
import type { BlastId, MadeId } from "../catalog/specials";
import type { Blast, Bunch, Fall, Hit, Wave } from "./record";

/** Describes the frame a move was played in: its board's size, and how far it is turned from the screen's. */
type Frame = Pick<Game, "board" | "turns">;

/** Each blast that runs a dasher's way, and the way it runs once its frame has turned a quarter. */
const BLASTS_TURNED = {
  ...DASHERS_TURNED,
  "wisp-and-dasher-across": "wisp-and-dasher-down",
  "wisp-and-dasher-down": "wisp-and-dasher-across",
} as const satisfies Partial<Readonly<Record<BlastId, BlastId>>>;

/** Returns a wave played in a frame as the screen shows it. */
export function waveOnScreen(wave: Wave, frame: Frame): Wave {
  if (frame.turns === 0) {
    return wave;
  }
  return {
    ...wave,
    bunches: wave.bunches.map((bunch) => bunchOnScreen(bunch, frame)),
    blasts: wave.blasts.map((blast) => blastOnScreen(blast, frame)),
    hits: wave.hits.map((hit) => hitOnScreen(hit, frame)),
    falls: wave.falls.map((fall) => fallOnScreen(fall, frame)),
  };
}

/** Returns a bunch gathered in a frame as the screen shows it, its squares in their order there. */
function bunchOnScreen({ squares, kind, makes }: Bunch, frame: Frame): Bunch {
  return {
    squares: squares
      .map((square) => onScreen(frame, square))
      .sort((a, b) => a - b),
    kind,
    makes:
      makes === null
        ? null
        : {
            ...makes,
            what: madeOnScreen(makes.what, frame),
            square: onScreen(frame, makes.square),
          },
  };
}

/** Returns a blast gone off in a frame as the screen shows it. */
function blastOnScreen(blast: Blast, frame: Frame): Blast {
  return {
    ...blast,
    what:
      turnsWays(frame) && isKeyOf(blast.what, BLASTS_TURNED)
        ? BLASTS_TURNED[blast.what]
        : blast.what,
    square: onScreen(frame, blast.square),
    strikes: blast.strikes.map((strike) => ({
      ...strike,
      square: onScreen(frame, strike.square),
    })),
  };
}

/** Returns a hit in a frame as the screen shows it. */
function hitOnScreen(hit: Hit, frame: Frame): Hit {
  const square = onScreen(frame, hit.square);
  return hit.what === "born"
    ? { ...hit, square, made: madeOnScreen(hit.made, frame) }
    : { ...hit, square };
}

/** Returns a piece's way down in a frame as the screen shows it, its lane the frame's still. */
function fallOnScreen(fall: Fall, frame: Frame): Fall {
  return {
    ...fall,
    from: fall.from === null ? null : onScreen(frame, fall.from),
    path: fall.path.map((square) => onScreen(frame, square)),
  };
}

/** Returns what a bunch made in a frame as the screen shows it, a dasher the way it runs there. */
function madeOnScreen(made: MadeId, frame: Frame): MadeId {
  return turnsWays(frame) && isKeyOf(made, DASHERS_TURNED)
    ? DASHERS_TURNED[made]
    : made;
}

/** Returns whether a frame is turned an odd count of quarters from the screen's, so that a dasher's way in it is the other way there. */
function turnsWays({ turns }: Frame): boolean {
  return turns % 2 === 1;
}
