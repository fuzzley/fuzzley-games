import { createTuning } from "./tuning";

/** Describes a game's tuned numbers, a switch among them. */
interface Feel {
  readonly speed: number;
  readonly reach: number;
  readonly wrap: boolean;
}

/** A game's own numbers, which the specs expect back by value, not by this record. */
const TUNED: Feel = { speed: 20, reach: 4, wrap: true };

describe("createTuning", () => {
  it("starts at the game's own numbers, not retuned", () => {
    const tuner = createTuning(TUNED);

    expect({ tuning: tuner.tuning(), retuned: tuner.retuned() }).toEqual({
      tuning: { speed: 20, reach: 4, wrap: true },
      retuned: false,
    });
  });

  it("keeps the numbers tuned before as another is tuned", () => {
    const tuner = createTuning(TUNED);
    tuner.tune("speed", 30);

    tuner.tune("reach", 6);

    expect(tuner.tuning()).toEqual({ speed: 30, reach: 6, wrap: true });
  });

  it("is retuned once a number is off the game's own", () => {
    const tuner = createTuning(TUNED);

    tuner.tune("reach", 6);

    expect(tuner.retuned()).toBe(true);
  });

  it("is retuned once a switch is turned over", () => {
    const tuner = createTuning(TUNED);

    tuner.tune("wrap", false);

    expect(tuner.retuned()).toBe(true);
  });

  it("is retuned no more once every number is tuned back to the game's own", () => {
    const tuner = createTuning(TUNED);
    tuner.tune("speed", 30);

    tuner.tune("speed", 20);

    expect(tuner.retuned()).toBe(false);
  });

  it("goes back to the game's own numbers at a reset, which it left as they were", () => {
    const tuner = createTuning(TUNED);
    tuner.tune("speed", 30);
    tuner.tune("wrap", false);

    tuner.reset();

    expect({ tuning: tuner.tuning(), retuned: tuner.retuned() }).toEqual({
      tuning: { speed: 20, reach: 4, wrap: true },
      retuned: false,
    });
  });

  it("tells every listener of each change as it is made, a reset among them, the numbers already tuned", () => {
    const tuner = createTuning(TUNED);
    const first: Feel[] = [];
    const second: Feel[] = [];
    tuner.onTune(() => first.push(tuner.tuning()));
    tuner.onTune(() => second.push(tuner.tuning()));

    tuner.tune("speed", 30);
    tuner.reset();

    const heard = [
      { speed: 30, reach: 4, wrap: true },
      { speed: 20, reach: 4, wrap: true },
    ];
    expect({ first, second }).toEqual({ first: heard, second: heard });
  });

  it("tells a listener that stopped nothing more", () => {
    const tuner = createTuning(TUNED);
    let heard = 0;
    const stop = tuner.onTune(() => {
      heard += 1;
    });
    tuner.tune("speed", 30);

    stop();
    tuner.tune("speed", 40);

    expect(heard).toBe(1);
  });
});
