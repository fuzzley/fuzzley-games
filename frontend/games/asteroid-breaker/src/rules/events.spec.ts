import { EVENT_LOG_SIZE, type FieldEvent, FieldEventLog } from "./events";

/** Returns copies of the events a log holds past a serial, oldest first. */
function eventsSince(log: FieldEventLog, serial: number): FieldEvent[] {
  const events: FieldEvent[] = [];
  log.forEachSince(serial, (event) => events.push({ ...event }));
  return events;
}

/** Returns an event as the log records it, nothing set beyond what it says. */
function eventOf(event: Partial<FieldEvent>): FieldEvent {
  return {
    serial: 1,
    kind: "lost",
    x: 0,
    y: 0,
    rock: null,
    size: null,
    pickup: null,
    reach: 0,
    ...event,
  };
}

/** An event of each kind the log records, at 1, 2: who it is of, how it is added, and what it records. */
const EACH_RECORD: readonly (readonly [
  string,
  (log: FieldEventLog) => void,
  Partial<FieldEvent>,
])[] = [
  [
    "a rock's",
    (log) => {
      log.addRock("broken", 1, 2, "ice", "small");
    },
    { kind: "broken", rock: "ice", size: "small" },
  ],
  [
    "a pickup's",
    (log) => {
      log.addPickup("faded", 1, 2, "nova");
    },
    { kind: "faded", pickup: "nova" },
  ],
  [
    "a place's",
    (log) => {
      log.add("dashed", 1, 2);
    },
    { kind: "dashed" },
  ],
];

describe("FieldEventLog", () => {
  it("records each rock's event with its kind, place, rock, size and reach, numbered", () => {
    const log = new FieldEventLog();

    log.addRock("hit", 1, 2, "iron", "large");
    log.addRock("blast", 3, 4, "volatile", "medium", 4);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "hit", x: 1, y: 2, rock: "iron", size: "large" }),
      eventOf({
        serial: 2,
        kind: "blast",
        x: 3,
        y: 4,
        rock: "volatile",
        size: "medium",
        reach: 4,
      }),
    ]);
  });

  it("records a pickup's event with its pickup", () => {
    const log = new FieldEventLog();

    log.addPickup("caught", 1, 2, "lance");

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "caught", x: 1, y: 2, pickup: "lance" }),
    ]);
  });

  it("records an event of a place with only its place", () => {
    const log = new FieldEventLog();

    log.add("lost", 1, 2);

    expect(eventsSince(log, 0)).toEqual([eventOf({ x: 1, y: 2 })]);
  });

  it("records the Nova's ring with its reach", () => {
    const log = new FieldEventLog();

    log.add("nova", 1, 2, 12);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "nova", x: 1, y: 2, reach: 12 }),
    ]);
  });

  it("keeps the latest events, as many as its size", () => {
    const log = new FieldEventLog();

    for (let i = 0; i < EVENT_LOG_SIZE + 44; i++) {
      log.addRock("hit", i, 0, "stone", "large");
    }

    const serials = eventsSince(log, 0).map((event) => event.serial);
    expect([serials.length, serials[0], serials.at(-1)]).toEqual([
      EVENT_LOG_SIZE,
      45,
      EVENT_LOG_SIZE + 44,
    ]);
  });

  it.each(EACH_RECORD)(
    "leaves nothing of an older event in the record %s event takes",
    (_, add, recorded) => {
      const log = new FieldEventLog();
      log.addRock("blast", 3, 4, "volatile", "large", 6);
      log.addPickup("dropped", 3, 4, "spread");
      for (let i = 2; i < EVENT_LOG_SIZE; i++) log.add("fired", 0, 0);

      add(log);
      add(log);

      expect(eventsSince(log, EVENT_LOG_SIZE)).toEqual([
        eventOf({ serial: EVENT_LOG_SIZE + 1, x: 1, y: 2, ...recorded }),
        eventOf({ serial: EVENT_LOG_SIZE + 2, x: 1, y: 2, ...recorded }),
      ]);
    },
  );
});
