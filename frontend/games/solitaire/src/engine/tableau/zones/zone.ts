import { ReadonlyCardPile, PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { GrabRule } from "../rules/grab";
import { PlacementRule } from "../rules/placement";
import { ZoneLook } from "./zone_look";

/**
 * Describes how a pile plays: what it accepts, what may be taken from it and
 * how much it holds.
 *
 * Nothing here says how the pile looks, which is its {@link ZoneLook}.
 */
export interface ZoneRules {
  /** The unique id of the pile this describes. */
  readonly id: string;

  /** The part it plays, for scoring, grouping and gestures. */
  readonly role: PileRole;

  /** How many cards it may hold, or undefined for no limit. */
  readonly capacity?: number;

  /**
   * What it accepts, or null when it is never a destination at all.
   *
   * Null, unlike a rule that refuses everything, keeps a drag from offering the
   * pile as a target.
   */
  readonly accept: PlacementRule | null;

  /** What may be taken from it. */
  readonly grab: GrabRule;

  /**
   * Whether a card taken from here may be dragged, rather than only clicked
   * like the top of the Klondike stock.
   */
  readonly draggable: boolean;
}

/**
 * Describes one pile of a game's board and everything that distinguishes it
 * from the others: how it plays, and how it looks.
 */
export interface ZoneSpec extends ZoneRules, ZoneLook {}

/** Returns whether the pile has room for `count` more cards. */
export function hasRoomFor(
  rules: ZoneRules,
  pile: ReadonlyCardPile<PlayingCard>,
  count: number,
): boolean {
  return rules.capacity === undefined || pile.size + count <= rules.capacity;
}
