import { InjectionToken } from "@angular/core";
import type { ComponentLoad } from "@fz/ui/on_demand";

/**
 * Loads How to play, its chunk fetched as it first opens: but in specs,
 * which load it slowly or fail to.
 */
export const LOAD_HELP = new InjectionToken<ComponentLoad>("LOAD_HELP", {
  providedIn: "root",
  factory: () => () =>
    import("./help.component").then((chunk) => chunk.HelpComponent),
});
