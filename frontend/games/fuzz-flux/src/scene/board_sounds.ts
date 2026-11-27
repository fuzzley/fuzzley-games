import { itemAt } from "@fz/core/records";
import { type SoundSprite, SpritePlayer } from "@fz/phaser/sound";
import type { Scene } from "phaser";
import type { SoundName } from "../view/effects/sounds";
import type { SoundCue } from "../view/timeline/timeline";
import type { BoardPlay, PlayClock } from "./play_clock";
import spritemap from "./sounds/sprite.json";
import spriteM4a from "./sounds/sprite.m4a?url";
import spriteOgg from "./sounds/sprite.ogg?url";

/**
 * The board's sounds' sprite, as Ogg Vorbis and, for Safari, as M4A, of
 * which the browser loads the first it plays; its map is typed by the
 * view's sounds, so a sound the map lacks fails to compile.
 */
export const SOUND_SPRITE: SoundSprite<SoundName> = {
  key: "fuzz-flux-sounds",
  spritemap,
  url: [spriteOgg, spriteM4a],
};

/** Where across the field a cue plays: its middle, as a cue has no place. */
const MIDDLE = 0;

/**
 * Plays the board's sounds from the one sprite while the player wants
 * them, each cue as the frame passes its moment, as far tuned and as loud
 * as it says, two of one take in a frame both heard: the play's
 * timeline's by where the play stands, and the shell's own by the scene's
 * clock.
 */
export class BoardSounds {
  /** Plays the sprite's sounds. */
  readonly player: SpritePlayer<SoundName>;

  /** Makes the player, which starts loading the sprite. */
  constructor(scene: Scene) {
    this.player = new SpritePlayer(scene, SOUND_SPRITE);
  }

  /** Follows the Sound setting, and plays each cue whose moment comes in the frame, the play's timeline's and then the shell's. */
  play(
    wanted: boolean,
    play: BoardPlay,
    shellCues: readonly SoundCue[],
    clock: PlayClock,
  ): void {
    this.player.follow(wanted);
    const { sounds } = play.timeline;
    for (let index = 0; index < sounds.length; index++) {
      const cue = itemAt(sounds, index);
      if (clock.starts(cue.atMs)) this.cue(cue);
    }
    for (let index = 0; index < shellCues.length; index++) {
      const cue = itemAt(shellCues, index);
      if (clock.reaches(cue.atMs)) this.cue(cue);
    }
  }

  /** Plays a cue, as far tuned and as loud as it says. */
  private cue({ sound, cents, volume }: SoundCue): void {
    this.player.playAt(sound, cents, MIDDLE, volume);
  }
}
