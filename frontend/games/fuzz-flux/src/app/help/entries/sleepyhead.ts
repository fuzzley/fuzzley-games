import type { CatalogHelp } from "../catalog_entries";

/** The sleepyhead, as How to play lists it, pictured as the bar pictures its goal. */
export const SLEEPYHEAD_HELP = {
  name: "Sleepyhead",
  about:
    "Can't be swapped. Falls when you clear what's under it, and goes to bed at the bottom.",
  pictureIn: (pictures) => pictures.sleepyhead,
} as const satisfies CatalogHelp;
