import { TestBed } from "@angular/core/testing";
import { FLIGHT_RULES } from "../../rules/tuning";
import { FLIGHT_PACE } from "../../view/play/pace";
import { DebugService } from "./debug.service";

describe("DebugService", () => {
  it("leaves the field's depth to the room until it sets one", () => {
    const debug = TestBed.inject(DebugService);

    expect(debug.depth()).toBeNull();
  });

  it("sets the field's depth over the room's, and gives it back", () => {
    const debug = TestBed.inject(DebugService);
    debug.setDepth(14);
    const set = debug.depth();

    debug.setDepth(null);

    expect([set, debug.depth()]).toEqual([14, null]);
  });

  it("refuses a depth no field has, keeping the one it had", () => {
    const debug = TestBed.inject(DebugService);
    debug.setDepth(14);

    expect(() => {
      debug.setDepth(23);
    }).toThrow(
      new RangeError("No field is 23 deep: the depths run from 11 to 22."),
    );
    expect(debug.depth()).toBe(14);
  });

  it("keeps a new run on the record", () => {
    const debug = TestBed.inject(DebugService);

    debug.startRun();

    expect(debug.runOffRecord()).toBe(false);
  });

  it.each([{ kept: true }, { locked: true }, { certified: true }] as const)(
    "takes a run begun as %o off the record",
    (opened) => {
      const debug = TestBed.inject(DebugService);

      debug.startRun(opened);

      expect(debug.runOffRecord()).toBe(true);
    },
  );

  it("puts the next run on the record again", () => {
    const debug = TestBed.inject(DebugService);
    debug.startRun({ kept: true });

    debug.startRun({});

    expect(debug.runOffRecord()).toBe(false);
  });

  it("tunes nothing until the menu does", () => {
    const debug = TestBed.inject(DebugService);

    expect([debug.rules(), debug.pace()]).toEqual([FLIGHT_RULES, FLIGHT_PACE]);
  });

  it("hands the game the rules and the pace as the menu tunes them", () => {
    const debug = TestBed.inject(DebugService);

    debug.tuning.tune("bored", 120);
    debug.tuning.tune("fast25", 40);

    expect([debug.rules().bored, debug.pace().speeds.fast]).toEqual([
      120,
      [22, 26, 40, 36],
    ]);
  });

  it.each([
    ["the boredom", "bored", 120, true],
    ["the first floor bounce", "firstBounce", 12, true],
    ["the floor bounces' step", "bounceStep", 6, true],
    ["the hatches' holds", "hatchHolds", 4, true],
    ["the guide's length", "guidePast", 1, false],
    ["a speed", "normal", 20, false],
  ] as const)(
    "says whether retuning %s leaves the certificates stale",
    (_, id, value, stale) => {
      const debug = TestBed.inject(DebugService);

      debug.tuning.tune(id, value);

      expect(debug.certificatesStale()).toBe(stale);
    },
  );

  it("takes the run under way off the record as a number is retuned, and keeps it off once put back", () => {
    const debug = TestBed.inject(DebugService);
    debug.startRun();

    debug.tuning.tune("normal", 20);
    debug.tuning.reset();

    expect(debug.runOffRecord()).toBe(true);
  });

  it("takes a run begun on retuned numbers off the record", () => {
    const debug = TestBed.inject(DebugService);
    debug.tuning.tune("bored", 120);

    debug.startRun();

    expect(debug.runOffRecord()).toBe(true);
  });

  it("opens every level, and only the player's again", () => {
    const debug = TestBed.inject(DebugService);
    debug.openEveryLevel(true);
    const open = debug.everyLevelOpen();

    debug.openEveryLevel(false);

    expect([open, debug.everyLevelOpen()]).toEqual([true, false]);
  });
});
