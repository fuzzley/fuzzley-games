import { loggedOn } from "../testing/field_picture";
import {
  describeCleared,
  describeEnd,
  describeEvent,
  describePause,
  describeResume,
  describeWave,
} from "./describe";
import { type FieldEvent, FieldEventLog } from "./events";
import type { Crew, Pilot } from "./pilots";
import { type Run, createRun } from "./run";
import type { WaveEntry } from "./waves";

/** Returns a crew of pilots flying and at home. */
function crewOf(flying: readonly Pilot[], home: readonly Pilot[] = []): Crew {
  return { flying, home, lastGiven: 7 };
}

/** Returns the event a log records as `add` writes it. */
function eventOf(add: (log: FieldEventLog) => void): FieldEvent {
  const events = new FieldEventLog();
  add(events);
  const [event] = loggedOn({ events });
  if (!event) throw new Error("Nothing was logged.");
  return event;
}

/** Returns a wave's entry, its number and its name. */
function entryOf(number: number, name: string): WaveEntry {
  return {
    number,
    sector: { id: "sector", name: "Sector", drops: 0, waves: [] },
    data: { id: "wave", name, rocks: [] },
  };
}

/** Returns a run under way at a wave, with a score. */
function runAt(wave: number, score: number): Run {
  return { ...createRun({ id: 1, seed: 1, speed: "normal", wave }), score };
}

describe("describeWave", () => {
  it("says the wave's number, its name and the rocks it holds", () => {
    expect(describeWave(entryOf(4, "Thaw"), 4)).toBe("Wave 4, Thaw. 4 rocks.");
  });

  it("says one rock as one", () => {
    expect(describeWave(entryOf(1, "First light"), 1)).toBe(
      "Wave 1, First light. 1 rock.",
    );
  });
});

describe("describeEvent", () => {
  it("says a stray drifts in", () => {
    const strayed = eventOf((log) => {
      log.addPilot("strayed", 1, 2, 5, crewOf([0, 1]));
    });

    expect(describeEvent(strayed)).toBe("A stray fuzzball drifts in.");
  });

  it("says how many waited at home as a stray was brought home", () => {
    const home = eventOf((log) => {
      log.addPilot("home", 1, 2, 5, crewOf([0], [4, 5]));
    });

    expect(describeEvent(home)).toBe("Brought home: 2 waiting.");
  });

  it("says a ship gained with a new pilot, and the ships the crew had then", () => {
    const gained = eventOf((log) => {
      log.addGained(1, 2, 3, false, crewOf([0, 1, 2, 3]));
    });

    expect(describeEvent(gained)).toBe("Extra ship. 4 ships.");
  });

  it("says a ship gained flown by a fuzzball brought home", () => {
    const gained = eventOf((log) => {
      log.addGained(1, 2, 5, true, crewOf([0, 5]));
    });

    expect(describeEvent(gained)).toBe(
      "Extra ship, flown by a fuzzball brought home. 2 ships.",
    );
  });

  it("says a ship lost, and the ships left then", () => {
    const lost = eventOf((log) => {
      log.addPilot("lost", 1, 2, 0, crewOf([1]));
    });

    expect(describeEvent(lost)).toBe("Ship lost. 1 ship left.");
  });

  it("says nothing of the last ship lost, which the run's end says", () => {
    const lost = eventOf((log) => {
      log.addPilot("lost", 1, 2, 0, crewOf([]));
    });

    expect(describeEvent(lost)).toBeNull();
  });

  it("says a pickup caught by its name", () => {
    const caught = eventOf((log) => {
      log.addCaught(1, 2, "nova", crewOf([0]));
    });

    expect(describeEvent(caught)).toBe("Nova.");
  });

  it("says an Extra ship caught by its name where the crew has the most ships, so it gains none", () => {
    const caught = eventOf((log) => {
      log.addCaught(1, 2, "ship", crewOf([0, 1, 2, 3, 4, 5]));
    });

    expect(describeEvent(caught)).toBe("Extra ship.");
  });

  it.each([
    [
      "an Extra ship caught with room for it, which the ship it gains says",
      (log: FieldEventLog) => {
        log.addCaught(1, 2, "ship", crewOf([0, 1, 2, 3, 4]));
      },
    ],
    [
      "a pickup let go",
      (log: FieldEventLog) => {
        log.addPickup("dropped", 1, 2, "nova");
      },
    ],
    [
      "a shot",
      (log: FieldEventLog) => {
        log.add("fired", 1, 2);
      },
    ],
    [
      "points",
      (log: FieldEventLog) => {
        log.addScore(1, 2, 40, 1);
      },
    ],
  ])("says nothing of %s", (_, add) => {
    expect(describeEvent(eventOf(add))).toBeNull();
  });
});

describe("describeCleared", () => {
  it("says the wave cleared and the score", () => {
    expect(describeCleared(runAt(3, 12_500))).toBe(
      "Wave 3 cleared! Score 12,500.",
    );
  });
});

describe("describePause", () => {
  it("says the run is paused, its score, and how to go on", () => {
    expect(describePause(runAt(2, 1_840))).toBe(
      "Paused, with a score of 1,840. Press Enter to go on.",
    );
  });
});

describe("describeResume", () => {
  it("says the run goes on", () => {
    expect(describeResume()).toBe("Going on.");
  });
});

describe("describeEnd", () => {
  it("says the game is over, the score and the wave it was lost on", () => {
    expect(describeEnd(runAt(4, 9_020))).toBe(
      "Game over. Score 9,020, on wave 4.",
    );
  });
});
