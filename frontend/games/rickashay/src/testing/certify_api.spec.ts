import type { Aim } from "@fz/brick-wall/rules/aims";
import { DEPTHS } from "@fz/brick-wall/rules/field";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { parFrom } from "@fz/brick-wall/rules/par";
import {
  FLOOR_SEEDS,
  SEED_STRIDE,
  floorGames,
} from "@fz/brick-wall/testing/holders";
import {
  lineHolds,
  replayLine,
  solveLine,
} from "@fz/brick-wall/testing/solver";
import { WALL_LEGEND } from "../rules/levels/legend";
import { LEVELS } from "../rules/levels/levels";
import { FLIGHT_RULES, PAR_SHARE } from "../rules/tuning";
import { CERTIFY_API, MARK_GAMES, certifiedOn, markGames } from "./certify_api";
import { type RoundPlay, levelPlayOf, linePlayOf } from "./line_play";
import { rallyMarkFrom } from "./rally_mark";

/** A level of a row of plain bricks on a field 11 deep, which the solver clears greedily in 3 rounds. */
const A_ROW = linePlayOf(wallFrom(["ooooooooo"], WALL_LEGEND), 11);

/** A level of a plain brick, flown by rules under which a fuzzball yawns a unit out, so no line clears it. */
const UNREACHED = linePlayOf(wallFrom(["o........"], WALL_LEGEND), 11, {
  ...FLIGHT_RULES,
  bored: 1,
});

/** Games of {@link A_ROW} as their lines alone, whose best rallies are 1, 3, 4 and 5. */
const GAMES: readonly { line: readonly Aim[] }[] = [
  { line: [0, 0] },
  { line: [0, 206] },
  { line: [0, 230] },
  { line: [0, 210] },
];

/** Returns a play that plays a start and an aim as the one handed in does the first time, and loses the level each time after. */
function forgetful(play: RoundPlay): RoundPlay {
  const played = new Set<string>();
  return {
    ...play,
    play: (start, aim) => {
      const round = play.play(start, aim);
      const key = `${play.keyOf(start)}@${String(aim)}`;
      if (!played.has(key)) {
        played.add(key);
        return round;
      }
      return { ...round, outcome: { ...round.outcome, result: "lost" } };
    },
  };
}

describe("MARK_GAMES", () => {
  it("plays as many games as a floor, from seeds as far apart as the floors'", () => {
    expect(MARK_GAMES).toEqual({
      count: FLOOR_SEEDS,
      seedStride: SEED_STRIDE,
    });
  });
});

describe("markGames", () => {
  it("plays a level's floor games, from the seeds the holders play them from", () => {
    const [entry] = LEVELS;

    const games = markGames(levelPlayOf(entry!, 13), entry!.number);

    expect(games).toEqual(floorGames(levelPlayOf, entry!, 13));
  });
});

describe("certifiedOn", () => {
  it("gives the solver's line and search, and the rally mark the games set with the line that reaches it", () => {
    const certified = certifiedOn(A_ROW, () => GAMES);

    expect(certified).toEqual({
      line: [0, 212, 24],
      search: { aimStep: 4, beam: 1 },
      rally: rallyMarkFrom(A_ROW, GAMES),
    });
  });

  it("gives a line that holds as a certificate, and a mark one of the games reached", () => {
    const { line, rally } = certifiedOn(A_ROW, () => GAMES)!;

    expect({
      holds: lineHolds(line, replayLine(A_ROW, line)),
      mark: rally.mark,
    }).toEqual({ holds: true, mark: 4 });
  });

  it("gives none where the solver finds no line, and plays no game", () => {
    let asked = false;

    const certified = certifiedOn(UNREACHED, () => {
      asked = true;
      return GAMES;
    });

    expect({ certified, asked }).toEqual({ certified: null, asked: false });
  });

  it("throws where the solver's line doesn't hold on its replay", () => {
    expect(() => certifiedOn(forgetful(A_ROW), () => GAMES)).toThrow(
      "The solver's line, [0,212,24], doesn't hold on its replay.",
    );
  });
});

describe("CERTIFY_API", () => {
  it("certifies the game's levels on every depth", () => {
    expect([CERTIFY_API.levels, CERTIFY_API.depths]).toEqual([LEVELS, DEPTHS]);
  });

  it("certifies a level by its number through the game's play, its rally mark set by its floor games", () => {
    const [entry] = LEVELS;
    const play = levelPlayOf(entry!, 22);
    const { line, search } = solveLine(play)!;

    const certified = CERTIFY_API.solve(1, 22);

    expect(certified).toStrictEqual({
      line,
      search,
      rally: rallyMarkFrom(play, floorGames(levelPlayOf, entry!, 22)),
    });
  });

  it("sets par at PAR_SHARE of a line's rounds, rounded up", () => {
    expect(CERTIFY_API.parFrom(5)).toBe(parFrom(5, PAR_SHARE));
  });
});
