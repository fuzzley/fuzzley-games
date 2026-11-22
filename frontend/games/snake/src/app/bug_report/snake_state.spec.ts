import { reportRun } from "../../rules/reported_run";
import { createRun } from "../../rules/run";
import { DEFAULT_SETTINGS } from "../settings/settings.service";
import { type SnakeState, readSnakeState } from "./snake_state";

/** A state as a report carries it: a run waiting, the board, the settings. */
const STATE: SnakeState = {
  run: reportRun(createRun({ id: 1, seed: 4, speed: "slow" })),
  stage: { newBest: false, card: "coming" },
  settings: { ...DEFAULT_SETTINGS, speed: "slow" },
};

/** Returns the state with some of a part of it changed. */
function stateWith(
  part: "stage" | "settings",
  change: Record<string, unknown>,
): unknown {
  return { ...STATE, [part]: { ...STATE[part], ...change } };
}

describe("readSnakeState", () => {
  it("reads a state back, its run under a new id", () => {
    expect(readSnakeState(STATE, 5)).toEqual({
      run: createRun({ id: 5, seed: 4, speed: "slow" }),
      stage: STATE.stage,
      settings: STATE.settings,
    });
  });

  it.each(["open", "closed"])(
    "reads the card over an ended run as %s",
    (card) => {
      expect(readSnakeState(stateWith("stage", { card }), 5).stage.card).toBe(
        card,
      );
    },
  );

  it("refuses a state that isn't a record", () => {
    expect(() => readSnakeState("sn1", 1)).toThrow(
      "The game state doesn't fit this build.",
    );
  });

  it("refuses a run it can't trust, naming it", () => {
    expect(() =>
      readSnakeState({ ...STATE, run: { ...STATE.run, outcome: "lost" } }, 1),
    ).toThrow("The game state's run.outcome doesn't fit this build.");
  });

  it.each(["stage", "settings"])("refuses a %s that isn't a record", (part) => {
    expect(() => readSnakeState({ ...STATE, [part]: [] }, 1)).toThrow(
      `The game state's ${part} doesn't fit this build.`,
    );
  });

  it.each<["stage" | "settings", Record<string, unknown>, string]>([
    ["stage", { newBest: "yes" }, "stage.newBest"],
    ["stage", { card: "gone" }, "stage.card"],
    ["settings", { speed: "ludicrous" }, "settings.speed"],
    ["settings", { movement: "slither" }, "settings.movement"],
    ["settings", { arrows: "sometimes" }, "settings.arrows"],
    ["settings", { sound: "loud" }, "settings.sound"],
  ])("refuses a %s of %j, naming it", (part, change, name) => {
    expect(() => readSnakeState(stateWith(part, change), 1)).toThrow(
      `The game state's ${name} doesn't fit this build.`,
    );
  });
});
