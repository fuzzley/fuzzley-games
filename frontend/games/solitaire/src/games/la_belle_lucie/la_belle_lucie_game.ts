import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { CardTransfer } from "@/engine/tableau/move";
import { ActionKind } from "@/games/common/action_kinds";
import { DeckOptions } from "@/games/common/deck_options";
import {
  CLOSED_STOCK_PLACEHOLDER,
  recyclePipsPlaceholder,
} from "@/games/common/zone_presets";
import { dealFans, dealLaBelleLucieLayout } from "./la_belle_lucie_deal";
import {
  DEFAULT_LA_BELLE_LUCIE_VARIANT,
  LaBelleLucieVariantRules,
  laBelleLucieRules,
} from "./la_belle_lucie_rules";
import {
  LaBelleLucieRole,
  LaBelleLucieVariant,
  REDEAL_PILE_ID,
  laBelleLucieZoneSpecs,
} from "./la_belle_lucie_zones";

/** Configures a game of the La Belle Lucie family. */
export interface LaBelleLucieOptions extends DeckOptions {
  /** Which game of the family to play. */
  readonly variant?: LaBelleLucieVariant;
}

/**
 * Plays La Belle Lucie or one of its family: the deck dealt in fans of three,
 * played off one card at a time onto suit foundations, with the fans gathered
 * and dealt again when play is stuck.
 */
export class LaBelleLucieGame extends DealtTableGame {
  /** The four suit foundations. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The fans, in the order they are dealt. */
  public readonly fans: readonly CardPile<PlayingCard>[];
  /** The marker pressed to redeal. */
  public readonly redealMarker: CardPile<PlayingCard>;

  /** Which of the family is being played. */
  public readonly variant: LaBelleLucieVariant;

  private readonly rules: LaBelleLucieVariantRules;
  private readonly random: () => number;

  /**
   * Creates a game whose piles are empty until the first deal.
   *
   * Its `random` shuffles redeals as well as the deck.
   */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
    variant = DEFAULT_LA_BELLE_LUCIE_VARIANT,
  }: LaBelleLucieOptions = {}) {
    super({
      zones: laBelleLucieZoneSpecs(variant),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // Foundations only: which fan a card goes to is the player's decision.
      autoMoveRoles: [LaBelleLucieRole.FOUNDATION],
      winsWhenAllCardsIn: LaBelleLucieRole.FOUNDATION,
    });

    this.variant = variant;
    this.rules = laBelleLucieRules(variant);
    this.random = random;
    this.foundations = this.pilesOfRole(LaBelleLucieRole.FOUNDATION);
    this.fans = this.pilesOfRole(LaBelleLucieRole.TABLEAU);
    this.redealMarker = this.requirePile(REDEAL_PILE_ID);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealLaBelleLucieLayout(
      deck,
      this.foundations,
      this.fans,
      this.rules.acesStartOnFoundations,
    );
  }

  // --- The redeal ---

  /** How many redeals the game allows. */
  public get maxRedeals(): number {
    return this.rules.maxRedeals;
  }

  /** How many redeals the player has left. */
  public get redealsRemaining(): number {
    return Math.max(0, this.maxRedeals - this.timesApplied(ActionKind.REDEAL));
  }

  /** Whether a redeal is available: one must be left, and a card to deal. */
  public get canRedeal(): boolean {
    return this.redealsRemaining > 0 && this.fans.some((fan) => !fan.isEmpty);
  }

  /**
   * Gathers every card left in the fans, shuffles them, and deals them out
   * again in threes from the first fan, as one undoable action, and returns
   * whether it could.
   */
  public redeal(): boolean {
    if (!this.canRedeal) {
      return false;
    }

    // Fan by fan, bottom first in each.
    const gathered: { card: PlayingCard; from: CardPile<PlayingCard> }[] = [];
    for (const fan of this.fans) {
      for (const card of [...fan.getCards()]) {
        gathered.push({ card, from: fan });
        fan.removeCard(card);
      }
    }

    dealFans(
      shuffle(
        gathered.map(({ card }) => card),
        this.random,
      ),
      this.fans,
    );

    // Undo replays the transfers in reverse, appending each card to the fan it
    // came from. Listing each fan's cards top first therefore lays them back
    // bottom first, rebuilding every fan in its old order however the new
    // deal mixed them.
    const transfers: CardTransfer[] = [];
    for (const { card, from } of gathered.reverse()) {
      const to = this.getPileContainingCard(card.id);
      if (!to) continue;
      transfers.push({
        cardIds: [card.id],
        fromPileId: from.id,
        toPileId: to.id,
        faceUpBefore: true,
      });
    }

    this.commitAction(ActionKind.REDEAL, transfers);
    return true;
  }

  /**
   * Returns the redeal marker's pips while it can redeal, and the plain
   * outline once a press would do nothing.
   *
   * @inheritDoc
   */
  public override pileBackgroundKey(
    pile: CardPile<PlayingCard>,
  ): string | undefined {
    if (pile !== this.redealMarker) {
      return super.pileBackgroundKey(pile);
    }
    return this.canRedeal
      ? recyclePipsPlaceholder(this.redealsRemaining, this.maxRedeals)
      : CLOSED_STOCK_PLACEHOLDER;
  }

  /**
   * Returns whether the redeal marker would redeal if pressed.
   *
   * @inheritDoc
   */
  public override isEmptySlotActionable(pile: CardPile<PlayingCard>): boolean {
    return pile === this.redealMarker
      ? this.canRedeal
      : super.isEmptySlotActionable(pile);
  }
}
