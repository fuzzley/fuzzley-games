import { FLIGHT_RULES } from "../../rules/tuning";
import { FLIGHT_PACE } from "../play/pace";
import {
  TUNED_NUMBERS,
  type TunedNumber,
  type TunedNumbers,
  staleCertificates,
  tunedPace,
  tunedRules,
} from "./debug_tuning";

/** A tuning with every number away from the game's own. */
const TRIED: TunedNumbers = {
  normal: 15,
  normal10: 18,
  normal25: 21,
  normal45: 25,
  fast: 23,
  fast10: 27,
  fast25: 31,
  fast45: 37,
  dash: 2.5,
  fastForward: 6.5,
  guidePast: 0.8,
  bored: 120,
  firstBounce: 12,
  bounceStep: 6,
  hatchHolds: 2,
};

describe("TUNED_NUMBERS", () => {
  it("are the numbers the game ships: the pace, the guide's length, the boredom, the floor bounce ladder and the hatches", () => {
    expect(TUNED_NUMBERS).toEqual({
      normal: 14,
      normal10: 17,
      normal25: 20,
      normal45: 24,
      fast: 22,
      fast10: 26,
      fast25: 30,
      fast45: 36,
      dash: FLIGHT_PACE.dash,
      fastForward: FLIGHT_PACE.fastForward,
      guidePast: FLIGHT_RULES.guidePast,
      bored: FLIGHT_RULES.bored,
      firstBounce: FLIGHT_RULES.firstBounce,
      bounceStep: FLIGHT_RULES.bounceStep,
      hatchHolds: FLIGHT_RULES.hatchHolds,
    });
  });
});

describe("tunedPace", () => {
  it("is FLIGHT_PACE at the game's own numbers", () => {
    expect(tunedPace(TUNED_NUMBERS)).toEqual(FLIGHT_PACE);
  });

  it("gives each setting's speeds, the dash and fast-forward as tuned", () => {
    expect(tunedPace(TRIED)).toEqual({
      speeds: { normal: [15, 18, 21, 25], fast: [23, 27, 31, 37] },
      dash: 2.5,
      fastForward: 6.5,
    });
  });
});

describe("tunedRules", () => {
  it("is FLIGHT_RULES at the game's own numbers", () => {
    expect(tunedRules(TUNED_NUMBERS)).toEqual(FLIGHT_RULES);
  });

  it("gives the guide's length, the boredom, the floor bounce ladder and the hatches as tuned, and the rest as the game's own", () => {
    expect(tunedRules(TRIED)).toEqual({
      ...FLIGHT_RULES,
      guidePast: 0.8,
      bored: 120,
      firstBounce: 12,
      bounceStep: 6,
      hatchHolds: 2,
    });
  });
});

describe("staleCertificates", () => {
  it("leaves the certificates sound at the game's own numbers", () => {
    expect(staleCertificates(TUNED_NUMBERS)).toBe(false);
  });

  it.each<TunedNumber>(["bored", "firstBounce", "bounceStep", "hatchHolds"])(
    "leaves them stale once %s moves, as a round's flight reads it",
    (id) => {
      expect(staleCertificates({ ...TUNED_NUMBERS, [id]: TRIED[id] })).toBe(
        true,
      );
    },
  );

  it.each<TunedNumber>([
    "normal",
    "fast45",
    "dash",
    "fastForward",
    "guidePast",
  ])(
    "leaves them sound as %s moves, which only plays a round back or shows one",
    (id) => {
      expect(staleCertificates({ ...TUNED_NUMBERS, [id]: TRIED[id] })).toBe(
        false,
      );
    },
  );
});
