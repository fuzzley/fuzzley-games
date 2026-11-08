import { type Field, type WaveSetup, fieldFor } from "../rules/field/field";
import { fillFor } from "../rules/field/fill";
import { stepRocks } from "../rules/rocks/rocks";
import { createCrew } from "../rules/ship/pilots";
import { STILL } from "../rules/ship/ship";
import type { Speed } from "../rules/speed";
import { stepsIn } from "../rules/stepper";
import { type Torus, distance } from "../rules/torus";
import {
  FAIR_COURSE,
  FAIR_COURSE_MS,
  FAIR_DISTANCE,
  FIRST_SHIP_POINTS,
} from "../rules/tuning";
import { FORMATIONS, WAVES, parseWave } from "../rules/waves/waves";
import { FIELDS } from "./autopilot";
import { shipOf, wholeRocks } from "./field_picture";
import { speedOfSpec } from "./speed_specs";

/** The seeds the spawn's specs lay each wave out from. */
export const LAYOUT_SEEDS: readonly number[] = Array.from(
  { length: 12 },
  (_, i) => i * 7919 + 1,
);

/**
 * Returns how the spawn's specs start a wave on a field of a shape at a
 * speed, from a seed, with a run's first crew.
 */
export function startOn(torus: Torus, speed: Speed, seed: number): WaveSetup {
  return {
    torus,
    speed,
    seed,
    crew: createCrew(),
    banked: 0,
    nextShipAt: FIRST_SHIP_POINTS,
    held: STILL,
  };
}

/** Says how near a laid field's rocks lie to its ship. */
export interface Nearness {
  /** How far off the nearest lies. */
  readonly off: number;
  /** How near the nearest course comes, as play flies them, in the time a course is judged by. */
  readonly flown: number;
}

/** Returns how near a laid field's rocks lie to its ship, flying them on as play does to see. */
export function nearness(field: Field): Nearness {
  const ship = shipOf(field);
  const nearest = (): number =>
    Math.min(
      ...wholeRocks(field).map((rock) =>
        distance(field.torus, ship.x, ship.y, rock.x, rock.y),
      ),
    );
  const off = nearest();
  let flown = Infinity;
  for (let step = 0; step < stepsIn(FAIR_COURSE_MS); step++) {
    stepRocks(field);
    flown = Math.min(flown, nearest());
  }
  return { off, flown };
}

/**
 * Holds every wave, in every formation, on the narrowest field and the
 * widest, either way up, laid out at the speed its spec file is named for
 * from each of {@link LAYOUT_SEEDS}, to every rock being laid, each far
 * enough from the ship on a course that keeps clear of it.
 *
 * Each speed's spec in `src/rules/field/every_layout/` calls it with its own
 * file (`import.meta.filename`), so Vitest lays the speeds out side by side
 * and a file lays out no speed but its own.
 */
export function holdEveryLayout(specFile: string): void {
  const speed = speedOfSpec(specFile, "every_layout");
  describe("layOut", () => {
    const cases = WAVES.flatMap((entry) =>
      FORMATIONS.flatMap((formation) =>
        FIELDS.map(
          (torus) =>
            [
              `${entry.data.name} as a ${formation}, ${String(torus.width)} by ${String(torus.height)}, at ${speed}`,
              { ...parseWave(entry), formation },
              torus,
            ] as const,
        ),
      ),
    );

    it.each(cases)("lays %s out fairly, every rock", (_, wave, torus) => {
      const unfair: number[] = [];
      let short = 0;

      for (const seed of LAYOUT_SEEDS) {
        const field = fieldFor(wave, startOn(torus, speed, seed));
        const fill = fillFor(wave, torus);
        const laid = fill.rocks.reduce((sum, each) => sum + each.count, 0);
        short += laid - wholeRocks(field).length;
        const { off, flown } = nearness(field);
        if (off < FAIR_DISTANCE || flown < FAIR_COURSE) unfair.push(seed);
      }

      expect({ short, unfair }).toEqual({ short: 0, unfair: [] });
    });
  });
}
