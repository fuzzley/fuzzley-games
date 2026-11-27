import type { CatalogHelp } from "../catalog_entries";

/** A burr, as How to play lists it, pictured on the fuzzball it sticks to. */
export const BURR_HELP = {
  name: "Burr",
  about:
    "Keeps you from swapping a fuzzball. Line up 3 next to a burr to brush it off, or burrs spread.",
  pictureIn: (pictures) => pictures.burred,
} as const satisfies CatalogHelp;
