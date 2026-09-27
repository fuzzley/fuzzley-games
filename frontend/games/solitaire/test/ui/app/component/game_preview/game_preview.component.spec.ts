// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { GamePreviewComponent } from "@/ui/app/component/game_preview/game_preview.component";
import type { GameBrowserItem } from "@/ui/app/model/game_browser_item";
import { Difficulty } from "@/ui/app/model/game_profile.model";
import { queryAll, queryRequired } from "@test/support/dom";

/** Spider, whose number of suits decides its difficulty. */
const SPIDER: GameBrowserItem = {
  key: "spider",
  gameId: "spider",
  name: "Spider",
  family: { id: "spider", name: "Spider family", description: "Runs." },
  tagline: "A test tagline.",
  difficulty: {
    optionId: "suitCount",
    byChoice: { 1: Difficulty.EASY, 4: Difficulty.HARD },
  },
  decks: 2,
  allCardsVisible: false,
  aliases: [],
  pinned: {},
  thumbnailUrl: "./test/thumb.webp",
  previewUrl: "./test/preview.webp",
};

/** Shows a game in a fresh preview. */
function preview(
  item: GameBrowserItem,
  values: Record<string, number> = {},
): ComponentFixture<GamePreviewComponent> {
  const fixture = TestBed.createComponent(GamePreviewComponent);
  fixture.componentRef.setInput("item", item);
  fixture.componentRef.setInput("values", values);
  fixture.detectChanges();
  return fixture;
}

/** Returns the facts a preview lists. */
function facts(fixture: ComponentFixture<GamePreviewComponent>): string[] {
  return queryAll(fixture, ".fact").map(
    (fact) => fact.textContent?.trim() ?? "",
  );
}

describe("GamePreviewComponent", () => {
  it("names a game's family, difficulty and decks", () => {
    const fixture = preview(SPIDER, { suitCount: 4 });

    expect(facts(fixture)).toEqual(["Spider family", "Hard", "2 decks"]);
  });

  it("rates a game by the rules it would be dealt by", () => {
    const fixture = preview(SPIDER, { suitCount: 1 });

    expect(facts(fixture)).toContain("Easy");
  });

  it("names the game a variant belongs to rather than its family", () => {
    const fixture = preview({ ...SPIDER, parentName: "Yukon" });

    expect(facts(fixture)[0]).toBe("Variant of Yukon");
  });

  it("says when every card is in view", () => {
    const fixture = preview({ ...SPIDER, allCardsVisible: true });

    expect(facts(fixture)).toContain("All cards visible");
  });

  it("describes the board's picture for a screen reader", () => {
    const fixture = preview(SPIDER);

    const image = queryRequired<HTMLImageElement>(fixture, ".shot-image");

    expect(image.alt).toBe("The Spider board, as dealt");
  });

  it("offers to play a game that is not on the table", () => {
    const fixture = preview(SPIDER);

    expect(queryRequired(fixture, ".btn-play").textContent?.trim()).toBe(
      "Play Spider",
    );
  });
});
