import { itemAt } from "@fz/core/records";
import { LEVEL_BRICK_LAYERS } from "../../../rules/levels/levels";
import type { CatalogHelp } from "../catalog_entries";

/** The fewest layers a brick on a level's board has. */
const FEWEST_LAYERS = itemAt(LEVEL_BRICK_LAYERS, 0);

/** The most layers a brick on a level's board has. */
const MOST_LAYERS = itemAt(LEVEL_BRICK_LAYERS, LEVEL_BRICK_LAYERS.length - 1);

/** A brick, as How to play lists it, pictured as the bar pictures its goal. */
export const BRICK_HELP = {
  name: "Brick",
  about: `Has ${String(FEWEST_LAYERS)} to ${String(MOST_LAYERS)} layers. A bunch next to it or a special knocks a layer off.`,
  pictureIn: (pictures) => pictures.brick,
} as const satisfies CatalogHelp;
