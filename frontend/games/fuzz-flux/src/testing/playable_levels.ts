// The levels whose every part the game's rules play: those whose board
// holds no element still played by the stand-in, and whose wind, where it
// turns, the wind's rule turns. The golden games and the random moves that
// hold the rules to the sketch play these, so each element's package lets
// its levels in as it takes its id off `STAND_INS`, and the wind's package
// lets in the levels whose wind turns.

import { isOneOf } from "@fz/core/records";
import { layOut } from "../rules/board/picture";
import { ELEMENT_IDS, type ElementId } from "../rules/catalog/elements";
import { STAND_INS, WIND_RULE } from "../rules/elements/element_rules";
import bedtime from "../rules/levels/bedtime.json";
import bricksAndBars from "../rules/levels/bricks-and-bars.json";
import { type Level, levelSetOf } from "../rules/levels/level";
import warmUp from "../rules/levels/warm-up.json";
import windyDays from "../rules/levels/windy-days.json";
import { DESIGN_SETS } from "./design_files";

/** Describes a level whose every part the rules play, and the set of the design's it is in. */
export interface PlayableLevel {
  readonly set: (typeof DESIGN_SETS)[number];
  readonly level: Level;
}

/** Each set's file as the game keeps it, by the name of the design's file it copies. */
const COPIES: Readonly<Record<(typeof DESIGN_SETS)[number], unknown>> = {
  "warm-up": warmUp,
  "bricks-and-bars": bricksAndBars,
  bedtime,
  "windy-days": windyDays,
};

/** Every level of the four sets whose every part the rules play, in the order they are played. */
export const PLAYABLE_LEVELS: readonly PlayableLevel[] = DESIGN_SETS.flatMap(
  (set) =>
    levelSetOf(COPIES[set])
      .levels.filter(isPlayable)
      .map((level) => ({ set, level })),
);

/** Returns whether the rules play every part of a level: each element its board holds, and its wind where it turns. */
function isPlayable(level: Level): boolean {
  const turning = level.wind?.turns ?? null;
  return (
    !elementsOn(level).some((element) => isOneOf(element, STAND_INS)) &&
    (turning === null || WIND_RULE.afterMove !== undefined)
  );
}

/** Returns the elements a level's board holds, as its pictures lay it out. */
function elementsOn({ board, dust }: Level): readonly ElementId[] {
  const { placed, dust: layers } = layOut(board, dust);
  const holds: Readonly<Record<ElementId, boolean>> = {
    dust: layers.some((layer) => layer > 0),
    brick: placed.some(({ what }) => what === "brick"),
    cage: placed.some((square) => square.what === "fuzzball" && square.caged),
    sleepyhead: placed.some(({ what }) => what === "sleepyhead"),
    burr: placed.some((square) => square.what === "fuzzball" && square.burred),
  };
  return ELEMENT_IDS.filter((element) => holds[element]);
}
