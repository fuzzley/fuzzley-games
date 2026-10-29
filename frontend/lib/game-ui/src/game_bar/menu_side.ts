import type { BarPlacement } from "./game_bar.component";

/** Names the side of its button a menu in a bar opens on. */
export type MenuSide = "below" | "above" | "after" | "before";

/**
 * Returns the side a menu in a bar at a placement opens on: away from the
 * edge the bar stands against, over the game.
 */
export function menuSide(placement: BarPlacement): MenuSide {
  switch (placement) {
    case "top":
      return "below";
    case "bottom":
      return "above";
    case "start":
      return "after";
    case "end":
      return "before";
  }
}

/** Returns whether a menu opens off the side of a rail, rather than a row. */
export function opensFromRail(side: MenuSide): boolean {
  return side === "after" || side === "before";
}
