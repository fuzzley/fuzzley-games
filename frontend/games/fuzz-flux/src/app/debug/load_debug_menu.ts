import { InjectionToken } from "@angular/core";
import type { ComponentLoad } from "@fz/ui/on_demand";

/**
 * Loads the debug menu, its chunk fetched as the settings drawer is first
 * drawn where the menu is offered: but in specs, which load it slowly or
 * fail to.
 */
export const LOAD_DEBUG_MENU = new InjectionToken<ComponentLoad>(
  "LOAD_DEBUG_MENU",
  {
    providedIn: "root",
    factory: () => () =>
      import("./debug_menu.component").then(
        (chunk) => chunk.DebugMenuComponent,
      ),
  },
);
