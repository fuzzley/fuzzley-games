import type { Hit } from "../../../rules/move/record";
import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import {
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { FEEL } from "../feel";
import type { HitOf } from "../hits";
import { noteCue } from "../part";
import { standingOn } from "../standing";
import type { WavePlay } from "../wave_play";
import { gathered } from "./gathered";

/** When the hit lands. */
const AT_MS = 300;

/** Returns a fuzzball a blast takes from the board's corner, by its id. */
function struck(piece: number): HitOf<"gathered"> {
  return {
    what: "gathered",
    square: 0,
    step: 1,
    blast: 0,
    piece,
    kind: "blue",
  };
}

/** Returns a puffer's wave played as its move's third, its blast taking some fuzzballs, numbered from 100, and so many more as it is the third. */
function thirdWaveTaking(count: number): WavePlay {
  const play = firstWaveOf(MOVE_FIXTURES.pufferGoesOff);
  const hits: readonly Hit[] = Array.from({ length: count }, (_, index) =>
    struck(100 + index),
  );
  return { ...play, wave: { ...play.wave, number: 3, hits }, before: 2 };
}

describe("gathered", () => {
  it("hops a fuzzball a blast takes off as the blast reaches it", () => {
    const play = firstWaveOf(MOVE_FIXTURES.pufferGoesOff);
    const parts = gathered(
      {
        what: "gathered",
        square: 0,
        step: 1,
        blast: 0,
        piece: 1,
        kind: "blue",
      },
      AT_MS,
      play,
    );

    expect(pieceAt(timelineOfParts(play.grid, parts), 1, AT_MS).face).toBe(
      "happy",
    );
  });

  it("only sends the copy of a special a blast sets off to its goal, its own blast playing the rest", () => {
    const play = firstWaveOf(MOVE_FIXTURES.dasherSetsOffPuffer);

    expect(
      gathered(
        {
          what: "gathered",
          square: 3,
          step: 2,
          blast: 0,
          piece: 4,
          kind: "green",
        },
        AT_MS,
        play,
      ),
    ).toEqual([
      noteCue("pop", AT_MS, 3, FEEL.struckBubbleVolume),
      {
        what: "gathered",
        atMs: AT_MS,
        piece: standingOn(play.grid, 3).piece,
        at: { x: 3, y: 0 },
      },
    ]);
  });

  it.each([
    [1, 3],
    [5, 7],
    [6, 2],
    [14, 4],
  ])(
    "pops the bubble of the fuzzball a wave's blasts take %i of theirs a rung up from the wave's each, round again after a few",
    (order, rung) => {
      expect(
        gathered(struck(99 + order), AT_MS, thirdWaveTaking(20)),
      ).toContainEqual(noteCue("pop", AT_MS, rung, FEEL.struckBubbleVolume));
    },
  );

  it("counts only the fuzzballs the wave's blasts take, not its bunches'", () => {
    const play = thirdWaveTaking(1);
    const hits: readonly Hit[] = [
      { ...struck(99), blast: null, step: 0 },
      ...play.wave.hits,
    ];

    expect(
      gathered(struck(100), AT_MS, { ...play, wave: { ...play.wave, hits } }),
    ).toContainEqual(noteCue("pop", AT_MS, 3, FEEL.struckBubbleVolume));
  });

  it("pops no bubble past the most a wave's blasts play", () => {
    const parts = gathered(
      struck(99 + FEEL.mostStruckBubbles + 1),
      AT_MS,
      thirdWaveTaking(20),
    );

    expect(parts.filter(({ what }) => what === "sound")).toEqual([]);
  });
});
