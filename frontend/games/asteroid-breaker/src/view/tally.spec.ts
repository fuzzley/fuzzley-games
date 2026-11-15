import type { WaveTally } from "../rules/field/scoring";
import { WAVES, waveEntryOf } from "../rules/waves/waves";
import { TALLY_COUNT_MS, nextWaveWords, tallyShownAt } from "./tally";

/** A cleared wave's points, a part on each line. */
const TALLY: WaveTally = {
  rocks: 1240,
  chains: 380,
  strays: 600,
  cleared: 500,
  clean: 0,
};

/** How long each line takes to count up: an equal share of the whole count. */
const LINE_MS = TALLY_COUNT_MS / 5;

describe("tallyShownAt", () => {
  it("writes each part of a cleared wave's points on a line of its own, in the card's order, and their total, once counted up", () => {
    const shown = tallyShownAt(TALLY, TALLY_COUNT_MS);

    expect(shown).toEqual({
      lines: [
        { label: "Rocks", points: "1,240" },
        { label: "Chains", points: "380" },
        { label: "Strays brought home", points: "600" },
        { label: "Wave cleared", points: "500" },
        { label: "No ship lost", points: "0" },
      ],
      total: "2,720",
    });
  });

  it("shows nothing counted as the card opens", () => {
    const shown = tallyShownAt(TALLY, 0);

    expect({
      points: shown.lines.map((line) => line.points),
      total: shown.total,
    }).toEqual({ points: ["0", "0", "0", "0", "0"], total: "0" });
  });

  it("counts the lines up in turn, each whole before the next starts", () => {
    const shown = tallyShownAt(TALLY, LINE_MS);

    expect({
      points: shown.lines.map((line) => line.points),
      total: shown.total,
    }).toEqual({ points: ["1,240", "0", "0", "0", "0"], total: "1,240" });
  });

  it("counts a line up fast, then slowing, as it eases out", () => {
    const shown = tallyShownAt(TALLY, LINE_MS / 2);

    // Seven eighths of the way, at half its time.
    expect(shown.lines[0]?.points).toBe("1,085");
  });

  it("adds up what the lines show so far as the total", () => {
    const shown = tallyShownAt(TALLY, LINE_MS * 1.5);

    // The rocks' whole, and seven eighths of the chains'.
    expect(shown.total).toBe("1,573");
  });

  it("keeps the sum whole past its count", () => {
    expect(tallyShownAt(TALLY, TALLY_COUNT_MS * 2)).toEqual(
      tallyShownAt(TALLY, TALLY_COUNT_MS),
    );
  });
});

describe("nextWaveWords", () => {
  it("names the wave to come by its number and its name", () => {
    expect(nextWaveWords(waveEntryOf(WAVES, 10))).toBe(
      "Next: wave 10, Boulder",
    );
  });

  it("names a wave of Endless's so", () => {
    expect(nextWaveWords(waveEntryOf(WAVES, WAVES.length + 1))).toBe(
      "Next: wave 31, Endless",
    );
  });
});
