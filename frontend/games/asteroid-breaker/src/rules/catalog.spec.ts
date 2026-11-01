import { WEAPONS } from "./catalog/weapons";
import { stepsIn } from "./stepper";
import { SHOT_LIFE_MS } from "./tuning";

const WEAPON_ENTRIES = Object.entries(WEAPONS);

/** The weapons a pickup gives, every one but the gun. */
const PICKED_WEAPONS = WEAPON_ENTRIES.filter(([id]) => id !== "gun");

describe("WEAPONS", () => {
  it.each(WEAPON_ENTRIES)(
    "keeps %s's shots in flight to whole pulls, one at least",
    (_, weapon) => {
      expect([
        weapon.inFlight >= weapon.count,
        weapon.inFlight % weapon.count,
      ]).toEqual([true, 0]);
    },
  );

  it.each(WEAPON_ENTRIES)(
    "holds a shot's life of %s's pulls in flight, so held fire never waits on its most",
    (_, weapon) => {
      const pulls = Math.ceil(stepsIn(SHOT_LIFE_MS) / stepsIn(weapon.everyMs));

      expect(weapon.inFlight / weapon.count).toBeGreaterThanOrEqual(pulls);
    },
  );

  it.each(WEAPON_ENTRIES)(
    "fans %s's shots only if it fires several a pull",
    (_, weapon) => {
      expect(weapon.spreadDeg > 0).toBe(weapon.count > 1);
    },
  );

  // No pickup is bad, so nothing has to be dodged that looks like a reward.
  it.each(PICKED_WEAPONS)("makes %s no worse than the gun", (_, weapon) => {
    const { gun } = WEAPONS;

    expect({
      count: weapon.count >= gun.count,
      everyMs: weapon.everyMs <= gun.everyMs,
      pullsInFlight: weapon.inFlight / weapon.count >= gun.inFlight / gun.count,
      breaks: weapon.breaks >= gun.breaks,
    }).toEqual({
      count: true,
      everyMs: true,
      pullsInFlight: true,
      breaks: true,
    });
  });

  it.each(PICKED_WEAPONS)(
    "makes %s better than the gun in a way",
    (_, weapon) => {
      const { gun } = WEAPONS;

      expect([
        weapon.count > gun.count,
        weapon.everyMs < gun.everyMs,
        weapon.breaks > gun.breaks,
      ]).toContain(true);
    },
  );
});
