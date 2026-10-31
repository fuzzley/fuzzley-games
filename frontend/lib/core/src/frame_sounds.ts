/** What a sound not heard holds as the most it rose: below any rise or fall. */
const UNHEARD = Number.NEGATIVE_INFINITY;

/** Describes a sound of the sprite, and the most it rose since it last played. */
interface Gathered<Name extends string> {
  readonly name: Name;
  /** In cents, or `UNHEARD`. */
  most: number;
}

/**
 * Gathers the sounds a frame's events call for, so each plays once, at the
 * most it rose: a dozen hits at once sound as one, and a rising run at its
 * highest.
 */
export class FrameSounds<Name extends string> {
  /** A record for each of the sprite's sounds, made once, in the order they play. */
  private readonly sounds: readonly Gathered<Name>[];

  /**
   * Creates the sounds of a frame, none heard yet.
   *
   * @param names Every sound of the sprite, each once, in the order a frame
   *   plays them.
   */
  constructor(names: readonly Name[]) {
    this.sounds = names.map((name) => ({ name, most: UNHEARD }));
  }

  /** Notes a sound an event calls for, risen by some cents. */
  hear(name: Name, detune: number): void {
    for (const sound of this.sounds) {
      if (sound.name !== name) continue;
      if (detune > sound.most) sound.most = detune;
      return;
    }
  }

  /**
   * Plays each sound heard since the last time, once, at the most it rose,
   * in the sprite's order, and forgets them.
   */
  playEach(play: (name: Name, detune: number) => void): void {
    for (const sound of this.sounds) {
      if (sound.most === UNHEARD) continue;
      const detune = sound.most;
      sound.most = UNHEARD;
      play(sound.name, detune);
    }
  }
}
