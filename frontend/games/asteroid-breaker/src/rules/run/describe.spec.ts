import { loggedOn } from "../../testing/field_picture";
import { type FieldEvent, FieldEventLog } from "../field/events";
import type { Crew, Pilot } from "../ship/pilots";
import { type WaveEntry, waveEntryOf } from "../waves/waves";
import {
  type EndMarks,
  describeCleared,
  describeEnd,
  describeEvent,
  describePause,
  describeResume,
  describeTakenUp,
  describeWave,
  marksWords,
} from "./describe";
import { FULL_STEP } from "../sparks/charge";
import { type Run, createRun } from "./run";

/** Returns a crew of a pilot at the controls or none, and those in tow. */
function crewOf(pilot: Pilot | null, tow: readonly Pilot[] = []): Crew {
  return { pilot, tow, home: [], lastGiven: 7 };
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

/** Returns Endless's wave of a number, past a game of no written waves. */
function endlessAt(number: number): WaveEntry {
  return waveEntryOf([], number);
}

/** What an ended run that set nothing is said to have set. */
const UNMARKED: EndMarks = { newBest: false, clearedAll: false };

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
      log.addPilot("strayed", 1, 2, 5, crewOf(0, [1]));
    });

    expect(describeEvent(strayed)).toBe("A stray fuzzball drifts in.");
  });

  it("says a stray caught into the line in tow, and how many ride in tow then", () => {
    const joined = eventOf((log) => {
      log.addPilot("joined", 1, 2, 5, crewOf(0, [1, 5]));
    });

    expect(describeEvent(joined)).toBe("Caught. 2 in tow.");
  });

  it("says a stray brought straight home", () => {
    const home = eventOf((log) => {
      log.addPilot("home", 1, 2, 5, crewOf(0, [1, 2, 3, 4, 6]));
    });

    expect(describeEvent(home)).toBe(
      "Brought straight home, with the line full.",
    );
  });

  it.each([
    ["how many ride in tow then", [1], "Hit! One knocked loose. 1 in tow."],
    [
      "that no one rides in tow then",
      [],
      "Hit! One knocked loose. No one in tow.",
    ],
  ])("says one knocked loose, and %s", (_, tow, said) => {
    const knocked = eventOf((log) => {
      log.addKnocked(1, 2, 3, crewOf(0, tow), 0, 1);
    });

    expect(describeEvent(knocked)).toBe(said);
  });

  it("says one knocked loose caught again, and how many ride in tow then", () => {
    const recaught = eventOf((log) => {
      log.addPilot("recaught", 1, 2, 3, crewOf(0, [1, 3]));
    });

    expect(describeEvent(recaught)).toBe("Caught again. 2 in tow.");
  });

  it("says one knocked loose floats home", () => {
    const floated = eventOf((log) => {
      log.addPilot("floated", 1, 2, 3, crewOf(0, [1]));
    });

    expect(describeEvent(floated)).toBe("A fuzzball floats home.");
  });

  it("says nothing of one floating home as the run ends, which the run's end says", () => {
    const floated = eventOf((log) => {
      log.addPilot("floated", 1, 2, 3, crewOf(null));
    });

    expect(describeEvent(floated)).toBeNull();
  });

  it("says nothing of the hit that ends the run, which the run's end says", () => {
    const lost = eventOf((log) => {
      log.addPilot("lost", 1, 2, 0, crewOf(null));
    });

    expect(describeEvent(lost)).toBeNull();
  });

  it("says a pickup caught by its name", () => {
    const caught = eventOf((log) => {
      log.addPickup("caught", 1, 2, "magnet");
    });

    expect(describeEvent(caught)).toBe("Magnet.");
  });

  it("says static has come to full", () => {
    const full = eventOf((log) => {
      log.addStep(1, 2, FULL_STEP, false);
    });

    expect(describeEvent(full)).toBe("Static full.");
  });

  it("says a zap", () => {
    const zapped = eventOf((log) => {
      log.addZap(1, 2, 0);
    });

    expect(describeEvent(zapped)).toBe("Zap!");
  });

  it("says a burr clings", () => {
    const clung = eventOf((log) => {
      log.addClung(1, 2, 1);
    });

    expect(describeEvent(clung)).toBe("A burr clings.");
  });

  it.each([
    [
      "a pickup let go",
      (log: FieldEventLog) => {
        log.addPickup("dropped", 1, 2, "magnet");
      },
    ],
    [
      "a shot",
      (log: FieldEventLog) => {
        log.addFired(1, 2, "gun");
      },
    ],
    [
      "points",
      (log: FieldEventLog) => {
        log.addScore(1, 2, 40, 1);
      },
    ],
    [
      "a spark gathered",
      (log: FieldEventLog) => {
        log.addSpark(1, 2, 0, 5, 1);
      },
    ],
    [
      "static rising a step short of full",
      (log: FieldEventLog) => {
        log.addStep(1, 2, FULL_STEP - 1, false);
      },
    ],
    [
      "static falling a step",
      (log: FieldEventLog) => {
        log.addStep(1, 2, FULL_STEP - 1, true);
      },
    ],
    [
      "a near miss",
      (log: FieldEventLog) => {
        log.addGraze(1, 2, 1, 0);
      },
    ],
    [
      "a zap's arc",
      (log: FieldEventLog) => {
        log.addArc({ x: 1, y: 2, kind: "stone", size: "small", slot: 0 }, 3, 4);
      },
    ],
    [
      "a burr coming in",
      (log: FieldEventLog) => {
        log.addBurr("burred", 1, 2);
      },
    ],
    [
      "a burr popped",
      (log: FieldEventLog) => {
        log.addBurr("popped", 1, 2);
      },
    ],
    [
      "burrs shaken off",
      (log: FieldEventLog) => {
        log.addShaken(1, 2, 0, 2);
      },
    ],
  ])("says nothing of %s", (_, add) => {
    expect(describeEvent(eventOf(add))).toBeNull();
  });
});

describe("describeCleared", () => {
  it("says the wave cleared and the score", () => {
    const said = describeCleared(
      runAt(3, 12_500),
      entryOf(3, "Thaw"),
      entryOf(4, "Drift"),
    );

    expect(said).toBe("Wave 3 cleared! Score 12,500.");
  });

  it("says the last sector cleared, by its name, and Endless beginning", () => {
    const said = describeCleared(
      runAt(30, 12_500),
      entryOf(30, "Eye"),
      endlessAt(31),
    );

    expect(said).toBe("Sector cleared! Endless begins. Score 12,500.");
  });

  it("says an Endless wave cleared by its number", () => {
    const said = describeCleared(
      runAt(37, 12_500),
      endlessAt(37),
      endlessAt(38),
    );

    expect(said).toBe("Wave 37 cleared! Score 12,500.");
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

describe("describeTakenUp", () => {
  it("says the wave the run is paused on, its score, how many ride in tow, and how to go on", () => {
    const run = { ...runAt(4, 9_020), crew: crewOf(0, [3, 1]) };

    expect(describeTakenUp(run, entryOf(4, "Thaw"))).toBe(
      "Your last run is paused on wave 4, Thaw, with a score of 9,020 and 2 in tow. Press Enter to go on.",
    );
  });

  it("says no one rides in tow of a run paused with none", () => {
    const run = { ...runAt(4, 9_020), crew: crewOf(0) };

    expect(describeTakenUp(run, entryOf(4, "Thaw"))).toBe(
      "Your last run is paused on wave 4, Thaw, with a score of 9,020 and no one in tow. Press Enter to go on.",
    );
  });
});

describe("marksWords", () => {
  it.each([
    ["nothing", false, false, ""],
    ["a new best", true, false, " A new best!"],
    ["all thirty cleared", false, true, " Cleared all thirty!"],
    ["both, the best first", true, true, " A new best! Cleared all thirty!"],
  ])("says of a run that set %s", (_, newBest, clearedAll, said) => {
    expect(marksWords({ newBest, clearedAll })).toBe(said);
  });
});

describe("describeEnd", () => {
  it("says everyone is home, as the result card does, the score and the wave it ended on", () => {
    expect(describeEnd(runAt(4, 9_020), entryOf(4, "Thaw"), UNMARKED)).toBe(
      "Everyone is home. Score 9,020, on wave 4.",
    );
  });

  it("says a wave of Endless's by its number, and Endless", () => {
    expect(describeEnd(runAt(37, 9_020), endlessAt(37), UNMARKED)).toBe(
      "Everyone is home. Score 9,020, on wave 37, Endless.",
    );
  });

  it("says a score is a new best", () => {
    const said = describeEnd(runAt(4, 9_020), entryOf(4, "Thaw"), {
      ...UNMARKED,
      newBest: true,
    });

    expect(said).toBe("Everyone is home. Score 9,020, on wave 4. A new best!");
  });

  it("says a run cleared all thirty, after a new best", () => {
    const run = { ...runAt(37, 9_020), firstWave: 1 };

    const said = describeEnd(run, endlessAt(37), {
      newBest: true,
      clearedAll: true,
    });

    expect(said).toBe(
      "Everyone is home. Score 9,020, on wave 37, Endless. A new best! Cleared all thirty!",
    );
  });
});
