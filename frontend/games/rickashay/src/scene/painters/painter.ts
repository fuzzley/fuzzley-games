import type {
  Painter as PainterOf,
  PaintContext as WallContext,
} from "@fz/brick-wall/scene/painter";
import type { FlightRules } from "../../rules/tuning";
import type { WallPalette } from "../../view/colors/palette";
import type { RoundView } from "../../view/run_state";

/**
 * Says what a frame of Rickashay is drawn from: what every wall game's is,
 * over the round as the view has it and the game's own palette, and the
 * rules' numbers as the debug menu may retune them.
 */
export interface PaintContext extends WallContext<RoundView, WallPalette> {
  /** The rules' numbers, among them how many floor bounces a fuzzball holds, a spring in the band each. */
  rules: FlightRules;
}

/** Draws a part of Rickashay's field, in the layers it was given, each frame. */
export type Painter = PainterOf<PaintContext>;
