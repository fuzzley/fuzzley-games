import { type FakeViewport, installFakeViewport } from "./fake_viewport";

describe("installFakeViewport", () => {
  let viewport: FakeViewport | null = null;

  /** Returns how many times a query's listener hears that it changed. */
  function listen(query: MediaQueryList): { told: number } {
    const heard = { told: 0 };
    query.addEventListener("change", () => {
      heard.told++;
    });
    return heard;
  }

  afterEach(() => {
    viewport?.restore();
    viewport = null;
    vi.restoreAllMocks();
  });

  it("answers a width query against its size", () => {
    viewport = installFakeViewport(700);

    expect(window.matchMedia("(max-width: 719.98px)").matches).toBe(true);
  });

  it("is tall enough by default that only the width can compact it", () => {
    viewport = installFakeViewport(390);

    expect(window.matchMedia("(max-height: 499.98px)").matches).toBe(false);
  });

  it("holds every condition of an alternative to its size", () => {
    viewport = installFakeViewport(844, 390);

    expect(
      window.matchMedia("(max-width: 719.98px) and (orientation: landscape)")
        .matches,
    ).toBe(false);
  });

  it("answers the color scheme as a light system's", () => {
    viewport = installFakeViewport(1280);

    expect(window.matchMedia("(prefers-color-scheme: dark)").matches).toBe(
      false,
    );
  });

  it("answers the motion query as a system's with no preference", () => {
    viewport = installFakeViewport(1280);

    expect(
      window.matchMedia("(prefers-reduced-motion: no-preference)").matches,
    ).toBe(true);
  });

  it("answers the pointer query as a mouse's", () => {
    viewport = installFakeViewport(1280);

    expect(window.matchMedia("(pointer: fine)").matches).toBe(true);
  });

  it("tells a query when the pointer becomes a finger", () => {
    viewport = installFakeViewport(390);
    const query = window.matchMedia("(pointer: coarse)");
    const heard = listen(query);

    viewport.setCoarsePointer(true);

    expect({ matches: query.matches, told: heard.told }).toEqual({
      matches: true,
      told: 1,
    });
  });

  it("tells a query when a new width changes its answer", () => {
    viewport = installFakeViewport(1000);
    const query = window.matchMedia("(max-width: 719.98px)");
    const heard = listen(query);

    viewport.setWidth(700);

    expect({ matches: query.matches, told: heard.told }).toEqual({
      matches: true,
      told: 1,
    });
  });

  it("answers a resolution query against the window's pixel ratio", () => {
    viewport = installFakeViewport(1280);

    expect(window.matchMedia("(resolution: 1dppx)").matches).toBe(true);
  });

  it("tells a resolution query when the pixel ratio changes, which the window reports", () => {
    viewport = installFakeViewport(1280);
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
    viewport = installFakeViewport(1280);

    expect(window.matchMedia("(resolution: 2.5dppx)").matches).toBe(true);
  });

  it("answers a resolution query at the ratio the window reports as it is asked, though spied after installing", () => {
    viewport = installFakeViewport(1280);

    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);

    expect(window.matchMedia("(resolution: 2dppx)").matches).toBe(true);
  });

  it("tells a query held at a spied ratio as a spec sets another", () => {
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);
    viewport = installFakeViewport(1280);
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
    viewport = installFakeViewport(1000);
    const heard = listen(window.matchMedia("(max-width: 719.98px)"));

    viewport.setSize(900, 700);

    expect(heard.told).toBe(0);
  });

  it("stops telling a listener once it is removed", () => {
    viewport = installFakeViewport(1000);
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
    viewport = installFakeViewport(1000);

    expect(() => window.matchMedia("(min-width: 10px)")).toThrow(
      "Fake viewport cannot answer: (min-width: 10px)",
    );
  });

  it("takes itself back off the window", () => {
    installFakeViewport(1000).restore();

    expect("matchMedia" in window).toBe(false);
  });
});
