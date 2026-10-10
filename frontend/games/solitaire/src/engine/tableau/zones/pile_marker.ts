import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { ZoneLook } from "./zone_look";

/**
 * Describes what a marked pile's slot shows now, and whether pressing it while
 * empty does anything, such as a stock that counts its recycles.
 */
export interface PileMarker {
  /** The artwork the pile's placeholder shows. */
  readonly artwork: string;
  /** Whether pressing the empty slot does something now. */
  readonly actionable: boolean;
}

/** Gives a pile's markers the zones that say how each pile starts out. */
export interface MarkedZones {
  /** Returns how the given pile looks, or undefined for an unknown pile. */
  zoneFor(pileId: string): ZoneLook | undefined;
}

/**
 * Holds the markers a game has put on its piles, and reads each pile's slot
 * from its marker, or else from its zone.
 */
export class PileMarkers {
  /** What each marked pile's slot shows, by pile id. */
  private readonly markers = new Map<string, () => PileMarker>();

  constructor(private readonly zones: MarkedZones) {}

  /** Makes a pile's slot show what `marker` says, asked afresh every frame. */
  mark(pileId: string, marker: () => PileMarker): void {
    this.markers.set(pileId, marker);
  }

  /**
   * Returns the artwork the pile's placeholder shows now: its marker's, or
   * else the one its zone declares.
   */
  backgroundKey(pile: ReadonlyCardPile<PlayingCard>): string | undefined {
    return (
      this.markers.get(pile.id)?.().artwork ??
      this.zones.zoneFor(pile.id)?.backgroundKey
    );
  }

  /**
   * Returns whether pressing the pile's empty slot does something now, as its
   * marker says, or else as its zone does.
   */
  isEmptySlotActionable(pile: ReadonlyCardPile<PlayingCard>): boolean {
    if (!pile.isEmpty) return false;
    const marker = this.markers.get(pile.id);
    return marker
      ? marker().actionable
      : (this.zones.zoneFor(pile.id)?.emptyIsActionable ?? false);
  }
}
