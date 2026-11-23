import { signal } from "@angular/core";
import {
  createRun,
  landRound,
  startLevel,
  takeRound,
} from "@fz/brick-wall/rules/run";
import type { Round, RoundStart } from "../../rules/flight/events";
import { levelEntryOf, parseLevel } from "../../rules/levels/levels";
import { describeCleared, describeRound } from "../../rules/run/describe";
import { type Run, levelStart, runRulesOf } from "../../rules/run/run";
import { FLIGHT_RULES } from "../../rules/tuning";
import {
  SPEC_LEVELS,
  SPEC_MARKS,
  STILL,
  type SpecRound,
  scriptedRounds,
} from "../../testing/spec_play";
import { RunWords, fastForwardWords } from "./words";

// The words themselves are the rules' `describe`'s, whose spec holds them:
// this one holds which the game says at each moment, and what of the run
// and the marks it says them with.

/** The run's rules over the specs' levels and marks. */
const RULES = runRulesOf(SPEC_LEVELS, SPEC_MARKS);

/** Returns the words over the specs' levels and marks. */
function wordsOf(): RunWords {
  return new RunWords(SPEC_LEVELS, SPEC_MARKS);
}

/** Returns a run of the specs' levels, at a level, on a field 13 deep. */
function runAt(level: number): Run {
  return createRun({ id: 1, level, depth: 13 }, SPEC_LEVELS, RULES);
}

/** Returns where a spec level's first round starts, on a field 13 deep. */
function startOf(level: number): RoundStart {
  return levelStart(parseLevel(levelEntryOf(SPEC_LEVELS, level).data), 13);
}

/** Returns a round a spec's script names, played from the first level's start. */
function roundOf(kind: SpecRound): Round {
  return scriptedRounds(kind)(startOf(1), { aim: STILL.aim }, FLIGHT_RULES);
}

/** Returns the run with its first level cleared by a round, landed, the stars it earned taken in. */
function clearedRun(): Run {
  const run = takeRound(
    startLevel(runAt(1)),
    roundOf("cleared").outcome,
    RULES,
  );
  return landRound(run, RULES);
}

describe("RunWords", () => {
  it("says a round's end of the round aimed next, while the level goes on", () => {
    const round = roundOf("step");
    const aimed = startOf(2);

    const said = wordsOf().round(round, aimed);

    expect(said).toBe(describeRound(round.outcome, aimed));
  });

  it("says a round's end of the wall it left, once it ends the level", () => {
    const round = roundOf("cleared");

    const said = wordsOf().round(round, startOf(2));

    expect(said).toBe(describeRound(round.outcome, round.next));
  });

  it("says the wall's jump after the round's end", () => {
    const round = roundOf("jump");
    const aimed = startOf(1);

    const said = wordsOf().round(round, aimed);

    expect(said).toBe(
      `${describeRound(round.outcome, aimed)} The wall jumped 4 rows. Your next shot is a hot shot.`,
    );
  });

  it("says the danger after the round's end, once a brick the level needs stands over the floor's row", () => {
    const round = roundOf("step");
    const start = startOf(1);
    const low = { ...start, wall: { ...start.wall, lowestRow: 1 } };

    const said = wordsOf().round(round, low);

    expect(said).toMatch(
      /Danger\. Break the bottom bricks this shot, or you lose the level\.$/,
    );
  });

  it("says a level begun with its par and its rally mark on the run's depth", () => {
    const words = wordsOf();
    words.follow(signal(runAt(1)));

    const said = words.level(levelEntryOf(SPEC_LEVELS, 1));

    expect(said).toBe("Level 1, First bounce. Par 8. Rally mark 9.");
  });

  it("refuses to say a level begun before it follows a run", () => {
    const words = wordsOf();

    expect(() => words.level(levelEntryOf(SPEC_LEVELS, 1))).toThrow(
      "No run is on the board to say a level of.",
    );
  });

  it("says a level cleared with the stars it earned against its rally mark", () => {
    const run = clearedRun();

    const said = wordsOf().cleared(run);

    expect(said).toBe(
      describeCleared(run, { cleared: true, par: true, mark: false }, 9),
    );
  });

  it("says a lost run's end on the level it was lost on", () => {
    const run: Run = { ...runAt(2), outcome: "over", score: 340 };

    const said = wordsOf().end(run, false);

    expect(said).toBe("Game over. Lost on level 2, Side door. Score 340.");
  });

  it("says a pause, going on, and a run taken up", () => {
    const words = wordsOf();
    const run: Run = { ...runAt(2), rounds: 2, score: 340 };

    const said = [
      words.pause(run),
      words.resume(),
      words.takenUp(run, levelEntryOf(SPEC_LEVELS, 2)),
    ];

    expect(said).toEqual([
      "Paused. Score 340. Press Enter to resume.",
      "Resumed.",
      "Paused on level 2, Side door. 2 shots taken. Score 340. Press Enter to resume.",
    ]);
  });
});

describe("fastForwardWords", () => {
  it("says fast-forward on or off", () => {
    expect([fastForwardWords(true), fastForwardWords(false)]).toEqual([
      "Fast-forward on.",
      "Fast-forward off.",
    ]);
  });
});
