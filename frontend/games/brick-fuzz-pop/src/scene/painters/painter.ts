import type {
  Painter as PainterOf,
  PaintContext as WallContext,
} from "@fz/brick-wall/scene/painter";
import type { Guide } from "../../rules/flight/guide";
import type { Boon } from "../../rules/shot";
import type { WallPalette } from "../../view/colors/palette";
import type { RoundView } from "../../view/round_play";
import type { Steer } from "../../view/steering/steering";

/**
 * Says what a frame of Brick Fuzz Pop is drawn from: what every wall game's
 * is, over the round as the view has it and the game's own palette, and the
 * steering, where the fuzzball waits and the guide.
 */
export interface PaintContext extends WallContext<RoundView, WallPalette> {
  /** The shot being aimed: the aim the waiting fuzzball looks along, the charge the meter shows, and the finger that aims, which the gauge shows it over. */
  steer: Readonly<Steer>;
  /** Where the player's fuzzball waits on the floor, across the field, or null while it is in the air. */
  waitingX: number | null;
  /** The boon the waiting fuzzball carries, which it wears, or null. */
  boon: Boon | null;
  /** The guide to draw, or null where none shows. */
  guide: Guide | null;
}

/** Draws a part of Brick Fuzz Pop's field, in the layers it was given, each frame. */
export type Painter = PainterOf<PaintContext>;
