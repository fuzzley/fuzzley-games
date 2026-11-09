import { InjectionToken } from "@angular/core";

/**
 * Where a game draws the seeds of its new runs and deals from:
 * `Math.random` unless a spec provides a source of its own.
 */
export const GAME_RANDOM = new InjectionToken<() => number>("GAME_RANDOM", {
  providedIn: "root",
  factory: () => Math.random,
});
