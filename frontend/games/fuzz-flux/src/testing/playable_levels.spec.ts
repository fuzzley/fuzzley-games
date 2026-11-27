import { isOneOf } from "@fz/core/records";
import { STAND_INS, WIND_RULE } from "../rules/elements/element_rules";
import { PLAYABLE_LEVELS } from "./playable_levels";

/** Returns the ids of the levels the rules play, of one set. */
function playableIn(set: string): readonly string[] {
  return PLAYABLE_LEVELS.filter((playable) => playable.set === set).map(
    ({ level }) => level.id,
  );
}

describe("PLAYABLE_LEVELS", () => {
  it("lets in every level of Warm-up, whose one element, dust, has its rule", () => {
    expect(playableIn("warm-up")).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);
  });

  it("lets in the levels whose wind blows one way and never turns", () => {
    expect(playableIn("windy-days")).toEqual(
      expect.arrayContaining(["28", "31"]),
    );
  });

  it("keeps out each level that brings in an element still played by the stand-in", () => {
    const strays = PLAYABLE_LEVELS.filter(({ level }) =>
      isOneOf(level.brings, STAND_INS),
    );

    expect(strays).toEqual([]);
  });

  it("keeps out each level that brings in a wind that turns, while the wind's rule turns none", () => {
    const strays = PLAYABLE_LEVELS.filter(
      ({ level }) =>
        level.brings === "turning-wind" && WIND_RULE.afterMove === undefined,
    );

    expect(strays).toEqual([]);
  });
});
