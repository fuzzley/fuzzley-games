import { vi, describe, it, expect } from "vitest";
import * as Phaser from "phaser";
import { CardPile } from "@/game/model/card/card_pile";
import { PlayingCardVisual } from "@/game/render/visual/card/playing_card_visual";
import { StockPileVisual } from "@/game/render/visual/pile/stock_pile_visual";
import { WastePileVisual } from "@/game/render/visual/pile/waste_pile_visual";
import { FoundationPileVisual } from "@/game/render/visual/pile/foundation_pile_visual";
import { TableauPileVisual } from "@/game/render/visual/pile/tableau_pile_visual";
import { Visual } from "@/game/render/visual/visual";
import { makePlayingCard } from "@test/support/card_builder";

describe("Visual base class", () => {
  it("exposes the sprite it was assigned", () => {
    const visual = new Visual();
    const sprite = {
      setPosition: vi.fn(),
    } as unknown as Phaser.GameObjects.Sprite;

    visual.sprite = sprite;

    expect(visual.sprite).toBe(sprite);
  });
});

describe("PlayingCardVisual", () => {
  it("is a Visual wrapping the given card, positioned at the origin", () => {
    const card = makePlayingCard({ id: "c1" });

    const visual = new PlayingCardVisual(card);

    expect(visual).toBeInstanceOf(Visual);
    expect(visual.value).toBe(card);
    expect(visual.position).toEqual({ x: 0, y: 0 });
  });

  it("exposes the position it was assigned", () => {
    const card = makePlayingCard({ id: "c1" });
    const visual = new PlayingCardVisual(card);

    visual.position = { x: 100, y: 200 };

    expect(visual.position).toEqual({ x: 100, y: 200 });
  });
});

describe("StockPileVisual", () => {
  it("is a Visual wrapping the given pile", () => {
    const pile = new CardPile();

    const visual = new StockPileVisual(pile);

    expect(visual).toBeInstanceOf(Visual);
    expect(visual.value).toBe(pile);
  });
});

describe("WastePileVisual", () => {
  it("is a Visual wrapping the given pile", () => {
    const pile = new CardPile();

    const visual = new WastePileVisual(pile);

    expect(visual).toBeInstanceOf(Visual);
    expect(visual.value).toBe(pile);
  });
});

describe("FoundationPileVisual", () => {
  it("is a Visual wrapping the given pile", () => {
    const pile = new CardPile();

    const visual = new FoundationPileVisual(pile);

    expect(visual).toBeInstanceOf(Visual);
    expect(visual.value).toBe(pile);
  });
});

describe("TableauPileVisual", () => {
  it("is a Visual wrapping the given pile", () => {
    const pile = new CardPile();

    const visual = new TableauPileVisual(pile);

    expect(visual).toBeInstanceOf(Visual);
    expect(visual.value).toBe(pile);
  });
});
