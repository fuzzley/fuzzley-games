// What each hit a wave makes plays as it lands: one struck beside or under
// a bunch a moment after it hops off, one a blast struck as the blast
// reaches its step. Each kind of hit plays by its own event in the list,
// a fuzzball a blast takes hopping off and dust swept among them; an
// element's events join it.

import { itemAt } from "@fz/core/records";
import type { Hit } from "../../rules/move/record";
import { broken, knocked } from "./events/brick";
import { brushedOff } from "./events/burr";
import { uncaged } from "./events/cage";
import { dusted } from "./events/dust";
import { gathered } from "./events/gathered";
import { ruffled } from "./events/sleepyhead";
import type { Part } from "./part";
import type { Reach } from "./reach";
import type { WavePlay } from "./wave_play";

/** A hit something struck: all but a special a bunch makes and a sleepyhead put to bed. */
type StruckHit = Exclude<Hit, { readonly what: "born" | "bedded" }>;

/** What a struck hit did, such as "knocked". */
type StruckWhat = StruckHit["what"];

/** A struck hit of a kind, such as a "knocked" one, as its event takes it. */
export type HitOf<What extends StruckWhat> = Extract<
  StruckHit,
  { readonly what: What }
>;

/** Returns the parts of a hit of a kind, as it lands at a moment of its wave. */
type HitEvent<What extends StruckWhat> = (
  hit: HitOf<What>,
  atMs: number,
  play: WavePlay,
) => readonly Part[];

/** Describes an event in the list, playing its own kind of hit and no other. */
interface Listed {
  readonly play: (
    hit: StruckHit,
    atMs: number,
    play: WavePlay,
  ) => readonly Part[];
}

/** Returns an event for the list, playing the hits of a kind by it. */
function playing<What extends StruckWhat>(
  what: What,
  event: HitEvent<What>,
): Listed {
  return {
    play: (hit, atMs, play) => (isOf(hit, what) ? event(hit, atMs, play) : []),
  };
}

/** Returns whether a hit is of a kind. */
function isOf<What extends StruckWhat>(
  hit: StruckHit,
  what: What,
): hit is HitOf<What> {
  return hit.what === what;
}

/** Each kind of hit's event. */
const HIT_EVENTS: readonly Listed[] = [
  playing("gathered", gathered),
  playing("dusted", dusted),
  playing("knocked", knocked),
  playing("broken", broken),
  playing("uncaged", uncaged),
  playing("ruffled", ruffled),
  playing("unburred", brushedOff),
];

/**
 * Returns the parts of each hit a wave's bunches and blasts strike, and a
 * hold until the last lands; the bunches' own fuzzballs are their own.
 */
export function hitsOf(
  play: WavePlay,
  reaches: readonly Reach[],
): readonly Part[] {
  return play.wave.hits.flatMap((hit): readonly Part[] => {
    if (hit.what === "born" || hit.what === "bedded") {
      return [];
    }
    if (hit.blast === null && hit.what === "gathered") {
      return [];
    }
    const atMs =
      hit.blast === null
        ? play.hopsMs + play.feel.struckAfterBunchMs
        : itemAt(reaches, hit.blast).reachMs(hit.step);
    return [
      ...HIT_EVENTS.flatMap((event) => event.play(hit, atMs, play)),
      { what: "hold", atMs },
    ];
  });
}
