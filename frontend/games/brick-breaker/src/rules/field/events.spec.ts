import { OWN_INK } from "../paddle/balls";
import { EVENT_LOG_SIZE, type FieldEvent, FieldEventLog } from "./events";

/** Returns copies of the events a log holds past a serial, oldest first. */
function eventsSince(log: FieldEventLog, serial: number): FieldEvent[] {
  const events: FieldEvent[] = [];
  log.forEachSince(serial, (event) => events.push({ ...event }));
  return events;
}

describe("FieldEventLog", () => {
  it("records each event's kind, place, brick, capsule and streak, numbered, in the player's own ink", () => {
    const log = new FieldEventLog();

    log.add("wall", 1, 2);
    log.add("dropped", 3, 4, 17, "wide");
    log.add("broken", 5, 6, 18, null, 5);

    expect(eventsSince(log, 0)).toEqual([
      {
        serial: 1,
        kind: "wall",
        x: 1,
        y: 2,
        cell: -1,
        capsule: null,
        streak: 0,
        way: 0,
        ink: OWN_INK,
      },
      {
        serial: 2,
        kind: "dropped",
        x: 3,
        y: 4,
        cell: 17,
        capsule: "wide",
        streak: 0,
        way: 0,
        ink: OWN_INK,
      },
      {
        serial: 3,
        kind: "broken",
        x: 5,
        y: 6,
        cell: 18,
        capsule: null,
        streak: 5,
        way: 0,
        ink: OWN_INK,
      },
    ]);
  });

  it("records the way a slider stepped", () => {
    const log = new FieldEventLog();

    log.add("slid", 5, 2.5, 2, null, 0, -1);

    expect(eventsSince(log, 0).map((event) => event.way)).toEqual([-1]);
  });

  it("records the ink a lost ball wore", () => {
    const log = new FieldEventLog();

    log.add("lost", 5, 30, -1, null, 0, 0, 3);

    expect(eventsSince(log, 0).map((event) => event.ink)).toEqual([3]);
  });

  it("keeps the latest events, as many as its size", () => {
    const log = new FieldEventLog();

    for (let i = 0; i < EVENT_LOG_SIZE + 44; i++) log.add("wall", i, 0);

    const serials = eventsSince(log, 0).map((event) => event.serial);
    expect([serials.length, serials[0], serials.at(-1)]).toEqual([
      EVENT_LOG_SIZE,
      45,
      EVENT_LOG_SIZE + 44,
    ]);
  });

  it("leaves nothing of the oldest event in the record a new one takes", () => {
    const log = new FieldEventLog();
    log.add("dropped", 3, 4, 17, "wide", 5, 1, 3);
    for (let i = 1; i < EVENT_LOG_SIZE; i++) log.add("paddle", 0, 0);

    log.add("wall", 1, 2);

    expect(eventsSince(log, EVENT_LOG_SIZE)).toEqual([
      {
        serial: EVENT_LOG_SIZE + 1,
        kind: "wall",
        x: 1,
        y: 2,
        cell: -1,
        capsule: null,
        streak: 0,
        way: 0,
        ink: OWN_INK,
      },
    ]);
  });
});
