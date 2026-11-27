import { itemAt } from "@fz/core/records";
import type { BlastId } from "../../rules/catalog/specials";
import type { Blast, Wave } from "../../rules/move/record";
import { FEEL } from "./feel";
import { heldUntilMs, reachesOf } from "./reach";

/** When the wave's bunches hop off. */
const HOPS_MS = 1000;

/** Returns a blast of a kind the move sets off, striking some squares a step apart. */
function blastOf(what: BlastId, strikes = 3, more: Partial<Blast> = {}): Blast {
  return {
    what,
    square: 0,
    piece: 1,
    kind: "red",
    setOffBy: null,
    wait: 0,
    strikes: Array.from({ length: strikes }, (_, step) => ({
      square: step,
      step,
    })),
    ...more,
  };
}

/** Returns a wave of nothing but some blasts. */
function waveOf(...blasts: readonly Blast[]): Wave {
  return {
    number: 1,
    bunches: [],
    blasts,
    hits: [],
    falls: [],
    goalsLeft: [],
  };
}

/** Returns when the first of a wave's blasts goes off and reaches its first three steps. */
function timesOf(blast: Blast): readonly number[] {
  const reach = itemAt(reachesOf(waveOf(blast), HOPS_MS, FEEL), 0);
  return [reach.startMs, reach.reachMs(0), reach.reachMs(1), reach.reachMs(2)];
}

describe("reachesOf", () => {
  it("sets a dasher off a moment after the bunches hop off, its streaks a square at a time", () => {
    const startMs = HOPS_MS + FEEL.blastAfterMs;

    expect(timesOf(blastOf("dasher-across"))).toEqual([
      startMs,
      startMs + FEEL.streaksAfterMs,
      startMs + FEEL.streaksAfterMs + FEEL.dasherSquareMs,
      startMs + FEEL.streaksAfterMs + 2 * FEEL.dasherSquareMs,
    ]);
  });

  it("reaches out from a puffer a ring at a time once it has breathed in", () => {
    const startMs = HOPS_MS + FEEL.blastAfterMs;

    expect(timesOf(blastOf("puffer")).slice(1)).toEqual([
      startMs + FEEL.pufferInMs,
      startMs + FEEL.pufferInMs + FEEL.pufferRingMs,
      startMs + FEEL.pufferInMs + 2 * FEEL.pufferRingMs,
    ]);
  });

  it("lands a wisp's copies a gap apart, the first a flight after it goes off", () => {
    const startMs = HOPS_MS + FEEL.blastAfterMs;

    expect(timesOf(blastOf("wisp")).slice(2)).toEqual([
      startMs + FEEL.wispMs,
      startMs + FEEL.wispMs + FEEL.wispGapMs,
    ]);
  });

  it("takes everything a frizzball strikes at once, its static leapt to each and held", () => {
    const startMs = HOPS_MS + FEEL.blastAfterMs;
    const takenMs = startMs + 3 * FEEL.frizzballStepMs + FEEL.frizzballHoldMs;

    expect(timesOf(blastOf("frizzball")).slice(1)).toEqual([
      takenMs,
      takenMs,
      takenMs,
    ]);
  });

  it("leaps a frizzball's static quicker to more fuzzballs, to all in the most time", () => {
    const reaches = reachesOf(waveOf(blastOf("frizzball", 35)), HOPS_MS, FEEL);

    expect(itemAt(reaches, 0).leapMs).toBe(FEEL.frizzballMostMs / 35);
  });

  it("bursts a frizzball's pair, as a frizzball alone, once its static has leapt to each and held", () => {
    const reaches = reachesOf(
      waveOf(blastOf("frizzball-and-dasher")),
      HOPS_MS,
      FEEL,
    );

    expect(itemAt(reaches, 0).burstMs).toBe(
      HOPS_MS + FEEL.pairMs + 3 * FEEL.frizzballStepMs + FEEL.frizzballHoldMs,
    );
  });

  it("sets a pair off once it has wound up", () => {
    expect(timesOf(blastOf("two-dashers"))[0]).toBe(HOPS_MS + FEEL.pairMs);
  });

  it("reaches each step of a frizzball's pair a while after its static has leapt to all", () => {
    const leaptMs = HOPS_MS + FEEL.pairMs + 3 * FEEL.frizzballStepMs;

    expect(timesOf(blastOf("frizzball-and-dasher")).slice(2)).toEqual([
      leaptMs + FEEL.frizzballPairAfterMs + FEEL.frizzballPairStepMs,
      leaptMs + FEEL.frizzballPairAfterMs + 2 * FEEL.frizzballPairStepMs,
    ]);
  });

  it("reaches each step of two frizzballs quickly, a while after they go off", () => {
    const startMs = HOPS_MS + FEEL.pairMs;

    expect(timesOf(blastOf("two-frizzballs")).slice(2)).toEqual([
      startMs + FEEL.twoFrizzballsStrikeAfterMs + FEEL.twoFrizzballsStepMs,
      startMs + FEEL.twoFrizzballsStrikeAfterMs + 2 * FEEL.twoFrizzballsStepMs,
    ]);
  });

  it("sets a blast off as the one that sets it off reaches it", () => {
    const reaches = reachesOf(
      waveOf(
        blastOf("dasher-across"),
        blastOf("puffer", 3, { setOffBy: 0, wait: 2 }),
      ),
      HOPS_MS,
      FEEL,
    );

    expect(reaches[1]?.startMs).toBe(reaches[0]?.reachMs(2));
  });
});

describe("heldUntilMs", () => {
  it.each<[BlastId, number]>([
    ["dasher-across", 1],
    ["wisp", 1],
    ["puffer", 2],
    ["two-puffers", 2],
    ["wisp-and-puffer", 2],
    ["frizzball-and-puffer", 2],
    ["dasher-and-puffer", 1],
  ])("holds the board for %s until it reaches step %i", (what, step) => {
    const blast = blastOf(what);
    const reach = itemAt(reachesOf(waveOf(blast), HOPS_MS, FEEL), 0);

    expect(heldUntilMs(blast, reach)).toBe(reach.reachMs(step));
  });
});
