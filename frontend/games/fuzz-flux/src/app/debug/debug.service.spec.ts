import { TestBed } from "@angular/core/testing";
import { FEEL } from "../../view/timeline/feel";
import { DebugService } from "./debug.service";

/** Returns the debug menu's settings, as a page opens with them. */
function debug(): DebugService {
  return TestBed.inject(DebugService);
}

describe("DebugService", () => {
  it("tunes the design's own numbers at first", () => {
    expect(debug().tuning.tuning()).toEqual(FEEL);
  });

  it("keeps a level on the record at first", () => {
    expect(debug().offRecord()).toBe(false);
  });

  it("takes a level off the record as a number is retuned", () => {
    debug().tuning.tune("swapMs", 2 * FEEL.swapMs);

    expect(debug().offRecord()).toBe(true);
  });

  it("keeps the level off the record once the numbers are put back", () => {
    debug().tuning.tune("swapMs", 2 * FEEL.swapMs);

    debug().tuning.reset();

    expect(debug().offRecord()).toBe(true);
  });

  it.each([
    ["played on its own deal", false, false],
    ["played off the record", true, true],
  ])(
    "begins a level %s, the numbers the design's: off the record %s",
    (_, offRecord, off) => {
      debug().tuning.tune("swapMs", 2 * FEEL.swapMs);
      debug().tuning.reset();

      debug().levelBegun(offRecord);

      expect(debug().offRecord()).toBe(off);
    },
  );

  it("begins a level off the record while a number is retuned", () => {
    debug().tuning.tune("swapMs", 2 * FEEL.swapMs);

    debug().levelBegun(false);

    expect(debug().offRecord()).toBe(true);
  });
});
