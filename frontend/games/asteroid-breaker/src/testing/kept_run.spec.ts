import { ROCK_KINDS } from "../rules/catalog/rocks";
import { type Field, stepField } from "../rules/field/field";
import { restoreGame, takeUpField } from "../rules/run/saved_game";
import { STILL } from "../rules/ship/ship";
import { stepsIn } from "../rules/stepper";
import { waveToPlay } from "../rules/waves/endless";
import { WAVES, type WaveEntry, waveEntryOf } from "../rules/waves/waves";
import { type RunBegun, type KeptRun, clearingRun, keptRun } from "./kept_run";

/** A run on Crowd, wave 9, a second before its first stray, on a field of 72 by 40. */
const KEPT: KeptRun = {
  wave: 9,
  speed: "normal",
  seed: 9,
  torus: { width: 72, height: 40 },
  strayInMs: 1000,
};

/** The game's first two waves, then a third of a small stone alone, cleared long before its first stray. */
const QUICK_WAVES: readonly WaveEntry[] = [
  waveEntryOf(WAVES, 1),
  waveEntryOf(WAVES, 2),
  {
    ...waveEntryOf(WAVES, 3),
    data: {
      ...waveEntryOf(WAVES, 3).data,
      rocks: [{ kind: "stone", size: "small", count: 1 }],
    },
  },
];

describe("keptRun", () => {
  it("keeps a run the game takes up, paused on its wave", () => {
    const stored: unknown = JSON.parse(JSON.stringify(keptRun(WAVES, KEPT)));

    const takenUp = restoreGame(stored, WAVES, 2);

    expect(takenUp?.run).toMatchObject({
      wave: 9,
      speed: "normal",
      outcome: "paused",
    });
  });

  it("keeps the field on the shape it names, played until its first stray is as near as it names", () => {
    const { field } = keptRun(WAVES, KEPT);

    expect({
      torus: field?.torus,
      strayIn: (field?.nextStrayAt ?? 0) - (field?.steps ?? 0),
    }).toEqual({ torus: KEPT.torus, strayIn: stepsIn(1000) });
  });

  it("keeps the points the autopilot scored on the way", () => {
    expect(keptRun(WAVES, KEPT).score).toBeGreaterThan(0);
  });

  it("keeps a run on an Endless wave, past the written ones", () => {
    const wave = WAVES.length + 1;
    const stored: unknown = JSON.parse(
      JSON.stringify(keptRun(WAVES, { ...KEPT, wave })),
    );

    const takenUp = restoreGame(stored, WAVES, 2);

    expect(takenUp?.run).toMatchObject({ wave, outcome: "paused" });
  });

  it("throws for a wave before the first", () => {
    expect(() => keptRun(WAVES, { ...KEPT, wave: 0 })).toThrow(RangeError);
  });

  it("throws for a wave that sends no stray", () => {
    expect(() => keptRun(WAVES, { ...KEPT, wave: 1 })).toThrow(
      "Wave 1 sends no stray.",
    );
  });

  it.each([0, 60_000])(
    "throws for a stray %i ms away, nearer than a step or no nearer than the wave's start",
    (strayInMs) => {
      expect(() => keptRun(WAVES, { ...KEPT, strayInMs })).toThrow(RangeError);
    },
  );

  it("throws for a wave the autopilot clears before its first stray is as near as it names", () => {
    expect(() => keptRun(QUICK_WAVES, { ...KEPT, wave: 3 })).toThrow(
      "The autopilot stopped short of wave 3's first stray.",
    );
  });
});

/** A run on the last written wave, on a field of 72 by 40. */
const CLEARING: RunBegun = {
  wave: WAVES.length,
  speed: "normal",
  seed: 30,
  torus: { width: 72, height: 40 },
};

/** How long a volatile rock's fuse burns, in steps, as its blast says. */
const FUSE_STEPS = stepsIn(ROCK_KINDS.volatile.traits[0].delayMs);

/** Returns the clearing run's field, taken up as a page takes it up, through storage's JSON. */
function takenUp(): Field {
  const stored: unknown = JSON.parse(
    JSON.stringify(clearingRun(WAVES, CLEARING)),
  );
  const restored = restoreGame(stored, WAVES, 2);
  if (!restored?.field) throw new Error("The run kept no field.");
  const { run, field } = restored;
  const wave = waveToPlay(waveEntryOf(WAVES, run.wave), run.seed);
  return takeUpField(wave, { held: STILL }, field, run);
}

describe("clearingRun", () => {
  it("keeps a run the game takes up, paused on its wave, with its field", () => {
    const stored: unknown = JSON.parse(
      JSON.stringify(clearingRun(WAVES, CLEARING)),
    );

    const restored = restoreGame(stored, WAVES, 2);

    expect({
      run: restored?.run,
      field: restored?.field?.torus,
    }).toMatchObject({
      run: { wave: WAVES.length, speed: "normal", outcome: "paused" },
      field: CLEARING.torus,
    });
  });

  it("clears its wave once it goes on, with nothing steered, as its fuse burns down", () => {
    const field = takenUp();

    for (let step = 0; step < FUSE_STEPS; step++) stepField(field);

    expect({ cleared: field.cleared, ship: field.ship !== null }).toEqual({
      cleared: true,
      ship: true,
    });
  });

  it("throws for a wave before the first", () => {
    expect(() => clearingRun(WAVES, { ...CLEARING, wave: 0 })).toThrow(
      RangeError,
    );
  });
});
