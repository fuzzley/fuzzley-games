import { installFakeViewport } from "./fake_viewport";

describe("installFakeViewport", () => {
  /** Returns how many times a query's listener hears that it changed. */
  function listen(query: MediaQueryList): { told: number } {
    const heard = { told: 0 };
    query.addEventListener("change", () => {
      heard.told++;
    });
    return heard;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers a width query against its size", () => {
    installFakeViewport(700);

    expect(window.matchMedia("(max-width: 719.98px)").matches).toBe(true);
  });

  it("is tall enough by default that only the width can compact it", () => {
    installFakeViewport(390);

    expect(window.matchMedia("(max-height: 499.98px)").matches).toBe(false);
  });

  it("holds every condition of an alternative to its size", () => {
    installFakeViewport(844, 390);

    expect(
      window.matchMedia("(max-width: 719.98px) and (orientation: landscape)")
        .matches,
    ).toBe(false);
  });

  it("answers the color scheme as a light system's", () => {
    installFakeViewport(1280);

    expect(window.matchMedia("(prefers-color-scheme: dark)").matches).toBe(
      false,
    );
  });

  it("answers the motion query as a system's with no preference", () => {
    installFakeViewport(1280);

    expect(
      window.matchMedia("(prefers-reduced-motion: no-preference)").matches,
    ).toBe(true);
  });

  it("tells a query when the system comes to prefer a dark scheme", () => {
    const viewport = installFakeViewport(1280);
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const heard = listen(query);

    viewport.setColorScheme("dark");

    expect({ matches: query.matches, told: heard.told }).toEqual({
      matches: true,
      told: 1,
    });
  });

  it("stops answering a light scheme once the system prefers a dark one", () => {
    const viewport = installFakeViewport(1280);

    viewport.setColorScheme("dark");

    expect(window.matchMedia("(prefers-color-scheme: light)").matches).toBe(
      false,
    );
  });

  it("tells a query when the player comes to ask for less motion", () => {
    const viewport = installFakeViewport(1280);
    const query = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const heard = listen(query);

    viewport.setReducedMotion(true);

    expect({ matches: query.matches, told: heard.told }).toEqual({
      matches: false,
      told: 1,
    });
  });

  it("answers a query for less motion once the player asks for it", () => {
    const viewport = installFakeViewport(1280);

    viewport.setReducedMotion(true);

    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(
      true,
    );
  });

  it("answers the pointer query as a mouse's", () => {
    installFakeViewport(1280);

    expect(window.matchMedia("(pointer: fine)").matches).toBe(true);
  });

  it("tells a query when the pointer becomes a finger", () => {
    const viewport = installFakeViewport(390);
    const query = window.matchMedia("(pointer: coarse)");
    const heard = listen(query);

    viewport.setCoarsePointer(true);

    expect({ matches: query.matches, told: heard.told }).toEqual({
      matches: true,
      told: 1,
    });
  });

  it("tells a query when a new width changes its answer", () => {
    const viewport = installFakeViewport(1000);
    const query = window.matchMedia("(max-width: 719.98px)");
    const heard = listen(query);

    viewport.setWidth(700);

    expect({ matches: query.matches, told: heard.told }).toEqual({
      matches: true,
      told: 1,
    });
  });

  it("answers a resolution query against the window's pixel ratio", () => {
    installFakeViewport(1280);

    expect(window.matchMedia("(resolution: 1dppx)").matches).toBe(true);
  });

  it("tells a resolution query when the pixel ratio changes, which the window reports", () => {
    const viewport = installFakeViewport(1280);
    const query = window.matchMedia("(resolution: 1dppx)");
    const heard = listen(query);

    viewport.setPixelRatio(1.25);

    expect({
      matches: query.matches,
      told: heard.told,
      ratio: window.devicePixelRatio,
    }).toEqual({ matches: false, told: 1, ratio: 1.25 });
  });

  it("answers a resolution query at the ratio a spec spied the window at", () => {
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2.5);
    installFakeViewport(1280);

    expect(window.matchMedia("(resolution: 2.5dppx)").matches).toBe(true);
  });

  it("answers a resolution query at the ratio the window reports as it is asked, though spied after installing", () => {
    installFakeViewport(1280);

    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);

    expect(window.matchMedia("(resolution: 2dppx)").matches).toBe(true);
  });

  it("tells a query held at a spied ratio as a spec sets another", () => {
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);
    const viewport = installFakeViewport(1280);
    const query = window.matchMedia("(resolution: 2dppx)");
    const heard = listen(query);

    viewport.setPixelRatio(1.5);

    expect({
      matches: query.matches,
      told: heard.told,
      ratio: window.devicePixelRatio,
    }).toEqual({ matches: false, told: 1, ratio: 1.5 });
  });

  it("puts the window's own pixel ratio back", () => {
    const fake = installFakeViewport(1280);
    fake.setPixelRatio(2);

    fake.restore();

    expect(window.devicePixelRatio).toBe(1);
  });

  it("tells a query nothing when its answer stays the same", () => {
    const viewport = installFakeViewport(1000);
    const heard = listen(window.matchMedia("(max-width: 719.98px)"));

    viewport.setSize(900, 700);

    expect(heard.told).toBe(0);
  });

  it("stops telling a listener once it is removed", () => {
    const viewport = installFakeViewport(1000);
    const query = window.matchMedia("(max-width: 719.98px)");
    let told = 0;
    const listener = (): void => {
      told++;
    };
    query.addEventListener("change", listener);
    query.removeEventListener("change", listener);

    viewport.setWidth(700);

    expect(told).toBe(0);
  });

  it("refuses a query it cannot answer", () => {
    installFakeViewport(1000);

    expect(() => window.matchMedia("(min-width: 10px)")).toThrow(
      "Fake viewport cannot answer: (min-width: 10px)",
    );
  });

  it("takes itself back off the window", () => {
    installFakeViewport(1000).restore();

    expect("matchMedia" in window).toBe(false);
  });

  it("takes itself back off the window once the test finishes", () => {
    // Registered first, so it runs last, after the cleanup it checks.
    onTestFinished(() => {
      expect({
        matchMedia: "matchMedia" in window,
        ratio: window.devicePixelRatio,
      }).toEqual({ matchMedia: false, ratio: 1 });
    });

    installFakeViewport(390).setPixelRatio(3);

    expect(window.devicePixelRatio).toBe(3);
  });

  it("leaves a fake installed after it alone once taken off", () => {
    const first = installFakeViewport(1280);
    first.restore();
    installFakeViewport(390);

    first.restore();

    expect(window.matchMedia("(max-width: 719.98px)").matches).toBe(true);
  });

  it("leaves the window's own ratio as a spy's restoring puts it back", () => {
    // Registered first, so it runs last, after the `afterEach` restores the
    // spy and the fake takes itself off.
    onTestFinished(() => {
      expect(window.devicePixelRatio).toBe(1);
    });
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);

    installFakeViewport(1280).setPixelRatio(1.5);

    expect(window.devicePixelRatio).toBe(1.5);
  });

  describe("installed in a beforeAll", () => {
    let thrown = false;

    beforeAll(() => {
      try {
        installFakeViewport(390);
      } catch {
        thrown = true;
      }
    });

    it("throws, leaving the window without the fake", () => {
      expect({ thrown, matchMedia: "matchMedia" in window }).toEqual({
        thrown: true,
        matchMedia: false,
      });
    });
  });

  describe("installed in a beforeEach", () => {
    beforeEach(() => {
      // Registered first, so it runs last, after the cleanup it checks.
      onTestFinished(() => {
        expect("matchMedia" in window).toBe(false);
      });
      installFakeViewport(390);
    });

    it("answers for the test", () => {
      expect(window.matchMedia("(max-width: 719.98px)").matches).toBe(true);
    });
  });
});
