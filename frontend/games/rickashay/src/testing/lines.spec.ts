import { SPEC_LEVELS } from "./spec_play";
import { TWO_SHOTS, filesHolding } from "./lines";

describe("filesHolding", () => {
  it("holds two shots for the specs' first level on the depth given, in its set's file", async () => {
    const [first] = SPEC_LEVELS;

    const file = await filesHolding(() => 14)[first?.set.id ?? ""]?.();

    expect(file).toEqual({ [first?.data.id ?? ""]: { "14": TWO_SHOTS } });
  });
});
