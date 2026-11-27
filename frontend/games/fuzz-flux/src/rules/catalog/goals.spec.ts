import { ELEMENT_IDS } from "./elements";
import { GOAL_IDS } from "./goals";

describe("GOAL_IDS", () => {
  it("names gathering, then each element but the burr, which no goal counts", () => {
    expect(GOAL_IDS).toEqual([
      "gather",
      ...ELEMENT_IDS.filter((id) => id !== "burr"),
    ]);
  });
});
