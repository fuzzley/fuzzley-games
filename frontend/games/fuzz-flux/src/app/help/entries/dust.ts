import { itemAt } from "@fz/core/records";
import { DUST_LAYERS } from "../../../rules/catalog/elements";
import type { CatalogHelp } from "../catalog_entries";

/** The most layers of dust a square can have. */
const MOST_LAYERS = itemAt(DUST_LAYERS, DUST_LAYERS.length - 1);

/** Dust, as How to play lists it, pictured as the bar pictures its goal. */
export const DUST_HELP = {
  name: "Dust",
  about: `Covers a square up to ${String(MOST_LAYERS)} layers deep. Clear the square to take a layer off.`,
  pictureIn: (pictures) => itemAt(pictures.dust, 0),
} as const satisfies CatalogHelp;
