// Fuzz Flux's sound lab, which its dev server alone serves, at sound-lab/
// (`@fz/dev/sound-lab`, in vite.config.ts): every sound of the sprite the
// scene plays, beside the design's own take of it
// (docs/fuzz-flux/sound/sprite.m4a), and scenes of play on both, to judge
// the sounds by ear at the feel gate.

import { type LabSound, mountSoundLab } from "@fz/dev/sound-lab-page";
import designMap from "../../../../docs/fuzz-flux/sound/sprite.json";
import designUrl from "../../../../docs/fuzz-flux/sound/sprite.m4a?url";
import designTable from "../../../../docs/fuzz-flux/sound/measures.md?raw";
import spritemap from "../src/scene/sounds/sprite.json";
import spriteM4a from "../src/scene/sounds/sprite.m4a?url";
import spriteOgg from "../src/scene/sounds/sprite.ogg?url";
import { SOUNDS, type SoundName } from "../src/view/effects/sounds";
import { SCENES } from "./sound-lab/scenes";
import { designSounds } from "./sounds/measures.mjs";

/** The design's table of its sounds, which says what plays each. */
const DESIGN = designSounds(designTable);

const sounds: readonly LabSound<SoundName>[] = SOUNDS.map((name) => ({
  name,
  plays: DESIGN.get(name)?.when ?? "",
}));

/** The design's take's map, as the lab reads a sprite's: the design's gives each sound's start and its length. */
const designSpritemap = {
  spritemap: Object.fromEntries(
    Object.entries(designMap).map(([name, { start, seconds }]) => [
      name,
      { start, end: start + seconds, loop: false },
    ]),
  ),
};

mountSoundLab<SoundName, SoundName>({
  game: "Fuzz Flux",
  sprite: { url: [spriteOgg, spriteM4a], spritemap },
  sounds,
  scenes: SCENES,
  before: {
    sprite: { url: designUrl, spritemap: designSpritemap },
    sounds,
  },
});
