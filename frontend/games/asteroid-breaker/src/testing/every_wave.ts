import { WAVES, type WaveEntry, parseWave } from "../rules/waves/waves";
import { AUTOPILOT_LIMIT, ENDLESS_PLAYED, FIELDS, playWave } from "./autopilot";
import { speedOfSpec } from "./speed_specs";

/** Returns every play of some waves the specs make: each on every field, named. */
function playsOf(waves: readonly WaveEntry[]) {
  return waves.flatMap((entry) =>
    FIELDS.map(
      (torus) =>
        [
          `${String(entry.number)}, ${entry.data.name},`,
          `${String(torus.width)} by ${String(torus.height)}`,
          entry,
          torus,
        ] as const,
    ),
  );
}

/**
 * Holds every wave, played on every field at the speed its spec file is
 * named for, to being cleared by the autopilot within four minutes of game
 * time, meeting a comet and a stray if it sends them.
 *
 * Each speed's spec in `src/rules/waves/every_wave/` calls it with its own
 * file (`import.meta.filename`), so Vitest plays the speeds side by side and
 * a file plays no speed but its own.
 */
export function holdEveryWave(specFile: string): void {
  const speed = speedOfSpec(specFile, "every_wave");
  describe("every wave", () => {
    it.each(playsOf(WAVES))(
      `is cleared, %s at ${speed} on a field %s, within four minutes of game time, meeting a comet and a stray if it sends them`,
      (_, __, entry, torus) => {
        const report = playWave(entry, speed, { torus });
        const wave = parseWave(entry);

        expect({
          cleared: report.cleared,
          inTime: report.steps < AUTOPILOT_LIMIT,
          metComet: report.cometsCrossed > 0,
          metStray: report.straysSent > 0,
        }).toEqual({
          cleared: true,
          inTime: true,
          metComet: wave.cometEvery !== null,
          metStray: wave.strays > 0,
        });
      },
    );
  });
}

/**
 * Holds Endless's waves 31 to 60, played on every field at the speed its
 * spec file is named for, to being cleared by the autopilot within four
 * minutes of game time with nothing able to take the ship, meeting a comet
 * and a stray.
 *
 * Endless climbs until a run's ships run out, so its waves are held to
 * being fair rather than to what they cost; `yarn report:waves --endless`
 * shows the cost. Each speed's spec in `src/rules/waves/every_endless_wave/`
 * calls it with its own file, as {@link holdEveryWave}'s do.
 */
export function holdEveryEndlessWave(specFile: string): void {
  const speed = speedOfSpec(specFile, "every_endless_wave");
  describe("every Endless wave the autopilot is held to", () => {
    it.each(playsOf(ENDLESS_PLAYED))(
      `can be cleared, wave %s at ${speed} on a field %s, within four minutes of game time, meeting a comet and a stray`,
      (_, __, entry, torus) => {
        const report = playWave(entry, speed, { torus, invulnerable: true });

        expect({
          cleared: report.cleared,
          inTime: report.steps < AUTOPILOT_LIMIT,
          metComet: report.cometsCrossed > 0,
          metStray: report.straysSent > 0,
        }).toEqual({
          cleared: true,
          inTime: true,
          metComet: true,
          metStray: true,
        });
      },
    );
  });
}
