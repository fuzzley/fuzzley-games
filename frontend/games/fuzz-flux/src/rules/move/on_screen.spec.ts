import { gameFrom } from "../../testing/board_picture";
import { turnFrame } from "../board/orientation";
import { waveOnScreen } from "./on_screen";
import type { Wave } from "./record";

/**
 * A board 3 squares across and 2 down on the screen, its frame turned a
 * quarter clockwise, so its own is 2 across and 3 down: its squares 0 to 5
 * are the screen's 3, 0, 4, 1, 5 and 2.
 */
const QUARTER_TURNED = turnFrame(gameFrom(["bgb", "rbr"]), 1);

/** The same board, its frame turned a half: its squares 0 to 5 are the screen's 5 to 0. */
const HALF_TURNED = turnFrame(gameFrom(["bgb", "rbr"]), 2);

/** A wave in a turned frame's own squares: a bunch down its first column that makes a dasher down, a wisp carrying a dasher across, and a fall. */
const WAVE: Wave = {
  number: 1,
  bunches: [
    {
      squares: [0, 2, 4],
      kind: "blue",
      makes: { what: "dasher-down", square: 2, piece: 3 },
    },
  ],
  blasts: [
    {
      what: "wisp-and-dasher-across",
      square: 1,
      piece: 2,
      kind: "red",
      setOffBy: null,
      wait: 0,
      strikes: [{ square: 5, step: 1 }],
    },
  ],
  hits: [
    {
      what: "gathered",
      square: 0,
      piece: 1,
      kind: "blue",
      step: 0,
      blast: null,
    },
    { what: "born", square: 2, piece: 3, made: "dasher-down", kind: "blue" },
  ],
  falls: [
    { piece: 4, kind: "red", from: 1, path: [3, 5], lane: 1 },
    { piece: 7, kind: "green", from: null, path: [1], lane: 1 },
  ],
  goalsLeft: [3],
};

describe("waveOnScreen", () => {
  it("leaves a wave played in a frame that isn't turned as it is", () => {
    const game = gameFrom(["bgb", "rbr"]);

    expect(waveOnScreen(WAVE, game)).toBe(WAVE);
  });

  it("puts each square where the screen shows it, a bunch's in their order there", () => {
    const wave = waveOnScreen(WAVE, QUARTER_TURNED);

    expect([
      wave.bunches.map(({ squares, makes }) => [squares, makes?.square]),
      wave.blasts.map(({ square, strikes }) => [square, strikes]),
      wave.hits.map(({ square }) => square),
      wave.falls.map(({ from, path }) => [from, path]),
    ]).toEqual([
      [[[3, 4, 5], 4]],
      [[0, [{ square: 2, step: 1 }]]],
      [3, 4],
      [
        [0, [1, 2]],
        [null, [0]],
      ],
    ]);
  });

  it("turns a dasher's way with a frame turned a quarter, in what a bunch makes, what goes off and what is born", () => {
    const wave = waveOnScreen(WAVE, QUARTER_TURNED);

    expect([
      wave.bunches[0]?.makes?.what,
      wave.blasts[0]?.what,
      wave.hits[1]?.what === "born" ? wave.hits[1].made : null,
    ]).toEqual(["dasher-across", "wisp-and-dasher-down", "dasher-across"]);
  });

  it("keeps a dasher's way in a frame turned a half", () => {
    const wave = waveOnScreen(WAVE, HALF_TURNED);

    expect([
      wave.bunches[0]?.squares,
      wave.bunches[0]?.makes?.what,
      wave.blasts[0]?.what,
    ]).toEqual([[1, 3, 5], "dasher-down", "wisp-and-dasher-across"]);
  });

  it("keeps everything but squares and ways: the number, kinds, pieces, steps, lanes and goals", () => {
    const { number, bunches, blasts, falls, goalsLeft } = waveOnScreen(
      WAVE,
      QUARTER_TURNED,
    );

    expect([
      number,
      bunches[0]?.kind,
      bunches[0]?.makes?.piece,
      blasts[0]?.piece,
      falls.map(({ piece, kind, lane }) => [piece, kind, lane]),
      goalsLeft,
    ]).toEqual([
      1,
      "blue",
      3,
      2,
      [
        [4, "red", 1],
        [7, "green", 1],
      ],
      [3],
    ]);
  });
});
