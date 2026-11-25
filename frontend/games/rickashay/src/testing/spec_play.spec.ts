import { levelAt } from "@fz/brick-wall/rules/progress";
import { thirdsOf } from "@fz/brick-wall/rules/wall";
import { parseLevel } from "../rules/levels/levels";
import { levelStart } from "../rules/run/run";
import { roundPoints } from "../rules/run/scoring";
import { FLIGHT_RULES } from "../rules/tuning";
import { SPEC_FLIGHTS, SPEC_LEVELS, STILL, scriptedRounds } from "./spec_play";

/** Where the first spec level's first round starts, on a field 13 deep. */
const START = levelStart(parseLevel(levelAt(SPEC_LEVELS, 1).data), 13);

/** A shot the scripted rounds pay no heed to. */
const SHOT = { aim: STILL.aim };

describe("scriptedRounds", () => {
  it("plays the rounds a script lists in turn, the last again once it runs out", () => {
    const play = scriptedRounds("step", "jump");

    const results = [1, 2, 3].map(
      () => play(START, SHOT, FLIGHT_RULES).outcome.jumped,
    );

    expect(results).toEqual([false, true, true]);
  });

  it("steps the wall down a row after a plain flight, the level going on", () => {
    const round = scriptedRounds("step")(START, SHOT, FLIGHT_RULES);

    expect([
      round.flight,
      round.outcome.result,
      round.next.wall.lowestRow,
      round.next.hot,
    ]).toEqual([SPEC_FLIGHTS.step, "on", START.wall.lowestRow - 1, false]);
  });

  it("jumps the wall a third of the field down, the next shot hot", () => {
    const round = scriptedRounds("jump")(START, SHOT, FLIGHT_RULES);

    expect([round.next.wall.lowestRow, round.next.hot]).toEqual([
      START.wall.lowestRow - thirdsOf(13).jump,
      true,
    ]);
  });

  it("scores a long rally's strikes and the floor bounce it earned", () => {
    const round = scriptedRounds("rally")(START, SHOT, FLIGHT_RULES);

    expect([round.outcome.earned, round.outcome.points]).toEqual([
      1,
      roundPoints({
        rally: SPEC_FLIGHTS.rally.rally,
        earned: 1,
        jumped: false,
      }),
    ]);
  });

  it("empties the wall of a round that clears the level", () => {
    const round = scriptedRounds("cleared")(START, SHOT, FLIGHT_RULES);

    expect([
      round.outcome.result,
      round.next.wall.bricks.every((brick) => brick === null),
    ]).toEqual(["cleared", true]);
  });

  it("steps the wall down as a round loses the level", () => {
    const round = scriptedRounds("lost")(START, SHOT, FLIGHT_RULES);

    expect([round.outcome.result, round.next.wall.lowestRow]).toEqual([
      "lost",
      START.wall.lowestRow - 1,
    ]);
  });
});
