/** Describes a flourish that plays from a place on the field, from a time. */
export interface Playing {
  /** When it started, in the scene's time, or −Infinity before it first plays. */
  at: number;
  x: number;
  y: number;
}

/**
 * Holds a flourish's records, each played in turn, the oldest taken for the
 * newest once every one is playing.
 */
export class Turns<T extends Playing> {
  /** Every record, playing or not. */
  readonly all: readonly T[];
  private next = 0;

  constructor(count: number, make: () => T) {
    this.all = Array.from({ length: count }, make);
  }

  /** Starts the next record playing from a place, at a time, and returns it. */
  play(x: number, y: number, now: number): T {
    const playing = this.all[this.next];
    if (playing === undefined) throw new RangeError("No record to play");
    this.next = (this.next + 1) % this.all.length;
    playing.at = now;
    playing.x = x;
    playing.y = y;
    return playing;
  }
}
