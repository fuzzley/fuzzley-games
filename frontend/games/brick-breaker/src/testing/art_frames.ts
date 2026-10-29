import { atlasFrames } from "../view/art";
import { type PaletteRoles, bricksPalette } from "../view/palette";
import type { ArtFrame, ArtScale, DrawCommand } from "../view/shapes";

/** The roles the art's specs draw in, each a color no other role takes. */
const ROLES: PaletteRoles = {
  panel: "#f1f3f5",
  text: "#1b1f24",
  accent: "#2f7d4f",
  danger: "#c62828",
  warning: "#a84b06",
};

/** The palette the art's specs draw in, a light one. */
export const ART_PALETTE = bricksPalette(ROLES, "light");

/** The scale the art's specs draw at, a field unit of 24 device pixels at 2 to a CSS pixel. */
export const ART_SCALE: ArtScale = { unit: 24, pixelRatio: 2 };

/** Returns a frame of the atlas in the specs' palette, at their scale, by its name. */
export function frameNamed(name: string): ArtFrame {
  const frame = atlasFrames(ART_PALETTE, ART_SCALE).find(
    (each) => each.name === name,
  );
  if (!frame) throw new Error(`No frame "${name}"`);
  return frame;
}

/** Returns the commands of a frame that draw in a color, of a kind. */
export function drawnIn(
  frame: ArtFrame,
  kind: DrawCommand["kind"],
  color: number,
): readonly DrawCommand[] {
  return frame.commands.filter(
    (command) => command.kind === kind && command.color === color,
  );
}
