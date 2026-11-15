import type { WaveTally } from "../rules/field/scoring";
import { describeEnd } from "../rules/run/describe";
import { createRun } from "../rules/run/run";
import { WAVES, waveEntryOf } from "../rules/waves/waves";
import {
  TALLY_COUNT_MS,
  endDescription,
  endSubtitle,
  endWords,
  nextWaveWords,
  tallyShownAt,
} from "./tally";

/** A cleared wave's points, a part on each line. */
const TALLY: WaveTally = {
  rocks: 1240,
  sparks: 85,
  static: 380,
  strays: 600,
  cleared: 500,
  clean: 0,
};

/** How long each line takes to count up: an equal share of the whole count. */
const LINE_MS = TALLY_COUNT_MS / 6;

describe("tallyShownAt", () => {
  it("writes each part of a cleared wave's points on a line of its own, in the card's order, and their total, once counted up", () => {
    const shown = tallyShownAt(TALLY, TALLY_COUNT_MS);

    expect(shown).toEqual({
      lines: [
        { label: "Rocks", points: "1,240" },
        { label: "Sparks", points: "85" },
        { label: "Static", points: "380" },
        { label: "Strays brought home", points: "600" },
        { label: "Wave cleared", points: "500" },
        { label: "No hit taken", points: "0" },
      ],
      total: "2,805",
    });
  });

  it("shows nothing counted as the card opens", () => {
    const shown = tallyShownAt(TALLY, 0);

    expect({
      points: shown.lines.map((line) => line.points),
      total: shown.total,
    }).toEqual({ points: ["0", "0", "0", "0", "0", "0"], total: "0" });
  });

  it("counts the lines up in turn, each whole before the next starts", () => {
    const shown = tallyShownAt(TALLY, LINE_MS);

    expect({
      points: shown.lines.map((line) => line.points),
      total: shown.total,
    }).toEqual({
      points: ["1,240", "0", "0", "0", "0", "0"],
      total: "1,240",
    });
  });

  it("counts a line up fast, then slowing, as it eases out", () => {
    const shown = tallyShownAt(TALLY, LINE_MS / 2);

    // Seven eighths of the way, at half its time.
    expect(shown.lines[0]?.points).toBe("1,085");
  });

  it("adds up what the lines show so far as the total", () => {
    const shown = tallyShownAt(TALLY, LINE_MS * 1.5);

    // The rocks' whole, and seven eighths of the sparks'.
    expect(shown.total).toBe("1,314");
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

describe("endWords", () => {
  it("names the wave a run ended on by its number and its name", () => {
    expect(endWords(waveEntryOf(WAVES, 14))).toBe(
      "The run ended on wave 14, Anvil",
    );
  });

  it("names a wave of Endless's so", () => {
    expect(endWords(waveEntryOf(WAVES, WAVES.length + 7))).toBe(
      "The run ended on wave 37, Endless",
    );
  });
});

describe("endSubtitle", () => {
  it("says where a run ended and at what speed", () => {
    expect(endSubtitle(waveEntryOf(WAVES, 14), "fast")).toBe(
      "The run ended on wave 14, Anvil, at Fast speed",
    );
  });
});

describe("endDescription", () => {
  // The announcer's words for the run's end are held beside the card's, so
  // a mark worded anew in one fails here until the other follows.
  it.each([
    ["nothing", false, false, ""],
    ["a new best", true, false, " A new best!"],
    ["all thirty cleared", false, true, " Cleared all thirty!"],
    ["both", true, true, " A new best! Cleared all thirty!"],
  ])(
    "says where a run ended, at what speed and its score, and of what it set, %s, as the announcer says it",
    (_set, newBest, clearedAll, marks) => {
      const run = {
        ...createRun({ id: 1, seed: 1, speed: "normal", wave: 14 }),
        score: 4250,
      };
      const entry = waveEntryOf(WAVES, 14);

      const said = {
        card: endDescription(run, entry, { newBest, clearedAll }),
        announcer: describeEnd(run, entry, { newBest, clearedAll }),
      };

      expect(said).toEqual({
        card: `The run ended on wave 14, Anvil, at Normal speed. Score 4,250.${marks}`,
        announcer: `Everyone is home. Score 4,250, on wave 14.${marks}`,
      });
    },
  );
});
