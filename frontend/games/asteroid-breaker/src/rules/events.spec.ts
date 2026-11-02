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
    kind: "fired",
    x: 0,
    y: 0,
    rock: null,
    size: null,
    pickup: null,
    pilot: null,
    points: 0,
    times: 0,
    reach: 0,
    chain: 0,
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
      log.addRock("hit", 1, 2, "ice", "small");
    },
    { kind: "hit", rock: "ice", size: "small" },
  ],
  [
    "a break's",
    (log) => {
      log.addBreak(1, 2, "ice", "small", 3);
    },
    { kind: "broken", rock: "ice", size: "small", chain: 3 },
  ],
  [
    "a pickup's",
    (log) => {
      log.addPickup("faded", 1, 2, "nova");
    },
    { kind: "faded", pickup: "nova" },
  ],
  [
    "a pilot's",
    (log) => {
      log.addPilot("home", 1, 2, 6);
    },
    { kind: "home", pilot: 6 },
  ],
  [
    "points'",
    (log) => {
      log.addScore(1, 2, 80, 2);
    },
    { kind: "scored", points: 80, times: 2 },
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

  it("records a rock broken with its kind, place, size and the count it is in its chain", () => {
    const log = new FieldEventLog();

    log.addBreak(1, 2, "ice", "medium", 4);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({
        kind: "broken",
        x: 1,
        y: 2,
        rock: "ice",
        size: "medium",
        chain: 4,
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

  it("records a pilot's event with its pilot", () => {
    const log = new FieldEventLog();

    log.addPilot("lost", 1, 2, 4);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "lost", x: 1, y: 2, pilot: 4 }),
    ]);
  });

  it("records points scored with the chain's multiplier they were scored at", () => {
    const log = new FieldEventLog();

    log.addScore(1, 2, 120, 3);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "scored", x: 1, y: 2, points: 120, times: 3 }),
    ]);
  });

  it("records an event of a place with only its place", () => {
    const log = new FieldEventLog();

    log.add("warned", 1, 2);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "warned", x: 1, y: 2 }),
    ]);
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
      // The five records it takes held a blast, a pickup's event, a pilot's, points and a break, each with what it alone records.
      const log = new FieldEventLog();
      log.addRock("blast", 3, 4, "volatile", "large", 6);
      log.addPickup("dropped", 3, 4, "spread");
      log.addPilot("strayed", 3, 4, 7);
      log.addScore(3, 4, 90, 4);
      log.addBreak(3, 4, "stone", "large", 5);
      for (let i = 5; i < EVENT_LOG_SIZE; i++) log.add("fired", 0, 0);

      for (let i = 0; i < 5; i++) add(log);

      expect(eventsSince(log, EVENT_LOG_SIZE)).toEqual(
        [1, 2, 3, 4, 5].map((n) =>
          eventOf({ serial: EVENT_LOG_SIZE + n, x: 1, y: 2, ...recorded }),
        ),
      );
    },
  );
});
