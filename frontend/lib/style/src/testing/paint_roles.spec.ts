// @vitest-environment jsdom
// paintRoles() paints the page, so its spec runs in jsdom, apart from the
// rest of the entry's, which run in Node.
import { paintRoles } from "./index.ts";

const ROOT = document.documentElement;
const NAMES = { ground: "page", ink: "text" };

describe("paintRoles", () => {
  it("paints each color under the role its key names", () => {
    paintRoles(NAMES, { ground: "#ffffff", ink: "#111111" });

    expect({
      page: ROOT.style.getPropertyValue("--fz-page"),
      text: ROOT.style.getPropertyValue("--fz-text"),
    }).toEqual({ page: "#ffffff", text: "#111111" });
  });

  it("takes its colors off the page once the test finishes", () => {
    // Registered first, so it runs last, after the cleanup it checks.
    onTestFinished(() => {
      expect({
        page: ROOT.style.getPropertyValue("--fz-page"),
        text: ROOT.style.getPropertyValue("--fz-text"),
      }).toEqual({ page: "", text: "" });
    });

    paintRoles(NAMES, { ground: "#ffffff", ink: "#111111" });

    expect(ROOT.style.getPropertyValue("--fz-page")).toBe("#ffffff");
  });

  it("gives back a color the page held before it", () => {
    onTestFinished(() => {
      ROOT.removeAttribute("style");
    });
    // Registered after the line above, so it runs before it, but after the
    // cleanup it checks.
    onTestFinished(() => {
      expect(ROOT.style.getPropertyValue("--fz-page")).toBe("#808080");
    });
    ROOT.style.setProperty("--fz-page", "#808080");

    paintRoles(NAMES, { ground: "#ffffff", ink: "#111111" });

    expect(ROOT.style.getPropertyValue("--fz-page")).toBe("#ffffff");
  });

  describe("in a beforeAll", () => {
    let thrown = false;

    beforeAll(() => {
      try {
        paintRoles(NAMES, { ground: "#ffffff", ink: "#111111" });
      } catch {
        thrown = true;
      }
    });

    it("throws, having painted nothing", () => {
      expect({
        thrown,
        page: ROOT.style.getPropertyValue("--fz-page"),
      }).toEqual({ thrown: true, page: "" });
    });
  });
});
