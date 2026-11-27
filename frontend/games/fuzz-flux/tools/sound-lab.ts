// Fuzz Flux's sound lab, which its dev server alone serves, at sound-lab/
// (`@fz/dev/sound-lab`, in vite.config.ts): every sound of the sprite the
// scene plays, beside the design's own take of it
// (docs/fuzz-flux/sound/sprite.m4a), and scenes of play on both, to judge
// the sounds by ear at the feel gate.

import { keysOf } from "@fz/core/records";
import { type LabSound, mountSoundLab } from "@fz/dev/sound-lab-page";
import designMap from "../../../../docs/fuzz-flux/sound/sprite.json";
import designUrl from "../../../../docs/fuzz-flux/sound/sprite.m4a?url";
import designTable from "../../../../docs/fuzz-flux/sound/measures.md?raw";
import spritemap from "../src/scene/sounds/sprite.json";
import spriteM4a from "../src/scene/sounds/sprite.m4a?url";
import spriteOgg from "../src/scene/sounds/sprite.ogg?url";
import { LADDERED, takesOf } from "../src/view/effects/ladder";
import { SOUNDS, type SoundName } from "../src/view/effects/sounds";
import { type DesignSound, SCENES } from "./sound-lab/scenes";
import { designSounds } from "./sounds/measures.mjs";

/** The design's table of its sounds, which says what plays each. */
const DESIGN = designSounds(designTable);

/** What plays each take of a laddered sound above the foot: its sound's words from the design's table, and the rung it is made on. */
const TAKES_UP = new Map<string, string>(
  LADDERED.flatMap((sound) =>
    takesOf(sound)
      .filter(({ rung }) => rung > 1)
      .map(
        (take) =>
          [
            take.sound,
            `${DESIGN.get(sound)?.when ?? ""} Made on rung ${String(take.rung)} of the ladder, for the rungs nearest it.`,
          ] as const,
      ),
  ),
);

/** Returns what plays a sound, from the design's table. */
function playsOf(name: string): string {
  return TAKES_UP.get(name) ?? DESIGN.get(name)?.when ?? "";
}

const sounds: readonly LabSound<SoundName>[] = SOUNDS.map((name) => ({
  name,
  plays: playsOf(name),
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

mountSoundLab<SoundName, DesignSound>({
  game: "Fuzz Flux",
  sprite: { url: [spriteOgg, spriteM4a], spritemap },
  sounds,
  scenes: SCENES,
  before: {
    sprite: { url: designUrl, spritemap: designSpritemap },
    sounds: keysOf(designMap).map((name) => ({ name, plays: playsOf(name) })),
  },
});
