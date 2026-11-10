/// <reference types="vite/client" />
import { DOCUMENT } from "@angular/common";
import { InjectionToken, inject } from "@angular/core";

/**
 * Whether the game is a development build, as its own dev server runs it:
 * `import.meta.env.DEV`, which a spec can't change, unless it provides
 * another.
 */
export const DEV_BUILD = new InjectionToken<boolean>("DEV_BUILD", {
  providedIn: "root",
  factory: () => import.meta.env.DEV,
});

/**
 * Whether the game offers its debug menu: in a development build, and in a
 * production one only when the page's address asks for it with `?debug`,
 * so the feel can be tuned on the site itself.
 */
export const DEBUG_MENU = new InjectionToken<boolean>("DEBUG_MENU", {
  providedIn: "root",
  factory: () =>
    inject(DEV_BUILD) ||
    new URLSearchParams(inject(DOCUMENT).location.search).has("debug"),
});
