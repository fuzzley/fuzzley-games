import type { BarPlacement } from "./game_bar.component";
import { type MenuSide, menuSide, opensFromRail } from "./menu_side";

describe("menuSide", () => {
  it.each<[BarPlacement, MenuSide]>([
    ["top", "below"],
    ["bottom", "above"],
    ["start", "after"],
    ["end", "before"],
  ])("opens a menu in a bar at the %s %s its button", (placement, side) => {
    expect(menuSide(placement)).toBe(side);
  });
});

describe("opensFromRail", () => {
  it.each<[MenuSide, boolean]>([
    ["below", false],
    ["above", false],
    ["after", true],
    ["before", true],
  ])("says whether a menu %s its button opens from a rail", (side, rail) => {
    expect(opensFromRail(side)).toBe(rail);
  });
});
