import { type MixNumbers, soundLabNotes } from "./sound_lab_notes.ts";

/** A mix's numbers, as a game's might be. */
const NUMBERS: MixNumbers = {
  variation: { cents: 40, decibels: 1.5 },
  voices: { sound: 4, family: 8, all: 24 },
  duck: { decibels: 6, heldUntil: 1 / 3 },
};

/** Returns the notes' text given the numbers, its spaces run together. */
function notesText(): string {
  return soundLabNotes(NUMBERS).replace(/\s+/g, " ");
}

describe("soundLabNotes", () => {
  it("gives how far the mix varies a play", () => {
    expect(notesText()).toContain("±40 cents and ±1.5 dB");
  });

  it("gives how many voices the mix lets sound", () => {
    expect(notesText()).toContain("4 of a sound, 8 of a family and 24 in all");
  });

  it("gives how far and how long a huge sound ducks the busy ones, in whole milliseconds", () => {
    expect(notesText()).toContain("ducked</strong> 6 dB for 333 ms");
  });
});
