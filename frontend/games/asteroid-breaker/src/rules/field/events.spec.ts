import type { RockKindId, RockSize } from "../catalog/rocks";
import type { Crew } from "../ship/pilots";
import {
  EVENT_LOG_SIZE,
  type FieldEvent,
  FieldEventLog,
  type LoggedRock,
} from "./events";

/** A crew of a pilot with two in tow and one gone home, whose line a pilot's event counts. */
const CREW: Crew = { pilot: 0, tow: [1, 3], home: [6], lastGiven: 6 };

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
    kind: "warned",
    x: 0,
    y: 0,
    rock: null,
    size: null,
    pickup: null,
    weapon: null,
    pilot: null,
    inTow: 0,
    runOver: false,
    points: 0,
    times: 0,
    reach: 0,
    step: 0,
    fell: false,
    slot: -1,
    wayX: 0,
    wayY: 0,
    burrs: 0,
    ...event,
  };
}

/** Returns a rock in a slot at a place, as its events record it. */
function rockAt(
  x: number,
  y: number,
  kind: RockKindId,
  size: RockSize,
  slot: number,
): LoggedRock {
  return { x, y, kind, size, slot };
}

describe("FieldEventLog", () => {
  it("records each rock's event with its kind, its place, kind, size and slot, and its reach, numbered", () => {
    const log = new FieldEventLog();

    log.addRock("hit", rockAt(1, 2, "iron", "large", 7));
    log.addRock("blast", rockAt(3, 4, "volatile", "medium", 9), 4);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({
        kind: "hit",
        x: 1,
        y: 2,
        rock: "iron",
        size: "large",
        slot: 7,
      }),
      eventOf({
        serial: 2,
        kind: "blast",
        x: 3,
        y: 4,
        rock: "volatile",
        size: "medium",
        slot: 9,
        reach: 4,
      }),
    ]);
  });

  it("records a rock broken with its place, kind, size and slot, static's multiplier it scored at, and the way the blow came", () => {
    const log = new FieldEventLog();

    log.addBreak(rockAt(1, 2, "ice", "medium", 5), 4, 3, 4);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({
        kind: "broken",
        x: 1,
        y: 2,
        rock: "ice",
        size: "medium",
        slot: 5,
        times: 4,
        wayX: 0.6,
        wayY: 0.8,
      }),
    ]);
  });

  it("records a rock broken by a blow that came no way with none", () => {
    const log = new FieldEventLog();

    log.addBreak(rockAt(1, 2, "ice", "medium", 5), 4, 0, 0);

    expect(eventsSince(log, 0)).toMatchObject([{ wayX: 0, wayY: 0 }]);
  });

  it("records a pull of fire with its place and the weapon that fired it", () => {
    const log = new FieldEventLog();

    log.addFired(1, 2, "lance");

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "fired", x: 1, y: 2, weapon: "lance" }),
    ]);
  });

  it("records the ship's dash with its place and the way it heads", () => {
    const log = new FieldEventLog();

    log.addDash(1, 2, Math.PI / 3);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({
        kind: "dashed",
        x: 1,
        y: 2,
        wayX: Math.cos(Math.PI / 3),
        wayY: Math.sin(Math.PI / 3),
      }),
    ]);
  });

  it("records a pickup's event with its pickup", () => {
    const log = new FieldEventLog();

    log.addPickup("dropped", 1, 2, "lance");

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "dropped", x: 1, y: 2, pickup: "lance" }),
    ]);
  });

  it("records a pilot's event as the run ends, no one at the controls", () => {
    const log = new FieldEventLog();

    log.addPilot("lost", 1, 2, 0, { ...CREW, pilot: null, tow: [] });

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "lost", x: 1, y: 2, pilot: 0, runOver: true }),
    ]);
  });

  it("records a pilot's event with its pilot and how many ride in tow", () => {
    const log = new FieldEventLog();

    log.addPilot("joined", 1, 2, 3, CREW);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "joined", x: 1, y: 2, pilot: 3, inTow: 2 }),
    ]);
  });

  it("records one of the crew knocked loose with its pilot, how many ride in tow, and the way the blow came", () => {
    const log = new FieldEventLog();

    log.addKnocked(1, 2, 5, CREW, -3, 4);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({
        kind: "knocked",
        x: 1,
        y: 2,
        pilot: 5,
        inTow: 2,
        wayX: -0.6,
        wayY: 0.8,
      }),
    ]);
  });

  it("records one of the crew knocked loose by a blow that came no way with none", () => {
    const log = new FieldEventLog();

    log.addKnocked(1, 2, 5, CREW, 0, 0);

    expect(eventsSince(log, 0)).toMatchObject([{ wayX: 0, wayY: 0 }]);
  });

  it("records points scored with static's multiplier they were scored at", () => {
    const log = new FieldEventLog();

    log.addScore(1, 2, 120, 3);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "scored", x: 1, y: 2, points: 120, times: 3 }),
    ]);
  });

  it("records a spark gathered with who gathered it, its points and static's multiplier", () => {
    const log = new FieldEventLog();

    log.addSpark(1, 2, 4, 5, 2);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "sparked", x: 1, y: 2, pilot: 4, points: 5, times: 2 }),
    ]);
  });

  it("records an event of a place with only its place", () => {
    const log = new FieldEventLog();

    log.add("warned", 1, 2);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "warned", x: 1, y: 2 }),
    ]);
  });

  it.each([
    ["rising", false],
    ["falling", true],
  ])("records static %s to a step with the step", (_, fell) => {
    const log = new FieldEventLog();

    log.addStep(1, 2, 3, fell);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "stepped", x: 1, y: 2, step: 3, fell }),
    ]);
  });

  it("records a near miss at the ship, with the way to what passed", () => {
    const log = new FieldEventLog();

    log.addGraze(1, 2, 0, -3);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "grazed", x: 1, y: 2, wayX: 0, wayY: -1 }),
    ]);
  });

  it("records a zap at the pod, with the way it heads", () => {
    const log = new FieldEventLog();

    log.addZap(1, 2, Math.PI / 2);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({
        kind: "zapped",
        x: 1,
        y: 2,
        wayX: Math.cos(Math.PI / 2),
        wayY: 1,
      }),
    ]);
  });

  it("records a zap's arc at its rock, with the rock's kind, size and slot, and the way and how far it leapt from the pod", () => {
    const log = new FieldEventLog();

    log.addArc(rockAt(7, 8, "ice", "medium", 5), 3, 4);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({
        kind: "arced",
        x: 7,
        y: 8,
        rock: "ice",
        size: "medium",
        slot: 5,
        reach: 5,
        wayX: 0.6,
        wayY: 0.8,
      }),
    ]);
  });

  it.each(["burred", "popped"] as const)(
    "records a burr %s with only its place",
    (kind) => {
      const log = new FieldEventLog();

      log.addBurr(kind, 1, 2);

      expect(eventsSince(log, 0)).toEqual([eventOf({ kind, x: 1, y: 2 })]);
    },
  );

  it("records a burr clinging at the ship, with how many cling", () => {
    const log = new FieldEventLog();

    log.addClung(1, 2, 3);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({ kind: "clung", x: 1, y: 2, burrs: 3 }),
    ]);
  });

  it("records burrs shaken off at the ship, with how many and the way it heads", () => {
    const log = new FieldEventLog();

    log.addShaken(1, 2, Math.PI, 2);

    expect(eventsSince(log, 0)).toEqual([
      eventOf({
        kind: "shaken",
        x: 1,
        y: 2,
        wayX: -1,
        wayY: Math.sin(Math.PI),
        burrs: 2,
      }),
    ]);
  });

  it("keeps the latest events, as many as its size", () => {
    const log = new FieldEventLog();

    for (let i = 0; i < EVENT_LOG_SIZE + 44; i++) {
      log.addRock("hit", rockAt(i, 0, "stone", "large", 0));
    }

    const serials = eventsSince(log, 0).map((event) => event.serial);
    expect([serials.length, serials[0], serials.at(-1)]).toEqual([
      EVENT_LOG_SIZE,
      45,
      EVENT_LOG_SIZE + 44,
    ]);
  });

  it("leaves nothing of an older event in a record the ring comes round to", () => {
    // The seven records it comes round to held a blast, a pickup's event, a
    // pilot's, points, a break, a pull of fire and a step of static, each
    // with what it alone records; the blast's is taken by a pickup's event,
    // which writes no reach, and the rest by warnings, which write no
    // pickup, weapon or step.
    const log = new FieldEventLog();
    log.addRock("blast", rockAt(3, 4, "volatile", "large", 8), 6);
    log.addPickup("dropped", 3, 4, "spread");
    log.addPilot("floated", 3, 4, 7, {
      pilot: null,
      tow: [1, 2],
      home: [5, 6],
      lastGiven: 7,
    });
    log.addScore(3, 4, 90, 4);
    log.addBreak(rockAt(3, 4, "stone", "large", 9), 3, 1, 1);
    log.addFired(3, 4, "spread");
    log.addStep(3, 4, 2, true);
    for (let i = 7; i < EVENT_LOG_SIZE; i++) log.add("warned", 0, 0);

    log.addPickup("faded", 1, 2, "magnet");
    for (let i = 0; i < 6; i++) log.add("warned", 1, 2);

    expect(eventsSince(log, EVENT_LOG_SIZE)).toEqual([
      eventOf({
        serial: EVENT_LOG_SIZE + 1,
        kind: "faded",
        x: 1,
        y: 2,
        pickup: "magnet",
      }),
      ...[2, 3, 4, 5, 6, 7].map((n) =>
        eventOf({ serial: EVENT_LOG_SIZE + n, kind: "warned", x: 1, y: 2 }),
      ),
    ]);
  });

  it("leaves no burrs of an older event in a record the ring comes round to", () => {
    const log = new FieldEventLog();
    log.addClung(3, 4, 2);
    for (let i = 1; i < EVENT_LOG_SIZE; i++) log.add("warned", 0, 0);

    log.add("warned", 1, 2);

    expect(eventsSince(log, EVENT_LOG_SIZE)).toEqual([
      eventOf({ serial: EVENT_LOG_SIZE + 1, kind: "warned", x: 1, y: 2 }),
    ]);
  });
});
