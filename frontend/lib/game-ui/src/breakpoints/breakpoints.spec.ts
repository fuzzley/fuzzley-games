import { compileString } from "sass";
import {
  COMPACT_MAX_HEIGHT_PX,
  COMPACT_MAX_WIDTH_PX,
  LABELLED_ACTIONS_MIN_WIDTH_PX,
  formFactorAt,
} from "./index";

// What `below()` takes off a width, so a window exactly on it matches only
// `from()`.
const GUARD = 0.02;

/** Returns the media query one of the Sass mixins writes. */
function media(include: string): string {
  const { css } = compileString(
    `@use "index" as breakpoints; @include breakpoints.${include} { a { b: c; } }`,
    { loadPaths: [import.meta.dirname] },
  );
  return (/@media ([^{]+)\{/.exec(css)?.[1] ?? "").replace(/\s+/g, " ").trim();
}

describe("formFactorAt", () => {
  it("reads a desktop's window as roomy", () => {
    expect(formFactorAt(1440, 900)).toBe("roomy");
  });

  it("reads a window exactly as wide and tall as the compact sizes as roomy", () => {
    expect(formFactorAt(COMPACT_MAX_WIDTH_PX, COMPACT_MAX_HEIGHT_PX)).toBe(
      "roomy",
    );
  });

  it("reads a phone held upright", () => {
    expect(formFactorAt(390, 844)).toBe("phone-portrait");
  });

  it("reads a phone on its side", () => {
    expect(formFactorAt(844, 390)).toBe("phone-landscape");
  });

  it("reads a wide window too short for the roomy chrome as on its side", () => {
    expect(formFactorAt(1000, COMPACT_MAX_HEIGHT_PX - 1)).toBe(
      "phone-landscape",
    );
  });

  it("reads a square compact window as upright, as CSS does", () => {
    expect(formFactorAt(600, 600)).toBe("phone-portrait");
  });

  it("reads an unmeasured window as roomy", () => {
    expect(formFactorAt(0, 0)).toBe("roomy");
  });
});

describe("the Sass breakpoints", () => {
  it("puts tablet at the compact width", () => {
    expect(media('below("tablet")')).toBe(
      `(max-width: ${COMPACT_MAX_WIDTH_PX - GUARD}px)`,
    );
  });

  it("starts from() at the width below() stops short of", () => {
    expect(media('from("tablet")')).toBe(
      `(min-width: ${COMPACT_MAX_WIDTH_PX}px)`,
    );
  });

  it("puts desktop at the width the bar's actions keep their labels from", () => {
    expect(media('below("desktop")')).toBe(
      `(max-width: ${LABELLED_ACTIONS_MIN_WIDTH_PX - GUARD}px)`,
    );
  });

  it("compacts below the compact width or the compact height", () => {
    expect(media("compact")).toBe(
      `(max-width: ${COMPACT_MAX_WIDTH_PX - GUARD}px), (max-height: ${COMPACT_MAX_HEIGHT_PX - GUARD}px)`,
    );
  });

  it("takes an upright phone to be narrower than the compact width", () => {
    expect(media("phone-portrait")).toBe(
      `(max-width: ${COMPACT_MAX_WIDTH_PX - GUARD}px) and (orientation: portrait)`,
    );
  });

  it("takes a phone on its side to be either compact size, turned", () => {
    expect(media("phone-landscape")).toBe(
      `(max-width: ${COMPACT_MAX_WIDTH_PX - GUARD}px) and (orientation: landscape), (max-height: ${COMPACT_MAX_HEIGHT_PX - GUARD}px) and (orientation: landscape)`,
    );
  });

  it("fails on a breakpoint it doesn't know", () => {
    expect(() => media('below("phone")')).toThrow(/Unknown breakpoint/);
  });
});
