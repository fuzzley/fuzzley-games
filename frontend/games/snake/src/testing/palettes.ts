import path from "node:path";
import { stylesheetPalettes } from "@fz/style/testing";

/** The game's palettes, as its global stylesheet sets them. */
export const PALETTES = stylesheetPalettes(
  // Built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
  path.join(import.meta.dirname, "../app/styles/global.scss"),
);
