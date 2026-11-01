import { pick } from "./tables";

describe("pick", () => {
  it("copies the entries under the keys given, and no others", () => {
    const brick = { hits: 2, broken: false, cell: 7 };

    expect(pick(brick, ["hits", "broken"])).toEqual({ hits: 2, broken: false });
  });
});
