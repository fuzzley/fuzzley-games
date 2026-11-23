import { TestBed } from "@angular/core/testing";
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
});
