// The frizzball, which has no kind's color: the house fuzzball fully
// charged, its fur on end and static's sparks about it, the site's own look
// for a fuzzball fully charged, drawn a little smaller than a fuzzball, as
// the design draws it. It wears the palette's text, so it turns with the
// palette, and its eyes, a frame a face as a fuzzball's are, the page's
// color, glinting in its own. Its sparks are static's cores alone, in the
// sparks' color: their faint halos would be a second frame for the scene to
// fade, and the cores keep 3:1 against the board by themselves.

import { fuzzballCommands, staticSparkCommands } from "@fz/phaser/fuzzball";
import { type ArtFrame, type ArtScale, centered } from "@fz/phaser/shapes";
import {
  FUZZBALL_FACES,
  MOST_LIFT,
  combFur,
  sparksOf,
} from "@fz/style/fuzzball";
import type { BoardPalette } from "../colors/palette";
import { EYES_GRID, type EyesSeat, eyesFrame } from "./eyes";
import { FRAMES } from "./frame_names";

/** How large the frizzball is drawn, as a share of a fuzzball. */
const FRIZZBALL_SCALE = 0.84;

/** Where the frizzball's eyes sit: at its body's middle, in the middle of its square, as much smaller as it is drawn. */
export const FRIZZBALL_EYES_SEAT: EyesSeat = {
  x: 0,
  y: 0,
  scale: FRIZZBALL_SCALE,
};

/** Returns the frizzball's body and its eyes in each face, in a palette at a scale. */
export function frizzballFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const { body, eyes } = palette.frizzball;
  const by = FRIZZBALL_SCALE * EYES_GRID * scale.unit;
  const fur = combFur({ lift: MOST_LIFT });
  const sparks = staticSparkCommands(by, sparksOf(fur), {
    core: palette.spark,
    halo: body,
    pixelRatio: scale.pixelRatio,
  });
  return [
    centered(FRAMES.frizzball, [
      ...fuzzballCommands(by, { color: body, fur }),
      ...sparks.cores,
    ]),
    ...FUZZBALL_FACES.map((face) =>
      eyesFrame(
        FRAMES.frizzballEyes(face),
        face,
        { color: eyes, glint: body },
        scale,
        FRIZZBALL_SCALE,
      ),
    ),
  ];
}
