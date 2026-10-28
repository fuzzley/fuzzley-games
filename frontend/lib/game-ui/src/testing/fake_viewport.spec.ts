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
