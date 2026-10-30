import { EVENT_LOG_SIZE, EventLog, type FieldEvent } from "./events";

/** Returns copies of the events a log holds past a serial, oldest first. */
function eventsSince(log: EventLog, serial: number): FieldEvent[] {
  const events: FieldEvent[] = [];
  log.forEachSince(serial, (event) => events.push({ ...event }));
  return events;
}

describe("EventLog", () => {
  it("holds no event before the first", () => {
    const log = new EventLog();

    expect({ latest: log.latest, events: eventsSince(log, 0) }).toEqual({
      latest: 0,
      events: [],
    });
  });

  it("numbers each event one more than the last", () => {
    const log = new EventLog();

    log.add("wall", 1, 2);
    log.add("broken", 3, 4, 17, null, 5);

    expect(eventsSince(log, 0)).toEqual([
      {
        serial: 1,
        kind: "wall",
        x: 1,
        y: 2,
        cell: -1,
        capsule: null,
        streak: 0,
      },
      {
        serial: 2,
        kind: "broken",
        x: 3,
        y: 4,
        cell: 17,
        capsule: null,
        streak: 5,
      },
    ]);
  });

  it("visits only the events past a serial", () => {
    const log = new EventLog();
    log.add("wall", 0, 0);
    log.add("paddle", 0, 0);
    log.add("lost", 0, 0);

    const serials = eventsSince(log, 1).map((event) => event.serial);

    expect(serials).toEqual([2, 3]);
  });

  it("keeps only the latest events once more were added than it holds", () => {
    const log = new EventLog();
    for (let i = 0; i < EVENT_LOG_SIZE + 44; i++) log.add("wall", i, 0);

    const serials = eventsSince(log, 0).map((event) => event.serial);

    expect([serials.length, serials[0], serials.at(-1)]).toEqual([
      EVENT_LOG_SIZE,
      45,
      EVENT_LOG_SIZE + 44,
    ]);
  });
});
