import { FIRST_SHIPS, MAX_SHIPS } from "../tuning";
import {
  type Crew,
  PILOT_COLORS,
  atControls,
  bailOut,
  bringHome,
  createCrew,
  given,
  nextPilot,
} from "./pilots";

/** Returns a crew of pilots flying and at home, the last color given 2 unless it says. */
function crewOf(
  flying: readonly number[],
  home: readonly number[] = [],
  lastGiven = 2,
): Crew {
  return { flying, home, lastGiven };
}

/** Returns a crew flying as many ships as a run has at most, the first colors in turn. */
function fullCrew(home: readonly number[] = []): Crew {
  return crewOf(
    Array.from({ length: MAX_SHIPS }, (_, color) => color),
    home,
  );
}

describe("createCrew", () => {
  it("flies a run's first ships with pilots in the first colors, in turn, no one at home", () => {
    const firsts = Array.from({ length: FIRST_SHIPS }, (_, color) => color);

    expect(createCrew()).toEqual({
      flying: firsts,
      home: [],
      lastGiven: FIRST_SHIPS - 1,
    });
  });
});

describe("atControls", () => {
  it("returns the pilot flying first", () => {
    expect(atControls(crewOf([4, 1, 6]))).toBe(4);
  });

  it("throws for a crew with no one flying", () => {
    expect(() => atControls(crewOf([]))).toThrow(RangeError);
  });
});

describe("nextPilot", () => {
  it.each([
    ["the next color in turn after the last given", crewOf([0, 1, 2]), null, 3],
    ["past a color the crew flies in", crewOf([3, 0], [], 2), null, 4],
    ["past a color worn at home", crewOf([0], [3], 2), null, 4],
    ["past the color of the stray adrift", crewOf([0]), 3, 4],
    ["past several worn in a row", crewOf([3, 4], [5], 2), 6, 7],
    ["round to the first after the last", crewOf([1], [], 7), null, 0],
    ["round past the first", crewOf([0, 7], [], 6), null, 1],
  ])("gives %s", (_, crew, adrift, color) => {
    expect(nextPilot(crew, adrift)).toBe(color);
  });

  it("gives the next in turn once every color is worn", () => {
    const crew = crewOf([0, 1, 2, 3, 4, 5], [6], 2);

    expect(nextPilot(crew, 7)).toBe(3);
  });

  it("gives every color in turn before one again, while none is worn", () => {
    let crew = crewOf([]);
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
    expect(given(crewOf([0, 1], [4]), 6)).toEqual(crewOf([0, 1], [4], 6));
  });
});

describe("bailOut", () => {
  it("hands the controls to the next in line", () => {
    expect(bailOut(crewOf([4, 1, 6], [2]))).toEqual(crewOf([1, 6], [2]));
  });

  it("leaves no one flying once the last pilot bails out", () => {
    expect(bailOut(crewOf([4])).flying).toEqual([]);
  });
});

describe("bringHome", () => {
  it("flies one more ship with a stray brought home, last in line", () => {
    expect(bringHome(crewOf([0, 1]), 3)).toEqual(crewOf([0, 1, 3]));
  });

  it("has a stray brought home with the most ships flying wait at home, behind those home before it", () => {
    expect(bringHome(fullCrew([7]), 6)).toEqual(fullCrew([7, 6]));
  });
});

describe("a stray brought home", () => {
  it("keeps its color at the controls", () => {
    let crew = crewOf([0, 1]);
    const stray = nextPilot(crew, null);
    crew = given(crew, stray);

    crew = bringHome(crew, stray);
    crew = bailOut(bailOut(crew));

    expect([stray, atControls(crew)]).toEqual([3, 3]);
  });
});
