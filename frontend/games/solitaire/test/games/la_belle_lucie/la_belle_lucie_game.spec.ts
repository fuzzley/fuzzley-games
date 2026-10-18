import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank } from "@/engine/core/card/playing_card";
import { LaBelleLucieGame } from "@/games/la_belle_lucie/la_belle_lucie_game";
import { laBelleLucieGestures } from "@/games/la_belle_lucie/la_belle_lucie_gestures";
import { LaBelleLucieVariant } from "@/games/la_belle_lucie/la_belle_lucie_rules";
import { REDEAL_PILE_ID } from "@/games/la_belle_lucie/la_belle_lucie_zones";
import {
  CLOSED_STOCK_PLACEHOLDER,
  recyclePipsPlaceholder,
} from "@/games/common/zone_presets";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  options: {
    cardIds?: typeof ALL_PLAYING_CARD_IDS;
    variant?: LaBelleLucieVariant;
  } = {},
): LaBelleLucieGame {
  const game = new LaBelleLucieGame({
    random: sequenceRandom(SHUFFLE_VALUES),
    ...options,
  });
  game.startNewGame();
  return game;
}

/** Returns the id of every card in every fan, fan by fan, bottom first. */
function fanContents(game: LaBelleLucieGame): string[][] {
  return game.fans.map((fan) => fan.getCards().map((card) => card.id));
}

describe("LaBelleLucieGame deal", () => {
  it("deals seventeen fans of three and one of a single card", () => {
    const game = newGame();

    expect(game.fans.map((fan) => fan.size)).toEqual([
      ...Array<number>(17).fill(3),
      1,
    ]);
  });

  it("deals every card face up", () => {
    const game = newGame();

    const faceDown = game.fans
      .flatMap((fan) => fan.getCards())
      .filter((card) => !card.faceUp);

    expect(faceDown).toEqual([]);
  });

  it("lays the Aces on the foundations and deals sixteen fans in Trefoil", () => {
    const game = newGame({ variant: LaBelleLucieVariant.TREFOIL });

    expect([
      game.foundations.map((pile) => pile.topCard?.rank),
      game.fans.map((fan) => fan.size),
    ]).toEqual([Array(4).fill(Rank.ACE), Array<number>(16).fill(3)]);
  });
});

describe("LaBelleLucieGame fans", () => {
  let game: LaBelleLucieGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("builds down in suit", () => {
    relocate(game, "card-hearts-9", game.fans[0]);
    relocate(game, "card-hearts-8", game.fans[1]);

    const moved = game.moveCardToPile("card-hearts-8", game.fans[0].id);

    expect(moved).toBe(true);
  });

  it("refuses another suit", () => {
    relocate(game, "card-hearts-9", game.fans[0]);
    relocate(game, "card-clubs-8", game.fans[1]);

    const moved = game.moveCardToPile("card-clubs-8", game.fans[0].id);

    expect(moved).toBe(false);
  });

  it("never refills an empty fan", () => {
    relocate(game, "card-hearts-king", game.fans[1]);

    const moved = game.moveCardToPile("card-hearts-king", game.fans[0].id);

    expect(moved).toBe(false);
  });

  it("lets a King fill an empty fan in The Fan", () => {
    const fan = newGame({ variant: LaBelleLucieVariant.THE_FAN });
    emptyBoard(fan);
    relocate(fan, "card-hearts-king", fan.fans[1]);

    const moved = fan.moveCardToPile("card-hearts-king", fan.fans[0].id);

    expect(moved).toBe(true);
  });
});

describe("LaBelleLucieGame in Shamrocks", () => {
  let game: LaBelleLucieGame;

  beforeEach(() => {
    game = newGame({ variant: LaBelleLucieVariant.SHAMROCKS });
    emptyBoard(game);
  });

  it("builds up in any suit", () => {
    relocate(game, "card-hearts-9", game.fans[0]);
    relocate(game, "card-clubs-10", game.fans[1]);

    const moved = game.moveCardToPile("card-clubs-10", game.fans[0].id);

    expect(moved).toBe(true);
  });

  it("builds down in any suit", () => {
    relocate(game, "card-hearts-9", game.fans[0]);
    relocate(game, "card-spades-8", game.fans[1]);

    const moved = game.moveCardToPile("card-spades-8", game.fans[0].id);

    expect(moved).toBe(true);
  });

  it("lets no fan hold more than three cards", () => {
    relocate(game, "card-hearts-9", game.fans[0]);
    relocate(game, "card-clubs-10", game.fans[0]);
    relocate(game, "card-spades-jack", game.fans[0]);
    relocate(game, "card-spades-queen", game.fans[1]);

    const moved = game.moveCardToPile("card-spades-queen", game.fans[0].id);

    expect(moved).toBe(false);
  });

  it("allows no redeal", () => {
    expect(game.redeal()).toBe(false);
  });
});

describe("LaBelleLucieGame redeal", () => {
  let game: LaBelleLucieGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals the cards left in the fans again, in threes from the first", () => {
    emptyBoard(game);
    for (const rank of ["2", "3", "4", "5"]) {
      relocate(game, `card-hearts-${rank}`, game.fans[9]);
    }

    game.redeal();

    expect(game.fans.map((fan) => fan.size).slice(0, 3)).toEqual([3, 1, 0]);
  });

  it("is taken back by one undo, rebuilding every fan in its old order", () => {
    const before = fanContents(game);
    game.redeal();

    game.undo();

    expect(fanContents(game)).toEqual(before);
  });

  it("gives the redeal back when it is taken back", () => {
    game.redeal();

    game.undo();

    expect(game.redealsRemaining).toBe(2);
  });

  it("allows two redeals and no more", () => {
    game.redeal();
    game.redeal();

    expect(game.redeal()).toBe(false);
  });

  it("counts the redeals left in pips on the marker", () => {
    game.redeal();

    expect(game.pileBackgroundKey(game.redealMarker)).toBe(
      recyclePipsPlaceholder(1, 2),
    );
  });

  it("shows the plain outline once the redeals are spent", () => {
    game.redeal();
    game.redeal();

    expect([
      game.pileBackgroundKey(game.redealMarker),
      game.isEmptySlotActionable(game.redealMarker),
    ]).toEqual([CLOSED_STOCK_PLACEHOLDER, false]);
  });

  it("redeals on a press of the marker", () => {
    const handle = laBelleLucieGestures(game);

    handle({ kind: "activate-pile", pileId: REDEAL_PILE_ID });

    expect(game.redealsRemaining).toBe(1);
  });

  it("keeps the redeals spent in a snapshot", () => {
    game.redeal();
    const copy = newGame();

    copy.restore(game.snapshot());

    expect(copy.redealsRemaining).toBe(1);
  });
});

describe("LaBelleLucieGame win condition", () => {
  it("is won once every card is on a foundation", () => {
    const aces = ALL_PLAYING_CARD_IDS.filter((card) => card.rank === Rank.ACE);
    const game = newGame({ cardIds: aces });
    emptyBoard(game);
    relocate(game, "card-spades-ace", game.foundations[0]);
    relocate(game, "card-hearts-ace", game.foundations[1]);
    relocate(game, "card-diamonds-ace", game.foundations[2]);
    relocate(game, "card-clubs-ace", game.fans[0]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-ace", game.foundations[3].id);

    expect(won).toBe(true);
  });
});
