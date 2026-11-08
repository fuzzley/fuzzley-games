import type { RunRecords } from "../rules/run/stats";

/**
 * Returns what a change in a run brings to the records: nothing but what is
 * given, at Normal unless it says.
 */
export function runRecords(change: Partial<RunRecords>): RunRecords {
  return {
    speed: "normal",
    started: false,
    strays: 0,
    reached: [],
    clearedAll: false,
    ended: null,
    ...change,
  };
}
