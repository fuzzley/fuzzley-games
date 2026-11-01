import { EVENT_LOG_SIZE, type FieldEvent, FieldEventLog } from "./events";

/** Returns copies of the events a log holds past a serial, oldest first. */
function eventsSince(log: FieldEventLog, serial: number): FieldEvent[] {
  const events: FieldEvent[] = [];
  log.forEachSince(serial, (event) => events.push({ ...event }));
  return events;
}

describe("FieldEventLog", () => {
  it("records each event's kind, place, rock, size and reach, numbered", () => {
    const log = new FieldEventLog();

    log.add("hit", 1, 2, "iron", "large");
    log.add("blast", 3, 4, "volatile", "medium", 4);

    expect(eventsSince(log, 0)).toEqual([
      {
        serial: 1,
        kind: "hit",
        x: 1,
        y: 2,
        rock: "iron",
        size: "large",
        reach: 0,
      },
      {
        serial: 2,
        kind: "blast",
        x: 3,
        y: 4,
        rock: "volatile",
        size: "medium",
        reach: 4,
      },
    ]);
  });

  it("records an event of no rock with none", () => {
    const log = new FieldEventLog();

    log.add("lost", 1, 2);

    expect(eventsSince(log, 0)).toEqual([
      {
        serial: 1,
        kind: "lost",
        x: 1,
        y: 2,
        rock: null,
        size: null,
        reach: 0,
      },
    ]);
  });

  it("keeps the latest events, as many as its size", () => {
    const log = new FieldEventLog();

    for (let i = 0; i < EVENT_LOG_SIZE + 44; i++) {
      log.add("hit", i, 0, "stone", "large");
    }

    const serials = eventsSince(log, 0).map((event) => event.serial);
    expect([serials.length, serials[0], serials.at(-1)]).toEqual([
      EVENT_LOG_SIZE,
      45,
      EVENT_LOG_SIZE + 44,
    ]);
  });

  it("leaves nothing of the oldest event in the record a new one takes", () => {
    const log = new FieldEventLog();
    log.add("blast", 3, 4, "volatile", "large", 6);
    for (let i = 1; i < EVENT_LOG_SIZE; i++) {
      log.add("hit", 0, 0, "stone", "large");
    }

    log.add("broken", 1, 2, "ice", "small");

    expect(eventsSince(log, EVENT_LOG_SIZE)).toEqual([
      {
        serial: EVENT_LOG_SIZE + 1,
        kind: "broken",
        x: 1,
        y: 2,
        rock: "ice",
        size: "small",
        reach: 0,
      },
    ]);
  });
});
