import { itemAt } from "@fz/core/records";
import { BRICK_LAYERS } from "../../../rules/catalog/elements";
import type { CatalogHelp } from "../catalog_entries";

/** The fewest layers a brick can have. */
const FEWEST_LAYERS = itemAt(BRICK_LAYERS, 0);

/** The most layers a brick can have. */
const MOST_LAYERS = itemAt(BRICK_LAYERS, BRICK_LAYERS.length - 1);

/** A brick, as How to play lists it, pictured as the bar pictures its goal. */
export const BRICK_HELP = {
  name: "Brick",
  about: `Has ${String(FEWEST_LAYERS)} to ${String(MOST_LAYERS)} layers. A bunch next to it or a special knocks a layer off.`,
  pictureIn: (pictures) => pictures.brick,
} as const satisfies CatalogHelp;
