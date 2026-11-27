// The flights to the goals a move plays, and the goals' counts: each
// fuzzball gathered sends a copy to the goal of its kind while that goal
// still asks for more than it has on the way, a gap after the last few,
// or none where so many are in the air that it is counted with none; and
// each goal's count falls as a copy lands, or at once for what it counts
// with no flight.

import { itemAt } from "@fz/core/records";
import type { ElementGoalId, Goal } from "../../rules/catalog/goals";
import type { KindId } from "../../rules/catalog/kinds";
import type { GoalShown } from "../run_state";
import { byStart } from "./by_start";
import type { FeelTuning } from "./feel";
import type { Part } from "./part";
import type { Flight, GoalCount } from "./timeline";

/** Describes what a goal counts: a fuzzball of a kind gathered, or one of an element cleared. */
export type Counts =
  | { readonly what: "gather"; readonly kind: KindId }
  | { readonly what: ElementGoalId };

/** Describes a fuzzball gathered, or something else a goal counts, as an event adds it. */
export type Claim = Extract<
  Part,
  { readonly what: "gathered" } | { readonly what: "counted" }
>;

/** Describes the flights a move plays and the goals' counts as they land. */
export interface FlightsAndCounts {
  /** Each flight, in the order it sets off. */
  readonly flights: readonly Flight[];
  /** Each count, in the order it lands. */
  readonly counts: readonly GoalCount[];
}

/** Describes the moment a goal counts one more. */
interface Landing {
  readonly atMs: number;
  readonly goal: number;
}

/**
 * Returns the flights of what a move gathers to the goals as they stand at
 * its start, and each goal's count as it falls, but for what no goal asks
 * for any longer.
 */
export function flightsOf(
  claims: readonly Claim[],
  goals: readonly GoalShown[],
  feel: FeelTuning,
): FlightsAndCounts {
  const asks = goals.map(({ left }) => left);
  const flights: Flight[] = [];
  const landings: Landing[] = [];
  for (const claim of byStart(claims)) {
    const counts = countsOf(claim);
    const goal = goals.findIndex((shown) => isCounting(shown.goal, counts));
    if (goal < 0 || itemAt(asks, goal) <= 0) {
      continue;
    }
    asks[goal] = itemAt(asks, goal) - 1;
    if (claim.what === "counted") {
      landings.push({ atMs: claim.atMs, goal });
      continue;
    }
    const inAir = flights.filter(
      ({ atMs, ms }) => atMs + ms > claim.atMs,
    ).length;
    if (inAir >= feel.mostFlights) {
      landings.push({ atMs: claim.atMs + feel.unflownCountMs, goal });
      continue;
    }
    const flight: Flight = {
      atMs:
        claim.atMs +
        feel.flightAfterMs +
        (inAir % feel.flightsInTurn) * feel.flightGapMs,
      ms: feel.flightMs,
      drawn: claim.piece,
      from: claim.at,
      goal,
    };
    flights.push(flight);
    landings.push({ atMs: flight.atMs + flight.ms, goal });
  }
  const shown = goals.map(({ left }) => left);
  return {
    flights: byStart(flights),
    counts: byStart(landings).map(({ atMs, goal }) => {
      shown[goal] = itemAt(shown, goal) - 1;
      return { atMs, goal, left: itemAt(shown, goal) };
    }),
  };
}

/** Returns what a goal counts a claim as. */
function countsOf(claim: Claim): Counts {
  return claim.what === "gathered"
    ? { what: "gather", kind: claim.piece.kind }
    : claim.counts;
}

/** Returns whether a goal counts something. */
function isCounting(goal: Goal, counts: Counts): boolean {
  return goal.what === "gather"
    ? counts.what === "gather" && counts.kind === goal.kind
    : goal.what === counts.what;
}
