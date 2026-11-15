import { FIRST_CREW, MOST_CREW } from "../tuning";
import {
  type Crew,
  type Pilot,
  PILOT_COLORS,
  aboard,
  atControls,
  bailOut,
  bringHome,
  createCrew,
  given,
  nextPilot,
  pilotsAboard,
} from "./pilots";

/**
 * Returns a crew of a pilot at the controls or none, those in tow and those
 * at home, the last color given 2 unless it says.
 */
function crewOf(
  pilot: Pilot | null,
  tow: readonly Pilot[] = [],
  home: readonly Pilot[] = [],
  lastGiven = 2,
): Crew {
  return { pilot, tow, home, lastGiven };
}

/** Returns a crew of the most aboard, the first colors in turn from the controls back. */
function fullCrew(home: readonly Pilot[] = []): Crew {
  const tow = Array.from({ length: MOST_CREW - 1 }, (_, place) => place + 1);
  return crewOf(0, tow, home);
}

describe("createCrew", () => {
  it("starts a run with a pilot at the controls and the rest of its first crew in tow, in the first colors, no one at home", () => {
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
    ["the next color in turn after the last given", crewOf(0, [1, 2]), null, 3],
    ["past the color at the controls", crewOf(3), null, 4],
    ["past a color in tow", crewOf(0, [3]), null, 4],
    ["past a color worn at home", crewOf(0, [], [3]), null, 4],
    ["past the color of the stray adrift", crewOf(0), 3, 4],
    ["past several worn in a row", crewOf(3, [4], [5]), 6, 7],
    ["round to the first after the last", crewOf(1, [], [], 7), null, 0],
    ["round past the first", crewOf(0, [7], [], 6), null, 1],
  ])("gives %s", (_, crew, adrift, color) => {
    expect(nextPilot(crew, adrift)).toBe(color);
  });

  it("gives the next in turn once every color is worn", () => {
    const crew = crewOf(0, [1, 2, 3, 4, 5], [6]);

    expect(nextPilot(crew, 7)).toBe(3);
  });

  it("gives every color in turn before one again, while none is worn", () => {
    let crew = crewOf(null);
    const colors: number[] = [];

    for (let turn = 0; turn < PILOT_COLORS + 1; turn++) {
      const color = nextPilot(crew, null);
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

describe("bailOut", () => {
  it("hands the controls to the first in tow", () => {
    expect(bailOut(crewOf(4, [1, 6], [2]))).toEqual(crewOf(1, [6], [2]));
  });

  it("leaves no one at the controls once the last pilot bails out", () => {
    expect(bailOut(crewOf(4))).toEqual(crewOf(null));
  });
});

describe("bringHome", () => {
  it("takes a stray brought home in tow, last in line", () => {
    expect(bringHome(crewOf(0, [1]), 3)).toEqual(crewOf(0, [1, 3]));
  });

  it("has a stray brought home with the most of the crew aboard wait at home, behind those home before it", () => {
    expect(bringHome(fullCrew([7]), 6)).toEqual(fullCrew([7, 6]));
  });

  it("throws for a crew with no one at the controls, whose run is over", () => {
    expect(() => bringHome(crewOf(null), 3)).toThrow(RangeError);
  });
});

describe("a stray brought home", () => {
  it("keeps its color at the controls", () => {
    let crew = crewOf(0, [1]);
    const stray = nextPilot(crew, null);
    crew = given(crew, stray);

    crew = bringHome(crew, stray);
    crew = bailOut(bailOut(crew));

    expect([stray, atControls(crew)]).toEqual([3, 3]);
  });
});
