import { PlayingCard } from "@/engine/core/card/playing_card";
import { Point } from "@/engine/render/geometry";
import { pileCardOffsets } from "@/engine/render/layout/pile_layout";
import { RenderLayer, depthFor } from "@/engine/render/view/render_layers";
import { TableMetrics } from "@/engine/render/layout/table_metrics";
import {
  CardView,
  TableViewState,
} from "@/engine/render/view/table_view_state";
import { TableInteractionState } from "@/engine/render/input/interaction_state";
import { itemAt } from "@/engine/core/common/item_at";
import { ZoneLook, frameFor, showsFace } from "../zones/zone_look";
import { highlightViews } from "./highlight_views";
import { pileArrangement } from "./pile_arrangement";
import { pileBackgroundViews } from "./pile_backgrounds";
import { TableView } from "./table_view";

/** Places one card for this frame and says whether it eases there. */
interface CardPlacement {
  /** Horizontal position in device pixels. */
  readonly x: number;
  /** Vertical position in device pixels. */
  readonly y: number;
  /** Drawing order, from {@link depthFor}. */
  readonly depth: number;
  /** Whether the card arrives immediately rather than easing towards it. */
  readonly snap: boolean;
}

/** Describes the stack in hand and how it is spaced while carried. */
interface DragContext {
  /** The cards being carried, bottom-first. */
  readonly cardIds: readonly string[];
  /** Where the pointer is, or null when nothing is being carried. */
  readonly primary: Point | null;
  /** The vertical gap the carried stack keeps, in design units. */
  readonly fanGap: number;
  /** Returns whether the given card is one of the cards in hand. */
  holds(cardId: string): boolean;
}

/** Builds the desired appearance of a table for one frame. */
class TableViewStateBuilder {
  /** Layout scale: design units to device pixels. */
  private readonly scale: number;
  private readonly origins: ReadonlyMap<string, Point>;

  constructor(
    private readonly game: TableView,
    private readonly interaction: TableInteractionState,
    private readonly metrics: TableMetrics,
    /** The artwork key for the back of a card, a player's choice. */
    private readonly cardBackKey: string,
  ) {
    this.scale = metrics.scale;
    this.origins = metrics.origins;
  }

  public build(): TableViewState {
    return {
      backgrounds: pileBackgroundViews(this.game, this.metrics),
      cards: this.buildCards(),
      highlights: highlightViews(this.game, this.interaction, this.metrics),
    };
  }

  /** Returns the position, frame and interactivity of every card in play. */
  private buildCards(): CardView[] {
    const drag = this.dragContext();
    const flightOrder = this.flightOrder();
    const cards: CardView[] = [];

    // Counted for every card, held ones included, to match the board order the
    // model announces relocations by.
    let restingIndex = 0;

    for (const pile of this.game.piles) {
      const origin = this.origins.get(pile.id);
      const zone = this.game.zoneFor(pile.id);
      if (!origin || !zone) continue;

      const pileCards = pile.getCards();
      const offsets = pileCardOffsets(
        pileArrangement(this.game, pile, this.metrics),
        pileCards,
        this.expansionCardId(zone, pileCards),
      );

      for (const [cardIndex, card] of pileCards.entries()) {
        const restingDepth = depthFor(RenderLayer.RESTING_CARD, restingIndex++);

        const placement =
          drag.primary && drag.holds(card.id)
            ? this.heldPlacement(card.id, drag, drag.primary)
            : this.restingPlacement(
                origin,
                itemAt(offsets, cardIndex),
                restingDepth,
                flightOrder.get(card.id),
              );

        cards.push({
          cardId: card.id,
          x: placement.x,
          y: placement.y,
          depth: placement.depth,
          snap: placement.snap,
          scale: this.scale,
          frame: frameFor(zone.face, card, this.cardBackKey),
          cursor: this.game.isCardInteractableInPile(card, pile)
            ? "pointer"
            : "default",
          draggable: this.game.isCardDraggableInPile(card, pile),
        });
      }
    }

    return cards;
  }

  /** Returns the stack in hand, spaced like the pile it came from. */
  private dragContext(): DragContext {
    const cardIds = this.interaction.drag?.cardIds ?? [];
    const primary = this.interaction.drag?.primary ?? null;
    const held = new Set(cardIds);

    const [primaryCardId] = cardIds;
    const sourcePile =
      primaryCardId === undefined
        ? null
        : this.game.getPileContainingCard(primaryCardId);
    const sourceLayout = sourcePile
      ? pileArrangement(this.game, sourcePile, this.metrics)
      : undefined;

    return {
      cardIds,
      primary,
      fanGap: sourceLayout?.kind === "fan-down" ? sourceLayout.faceUpGap : 0,
      holds: (cardId) => held.has(cardId),
    };
  }

  /**
   * Returns where each card in the air sits in the drawing order, with later
   * flights over earlier ones.
   */
  private flightOrder(): ReadonlyMap<string, number> {
    const order = new Map<string, number>();
    for (const flight of this.interaction.flights) {
      for (const cardId of flight.cardIds) {
        order.set(cardId, order.size);
      }
    }
    return order;
  }

  /** Places a card being carried under the pointer, fanned in hand. */
  private heldPlacement(
    cardId: string,
    drag: DragContext,
    primary: Point,
  ): CardPlacement {
    const dragIndex = drag.cardIds.indexOf(cardId);
    return {
      x: primary.x,
      y: primary.y + dragIndex * drag.fanGap * this.scale,
      depth: depthFor(RenderLayer.HELD_CARD, dragIndex),
      // A card in hand follows the pointer exactly rather than easing after it.
      snap: true,
    };
  }

  /**
   * Places a card that is not in hand at its place in its pile, lifted above
   * the board while it is in the air.
   */
  private restingPlacement(
    origin: Point,
    offset: Point,
    restingDepth: number,
    flightIndex: number | undefined,
  ): CardPlacement {
    return {
      x: origin.x + offset.x * this.scale,
      y: origin.y + offset.y * this.scale,
      depth:
        flightIndex === undefined
          ? restingDepth
          : depthFor(RenderLayer.FLYING_CARD, flightIndex),
      snap: this.interaction.snapAll,
    };
  }

  /**
   * Returns the hovered card in this pile if its fan should open to reveal more
   * of it, or null.
   *
   * Any card drawn face up opens, even one the rules will not let go of, since
   * a buried card is the one a player most needs to read.
   */
  private expansionCardId(
    look: ZoneLook,
    pileCards: readonly PlayingCard[],
  ): string | null {
    if (!this.interaction.hoveredCardId || this.interaction.drag) {
      return null;
    }
    const hovered = pileCards.find(
      (card) => card.id === this.interaction.hoveredCardId,
    );
    return hovered && showsFace(look.face, hovered) ? hovered.id : null;
  }
}

/**
 * Builds the complete desired appearance of a table for one frame.
 *
 * @param cardBackKey The artwork key for the back of a card.
 */
export function buildTableViewState(
  game: TableView,
  interaction: TableInteractionState,
  metrics: TableMetrics,
  cardBackKey: string,
): TableViewState {
  return new TableViewStateBuilder(
    game,
    interaction,
    metrics,
    cardBackKey,
  ).build();
}
