import { DEPTHS } from "@fz/brick-wall/rules/field";
import type { Pars } from "@fz/brick-wall/rules/par";
import { LEVEL_MARKS } from "./level_marks";
import { LEVELS } from "./levels";

/** Returns the depths a table of marks holds each level on, by the level's id. */
function depthsOf(table: Pars): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(table).map(([id, row]) => [id, Object.keys(row)]),
  );
}

describe("LEVEL_MARKS", () => {
  it("hold a par and a rally mark for every level on every depth, and for no other level", () => {
    const every = Object.fromEntries(
      LEVELS.map(({ data }) => [data.id, DEPTHS.map(String)]),
    );

    expect([depthsOf(LEVEL_MARKS.par), depthsOf(LEVEL_MARKS.rally)]).toEqual([
      every,
      every,
    ]);
  });
});
