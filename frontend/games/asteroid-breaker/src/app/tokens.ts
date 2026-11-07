import { DOCUMENT } from "@angular/common";
import { InjectionToken, inject } from "@angular/core";
import { WAVES, type WaveEntry } from "../rules/waves/waves";

/** Where new runs take their seeds from: `Math.random` but in specs. */
export const GAME_RANDOM = new InjectionToken<() => number>("GAME_RANDOM", {
  providedIn: "root",
  factory: () => Math.random,
});

/** Whether the game is a development build, as its own dev server runs it. */
export const DEV_BUILD = new InjectionToken<boolean>("DEV_BUILD", {
  providedIn: "root",
  factory: () => import.meta.env.DEV,
});

/**
 * Whether the settings offer the debug menu: in a development build, and in
 * a production one only when the page's address asks for it with `?debug`,
 * so the feel can be tuned on the site itself.
 */
export const DEBUG_MENU = new InjectionToken<boolean>("DEBUG_MENU", {
  providedIn: "root",
  factory: () =>
    inject(DEV_BUILD) ||
    new URLSearchParams(inject(DOCUMENT).location.search).has("debug"),
});

/** The waves a run is played through, in order: the game's but in specs. */
export const GAME_WAVES = new InjectionToken<readonly WaveEntry[]>(
  "GAME_WAVES",
  { providedIn: "root", factory: () => WAVES },
);
