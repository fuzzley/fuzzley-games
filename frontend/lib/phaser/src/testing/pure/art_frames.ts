import type { ArtFrame, DrawCommand } from "../../shapes";

/** Returns the frame of those given that has a name, throwing when none has. */
export function frameNamed(
  frames: readonly ArtFrame[],
  name: string,
): ArtFrame {
  const frame = frames.find((each) => each.name === name);
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
