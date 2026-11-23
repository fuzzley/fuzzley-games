import { centsOf } from "@fz/dev/synth";
import { RALLY_CENTS, SOUNDS, rallyCentsOf } from "./sounds";

describe("SOUNDS", () => {
  it('lists the twenty-five sounds of the design\'s "Sound"', () => {
    expect(SOUNDS).toHaveLength(25);
  });

  it("names each sound once", () => {
    expect(new Set(SOUNDS).size).toBe(SOUNDS.length);
  });

  it.each(SOUNDS)(
    "names %s in lower case, its words joined by hyphens",
    (name) => {
      expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
    },
  );
});

describe("RALLY_CENTS", () => {
  it("climbs the sound kit's five-note scale a step a strike, two octaves in all", () => {
    expect(RALLY_CENTS).toEqual(
      Array.from({ length: 11 }, (_, step) => centsOf(step)),
    );
  });
});

describe("rallyCentsOf", () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 200],
    [5, 900],
    [6, 1200],
    [10, 2100],
    [11, 2400],
    [25, 2400],
  ])("raises the note of a rally of %i by %i cents", (rally, cents) => {
    expect(rallyCentsOf(rally)).toBe(cents);
  });
});
