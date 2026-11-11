import { TestBed } from "@angular/core/testing";
import { LEAST_DEPTH, MOST_DEPTH } from "../../rules/tuning";
import { TUNED_NUMBERS } from "../../view/debug/debug_tuning";
import { DebugService } from "./debug.service";

/** Returns the debug menu's state, as a fresh page starts it. */
function debugService(): DebugService {
  return TestBed.inject(DebugService);
}

describe("DebugService", () => {
  it("starts at the game the player is shipped: its own numbers, the room's depth and the levels it has opened", () => {
    const debug = debugService();

    expect(debug.tuning.tuning()).toEqual(TUNED_NUMBERS);
    expect(debug.depth()).toBeNull();
    expect(debug.everyLevelOpen()).toBe(false);
    expect(debug.runOffRecord()).toBe(false);
  });

  it.each([LEAST_DEPTH, 16, MOST_DEPTH])("sets the field %i deep", (depth) => {
    const debug = debugService();

    debug.setDepth(depth);

    expect(debug.depth()).toBe(depth);
  });

  it("gives the depth back to the room's", () => {
    const debug = debugService();
    debug.setDepth(14);

    debug.setDepth(null);

    expect(debug.depth()).toBeNull();
  });

  it.each([LEAST_DEPTH - 1, MOST_DEPTH + 1, 14.5])(
    "refuses a field %s deep, as none is",
    (depth) => {
      const debug = debugService();

      expect(() => {
        debug.setDepth(depth);
      }).toThrow(RangeError);
    },
  );

  it("opens every level", () => {
    const debug = debugService();

    debug.openEveryLevel(true);

    expect(debug.everyLevelOpen()).toBe(true);
  });

  it("shuts the levels it opened again", () => {
    const debug = debugService();
    debug.openEveryLevel(true);

    debug.openEveryLevel(false);

    expect(debug.everyLevelOpen()).toBe(false);
  });

  it("leaves the certificates stale while the boredom is retuned", () => {
    const debug = debugService();

    debug.tuning.tune("bored", 80);

    expect(debug.certificatesStale()).toBe(true);
  });

  it("leaves the certificates sound while only the flight's pace is retuned", () => {
    const debug = debugService();

    debug.tuning.tune("normalPace", 20);

    expect(debug.certificatesStale()).toBe(false);
  });

  it("keeps the run's records on a depth the menu sets, as a window of that size would give it", () => {
    const debug = debugService();

    debug.setDepth(MOST_DEPTH);

    expect(debug.runOffRecord()).toBe(false);
  });

  it("takes the run off the record as a number is retuned", () => {
    const debug = debugService();

    debug.tuning.tune("fastPace", 30);

    expect(debug.runOffRecord()).toBe(true);
  });

  it("keeps the run's records as every level opens, as the run under way began on one the player had", () => {
    const debug = debugService();

    debug.openEveryLevel(true);

    expect(debug.runOffRecord()).toBe(false);
  });

  it("keeps the run off the record once the numbers are put back", () => {
    const debug = debugService();
    debug.tuning.tune("bored", 80);

    debug.tuning.reset();

    expect(debug.runOffRecord()).toBe(true);
  });

  it("starts the next run on the record once the numbers are put back", () => {
    const debug = debugService();
    debug.tuning.tune("bored", 80);
    debug.tuning.reset();

    debug.startRun();

    expect(debug.runOffRecord()).toBe(false);
  });

  it("starts a run off the record while a number is retuned", () => {
    const debug = debugService();
    debug.tuning.tune("bored", 80);

    debug.startRun();

    expect(debug.runOffRecord()).toBe(true);
  });

  it("starts a run off the record at a level the player hasn't opened", () => {
    const debug = debugService();

    debug.startRun({ locked: true });

    expect(debug.runOffRecord()).toBe(true);
  });

  it("starts a run taken up off the record where storage kept it so", () => {
    const debug = debugService();

    debug.startRun({ kept: true });

    expect(debug.runOffRecord()).toBe(true);
  });
});
