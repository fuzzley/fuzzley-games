import { formatPoints } from "@fz/core/format";
import { RULES_VERSION } from "../rules/run/stats";

/**
 * Returns whether a best was made under earlier rules than these, so the
 * next run to score beats it, whatever it scores, and takes its place:
 * never a best of no points, and always one kept with no rules' number, as
 * made under the first.
 */
export function isEarlierBest(
  best: number,
  rules: number | undefined,
): boolean {
  return best > 0 && (rules === undefined || rules < RULES_VERSION);
}

/** Returns what the result calls the best at its run's speed: "Best", or "Best, earlier rules" for one made under them. */
export function bestTerm(best: number, rules: number): string {
  return isEarlierBest(best, rules) ? "Best, earlier rules" : "Best";
}

/** Describes a sector's best at the speed in play, as the Sectors dialog has it: its points, if a run has ended there, and the rules' number it was made under, if kept. */
export interface SectorBest {
  readonly best: number | undefined;
  readonly rules: number | undefined;
}

/** Returns whether the Sectors dialog says a sector's best was made under earlier rules: only an open sector's, which shows its best. */
export function saysEarlierRules(
  open: boolean,
  { best, rules }: SectorBest,
): boolean {
  return open && isEarlierBest(best ?? 0, rules);
}

/**
 * Returns what the Sectors dialog says of a sector under its waves:
 * "Locked" for one not open, its best at the speed in play, with "earlier
 * rules" after one made under them, or null for an open one with no best.
 */
export function sectorStatus(
  open: boolean,
  sectorBest: SectorBest,
): string | null {
  if (!open) return "Locked";
  if (sectorBest.best === undefined) return null;
  const words = `Best ${formatPoints(sectorBest.best)}`;
  return saysEarlierRules(open, sectorBest) ? `${words}, earlier rules` : words;
}
