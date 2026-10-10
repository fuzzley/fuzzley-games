import { PlayingCard } from "@/engine/core/card/playing_card";
import { PileLayout } from "@/engine/render/layout/pile_layout";
import { SlotPlacement } from "@/engine/render/layout/table_layout";

/**
 * Says which side of its cards a zone shows, which may override the cards' own
 * {@link PlayingCard.faceUp}.
 */
export type FaceVisibility =
  /** Show whichever side the card itself says. */
  | "card"
  /** Always show the face, whatever the card says. */
  | "always-up"
  /** Always show the back, whatever the card says. */
  | "always-down";

/**
 * Describes how a pile looks on the table: where it sits, how it fans its
 * cards, which side they show and what its empty slot shows.
 *
 * Nothing here changes what the pile takes or gives up, which is its
 * {@link ZoneRules}.
 */
export interface ZoneLook {
  /** Where it sits in the table grid. */
  readonly slot: SlotPlacement;

  /** How it arranges the cards stacked in it. */
  readonly layout: PileLayout;

  /** Which side of its cards it shows. */
  readonly face: FaceVisibility;

  /**
   * The artwork key for the placeholder drawn beneath the pile, or undefined
   * for a pile drawn over bare table.
   */
  readonly backgroundKey?: string;

  /**
   * Whether clicking this pile's empty slot does something, and so earns a
   * pointer cursor and a hover border.
   */
  readonly emptyIsActionable?: boolean;
}

/** Returns whether a zone draws the given card face up. */
export function showsFace(face: FaceVisibility, card: PlayingCard): boolean {
  switch (face) {
    case "always-down":
      return false;
    case "always-up":
      return true;
    case "card":
      return card.faceUp;
  }
}

/** Returns the artwork key a zone shows for one of its cards. */
export function frameFor(
  face: FaceVisibility,
  card: PlayingCard,
  cardBackKey: string,
): string {
  return showsFace(face, card) ? card.faceKey : cardBackKey;
}
