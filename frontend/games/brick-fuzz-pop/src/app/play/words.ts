import type { RoundWords } from "@fz/brick-wall/app/round_driver";
import { type LevelEntry, parseLevel } from "../../rules/levels/levels";
import type { Round, RoundStart } from "../../rules/round/round";
import {
  describeCleared,
  describeEnd,
  describeLevel,
  describePause,
  describeResume,
  describeRound,
  describeTakenUp,
} from "../../rules/run/describe";
import type { LevelCounts } from "../../rules/run/run";

/** What the game says as its run goes, each moment's words the rules' own. */
export const ROUND_WORDS: RoundWords<
  LevelCounts,
  LevelEntry,
  RoundStart,
  Round
> = {
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
