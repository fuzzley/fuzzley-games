import type { CatalogHelp } from "../catalog_entries";

/** The wind, as How to play lists it, with no picture: it shows as the arrow beside the goals, not on the board. */
export const WIND_HELP = {
  name: "Wind",
  about:
    "Makes fuzzballs fall the way its arrow points. New ones come in from the other side.",
  pictureIn: () => null,
} as const satisfies CatalogHelp;

/** A wind that turns, as How to play lists it, with no picture, as the wind has none. */
export const TURNING_WIND_HELP = {
  name: "Turning wind",
  about:
    "Makes a quarter turn every few moves. The number under its arrow counts down the moves.",
  pictureIn: () => null,
} as const satisfies CatalogHelp;
