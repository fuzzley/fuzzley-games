import { FUZZBALL, fuzzballSvg } from "./fuzzball.ts";

describe("fuzzballSvg", () => {
  it("draws the body and the fur in one color", () => {
    const svg = fuzzballSvg("#123456");

    expect(svg).toContain(".body{fill:#123456}.fur{stroke:#123456}");
  });

  it("needs no color scheme rule for one color", () => {
    expect(fuzzballSvg("#123456")).not.toContain("prefers-color-scheme");
  });

  it("switches the fur's color with the system's color scheme", () => {
    const svg = fuzzballSvg({ light: "#123456", dark: "#abcdef" });

    expect(svg).toContain(
      "<style>.body{fill:#123456}.fur{stroke:#123456}@media (prefers-color-scheme:dark){.body{fill:#abcdef}.fur{stroke:#abcdef}}</style>",
    );
  });

  it("gives both eyes their own ink, whatever the fur's color", () => {
    const svg = fuzzballSvg("#123456");

    expect(svg.match(/<ellipse [^>]*fill="([^"]+)"/g)).toEqual([
      expect.stringContaining(`fill="${FUZZBALL.ink}"`),
      expect.stringContaining(`fill="${FUZZBALL.ink}"`),
    ]);
  });

  it("gives each eye a glint", () => {
    const svg = fuzzballSvg("#123456");

    expect(svg.split(`fill="${FUZZBALL.glint}"`).length - 1).toBe(
      FUZZBALL.glints.length,
    );
  });

  it("leaves out the glints when asked", () => {
    expect(fuzzballSvg("#123456", { withGlints: false })).not.toContain(
      `fill="${FUZZBALL.glint}"`,
    );
  });

  it("draws the fur's strands", () => {
    expect(fuzzballSvg("#123456")).toContain(`d="${FUZZBALL.fur.d}"`);
  });
});
