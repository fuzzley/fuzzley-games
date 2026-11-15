import {
  CHAIN_CENTS,
  CHAIN_STEPS,
  centsOf,
  degree,
  note,
  pitch,
} from "./synth_music.ts";
import { hz } from "./synth_signal.ts";

describe("degree", () => {
  it("climbs the pentatonic scale from an octave's C", () => {
    const steps = [0, 1, 2, 3, 4, 5].map((step) => degree(step));

    expect(steps).toEqual([72, 74, 76, 79, 81, 84].map(hz));
  });

  it("goes down below step 0, and starts in another octave when told", () => {
    expect([degree(-1), degree(-2), degree(-5), degree(0, 3)]).toEqual(
      [69, 67, 60, 48].map(hz),
    );
  });

  it.each([
    ["degree()", () => degree(2.5), "2.5"],
    ["centsOf()", () => centsOf(0.5), "0.5"],
  ])(
    "refuses a step between two of the scale's in %s",
    (_name, step, named) => {
      expect(step).toThrow(`The scale has no step ${named}.`);
    },
  );
});

describe("note", () => {
  it("reads a note's letter, its sharp or flat and its octave", () => {
    expect([
      note("A4"),
      note("C5"),
      note("G#4"),
      note("Eb3"),
      note("C-1"),
    ]).toEqual([69, 72, 68, 51, 0]);
  });

  it("refuses a name that names no note", () => {
    expect(() => note("H2")).toThrow('"H2" names no note.');
  });

  it("gives a named note's pitch", () => {
    expect(pitch("A4")).toBe(440);
  });
});

describe("the chain's ladder", () => {
  it("lies a step's semitones above step 0, an octave for each five steps", () => {
    expect([
      centsOf(0),
      centsOf(3),
      centsOf(5),
      centsOf(13),
      centsOf(-1),
    ]).toEqual([0, 700, 1200, 3100, -300]);
  });

  it("climbs four notes, lands on C as the multiplier steps up, circles, then rings a fifth above", () => {
    expect({ steps: CHAIN_STEPS, cents: CHAIN_CENTS }).toEqual({
      steps: [
        0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 12, 11, 12, 13, 12, 11, 13,
      ],
      cents: [
        0, 200, 400, 700, 1200, 1400, 1600, 1900, 2100, 2400, 2600, 2800, 3100,
        2800, 2600, 2800, 3100, 2800, 2600, 3100,
      ],
    });
  });
});
