/** Names something that happened on the field, for the scene to play. */
export type FieldEventKind =
  /** A ball left the paddle. */
  | "launched"
  /** A ball bounced off a wall. */
  | "wall"
  /** A ball bounced off the paddle. */
  | "paddle"
  /** A brick took a hit and holds. */
  | "hit"
  /** A brick broke. */
  | "broken"
  /** A ball fell past the floor. */
  | "lost"
  /** The last brick the level needs broke. */
  | "cleared";

/** Records something that happened on the field, and where. */
export interface FieldEvent {
  /** Numbers it, one more than the event before. */
  serial: number;
  kind: FieldEventKind;
  /** Where it happened, in field units. */
  x: number;
  y: number;
  /** The cell of the brick it happened to, or -1. */
  cell: number;
}

/** How many events the log keeps, far more than a frame's steps make. */
export const EVENT_LOG_SIZE = 256;

/**
 * Keeps the field's latest events in a ring of records made once, each
 * numbered.
 *
 * A reader plays every event past the last it played, however many steps a
 * frame took, and nothing is made as the field steps.
 */
export class EventLog {
  private readonly ring: FieldEvent[] = Array.from(
    { length: EVENT_LOG_SIZE },
    () => ({ serial: 0, kind: "wall", x: 0, y: 0, cell: -1 }),
  );

  private last = 0;

  /** The serial of the latest event, 0 before the first. */
  get latest(): number {
    return this.last;
  }

  /** Records an event. */
  add(kind: FieldEventKind, x: number, y: number, cell = -1): void {
    this.last++;
    const event = this.ring[this.last % EVENT_LOG_SIZE];
    if (event) {
      event.serial = this.last;
      event.kind = kind;
      event.x = x;
      event.y = y;
      event.cell = cell;
    }
  }

  /**
   * Visits every event after a serial, oldest first, as many as the ring
   * still holds.
   */
  forEachSince(
    serial: number,
    visit: (event: Readonly<FieldEvent>) => void,
  ): void {
    const first = Math.max(serial + 1, this.last - EVENT_LOG_SIZE + 1);
    for (let at = first; at <= this.last; at++) {
      const event = this.ring[at % EVENT_LOG_SIZE];
      if (event) visit(event);
    }
  }
}
