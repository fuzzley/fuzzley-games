// A wall game's run driven from each shot's release to the next aim: the
// frame played, a flight landed at once, the board's drawn gate, the field
// reshaped and its depth caught up between rounds, the run's moves and what
// is said of them, and the level's rounds recorded for a bug report. How a
// round plays, its guide, its words, its records and its play are the
// game's own, which it hands in.

export {
  type DrivenLevel,
  type DrivenRound,
  type DrivenStart,
  type LandingRecords,
  RoundDriver,
  type RoundDriving,
  type RoundWords,
  type RunBegun,
} from "./round_driver/round_driver";
