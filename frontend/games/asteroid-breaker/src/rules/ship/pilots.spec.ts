import { FIRST_CREW } from "../tuning";
import {
  type Crew,
  type Pilot,
  PILOT_COLORS,
  aboard,
  atControls,
  bailOut,
  createCrew,
  given,
  goHome,
  joinTow,
  knockLoose,
  nextPilot,
  pilotsAboard,
} from "./pilots";

/**
 * Returns a crew of a pilot at the controls or none, those in tow and those
 * gone home, the last color given 2 unless it says.
 */
function crewOf(
  pilot: Pilot | null,
  tow: readonly Pilot[] = [],
  home: readonly Pilot[] = [],
  lastGiven = 2,
): Crew {
  return { pilot, tow, home, lastGiven };
}

describe("createCrew", () => {
  it("starts a run with a pilot at the controls and the rest of its first crew in tow, in the first colors, no one gone home", () => {
    const behind = Array.from({ length: FIRST_CREW - 1 }, (_, at) => at + 1);

    expect(createCrew()).toEqual({
      pilot: 0,
      tow: behind,
      home: [],
      lastGiven: FIRST_CREW - 1,
    });
  });
});

describe("atControls", () => {
  it("returns the pilot at the controls", () => {
    expect(atControls(crewOf(4, [1, 6]))).toBe(4);
  });

  it("throws for a crew with no one at the controls", () => {
    expect(() => atControls(crewOf(null))).toThrow(RangeError);
  });
});

describe("aboard", () => {
  it.each([
    ["the pilot and those in tow", crewOf(4, [1, 6], [2]), 3],
    ["the pilot alone, with no one in tow", crewOf(4), 1],
    ["no one, once no one is at the controls", crewOf(null, [], [2]), 0],
  ])("counts %s", (_, crew, count) => {
    expect(aboard(crew)).toBe(count);
  });
});

describe("pilotsAboard", () => {
  it.each([
    [
      "the pilot first, then those in tow in order",
      crewOf(4, [1, 6], [2]),
      [4, 1, 6],
    ],
    ["the pilot alone, with no one in tow", crewOf(4), [4]],
    ["no one, once no one is at the controls", crewOf(null, [], [2]), []],
  ])("lists %s", (_, crew, pilots) => {
    expect(pilotsAboard(crew)).toEqual(pilots);
  });
});

describe("nextPilot", () => {
  it.each([
    ["the next color in turn after the last given", crewOf(0, [1, 2]), [], 3],
    ["past the color at the controls", crewOf(3), [], 4],
    ["past a color in tow", crewOf(0, [3]), [], 4],
    ["past a color on the field", crewOf(0), [3], 4],
    ["past several worn in a row", crewOf(3, [4]), [6, 5], 7],
    ["the color of one gone home, out of the run", crewOf(0, [], [3]), [], 3],
    ["round to the first after the last", crewOf(1, [], [], 7), [], 0],
    ["round past the first", crewOf(0, [7], [], 6), [], 1],
  ])("gives %s", (_, crew, onField, color) => {
    expect(nextPilot(crew, onField)).toBe(color);
  });

  it("gives the next in turn once every color is worn", () => {
    const crew = crewOf(0, [1, 2, 3, 4, 5]);

    expect(nextPilot(crew, [6, 7])).toBe(3);
  });

  it("gives every color in turn before one again, while none is worn", () => {
    let crew = crewOf(null);
    const colors: number[] = [];

    for (let turn = 0; turn < PILOT_COLORS + 1; turn++) {
      const color = nextPilot(crew, []);
      colors.push(color);
      crew = given(crew, color);
    }

    expect(colors).toEqual([3, 4, 5, 6, 7, 0, 1, 2, 3]);
  });
});

describe("given", () => {
  it("counts a color as the last given, keeping the crew", () => {
    expect(given(crewOf(0, [1], [4]), 6)).toEqual(crewOf(0, [1], [4], 6));
  });
});

describe("joinTow", () => {
  it("puts a pilot at the line in tow's end", () => {
    expect(joinTow(crewOf(0, [1], [5]), 3)).toEqual(crewOf(0, [1, 3], [5]));
  });

  it("puts a pilot in tow of a crew with no one in tow", () => {
    expect(joinTow(crewOf(0), 3)).toEqual(crewOf(0, [3]));
  });

  it("throws for a crew with no one at the controls, whose run is over", () => {
    expect(() => joinTow(crewOf(null), 3)).toThrow(RangeError);
  });
});

describe("knockLoose", () => {
  it("drops the last in tow out of the line", () => {
    expect(knockLoose(crewOf(0, [1, 6], [2]))).toEqual(crewOf(0, [1], [2]));
  });

  it("leaves a crew with no one in tow as it is", () => {
    const crew = crewOf(4);

    expect(knockLoose(crew)).toBe(crew);
  });
});

describe("goHome", () => {
  it("sends a fuzzball home, behind those home before it", () => {
    expect(goHome(crewOf(0, [1], [7]), 6)).toEqual(crewOf(0, [1], [7, 6]));
  });
});

describe("bailOut", () => {
  it("sends the pilot at the controls home, leaving no one aboard", () => {
    expect(bailOut(crewOf(4, [], [2]))).toEqual(crewOf(null, [], [2, 4]));
  });

  it("throws for a crew with no one at the controls, whose run is over already", () => {
    expect(() => bailOut(crewOf(null))).toThrow(RangeError);
  });

  it("throws for a crew with someone in tow, whom a hit knocks loose instead", () => {
    expect(() => bailOut(crewOf(4, [1]))).toThrow(RangeError);
  });
});

describe("a stray caught", () => {
  it("rides in tow in its color, behind those caught before it", () => {
    let crew = crewOf(0, [1]);
    const stray = nextPilot(crew, []);
    crew = given(crew, stray);

    crew = joinTow(crew, stray);

    expect(pilotsAboard(crew)).toEqual([0, 1, 3]);
  });
});
