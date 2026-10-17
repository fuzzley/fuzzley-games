import { DOCUMENT } from "@angular/common";
import { InjectionToken, inject } from "@angular/core";

/**
 * The browser's localStorage, or null where there is none: some private
 * windows, and browsers set to block site data, throw on the mere access.
 * Writing can still fail where it exists (a full or read-only store), so
 * a caller catches that too.
 */
export const BROWSER_STORAGE = new InjectionToken<Storage | null>(
  "BROWSER_STORAGE",
  {
    providedIn: "root",
    factory: () => {
      try {
        return inject(DOCUMENT).defaultView?.localStorage ?? null;
      } catch {
        return null;
      }
    },
  },
);
