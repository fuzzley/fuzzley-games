import type { Piece } from "../../rules/catalog/pieces";
import type { SpecialId } from "../../rules/catalog/specials";
import { FEEL } from "../timeline/feel";
import { type Breath, breathAt } from "./breaths";

/** Returns a red fuzzball wearing a special's fur, or none. */
function fuzzball(id: number, special: SpecialId | null): Piece {
  return {
    what: "fuzzball",
    id,
    kind: "red",
    special,
    caged: false,
    burred: false,
  };
}

/** Returns how a piece's body stirs at a moment. */
function breathOf(piece: Piece | null, ms: number): Breath {
  return breathAt(piece, FEEL, ms, { scale: 1, turn: 0 });
}

/** Returns how a piece's body stirs at each millisecond of a while from the start of the scene's clock. */
function breathsOf(piece: Piece, ms: number): readonly Breath[] {
  return Array.from({ length: ms }, (_, at) => breathOf(piece, at));
}

/** How long a puffer takes to breathe in and out once. */
const BREATH_MS = 2 * Math.PI * FEEL.pufferBreathRadianMs;

/** How long a wisp's seed-head takes to sway there and back once. */
const SWAY_MS = 2 * Math.PI * FEEL.wispSwayRadianMs;

describe("breathAt", () => {
  it("swells and shrinks a puffer by the feel's breath each way as it breathes", () => {
    const scales = breathsOf(fuzzball(1, "puffer"), BREATH_MS).map(
      ({ scale }) => scale,
    );

    expect([Math.max(...scales), Math.min(...scales)]).toEqual([
      expect.closeTo(1 + FEEL.pufferBreath, 5),
      expect.closeTo(1 - FEEL.pufferBreath, 5),
    ]);
  });

  it("breathes a puffer in and out again over the feel's breath, never turning it", () => {
    const puffer = fuzzball(1, "puffer");

    const { scale, turn } = breathOf(puffer, 100 + BREATH_MS);

    expect([scale, turn]).toEqual([
      expect.closeTo(breathOf(puffer, 100).scale, 9),
      0,
    ]);
  });

  it("sways a wisp's seed-head by the feel's sway each way, never scaling it", () => {
    const breaths = breathsOf(fuzzball(1, "wisp"), SWAY_MS);
    const turns = breaths.map(({ turn }) => turn);

    expect([
      Math.max(...turns),
      Math.min(...turns),
      new Set(breaths.map(({ scale }) => scale)),
    ]).toEqual([
      expect.closeTo(FEEL.wispSway, 5),
      expect.closeTo(-FEEL.wispSway, 5),
      new Set([1]),
    ]);
  });

  it("crackles the frizzball's static a step round at each of its steps, and round again after the last", () => {
    const frizzball: Piece = { what: "frizzball", id: 1 };

    expect(
      Array.from(
        { length: FEEL.staticSteps + 1 },
        (_, step) => breathOf(frizzball, step * FEEL.staticStepMs).turn,
      ),
    ).toEqual([
      ...Array.from(
        { length: FEEL.staticSteps },
        (_, step) => step * FEEL.staticStep,
      ),
      0,
    ]);
  });

  it("holds the frizzball's static still between its steps", () => {
    const frizzball: Piece = { what: "frizzball", id: 1 };

    expect(breathOf(frizzball, 2 * FEEL.staticStepMs - 1).turn).toBe(
      FEEL.staticStep,
    );
  });

  it("sets each puffer's breath apart from the others by its id, a radian an id", () => {
    expect(breathOf(fuzzball(2, "puffer"), 0).scale).toBeCloseTo(
      breathOf(fuzzball(1, "puffer"), FEEL.pufferBreathRadianMs).scale,
      9,
    );
  });

  it("sets each wisp's sway apart from the others by its id, a radian an id", () => {
    expect(breathOf(fuzzball(2, "wisp"), 0).turn).toBeCloseTo(
      breathOf(fuzzball(1, "wisp"), FEEL.wispSwayRadianMs).turn,
      9,
    );
  });

  it.each<[string, Piece | null]>([
    ["a plain fuzzball", fuzzball(1, null)],
    ["a dasher", fuzzball(1, "dasher-across")],
    ["a brick", { what: "brick", id: 1, layers: 2 }],
    ["a sleepyhead", { what: "sleepyhead", id: 1 }],
    ["a loose sprite's record", null],
  ])("leaves %s still", (_, piece) => {
    expect(breathAt(piece, FEEL, 500, { scale: 2, turn: 1 })).toEqual({
      scale: 1,
      turn: 0,
    });
  });

  it("writes into the record it is given, and returns it", () => {
    const record: Breath = { scale: 1, turn: 0 };

    expect(breathAt(fuzzball(1, "puffer"), FEEL, 0, record)).toBe(record);
  });
});
