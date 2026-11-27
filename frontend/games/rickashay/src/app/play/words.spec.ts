import { signal } from "@angular/core";
import {
  createRun,
  landRound,
  startLevel,
  takeRound,
} from "@fz/brick-wall/rules/run";
import { levelAt } from "@fz/core/levels";
import type { Round, RoundStart } from "../../rules/flight/events";
import { parseLevel } from "../../rules/levels/levels";
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
import { RunWords } from "./words";

// The words themselves are the rules' `describe`'s, whose spec holds them:
// this one holds which the game says at each moment, and what of the run
// and the marks it says them with.

/** The run's rules over the specs' levels and marks. */
const RULES = runRulesOf(SPEC_LEVELS, SPEC_MARKS);

/** Returns the words over the specs' levels and marks. */
function wordsOf(): RunWords {
  return new RunWords(SPEC_LEVELS, SPEC_MARKS, FLIGHT_RULES);
}

/** Returns a run of the specs' levels, at a level, on a field 13 deep. */
function runAt(level: number): Run {
  return createRun({ id: 1, level, depth: 13 }, SPEC_LEVELS, RULES);
}

/** Returns where a spec level's first round starts, on a field 13 deep. */
function startOf(level: number): RoundStart {
  return levelStart(parseLevel(levelAt(SPEC_LEVELS, level).data), 13);
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

    const said = words.level(levelAt(SPEC_LEVELS, 1));

    expect(said).toBe("Level 1, First bounce. Par 8. Rally mark 9.");
  });

  it("refuses to say a level begun before it follows a run", () => {
    const words = wordsOf();

    expect(() => words.level(levelAt(SPEC_LEVELS, 1))).toThrow(
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
      words.takenUp(run, levelAt(SPEC_LEVELS, 2)),
    ];

    expect(said).toEqual([
      "Paused. Score 340. Press Enter to resume.",
      "Resumed.",
      "Paused on level 2, Side door. 2 shots taken. Score 340. Press Enter to resume.",
    ]);
  });
});

describe("RunWords, holding a flight's news", () => {
  it("says a floor bounce lost by the most a fuzzball holds, from the rules it is handed", () => {
    const words = new RunWords(SPEC_LEVELS, SPEC_MARKS, { mostBounces: 2 });
    words.hold([{ kind: "earned", by: "rally", rally: 70, kept: false }]);

    const said = words.takeHeld();

    expect(said).toBe("Rally 70: a floor bounce, but you already have 2.");
  });

  it("holds a floor bounce earned and the call, in order, until taken", () => {
    const words = wordsOf();
    words.hold([
      { kind: "earned", by: "rally", rally: 10, kept: true },
      { kind: "called" },
    ]);

    const said = [words.takeHeld(), words.takeHeld()];

    expect(said).toEqual(["Rally 10: a floor bounce. Rickaashay!", null]);
  });

  it("says what it holds before a round's end the same frame brings, and lets go of it", () => {
    const words = wordsOf();
    const round = roundOf("step");
    const aimed = startOf(1);
    words.hold([{ kind: "called" }]);

    const said = [words.round(round, aimed), words.takeHeld()];

    expect(said).toEqual([
      `Rickaashay! ${describeRound(round.outcome, aimed)}`,
      null,
    ]);
  });
});
