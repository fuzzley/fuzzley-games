// Pictures of the pieces as the scene hands them to the shell, for the
// shell's specs, each a `data:` URL that names its atlas frame, as no
// canvas draws one in a spec.

import { recordOf } from "@fz/core/records";
import { KIND_IDS } from "../rules/catalog/kinds";
import { SPECIAL_IDS } from "../rules/catalog/specials";
import { PICTURE_FRAMES, type Pictures } from "../scene/pictures";

/** Returns a picture of a frame, as a `data:` URL holding its name. */
function pictureOf(frame: string): string {
  return `data:text/plain,${frame}`;
}

/** A picture of each frame `PICTURE_FRAMES` names. */
export const PICTURES: Pictures = {
  kinds: recordOf(KIND_IDS, (kind) => pictureOf(PICTURE_FRAMES.kinds[kind])),
  specials: recordOf(SPECIAL_IDS, (special) =>
    pictureOf(PICTURE_FRAMES.specials[special]),
  ),
  frizzball: pictureOf(PICTURE_FRAMES.frizzball),
  sleepyhead: pictureOf(PICTURE_FRAMES.sleepyhead),
  caged: pictureOf(PICTURE_FRAMES.caged),
  burred: pictureOf(PICTURE_FRAMES.burred),
  dust: PICTURE_FRAMES.dust.map(pictureOf),
  brick: pictureOf(PICTURE_FRAMES.brick),
};
