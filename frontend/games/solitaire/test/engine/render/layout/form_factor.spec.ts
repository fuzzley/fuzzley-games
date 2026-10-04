import { describe, it, expect } from "vitest";
import {
  COMPACT_MAX_HEIGHT_CSS_PX,
  COMPACT_MAX_WIDTH_CSS_PX,
  formFactorOf,
} from "@/engine/render/layout/form_factor";

/** Returns a viewport of the given CSS size at a pixel ratio of 3. */
function screen(cssWidth: number, cssHeight: number) {
  return { width: cssWidth * 3, height: cssHeight * 3, pixelRatio: 3 };
}

describe("formFactorOf", () => {
  it("reads a desktop window as roomy", () => {
    expect(formFactorOf(screen(1440, 900))).toBe("roomy");
  });

  it("reads a phone held upright as a phone in portrait", () => {
    expect(formFactorOf(screen(390, 844))).toBe("phone-portrait");
  });

  it("reads a phone on its side as a phone in landscape", () => {
    expect(formFactorOf(screen(844, 390))).toBe("phone-landscape");
  });

  it("reads a narrow window taller than it is wide as portrait", () => {
    expect(formFactorOf(screen(600, 900))).toBe("phone-portrait");
  });

  it("reads a narrow window wider than it is tall as landscape", () => {
    expect(formFactorOf(screen(700, 600))).toBe("phone-landscape");
  });

  it("reads a short window wider than the compact width as landscape", () => {
    expect(formFactorOf(screen(1280, 450))).toBe("phone-landscape");
  });

  it("reads a window exactly at both limits as roomy", () => {
    expect(
      formFactorOf(screen(COMPACT_MAX_WIDTH_CSS_PX, COMPACT_MAX_HEIGHT_CSS_PX)),
    ).toBe("roomy");
  });

  it("reads a square compact window as portrait, as CSS does", () => {
    expect(formFactorOf(screen(400, 400))).toBe("phone-portrait");
  });

  it("reads an unmeasured viewport as roomy", () => {
    expect(formFactorOf({ width: 0, height: 0, pixelRatio: 1 })).toBe("roomy");
  });
});
