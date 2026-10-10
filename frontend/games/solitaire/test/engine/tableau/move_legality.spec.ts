import { beforeEach, describe, expect, it } from "vitest";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { resolveMove } from "@/engine/tableau/move_legality";
import {
  PlacementContext,
  anyCard,
  never,
} from "@/engine/tableau/rules/placement";
import { Tabletop } from "@/engine/tableau/tabletop";
import { ZoneSpec } from "@/engine/tableau/zones/zone";

/** Returns a pile's zone: lifting any face-up card and taking any card. */
function zone(id: string, overrides: Partial<ZoneSpec> = {}): ZoneSpec {
  return {
    id,
    role: id,
    slot: { pileId: id, column: 0, row: 0 },
    layout: { kind: "stacked" },
    accept: anyCard,
    grab: { kind: "any-face-up" },
    draggable: true,
    face: "card",
    ...overrides,
  };
}

describe("resolveMove", () => {
  let registry: CardRegistry;
  let tabletop: Tabletop;

  beforeEach(() => {
    registry = new CardRegistry();
    tabletop = new Tabletop(
      [
        zone("from"),
        zone("to"),
        zone("cell", { capacity: 1 }),
        zone("closed", { accept: null }),
        zone("refusing", { accept: never }),
        zone("locked", { grab: { kind: "none" } }),
        zone("stock", { grab: { kind: "top-only" } }),
      ],
      registry,
    );
  });

  /** Puts cards of the given ranks on a pile, bottom first, and returns them. */
  function lay(
    pileId: string,
    ranks: readonly Rank[],
    faceUp = true,
  ): PlayingCard[] {
    const pile = tabletop.requirePile(pileId);
    return ranks.map((rank) => {
      const card = registry.getOrCreate({ suit: Suit.HEART, rank });
      tabletop.place(card, pile, faceUp);
      return card;
    });
  }

  it("resolves a card and everything stacked on it into the move", () => {
    const [, seven, six] = lay("from", [Rank.EIGHT, Rank.SEVEN, Rank.SIX]);

    const move = resolveMove(tabletop, seven.id, "to");

    expect(move).toEqual({
      movingStack: [seven, six],
      sourcePile: tabletop.requirePile("from"),
      targetPile: tabletop.requirePile("to"),
    });
  });

  it("hands the placement rule the stack, both piles and the board", () => {
    let seen: PlacementContext | undefined;
    const watching = new Tabletop(
      [
        zone("from"),
        zone("to", {
          accept: (context) => {
            seen = context;
            return true;
          },
        }),
      ],
      registry,
    );
    const from = watching.requirePile("from");
    const eight = registry.getOrCreate({ suit: Suit.CLUB, rank: Rank.EIGHT });
    const seven = registry.getOrCreate({ suit: Suit.CLUB, rank: Rank.SEVEN });
    watching.place(eight, from, true);
    watching.place(seven, from, true);

    resolveMove(watching, eight.id, "to");

    expect(seen).toEqual({
      card: eight,
      movingStack: [eight, seven],
      sourcePile: from,
      targetPile: watching.requirePile("to"),
      board: watching,
    });
  });

  it("refuses a card that is not on the table", () => {
    expect(resolveMove(tabletop, "card-hearts-ace", "to")).toBeNull();
  });

  it("refuses a pile no zone declares", () => {
    const [card] = lay("from", [Rank.ACE]);

    expect(resolveMove(tabletop, card.id, "nowhere")).toBeNull();
  });

  it("refuses a pile that is never a destination", () => {
    const [card] = lay("from", [Rank.ACE]);

    expect(resolveMove(tabletop, card.id, "closed")).toBeNull();
  });

  it("refuses a move onto the pile the card is already in", () => {
    const [card] = lay("from", [Rank.ACE]);

    expect(resolveMove(tabletop, card.id, "from")).toBeNull();
  });

  it("refuses a face-down card even where its grab rule lets go of it", () => {
    const [card] = lay("stock", [Rank.ACE], false);

    expect(resolveMove(tabletop, card.id, "to")).toBeNull();
  });

  it("refuses a card its pile's grab rule will not let go", () => {
    const [card] = lay("locked", [Rank.ACE]);

    expect(resolveMove(tabletop, card.id, "to")).toBeNull();
  });

  it("refuses a stack larger than the target has room for", () => {
    const [two] = lay("from", [Rank.TWO, Rank.ACE]);

    expect(resolveMove(tabletop, two.id, "cell")).toBeNull();
  });

  it("refuses a move the target's placement rule refuses", () => {
    const [card] = lay("from", [Rank.ACE]);

    expect(resolveMove(tabletop, card.id, "refusing")).toBeNull();
  });
});
