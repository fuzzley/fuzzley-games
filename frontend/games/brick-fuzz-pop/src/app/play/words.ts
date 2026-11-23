import { parseLevel } from "../../rules/levels/levels";
import {
  describeCleared,
  describeEnd,
  describeLevel,
  describePause,
  describeResume,
  describeRound,
  describeTakenUp,
} from "../../rules/run/describe";
import type { RoundWords } from "./round_driver";

/** What the game says as its run goes, each moment's words the rules' own. */
export const ROUND_WORDS: RoundWords = {
  // A round that leaves the level on is said of the next as it is aimed;
  // one that ends it, of the wall it leaves.
  round: ({ outcome, next }, aimed) =>
    describeRound(outcome, outcome.result === "on" ? aimed : next),
  level: (level) => describeLevel(level, parseLevel(level.data).boon),
  cleared: describeCleared,
  end: describeEnd,
  pause: describePause,
  resume: describeResume,
  takenUp: describeTakenUp,
};

/**
 * Returns what is said as F switches fast-forward on or off, which the bar's
 * button says for a press by being pressed or not.
 */
export function fastForwardWords(on: boolean): string {
  return on ? "Fast-forward on." : "Fast-forward off.";
}
