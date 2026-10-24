import { compileString } from "sass";
import { type Breakpoint, below } from "./breakpoints";

// The widths are written twice, in Sass for the stylesheets and here for the
// components, so this keeps the two in step.
describe("below", () => {
  /** Returns the media query `bp.below` writes for a breakpoint. */
  function sassQuery(name: Breakpoint): string | undefined {
    const { css } = compileString(
      `@use "breakpoints" as bp; @include bp.below(${name}) { a { b: c; } }`,
      { loadPaths: [import.meta.dirname] },
    );
    return /@media ([^{]+?)\s*\{/.exec(css)?.[1];
  }

  it.each<Breakpoint>(["sm", "md", "lg", "xl"])(
    "matches what the stylesheets mean by %s",
    (name) => {
      expect(below(name)).toBe(sassQuery(name));
    },
  );
});
