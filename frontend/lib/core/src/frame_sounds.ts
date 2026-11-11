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
 *
 * Neither hearing a sound nor playing a frame's makes anything, and a frame
 * that heard none goes through none of them.
 */
export class FrameSounds<Name extends string> {
  /** A record for each of the sprite's sounds, made once, in the order they play. */
  private readonly sounds: readonly Gathered<Name>[];
  /** The same records, by name. */
  private readonly byName: ReadonlyMap<Name, Gathered<Name>>;
  /** Whether a sound was heard since the sounds last played. */
  private heard = false;

  /**
   * Creates the sounds of a frame, none heard yet.
   *
   * @param names Every sound of the sprite, each once, in the order a frame
   *   plays them.
   */
  constructor(names: readonly Name[]) {
    this.sounds = names.map((name) => ({ name, most: UNHEARD }));
    this.byName = new Map(this.sounds.map((sound) => [sound.name, sound]));
  }

  /** Notes a sound an event calls for, risen by some cents; one not of the sprite is not heard. */
  hear(name: Name, detune: number): void {
    const sound = this.byName.get(name);
    if (sound === undefined) return;
    this.heard = true;
    if (detune > sound.most) sound.most = detune;
  }

  /**
   * Plays each sound heard since the last time, once, at the most it rose,
   * in the sprite's order, and forgets them.
   */
  playEach(play: (name: Name, detune: number) => void): void {
    if (!this.heard) return;
    this.heard = false;
    // Read by number, as a frame's round of the sounds makes nothing.
    const { sounds } = this;
    const count = sounds.length;
    for (let at = 0; at < count; at++) {
      const sound = sounds[at];
      if (sound === undefined || sound.most === UNHEARD) continue;
      const detune = sound.most;
      sound.most = UNHEARD;
      play(sound.name, detune);
    }
  }
}
