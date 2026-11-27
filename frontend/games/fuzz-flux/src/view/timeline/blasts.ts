// What each blast a wave sets off plays as it goes off, by its own event,
// each holding the board until it has reached as far as the board waits
// for.

import { itemAt } from "@fz/core/records";
import type { BlastId } from "../../rules/catalog/specials";
import type { Blast } from "../../rules/move/record";
import { dasherOff } from "./events/dasher";
import { frizzballOff } from "./events/frizzball";
import { pufferOff } from "./events/puffer";
import { wispOff } from "./events/wisp";
import type { Part } from "./part";
import { type Reach, heldUntilMs } from "./reach";
import type { WavePlay } from "./wave_play";

/** Returns the parts of a blast going off, as its reach times it, in its wave. */
export type BlastEvent = (
  blast: Blast,
  reach: Reach,
  play: WavePlay,
) => readonly Part[];

/** Each blast's event. */
const BLAST_EVENTS: Readonly<Partial<Record<BlastId, BlastEvent>>> = {
  "dasher-across": dasherOff,
  "dasher-down": dasherOff,
  puffer: pufferOff,
  wisp: wispOff,
  frizzball: frizzballOff,
};

/** Returns the parts of each blast a wave sets off, each holding the board until it has reached as far as the board waits for. */
export function blastsOf(
  play: WavePlay,
  reaches: readonly Reach[],
): readonly Part[] {
  return play.wave.blasts.flatMap((blast, index): readonly Part[] => {
    const reach = itemAt(reaches, index);
    return [
      ...(BLAST_EVENTS[blast.what]?.(blast, reach, play) ?? []),
      { what: "hold", atMs: heldUntilMs(blast, reach) },
    ];
  });
}
