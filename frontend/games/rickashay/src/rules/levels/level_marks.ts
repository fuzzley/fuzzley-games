// Every set's marks, as `yarn certify:levels` writes them in marks/, listed
// once for the game, the specs and the scripts: a set listed in levels.ts
// lists its marks here too. They are kept out of levels.ts, which the run's
// modules import, so that it never imports the run's stars.

import { type Marks, marksOf } from "../run/stars";
import anglesMarks from "./marks/angles.json";
import longRalliesMarks from "./marks/long-rallies.json";
import tricksMarks from "./marks/tricks.json";
import warmUpMarks from "./marks/warm-up.json";

/** Every level's par and rally mark on every depth, from each set's marks, in the order the sets are played. */
export const LEVEL_MARKS: Marks = marksOf([
  warmUpMarks,
  anglesMarks,
  tricksMarks,
  longRalliesMarks,
]);
