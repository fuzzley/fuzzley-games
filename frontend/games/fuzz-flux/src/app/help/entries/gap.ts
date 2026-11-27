import type { CatalogHelp } from "../catalog_entries";

/** A gap, as How to play lists it, with no picture: the board shows a gap as nothing at all. */
export const GAP_HELP = {
  name: "Gap",
  about: "Has no square. Fuzzballs fall past it.",
  pictureIn: () => null,
} as const satisfies CatalogHelp;
