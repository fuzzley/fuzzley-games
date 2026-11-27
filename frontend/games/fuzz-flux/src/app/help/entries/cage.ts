import type { CatalogHelp } from "../catalog_entries";

/** A cage, as How to play lists it, pictured as the bar pictures its goal. */
export const CAGE_HELP = {
  name: "Cage",
  about:
    "Holds a fuzzball in place, so you can't swap it. Free it with a bunch or a special.",
  pictureIn: (pictures) => pictures.caged,
} as const satisfies CatalogHelp;
