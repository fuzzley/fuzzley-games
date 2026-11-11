import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import { eventsOf, near } from "../../testing/flights";
import { PRISM, STAND_IN_RULES } from "../../testing/stand_ins";
import { wallFrom } from "../../testing/wall_picture";
import { TRAIT_RULES } from "../bricks/trait_rules";
import { BRICK_KINDS } from "../catalog/bricks";
import { levelStart } from "../levels/level";
import { LEVELS, parseLevel } from "../levels/levels";
import { BORED, COLUMNS, SIDE_MARGIN, TRIPLE_MATES } from "../tuning";
import {
  RULES,
  type RoundStart,
  flightRulesOf,
  flightStartOf,
  playRound,
  playRoundBy,
} from "./round";

/** Returns where a round starts on a field 11 deep, its fuzzball waiting at the floor's middle, at a wall drawn as a picture whose lowest row stands in a field row, 3 unless given. */
function startAt(picture: readonly string[], lowestRow = 3): RoundStart {
  const wall = wallFrom(picture, { lowestRow });
  return { wall, depth: 11, x: 4.5, crew: { friends: [] }, boon: null };
}

/** The aim straight up. */
const UP = 328;

describe("RULES", () => {
  it("bores a fuzzball at the tuning's distance", () => {
    expect(RULES.bored).toBe(BORED);
  });
});

describe("playRound()", () => {
  it.each(Object.entries(FLIGHT_FIXTURES))(
    "plays %s's round as it was worked out",
    (_, { start, shot, levelBoon, round }) => {
      const played = playRound(start, shot, levelBoon);

      expect(played).toEqual(near(round));
    },
  );

  it.each(LEVELS.map(({ number, data }) => [number, data] as const))(
    "plays the same round twice for the same shot at level %i's opening wall",
    (_, data) => {
      const start = levelStart(parseLevel(data), 16);

      const first = playRound(start, { aim: 200, charge: 3 }, "hot");
      const second = playRound(start, { aim: 200, charge: 3 }, "hot");

      expect(second).toStrictEqual(first);
    },
  );

  it("leaves what it is handed as it was", () => {
    const { start, shot, levelBoon } = FLIGHT_FIXTURES.zap;
    const handed = structuredClone({ start, shot, levelBoon });

    playRound(start, shot, levelBoon);

    expect({ start, shot, levelBoon }).toStrictEqual(handed);
  });

  // Aim 131 lands the fuzzball 0.27 from the left wall, aim 243 0.28 from
  // the right.
  it.each([
    [131, SIDE_MARGIN],
    [243, COLUMNS - SIDE_MARGIN],
  ])(
    "starts the next round from aim %i's landing, held half a unit off the side wall",
    (aim, x) => {
      const start = startAt(["ooooooooo", "ooooooooo"], 6);

      const round = playRound(start, { aim, charge: 0 }, "hot");

      expect(round.next.x).toBe(x);
    },
  );

  // A plain fuzzball straight up wears the moss of 2 to 1, and the next
  // round starts with it grown back as the wall stepped down.
  it("grows the moss its flight wore back a hit in the next round's start", () => {
    const start = startAt(["....M...."]);

    const round = playRound(start, { aim: UP, charge: 0 }, "hot");

    expect([
      eventsOf(round, "strike").map(({ left }) => left),
      round.next.wall.bricks[4]?.hits,
    ]).toEqual([[1], 2]);
  });

  // The cage stands over two others, out of the fuzzball's way, so it holds
  // the friend in ink 2, and a fuzzball of charge 2 breaks it at a strike.
  it("adds the friend a cage frees to the crew, after those it had", () => {
    const start = {
      ...startAt(["....C....", "C.C......"]),
      crew: { friends: [3] },
    };

    const round = playRound(start, { aim: UP, charge: 2 }, "hot");

    expect([round.outcome.freed, round.next.crew]).toEqual([
      1,
      { friends: [3, 2] },
    ]);
  });

  it("flies by the bored distance it is handed", () => {
    const start = startAt(["ooooooooo"]);

    const round = playRound(start, { aim: UP, charge: 0 }, "hot", {
      bored: 1,
    });

    expect(eventsOf(round, "yawn").map(({ at }) => at)).toEqual([1]);
  });
});

describe("playRoundBy()", () => {
  it("flies by the kinds it is handed", () => {
    const start = startAt(["....o...."]);
    const rules = {
      bored: BORED,
      kinds: { ...BRICK_KINDS, brick: PRISM },
      traits: STAND_IN_RULES,
    };

    const round = playRoundBy(start, { aim: UP, charge: 0 }, "hot", rules);

    expect(eventsOf(round, "split").map(({ cell }) => cell)).toEqual([4]);
  });
});

describe("flightRulesOf()", () => {
  it("flies by the catalog's kinds and the bricks' own rules, at the bored distance handed", () => {
    const rules = flightRulesOf({ bored: 7 });

    expect(rules).toEqual({
      bored: 7,
      kinds: BRICK_KINDS,
      traits: TRAIT_RULES,
    });
  });
});

describe("flightStartOf()", () => {
  it("sends a triple shot's mates and the crew behind the player's fuzzball", () => {
    const start: RoundStart = {
      ...startAt(["ooooooooo"]),
      crew: { friends: [2, 5] },
      boon: "triple",
    };

    const leaving = flightStartOf(start, { aim: UP, charge: 4 });

    expect(leaving).toEqual({
      wall: start.wall,
      depth: 11,
      x: 4.5,
      aim: UP,
      charge: 4,
      hot: false,
      mates: TRIPLE_MATES,
      friends: 2,
    });
  });

  it("makes a hot shot of a start whose boon is one", () => {
    const start: RoundStart = { ...startAt(["ooooooooo"]), boon: "hot" };

    const leaving = flightStartOf(start, { aim: UP, charge: 0 });

    expect([leaving.hot, leaving.mates]).toEqual([true, 0]);
  });
});
