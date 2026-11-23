import type { GuidePlace, WallGuide } from "@fz/brick-wall/view/guide";
import type { Guide } from "../rules/flight/guide";

/** The turns of a guide that rings none, as Brick Fuzz Pop's doesn't. */
const NO_TURNS: readonly GuidePlace[] = [];

/**
 * Reads Brick Fuzz Pop's guide as a wall game's, which
 * `@fz/brick-wall/scene/guide`'s painter draws: its dots, no ring at a turn,
 * and a mark over each brick the shot would punch through. It makes one a
 * guide, so the painter draws again only as the guide changes.
 */
export class WallGuides {
  /** The guide last read, or null. */
  private read: Guide | null = null;
  /** The wall game's guide made of it, or null where none shows. */
  private made: WallGuide | null = null;

  /** Returns the wall game's guide a guide shows, or null where none shows: the same one while handed the same guide. */
  of(guide: Guide | null): WallGuide | null {
    if (guide !== this.read) {
      this.read = guide;
      this.made = guide && {
        dots: guide.dots,
        turns: NO_TURNS,
        struck: guide.punched,
      };
    }
    return this.made;
  }
}
