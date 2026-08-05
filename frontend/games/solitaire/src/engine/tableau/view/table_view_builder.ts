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
 * Resolves the pile an in-flight drag would land on, as the pile's full drop
 * rectangle.
 *
 * The single answer to "where does this drag go": the view builder calls it
 * every frame to preview the target and the input handler calls it on release
 * to commit the move, so the border can never promise a pile the drop then
 * disagrees with.
 *
 * @param game The game being drawn.
 * @param drag The active drag.
 * @param metrics The board measured for this frame.
 * @returns The target pile's geometry, or null when the drag overlaps no pile.
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

/** Where one card is drawn this frame, and whether it eases there. */
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

/** The stack currently in hand, and how it is spaced while carried. */
interface DragContext {
  /** The cards being carried, bottom-first. */
  readonly cardIds: readonly string[];
  /** Where the pointer is, or null when nothing is being carried. */
  readonly primary: Point | null;
  /** The vertical gap the carried stack keeps, in design units. */
  readonly fanGap: number;
  /** Whether the given card is one of the cards in hand. */
  holds(cardId: string): boolean;
}

/**
 * Builds the desired appearance of a table for one frame.
 *
 * Reads the game only through {@link TableView} and the zones, so the same
 * builder draws Klondike, FreeCell or Spider: which piles exist, how each fans,
 * which side of its cards it shows and what may be picked up are all declared
 * rather than branched on here.
 */
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
    // The artwork is authored larger than a card is drawn, so a sprite is
    // scaled down from its texels while the layout keeps working in design
    // units.
    this.spriteScale = this.scale / CARD_ART_SCALE;
    this.origins = metrics.origins;
    // Size the highlight from the drawn card size so its border hugs the
    // rendered card exactly, rather than the slightly larger layout grid cell.
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

  /** A placeholder for every zone that declares one. */
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
        // Only a slot that does something when clicked while empty invites one.
        cursor: zone.emptyIsActionable && pile.isEmpty ? "pointer" : "default",
      });
    }

    return backgrounds;
  }

  /** The position, frame and interactivity of every card in play. */
  private buildCards(): CardView[] {
    const drag = this.dragContext();
    const flightOrder = this.flightOrder();
    const cards: CardView[] = [];

    // Resting cards are ordered across the whole board rather than within each
    // pile, so two cards in different piles never share a depth and the order
    // they are drawn in never falls back to the order their sprites were made.
    //
    // Counted for every card, held ones included, because this ordering has to
    // agree card-for-card with the one the model announces relocations by.
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

  /**
   * The stack in hand, and the spacing it keeps.
   *
   * A dragged stack keeps the spacing of the pile it came from, so a fanned
   * column stays fanned in hand and a squarely stacked pile stays square.
   */
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
   * Where each card in the air sits in the drawing order.
   *
   * Counted across every flight in the order they began, so a stack keeps its
   * own order and a later flight draws over an earlier one still settling.
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

  /**
   * Where a card being carried is drawn: under the pointer, fanned in hand.
   *
   * Takes the pointer position rather than reading it back off the context, so
   * that the caller's check for "is anything being carried" is what narrows it
   * and no cast is needed here.
   */
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
   * Where a card that is not in hand is drawn: at its place in its pile.
   *
   * A card in the air is lifted clear of the board, so it crosses over the
   * columns between it and its destination instead of sliding under them on its
   * way to a depth it has not arrived at yet.
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
   * The card in this pile whose fan should open to reveal more of it, or null.
   *
   * Any card the zone draws face up expands, whether or not the rules would let
   * it be picked up. The gap is how a player reads a buried card's suit, and a
   * card too deep in a column to lift is the one they most need to read: an
   * Eight Off column offers up only the top of a same-suit run, so tying the
   * expansion to grabbability left almost every covered card unreadable. A card
   * drawn face down has nothing to reveal, so it still opens no gap.
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
   * The highlight borders to draw: drag feedback while a stack is in hand, and
   * the hover border otherwise.
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
   * The border marking where the dragged stack would land if released now, or
   * null when it would not be accepted anywhere.
   *
   * The card in hand wears no border of its own: it is already lifted above the
   * board and following the pointer, so the only thing left to say is where it
   * is going — and only when it can actually go there, so the border never
   * invites a drop the rules will refuse.
   */
  private buildDropTargetHighlight(
    drag: DragInteraction,
  ): HighlightView | null {
    // Asking the same resolver the drop itself will ask means the previewed
    // pile is the pile the card lands on, not a second guess at it.
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

    // Outline the card the stack would land on, which is the pile itself when
    // there is nothing in it yet. Sized to a card either way, so the border
    // marks the landing place rather than the whole column it belongs to.
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
   * The hover border for the card or empty slot under the pointer, or null when
   * nothing hovered can be interacted with.
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
      // Leave the bottom edge open when another card is stacked on top, so the
      // border never draws a line across the covering card.
      openBottom: cardIndex !== -1 && cardIndex < pileCards.length - 1,
    };
  }

  /** The border for a hovered empty slot that does something when clicked. */
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

/**
 * Builds the complete desired appearance of a table for one frame.
 *
 * @param game The game being drawn, read through its narrow view.
 * @param interaction The current pointer and drag state.
 * @param metrics The board measured for this viewport.
 * @param presentation The player's choices about how cards look.
 * @returns The pure view state describing positions, depths, frames and borders.
 */
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
