import { type ReportEnvironment, environmentList } from "./environment";

/** A desktop's browser, its window 1280 by 720 at twice the pixels. */
const BROWSER = {
  userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
  width: 1280,
  height: 720,
  pixelRatio: 2,
} as const;

/** A roomy window with a mouse, its build stamped. */
const DESK: ReportEnvironment = {
  build: { commit: "549c93a", buildTime: "2031-06-15T09:30:00.000Z" },
  browser: BROWSER,
  compact: false,
  portrait: false,
  barPlacement: "top",
  touch: false,
  allowsMotion: true,
  theme: "midnight",
};

/** An upright phone, asking for less motion. */
const PHONE: ReportEnvironment = {
  ...DESK,
  compact: true,
  portrait: true,
  barPlacement: "bottom",
  touch: true,
  allowsMotion: false,
};

/** Returns the lines of the list for a page, with no settings of the game's. */
function lines(page: ReportEnvironment): string[] {
  return environmentList(page, []).split("\n");
}

describe("environmentList", () => {
  it("says which build filed the report, and when it was built", () => {
    expect(lines(DESK)).toContain(
      "- Build: 549c93a, built 2031-06-15T09:30:00.000Z",
    );
  });

  it("says so when the build carries no stamp", () => {
    expect(lines({ ...DESK, build: null })).toContain("- Build: unknown");
  });

  it("names the browser", () => {
    expect(lines(DESK)).toContain("- Browser: Mozilla/5.0 (X11; Linux x86_64)");
  });

  it("gives the size of the window and its pixel ratio", () => {
    expect(lines(DESK)).toContain("- Window: 1280×720 at 2× pixel ratio");
  });

  it("rounds the pixel ratio a browser reports with float noise", () => {
    const page = {
      ...DESK,
      browser: { ...BROWSER, pixelRatio: 2.0000000596046448 },
    };

    expect(lines(page)).toContain("- Window: 1280×720 at 2× pixel ratio");
  });

  it("leaves out the browser and the window for a document without one", () => {
    expect(lines({ ...DESK, browser: null })).toEqual([
      "- Build: 549c93a, built 2031-06-15T09:30:00.000Z",
      "- Screen: roomy, landscape, bar at the top, no touch",
      "- Motion: full",
      "- Theme: midnight",
    ]);
  });

  it("describes a roomy screen with no touch", () => {
    expect(lines(DESK)).toContain(
      "- Screen: roomy, landscape, bar at the top, no touch",
    );
  });

  it("describes an upright phone", () => {
    expect(lines(PHONE)).toContain(
      "- Screen: compact, portrait, bar at the bottom, touch",
    );
  });

  it("describes a phone on its side", () => {
    const page = {
      ...PHONE,
      portrait: false,
      barPlacement: "end",
    } as const satisfies ReportEnvironment;

    expect(lines(page)).toContain(
      "- Screen: compact, landscape, bar at the end, touch",
    );
  });

  it("says when the player allows motion", () => {
    expect(lines(DESK)).toContain("- Motion: full");
  });

  it("says when the player asks for less motion", () => {
    expect(lines(PHONE)).toContain("- Motion: reduced");
  });

  it("names the palette in use", () => {
    expect(lines(DESK)).toContain("- Theme: midnight");
  });

  it("lists the game's settings last, as it words them", () => {
    const list = environmentList(DESK, ["Speed: Normal", "Sound: Off"]);

    expect(list.split("\n").slice(-2)).toEqual([
      "- Speed: Normal",
      "- Sound: Off",
    ]);
  });
});
