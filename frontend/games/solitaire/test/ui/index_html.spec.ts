import { describe, it, expect } from "vitest";
import { browserItems } from "@/ui/app/model/game_browser_item";
import { GAME_CATALOG } from "@/ui/app/provider/game_catalog";
import { GAME_PROFILE_REGISTRY } from "@/ui/app/provider/game_profile_data";
import indexHtml from "../../index.html?raw";

/** Every game the browser lists from the real catalog. */
const ITEMS = browserItems(GAME_CATALOG, GAME_PROFILE_REGISTRY);

/** Returns the games the page lists for a reader without JavaScript. */
function noscriptGames(): string[] {
  const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(indexHtml)?.[1];
  return [...(noscript ?? "").matchAll(/<li>(.*?)<\/li>/g)].map(
    (match) => match[1],
  );
}

/** Returns the terms in the page's keywords. */
function keywords(): string[] {
  const content = /<meta\s+name="keywords"\s+content="([^"]*)"/.exec(
    indexHtml,
  )?.[1];
  return (content ?? "").split(",").map((term) => term.trim());
}

describe("index.html", () => {
  it("lists every game the browser does, in its order, without JavaScript", () => {
    expect(noscriptGames()).toEqual(ITEMS.map((item) => item.name));
  });

  it("names every game, and every other name it goes by, in its keywords", () => {
    const names = ITEMS.flatMap((item) => [item.name, ...item.aliases]);

    expect(keywords()).toEqual(expect.arrayContaining(names));
  });
});
