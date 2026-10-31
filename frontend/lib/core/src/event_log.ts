/** Describes an event an {@link EventLog} keeps: whatever a game records of it, numbered. */
export interface NumberedEvent {
  /** Numbers it, one more than the event before. */
  serial: number;
}

/**
 * Keeps a game's latest events in a ring of records, each numbered, which
 * its readers each read on from the last event they saw.
 *
 * A reader visits every event past the last it visited, however many steps a
 * frame took. The records are made with the log and filled in place ever
 * after, so a game's steps make nothing.
 */
export class EventLog<E extends NumberedEvent> {
  /** The records, the first event kept in the first. */
  private readonly ring: E[] = [];

  private last = 0;

  /**
   * Creates a log of no events, its records made.
   *
   * @param size How many events it keeps, a whole number, at least one: far
   *   more than a frame's steps make, so no reader misses one.
   * @param blank Makes a record for the ring, which the log numbers and its
   *   writer fills.
   */
  constructor(
    private readonly size: number,
    private readonly blank: () => E,
  ) {
    if (!Number.isInteger(size) || size < 1) {
      throw new RangeError(`An event log can't keep ${size} events.`);
    }
    for (let serial = 1; serial <= size; serial++) this.recordOf(serial);
  }

  /** The serial of the latest event, 0 before the first. */
  get latest(): number {
    return this.last;
  }

  /**
   * Returns the record of the next event, numbered one more than the latest,
   * for its writer to fill in place.
   *
   * Once the ring has come round, the record still holds the oldest event,
   * which it now replaces, so the writer sets every field but the serial.
   */
  next(): E {
    this.last++;
    const event = this.recordOf(this.last);
    event.serial = this.last;
    return event;
  }

  /**
   * Visits every event after a serial, oldest first, as many as the ring
   * still holds.
   */
  forEachSince(serial: number, visit: (event: Readonly<E>) => void): void {
    const first = Math.max(
      Math.floor(serial) + 1,
      this.last - this.size + 1,
      1,
    );
    for (let at = first; at <= this.last; at++) visit(this.recordOf(at));
  }

  /**
   * Returns the record of the ring that a whole serial's event is kept in,
   * made if it isn't yet.
   *
   * The constructor makes every record through here, so none is made after;
   * a lookup in the ring alone is a record or nothing to the compiler.
   */
  private recordOf(serial: number): E {
    const at = (serial - 1) % this.size;
    return (this.ring[at] ??= this.blank());
  }
}
