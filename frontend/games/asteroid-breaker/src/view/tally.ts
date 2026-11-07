import { formatPoints } from "@fz/core/format";
import type { WaveTally } from "../rules/field/scoring";

/** Describes a line of the Cleared card's sum: what it counts, and its points as written. */
export interface TallyLine {
  readonly label: string;
  readonly points: string;
}

/** Returns how a cleared wave's points added up, a line for each part, in the Cleared card's order. */
export function tallyLines(tally: WaveTally): readonly TallyLine[] {
  return [
    { label: "Rocks", points: formatPoints(tally.rocks) },
    { label: "Chains", points: formatPoints(tally.chains) },
    { label: "Strays brought home", points: formatPoints(tally.strays) },
    { label: "Wave cleared", points: formatPoints(tally.cleared) },
    { label: "No ship lost", points: formatPoints(tally.clean) },
  ];
}
