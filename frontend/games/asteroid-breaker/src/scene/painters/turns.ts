/** Holds a flourish's records, each played in turn, the oldest taken for the newest once every one is playing. */
export class Turns<T> {
  /** Every record, playing or not. */
  readonly all: readonly T[];
  private next = 0;

  constructor(count: number, make: () => T) {
    this.all = Array.from({ length: count }, make);
  }

  /** Returns the record to play next. */
  take(): T {
    const taken = this.all[this.next];
    if (taken === undefined) throw new RangeError("No record to play");
    this.next = (this.next + 1) % this.all.length;
    return taken;
  }
}
