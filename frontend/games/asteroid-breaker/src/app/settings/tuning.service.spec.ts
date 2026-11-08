import { TestBed } from "@angular/core/testing";
import { TUNED, type Tuning } from "../../view/debug_tuning";
import { TuningService } from "./tuning.service";

describe("TuningService", () => {
  it("starts at tuning.ts's numbers, not retuned", () => {
    const tuner = TestBed.inject(TuningService);

    expect({ tuning: tuner.tuning(), retuned: tuner.retuned() }).toEqual({
      tuning: TUNED,
      retuned: false,
    });
  });

  it("keeps the numbers tuned before as another is tuned", () => {
    const tuner = TestBed.inject(TuningService);
    tuner.tune({ thrust: 40 });

    tuner.tune({ rockSpeed: 2 });

    expect(tuner.tuning()).toEqual({ ...TUNED, thrust: 40, rockSpeed: 2 });
  });

  it("is retuned once a number is off tuning.ts's", () => {
    const tuner = TestBed.inject(TuningService);

    tuner.tune({ carryShip: !TUNED.carryShip });

    expect(tuner.retuned()).toBe(true);
  });

  it("is retuned no more once every number is tuned back to tuning.ts's", () => {
    const tuner = TestBed.inject(TuningService);
    tuner.tune({ thrust: 40 });

    tuner.tune({ thrust: TUNED.thrust });

    expect(tuner.retuned()).toBe(false);
  });

  it("goes back to tuning.ts's at a reset", () => {
    const tuner = TestBed.inject(TuningService);
    tuner.tune({ thrust: 40, rockSpeed: 2 });

    tuner.reset();

    expect({ tuning: tuner.tuning(), retuned: tuner.retuned() }).toEqual({
      tuning: TUNED,
      retuned: false,
    });
  });

  it("tells every listener of each tuning as it is made, a reset among them, the numbers already tuned", () => {
    const tuner = TestBed.inject(TuningService);
    const first: Tuning[] = [];
    const second: Tuning[] = [];
    tuner.onTune(() => first.push(tuner.tuning()));
    tuner.onTune(() => second.push(tuner.tuning()));

    tuner.tune({ thrust: 40 });
    tuner.reset();

    const heard = [{ ...TUNED, thrust: 40 }, TUNED];
    expect({ first, second }).toEqual({ first: heard, second: heard });
  });

  it("tells a listener that stopped nothing more", () => {
    const tuner = TestBed.inject(TuningService);
    let heard = 0;
    const stop = tuner.onTune(() => {
      heard += 1;
    });
    tuner.tune({ thrust: 40 });

    stop();
    tuner.tune({ thrust: 30 });

    expect(heard).toBe(1);
  });
});
