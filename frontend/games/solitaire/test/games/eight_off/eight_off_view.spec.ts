import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { measureTable } from "@/engine/render/layout/table_layout";
import {
  TableInteractionState,
  Viewport,
} from "@/engine/render/view/table_view_state";
import { buildTableViewState } from "@/engine/tableau/view/table_view_builder";
import { EightOffGame } from "@/games/eight_off/eight_off_game";
import { EIGHT_OFF_LAYOUT } from "@/games/eight_off/eight_off_layout";
import {
  TABLEAU_FACE_UP_OFFSET as TABLEAU_CARD_OFFSET,
  TABLEAU_HOVER_EXPANSION_OFFSET,
} from "@/games/common/pile_layouts";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the opening deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

const VIEWPORT: Viewport = { width: 1920, height: 1080, pixelRatio: 1 };

/** The board measured once, since the layout never changes between tests. */
const METRICS = measureTable(EIGHT_OFF_LAYOUT, VIEWPORT);

/**
 * Design units converted to the screen pixels the view state is built in.
 *
 * The layout scale is irrational on any real viewport, so a gap is compared
 * with {@link expect.toBeCloseTo} rather than exactly: summing offsets and
 * scaling the sum is not the same arithmetic as scaling each offset and summing
 * those, and the two disagree in the last bit or two.
 */
function onScreen(designUnits: number): number {
  return designUnits * METRICS.scale;
}

/**
 * Eight Off is the reason the hover expansion is not tied to grabbability. A
 * column gives up only the top of a same-suit run, so almost every covered card
 * is one the rules will not lift — and a covered court card is exactly the one
 * whose suit is unreadable, because its picture fills the strip a pip would
 * show in.
 */
describe("the Eight Off board", () => {
  let game: EightOffGame;
  /** The King buried under a broken run, and the card covering it. */
  let buried: PlayingCard;
  let covering: PlayingCard;

  beforeEach(() => {
    game = new EightOffGame(
      ALL_PLAYING_CARD_IDS,
      sequenceRandom(SHUFFLE_VALUES),
    );
    game.startNewGame();

    emptyBoard(game);
    relocate(game, "card-spades-8", game.tableaus[0]);
    buried = relocate(game, "card-hearts-king", game.tableaus[0]);
    covering = relocate(game, "card-clubs-4", game.tableaus[0]);
    relocate(game, "card-diamonds-queen", game.tableaus[0]);
  });

  /** The board drawn with the given card under the pointer, or with none. */
  function draw(hoveredCardId: string | null) {
    const interaction: TableInteractionState = {
      hoveredCardId,
      hoveredBackgroundPileId: null,
      drag: null,
      flights: [],
      snapAll: false,
    };
    return buildTableViewState(game, interaction, METRICS, {
      cardBackKey: "card-back-blue",
    });
  }

  /** The gap between the buried card and the one covering it, in pixels. */
  function gapBelowBuried(hoveredCardId: string | null): number {
    const cards = draw(hoveredCardId).cards;
    const buriedView = cards.find((card) => card.cardId === buried.id)!;
    const coveringView = cards.find((card) => card.cardId === covering.id)!;
    return coveringView.y - buriedView.y;
  }

  it("will not lift a face-up card buried under a broken run", () => {
    expect(game.isCardInteractable(buried)).toBe(false);
  });

  it("opens the fan below a hovered card even when it cannot be lifted", () => {
    expect(gapBelowBuried(buried.id)).toBeCloseTo(
      onScreen(TABLEAU_CARD_OFFSET + TABLEAU_HOVER_EXPANSION_OFFSET),
    );
  });

  it("leaves the fan closed when the pointer is elsewhere", () => {
    expect(gapBelowBuried(null)).toBeCloseTo(onScreen(TABLEAU_CARD_OFFSET));
  });

  it("still draws no highlight around a card it will not lift", () => {
    expect(draw(buried.id).highlights).toEqual([]);
  });
});
