import { vi } from "vitest";
import * as Phaser from "phaser";
import { CardPile } from "@/game/model/card/card_pile";
import { PlayingCardVisual } from "@/game/render/visual/card/playing_card_visual";
import { StockPileVisual } from "@/game/render/visual/pile/stock_pile_visual";
import { WastePileVisual } from "@/game/render/visual/pile/waste_pile_visual";
import { FoundationPileVisual } from "@/game/render/visual/pile/foundation_pile_visual";
import { TableauPileVisual } from "@/game/render/visual/pile/tableau_pile_visual";
import { Visual } from "@/game/render/visual/visual";
import { makePlayingCard } from "@test/support/card_builder";

/** Builds a card visual for a fresh card with the given id and face state. */
function cardVisual(id: string, faceUp = false): PlayingCardVisual {
  return new PlayingCardVisual(makePlayingCard({ id, faceUp }));
}

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
    const visual = cardVisual("c1");

    visual.position = { x: 100, y: 200 };

    expect(visual.position).toEqual({ x: 100, y: 200 });
  });
});

describe("StockPileVisual", () => {
  it("is a Visual wrapping the given pile, positioned at the origin", () => {
    const pile = new CardPile();

    const visual = new StockPileVisual(pile);

    expect(visual).toBeInstanceOf(Visual);
    expect(visual.value).toBe(pile);
    expect(visual.position).toEqual({ x: 0, y: 0 });
  });

  it("stacks every card at the pile origin", () => {
    const v1 = cardVisual("c1");
    const v2 = cardVisual("c2");
    const visual = new StockPileVisual(new CardPile(), [v1, v2]);

    visual.layoutPile();

    expect(v1.position).toEqual({ x: 0, y: 0 });
    expect(v2.position).toEqual({ x: 0, y: 0 });
  });
});

describe("WastePileVisual", () => {
  it("is a Visual wrapping the given pile", () => {
    const pile = new CardPile();

    const visual = new WastePileVisual(pile);

    expect(visual).toBeInstanceOf(Visual);
    expect(visual.value).toBe(pile);
  });

  it("fans the top cards out horizontally", () => {
    const v1 = cardVisual("c1");
    const v2 = cardVisual("c2");
    const visual = new WastePileVisual(new CardPile(), [v1, v2]);

    visual.layoutPile();

    expect(v1.position).toEqual({ x: 0, y: 0 });
    expect(v2.position).toEqual({ x: 25, y: 0 });
  });

  it("stacks overflow cards at the origin and fans only the last MAX_FAN_CARDS", () => {
    const v1 = cardVisual("c1");
    const v2 = cardVisual("c2");
    const v3 = cardVisual("c3");
    const v4 = cardVisual("c4");
    const visual = new WastePileVisual(new CardPile(), [v1, v2, v3, v4]);

    visual.layoutPile();

    // With 4 cards (MAX_FAN_CARDS = 3) the first card sits below the fan at the
    // origin and the last three are fanned.
    expect(v1.position).toEqual({ x: 0, y: 0 });
    expect(v2.position).toEqual({ x: 0, y: 0 });
    expect(v3.position).toEqual({ x: 25, y: 0 });
    expect(v4.position).toEqual({ x: 50, y: 0 });
  });
});

describe("FoundationPileVisual", () => {
  it("is a Visual wrapping the given pile", () => {
    const pile = new CardPile();

    const visual = new FoundationPileVisual(pile);

    expect(visual).toBeInstanceOf(Visual);
    expect(visual.value).toBe(pile);
  });

  it("stacks every card at the pile origin", () => {
    const v1 = cardVisual("c1");
    const v2 = cardVisual("c2");
    const visual = new FoundationPileVisual(new CardPile(), [v1, v2]);

    visual.layoutPile();

    expect(v1.position).toEqual({ x: 0, y: 0 });
    expect(v2.position).toEqual({ x: 0, y: 0 });
  });
});

describe("TableauPileVisual", () => {
  it("is a Visual wrapping the given pile", () => {
    const pile = new CardPile();

    const visual = new TableauPileVisual(pile);

    expect(visual).toBeInstanceOf(Visual);
    expect(visual.value).toBe(pile);
  });

  it("spaces face-down cards closer together than face-up cards", () => {
    const v1 = cardVisual("c1", false);
    const v2 = cardVisual("c2", true);
    const v3 = cardVisual("c3", false);
    const visual = new TableauPileVisual(new CardPile(), [v1, v2, v3]);

    visual.layoutPile();

    // v1 is face-down => 18px offset => v2 sits at y = 18.
    expect(v2.position).toEqual({ x: 0, y: 18 });
    // v2 is face-up => 45px offset => v3 sits at y = 18 + 45 = 63.
    expect(v3.position).toEqual({ x: 0, y: 63 });
  });
});
