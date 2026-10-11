import { describe, it, expect } from "vitest";
import { GAME_DOCUMENTATION_REGISTRY } from "@/ui/app/provider/game_documentation_data";

describe("the rules pages", () => {
  it("show screenshots that exist", () => {
    // What `yarn build:thumbs` writes, as the paths the public folder serves.
    const images = new Set(
      Object.keys(import.meta.glob("/public/docs/screenshots/*/*.webp")).map(
        (path) => path.replace("/public/", "./"),
      ),
    );

    const missing = Object.values(GAME_DOCUMENTATION_REGISTRY)
      .flatMap((doc) => (doc.screenshot ? [doc.screenshot.url] : []))
      .filter((url) => !images.has(url));

    expect(missing).toEqual([]);
  });
});
