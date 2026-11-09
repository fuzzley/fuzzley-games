import { setPageVisibility } from "./page_visibility";

describe("setPageVisibility", () => {
  it("sets the page's visibility", () => {
    setPageVisibility("hidden");

    expect(document.visibilityState).toBe("hidden");
  });

  it("says so as it sets it", () => {
    let heard: DocumentVisibilityState | null = null;
    document.addEventListener(
      "visibilitychange",
      () => {
        heard = document.visibilityState;
      },
      { once: true },
    );

    setPageVisibility("hidden");

    expect(heard).toBe("hidden");
  });

  it("gives the page back its own visibility once the test finishes", () => {
    // Registered first, so it runs last, after the cleanup it checks.
    onTestFinished(() => {
      // jsdom's own, as a window that pretends to be drawn has.
      expect(document.visibilityState).toBe("visible");
    });

    setPageVisibility("hidden");

    expect(document.visibilityState).toBe("hidden");
  });
});
