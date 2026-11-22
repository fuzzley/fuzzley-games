import { createField } from "../../rules/field/field";
import { parseLevel } from "../../rules/levels/levels";
import { type ReportedPlay, reportPlay } from "../../rules/run/report_state";
import { createRun, levelSeed, startLevel } from "../../rules/run/run";
import { restoreGame } from "../../rules/run/saved_game";
import { throwBall } from "../../testing/field_picture";
import { SPEC_LEVEL, SPEC_LEVELS } from "../../testing/play";
import {
  type BrickBreakerState,
  TRIMMED_NOTE,
  readBrickBreakerState,
  reportState,
} from "./brick_breaker_state";

/** Returns the steel level of the specs under way, a ball in play at ×1.5 its speed, as a report takes it. */
function steelInPlay(): ReportedPlay {
  const run = startLevel(
    createRun({
      id: 1,
      seed: 4,
      speed: "fast",
      lastLevel: SPEC_LEVELS.length,
      level: SPEC_LEVEL.steel,
    }),
  );
  const entry = SPEC_LEVELS[SPEC_LEVEL.steel - 1];
  if (!entry) throw new Error("No steel level.");
  const field = createField(parseLevel(entry), {
    speed: run.speed,
    seed: levelSeed(run),
  });
  throwBall(field, 5, 20, 30);
  field.ballSpeedScale = 1.5;
  return reportPlay(run, field, SPEC_LEVELS);
}

/** Returns the state a report packs of the steel level in play, read back from JSON. */
function packed(
  change: Partial<Record<keyof BrickBreakerState, unknown>> = {},
): Record<string, unknown> {
  const { value } = reportState(steelInPlay(), 1.5);
  return { ...(JSON.parse(JSON.stringify(value)) as object), ...change };
}

describe("reportState", () => {
  it("carries the level in play, its moment and the ball's speed, summed up", () => {
    const play = steelInPlay();

    const state = reportState(play, 1.5);

    expect({ summary: state.summary, value: state.value }).toEqual({
      summary: "Level 3 · Score 0 · 3 lives · 1 ball in play",
      value: { game: play.game, moment: play.moment, ballSpeedScale: 1.5 },
    });
  });

  it("drops the field's moment where the link has no room for it, saying so", () => {
    const play = steelInPlay();

    const { trim } = reportState(play, 1.5);

    expect({ most: trim?.most, trimmed: trim?.at(0) }).toEqual({
      most: 1,
      trimmed: {
        value: { game: play.game, moment: null, ballSpeedScale: 1.5 },
        note: TRIMMED_NOTE,
      },
    });
  });

  it("can't shrink a state with no moment", () => {
    const play: ReportedPlay = { ...steelInPlay(), moment: null };

    expect(reportState(play, 1).trim).toBeUndefined();
  });
});

describe("readBrickBreakerState", () => {
  it("reads a state back, its run taken up under a new id", () => {
    const play = steelInPlay();

    expect(readBrickBreakerState(packed(), SPEC_LEVELS, 7)).toEqual({
      takenUp: restoreGame(play.game, SPEC_LEVELS, 7),
      moment: play.moment,
      ballSpeedScale: 1.5,
    });
  });

  it("reads a state trimmed of its moment", () => {
    expect(
      readBrickBreakerState(packed({ moment: null }), SPEC_LEVELS, 7).moment,
    ).toBeNull();
  });

  it("refuses a state that isn't a record", () => {
    expect(() => readBrickBreakerState("bb1", SPEC_LEVELS, 7)).toThrow(
      "The game state doesn't fit this build.",
    );
  });

  it("refuses a part it doesn't know, naming it", () => {
    expect(() =>
      readBrickBreakerState({ ...packed(), stage: {} }, SPEC_LEVELS, 7),
    ).toThrow("The game state's stage doesn't fit this build.");
  });

  it("says a run that was over has no game to load", () => {
    expect(() =>
      readBrickBreakerState(
        packed({ game: null, moment: null }),
        SPEC_LEVELS,
        7,
      ),
    ).toThrow(
      "This game was over when it was reported. There's nothing to load.",
    );
  });

  it("refuses a game the saved game's reader refuses", () => {
    const { game } = steelInPlay();

    expect(() =>
      readBrickBreakerState(
        packed({ game: { ...game, levelId: "rocket" } }),
        SPEC_LEVELS,
        7,
      ),
    ).toThrow("The game state's game doesn't fit this build.");
  });

  it("refuses a moment the moment's reader refuses, naming its part", () => {
    const { moment } = steelInPlay();

    expect(() =>
      readBrickBreakerState(
        packed({ moment: { ...moment, height: 2 } }),
        SPEC_LEVELS,
        7,
      ),
    ).toThrow("The game state's moment.height doesn't fit this build.");
  });

  it("refuses a moment over a level not yet begun", () => {
    const { game } = steelInPlay();

    expect(() =>
      readBrickBreakerState(
        packed({ game: { ...game, field: null } }),
        SPEC_LEVELS,
        7,
      ),
    ).toThrow("The game state's moment doesn't fit this build.");
  });

  it("refuses a moment at another ball's speed than the state's", () => {
    const { moment } = steelInPlay();

    expect(() =>
      readBrickBreakerState(
        packed({ moment: { ...moment, ballSpeedScale: 9 } }),
        SPEC_LEVELS,
        7,
      ),
    ).toThrow("The game state's moment.ballSpeedScale doesn't fit this build.");
  });

  it.each([0.45, 2.05, "1"])(
    "refuses a ball's speed of %j, outside the debug menu's range",
    (ballSpeedScale) => {
      expect(() =>
        readBrickBreakerState(packed({ ballSpeedScale }), SPEC_LEVELS, 7),
      ).toThrow("The game state's ballSpeedScale doesn't fit this build.");
    },
  );
});
