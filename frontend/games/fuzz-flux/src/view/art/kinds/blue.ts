// The blue kind, round: a whole coat of short fur, its tips nearly even all
// round, so its outline is a fuzzy disc and nothing more.

import { ORIGIN } from "@fz/phaser/shapes";
import {
  type Coat,
  type KindArt,
  STRAND_WIDTH,
  coat,
  strokes,
} from "./kind_art";

/** Its coat, longer than the other kinds' and evenly ringed. */
const COAT: Coat = { count: 27, reach: 1.2, vary: 0.14, bend: 0.2, seed: 11 };

/** The blue kind's art, which sits in the middle of its square. */
export const BLUE: KindArt = {
  seat: ORIGIN,
  fur: (ink, lift) => strokes(coat(COAT, lift), ink, STRAND_WIDTH),
};
