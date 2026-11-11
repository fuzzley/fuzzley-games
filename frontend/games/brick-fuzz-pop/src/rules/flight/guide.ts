// The guide: where a shot flies to its first turn and a little past it, and
// what it punches through on the way, worked out by the flight's own rules
// so it never shows what the shot won't do.

import {
  RULES,
  type RoundRules,
  type RoundStart,
  flightRulesOf,
  flightStartOf,
} from "../round/round";
import type { Shot } from "../shot";
import { GUIDE_DOT_GAP } from "../tuning";
import { type BallTrack, positionAt } from "./events";
import { fly } from "./flight";

/** Describes a place on the field, in field units. */
export interface GuidePlace {
  readonly x: number;
  readonly y: number;
}

/** Describes the guide a shot shows before it is released. */
export interface Guide {
  /** Where each dot's middle lies, `GUIDE_DOT_GAP` apart along the shot's flight to its first turn and the guide's length past it. */
  readonly dots: readonly GuidePlace[];
  /** The wall cell of each brick the shot would punch through by then, in the order it would, in the wall it is aimed at. */
  readonly punched: readonly number[];
}

/**
 * Returns the guide of a shot from where a round starts: the player's
 * fuzzball flown as `playRound()` flies it, until `pastTurn`, not below 0,
 * past its first turn, `GUIDE_PAST_TURN` unless the debug menu retunes it.
 *
 * It flies without the mates and friends behind it, which take the same
 * path and would cost several times as long, though one could change the
 * player's path before the guide ends only by a zap set off behind it.
 *
 * It throws a `RangeError` for an aim that isn't one of the 657.
 */
export function guideOf(
  start: RoundStart,
  shot: Shot,
  pastTurn: number,
  rules: RoundRules = RULES,
): Guide {
  const { flight, punched } = fly(
    { ...flightStartOf(start, shot), mates: 0, friends: 0 },
    flightRulesOf(rules),
    { stop: "first-turn", extra: pastTurn },
  );
  // The tracks go by ball, so the player's fuzzball's is the first.
  return { dots: flight.tracks.slice(0, 1).flatMap(dotsAlong), punched };
}

/** Returns the guide's dots along a fuzzball's track, from where it leaves to where it ends. */
function dotsAlong(track: BallTrack): GuidePlace[] {
  const dots: GuidePlace[] = [];
  for (let dot = 1; ; dot++) {
    const place = positionAt(track, dot * GUIDE_DOT_GAP);
    if (place === null) {
      return dots;
    }
    dots.push({ x: place.x, y: place.y });
  }
}
