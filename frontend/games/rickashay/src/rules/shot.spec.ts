import { isShot } from "./shot";

describe("isShot", () => {
  it.each([0, 148, 656])("takes a shot at aim %s", (aim) => {
    expect(isShot({ aim })).toBe(true);
  });

  it.each([
    ["an aim past the last", { aim: 657 }],
    ["an aim between two", { aim: 2.5 }],
    ["an aim written as text", { aim: "148" }],
    ["a record with no aim", {}],
    ["a bare aim", 148],
    ["null", null],
  ])("refuses %s", (_, value) => {
    expect(isShot(value)).toBe(false);
  });
});
