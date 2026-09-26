import { PlayingCard } from "@/engine/core/card/playing_card";
import { Point } from "@/engine/core/common/point";
import {
  CARD_ART_SCALE,
  CARD_RENDER_HEIGHT_PX,
  CARD_RENDER_WIDTH_PX,
} from "@/engine/render/layout/card_metrics";
import {
  computeDropGeometries,
  resolveDropTarget,
} from "@/engine/render/layout/drop_geometry";
import { pileCardOffsets } from "@/engine/render/layout/pile_layout";
import { RenderLayer, depthFor } from "@/engine/render/layout/render_layers";
import { TableMetrics } from "@/engine/render/layout/table_layout";
import {
  CardView,
  DragInteraction,
  HighlightView,
  PileBackgroundView,
  PileGeometry,
  TableInteractionState,
  TableViewState,
} from "@/engine/render/view/table_view_state";
import { ZoneSpec, frameFor, showsFace } from "../zone";
import { TablePresentation, TableView } from "./table_view";

/**
 * Resolves the pile a drag would land on, as its drop rectangle, or null if it
 * is over none.
 *
 * Both the hover preview and the drop itself ask this, so the two agree.
 */
export function resolveDragTarget(
  game: TableView,
  drag: DragInteraction,
  metrics: TableMetrics,
): PileGeometry | null {
  const cardSize = metrics.layout.cardSize;
  const geometries = computeDropGeometries(
    game.dropTargetPiles.map((pile) => ({
      pile,
      layout: game.zoneFor(pile.id)?.layout ?? { kind: "stacked" },
    })),
    metrics.origins,
    cardSize,
    metrics.scale,
  );

  return resolveDropTarget(
    {
      x: drag.primary.x,
      y: drag.primary.y,
      width: cardSize.width * metrics.scale,
      height: cardSize.height * metrics.scale,
    },
    geometries,
  );
}

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
  /** Sprite scale: atlas texels to device pixels. */
  private readonly spriteScale: number;
  private readonly origins: ReadonlyMap<string, Point>;
  private readonly cardWidth: number;
  private readonly cardHeight: number;

  constructor(
    private readonly game: TableView,
    private readonly interaction: TableInteractionState,
    private readonly metrics: TableMetrics,
    private readonly presentation: TablePresentation,
  ) {
    this.scale = metrics.scale;
    this.spriteScale = this.scale / CARD_ART_SCALE;
    this.origins = metrics.origins;
    // The drawn size rather than the grid cell, so a highlight hugs the card.
    this.cardWidth = CARD_RENDER_WIDTH_PX * this.scale;
    this.cardHeight = CARD_RENDER_HEIGHT_PX * this.scale;
  }

  public build(): TableViewState {
    return {
      backgrounds: this.buildBackgrounds(),
      cards: this.buildCards(),
      highlights: this.buildHighlights(),
    };
  }

  /** Returns a placeholder for every zone that declares one. */
  private buildBackgrounds(): PileBackgroundView[] {
    const backgrounds: PileBackgroundView[] = [];

    for (const pile of this.game.piles) {
      const zone = this.game.zoneFor(pile.id);
      const origin = this.origins.get(pile.id);
      if (!zone?.backgroundKey || !origin) continue;

      backgrounds.push({
        pileId: pile.id,
        x: origin.x,
        y: origin.y,
        scale: this.spriteScale,
        depth: depthFor(RenderLayer.PILE_BACKGROUND),
        cursor: zone.emptyIsActionable && pile.isEmpty ? "pointer" : "default",
      });
    }

    return backgrounds;
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
        zone.layout,
        pileCards,
        this.expansionCardId(zone, pileCards),
      );

      for (let cardIndex = 0; cardIndex < pileCards.length; cardIndex++) {
        const card = pileCards[cardIndex];
        const restingDepth = depthFor(RenderLayer.RESTING_CARD, restingIndex++);

        const placement =
          drag.primary && drag.holds(card.id)
            ? this.heldPlacement(card.id, drag, drag.primary)
            : this.restingPlacement(
                origin,
                offsets[cardIndex],
                restingDepth,
                flightOrder.get(card.id),
              );

        cards.push({
          cardId: card.id,
          x: placement.x,
          y: placement.y,
          depth: placement.depth,
          snap: placement.snap,
          scale: this.spriteScale,
          frame: frameFor(zone.face, card, this.presentation.cardBackKey),
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

    const sourcePile =
      cardIds.length > 0 ? this.game.getPileContainingCard(cardIds[0]) : null;
    const sourceLayout = sourcePile
      ? this.game.zoneFor(sourcePile.id)?.layout
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
    zone: ZoneSpec,
    pileCards: readonly PlayingCard[],
  ): string | null {
    if (!this.interaction.hoveredCardId || this.interaction.drag) {
      return null;
    }
    const hovered = pileCards.find(
      (card) => card.id === this.interaction.hoveredCardId,
    );
    return hovered && showsFace(zone.face, hovered) ? hovered.id : null;
  }

  /**
   * Returns the highlight borders to draw: drag feedback while a stack is in
   * hand, and the hover border otherwise.
   */
  private buildHighlights(): HighlightView[] {
    const drag = this.interaction.drag;
    if (drag && drag.cardIds.length > 0) {
      const dropTarget = this.buildDropTargetHighlight(drag);
      return dropTarget ? [dropTarget] : [];
    }

    const hoverHighlight = this.buildHoverHighlight();
    return hoverHighlight ? [hoverHighlight] : [];
  }

  /**
   * Returns the border marking where the dragged stack would land if released
   * now, or null if it would not be accepted there.
   */
  private buildDropTargetHighlight(
    drag: DragInteraction,
  ): HighlightView | null {
    const target = resolveDragTarget(this.game, drag, this.metrics);
    if (!target) {
      return null;
    }

    const targetPile = this.game.getPileById(target.pileId);
    if (
      !targetPile ||
      !this.game.canMoveCardToPile(drag.cardIds[0], target.pileId)
    ) {
      return null;
    }

    // Outline the card the stack would land on, or the empty slot, rather than
    // the whole column.
    const topCard = targetPile.topCard;

    return {
      anchor: topCard
        ? { kind: "card", cardId: topCard.id }
        : { kind: "point", x: target.x, y: target.y },
      width: this.cardWidth,
      height: this.cardHeight,
      scale: this.scale,
      depth: depthFor(RenderLayer.DROP_TARGET_HINT),
      openBottom: false,
    };
  }

  /**
   * Returns the hover border for the card or empty slot under the pointer, or
   * null when nothing hovered can be interacted with.
   */
  private buildHoverHighlight(): HighlightView | null {
    const backgroundHighlight = this.buildBackgroundHoverHighlight();
    if (backgroundHighlight) {
      return backgroundHighlight;
    }

    if (!this.interaction.hoveredCardId) {
      return null;
    }

    const hoveredCard = this.game.getCardById(this.interaction.hoveredCardId);
    const hoveredPile = hoveredCard
      ? this.game.getPileContainingCard(hoveredCard.id)
      : undefined;
    if (
      !hoveredCard ||
      !hoveredPile ||
      !this.game.isCardInteractableInPile(hoveredCard, hoveredPile)
    ) {
      return null;
    }

    const pileCards = hoveredPile.getCards();
    const cardIndex = pileCards.indexOf(hoveredCard);

    return {
      anchor: { kind: "card", cardId: hoveredCard.id },
      width: this.cardWidth,
      height: this.cardHeight,
      scale: this.scale,
      depth: depthFor(RenderLayer.HOVER_HINT),
      openBottom: cardIndex !== -1 && cardIndex < pileCards.length - 1,
    };
  }

  /** Returns the border for a hovered empty slot that does something. */
  private buildBackgroundHoverHighlight(): HighlightView | null {
    const pileId = this.interaction.hoveredBackgroundPileId;
    if (!pileId) return null;

    const pile = this.game.getPileById(pileId);
    const zone = this.game.zoneFor(pileId);
    const origin = this.origins.get(pileId);
    if (!pile?.isEmpty || !zone?.emptyIsActionable || !origin) {
      return null;
    }

    return {
      anchor: { kind: "point", x: origin.x, y: origin.y },
      width: this.cardWidth,
      height: this.cardHeight,
      scale: this.scale,
      depth: depthFor(RenderLayer.HOVER_HINT),
      openBottom: false,
    };
  }
}

/** Builds the complete desired appearance of a table for one frame. */
export function buildTableViewState(
  game: TableView,
  interaction: TableInteractionState,
  metrics: TableMetrics,
  presentation: TablePresentation,
): TableViewState {
  return new TableViewStateBuilder(
    game,
    interaction,
    metrics,
    presentation,
  ).build();
}
