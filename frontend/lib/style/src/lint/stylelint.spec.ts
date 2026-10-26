import stylelint from "stylelint";
import preset from "./stylelint.ts";

/** Returns the rules a stylesheet breaks under the preset. */
async function broken(code: string): Promise<string[]> {
  const { results } = await stylelint.lint({ code, config: preset });
  return results.flatMap((result) => result.warnings.map(({ rule }) => rule));
}

describe("the stylelint preset", () => {
  it("accepts a color read from the palette", async () => {
    expect(await broken("a {\n  color: var(--fz-accent);\n}\n")).toEqual([]);
  });

  it("rejects a hex color", async () => {
    expect(await broken("a {\n  color: #fff;\n}\n")).toEqual(["color-no-hex"]);
  });

  it("rejects a color written as a function", async () => {
    expect(await broken("a {\n  color: rgb(0 0 0);\n}\n")).toEqual([
      "function-disallowed-list",
    ]);
  });

  it("rejects @import, for Sass modules", async () => {
    expect(await broken('@import "tokens";\n')).toContain(
      "at-rule-disallowed-list",
    );
  });
});
