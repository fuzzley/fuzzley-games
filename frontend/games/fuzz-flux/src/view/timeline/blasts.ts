// What each blast a wave sets off plays as it goes off, by its own event,
// each special alone and each pair swapped together, holding the board
// until it has reached as far as the board waits for.

import { itemAt } from "@fz/core/records";
import type { BlastId } from "../../rules/catalog/specials";
import type { Blast } from "../../rules/move/record";
import { crossOff } from "./events/cross";
import { dasherOff } from "./events/dasher";
import { frizzballOff } from "./events/frizzball";
import { pufferOff } from "./events/puffer";
import { twoFrizzballsOff } from "./events/two_frizzballs";
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
const BLAST_EVENTS = {
  "dasher-across": dasherOff,
  "dasher-down": dasherOff,
  puffer: pufferOff,
  wisp: wispOff,
  frizzball: frizzballOff,
  "two-dashers": crossOff,
  "dasher-and-puffer": crossOff,
  "two-puffers": pufferOff,
  "two-wisps": wispOff,
  "wisp-and-dasher-across": wispOff,
  "wisp-and-dasher-down": wispOff,
  "wisp-and-puffer": wispOff,
  "frizzball-and-dasher": frizzballOff,
  "frizzball-and-puffer": frizzballOff,
  "frizzball-and-wisp": frizzballOff,
  "two-frizzballs": twoFrizzballsOff,
} as const satisfies Readonly<Record<BlastId, BlastEvent>>;

/** Returns the parts of each blast a wave sets off, each holding the board until it has reached as far as the board waits for. */
export function blastsOf(
  play: WavePlay,
  reaches: readonly Reach[],
): readonly Part[] {
  return play.wave.blasts.flatMap((blast, index): readonly Part[] => {
    const reach = itemAt(reaches, index);
    return [
      ...BLAST_EVENTS[blast.what](blast, reach, play),
      { what: "hold", atMs: heldUntilMs(blast, reach) },
    ];
  });
}
