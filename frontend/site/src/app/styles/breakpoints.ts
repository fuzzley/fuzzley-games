/**
 * The widths the layout changes at, the same as `_breakpoints.scss`'s, for a
 * component that needs one in TypeScript, such as to bind an input to it.
 */
const WIDTHS = { sm: "36rem", md: "40rem", lg: "52rem", xl: "64rem" } as const;

/** The name of one of the layout's breakpoints. */
export type Breakpoint = keyof typeof WIDTHS;

/** Returns the media query that matches the viewports `bp.below` styles. */
export function below(name: Breakpoint): string {
  return `(max-width: ${WIDTHS[name]})`;
}
