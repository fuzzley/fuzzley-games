import { runInNewContext } from "node:vm";
import { themeBootstrapScript } from "./theme_script.ts";

describe("themeBootstrapScript", () => {
  const script = themeBootstrapScript({
    ids: ["classic", "casino"],
    storageKey: "fuzzley-theme",
    defaults: { light: "classic", dark: "casino" },
  });

  /** Runs the script in a page with the given storage and color scheme. */
  function pick({
    saved = null,
    dark = false,
    storage = true,
  }: {
    saved?: string | null;
    dark?: boolean;
    storage?: boolean;
  }): string | undefined {
    const dataset: Record<string, string> = {};
    const page: Record<string, unknown> = {
      localStorage: {
        getItem: (key: string) => {
          if (!storage) throw new Error("storage is off");
          return key === "fuzzley-theme" ? saved : null;
        },
      },
      matchMedia: () => ({ matches: dark }),
      document: { documentElement: { dataset } },
    };
    page["window"] = page;
    runInNewContext(script, page);
    return dataset["theme"];
  }

  it("keeps the palette the player chose", () => {
    expect(pick({ saved: "casino" })).toBe("casino");
  });

  it("picks the light default on a light system", () => {
    expect(pick({})).toBe("classic");
  });

  it("picks the dark default on a dark system", () => {
    expect(pick({ dark: true })).toBe("casino");
  });

  it("ignores a saved value that isn't a palette", () => {
    expect(pick({ saved: "neon" })).toBe("classic");
  });

  it("still picks a palette when storage is unavailable", () => {
    expect(pick({ storage: false, dark: true })).toBe("casino");
  });
});
