// Fuzz Flux's sound lab, which its dev server alone serves, at sound-lab/
// (`@fz/dev/sound-lab`, in vite.config.ts): every sound of the sprite the
// scene plays, beside the design's own take of it, made in the page from
// the design's recipes (tools/sound-lab/design_take.ts), and scenes of play
// on both, to judge the sounds by ear at the feel gate.

import { type LabSound, mountSoundLab } from "@fz/dev/sound-lab-page";
import designTable from "../../../../docs/fuzz-flux/sound/measures.md?raw";
import spritemap from "../src/scene/sounds/sprite.json";
import spriteM4a from "../src/scene/sounds/sprite.m4a?url";
import spriteOgg from "../src/scene/sounds/sprite.ogg?url";
import { LADDERED, takesOf } from "../src/view/effects/ladder";
import { SOUNDS, type SoundName } from "../src/view/effects/sounds";
import { type DesignTake, designTake } from "./sound-lab/design_take";
import { SCENES } from "./sound-lab/scenes";
import { designSounds } from "./sounds/measures.mjs";

/** The design's table of its sounds, which says what plays each. */
const DESIGN = designSounds(designTable);

/** What plays each take of a laddered sound above the foot: its sound's words from the design's table, and the rung it is made on. */
const TAKES_UP = new Map<string, string>(
  LADDERED.flatMap((sound) =>
    takesOf(sound)
      .filter(({ rung }) => rung > 0)
      .map(
        (take) =>
          [
            take.sound,
            `${DESIGN.get(sound)?.when ?? ""} Made ${String(take.rung)} rungs up the ladder, for the rungs nearest it.`,
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

mountSoundLab<SoundName, DesignTake>({
  game: "Fuzz Flux",
  sprite: { url: [spriteOgg, spriteM4a], spritemap },
  sounds,
  scenes: SCENES,
  before: designTake(),
});
