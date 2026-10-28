import { NO_INSETS } from "./insets";

describe("NO_INSETS", () => {
  it("lays nothing over any edge", () => {
    const edges = Object.values(NO_INSETS);

    expect(edges).toEqual([0, 0, 0, 0]);
  });
});
