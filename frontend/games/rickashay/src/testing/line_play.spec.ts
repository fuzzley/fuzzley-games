import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { playCarelessly } from "@fz/brick-wall/testing/careless";
import { replayLine, solveLine } from "@fz/brick-wall/testing/solver";
import { WALL_RULES } from "../rules/bricks/wall_rules";
import type { RoundStart } from "../rules/flight/events";
import { WALL_LEGEND } from "../rules/levels/legend";
import { LEVELS, type Level, parseLevel } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import { levelStart } from "../rules/run/run";
import { FLIGHT_RULES } from "../rules/tuning";
import { levelPlayOf, linePlayOf } from "./line_play";
import { STAND_INS } from "./stand_ins";
import { wallScore } from "./wall_score";

/** Returns a level of a wall drawn as a picture. */
function levelFrom(picture: readonly string[]): Level {
  return wallFrom(picture, WALL_LEGEND);
}

/** A level of one plain brick, which opens on row 5 of a field 11 deep, under the jump line. */
const ONE_BRICK = levelFrom(["o........"]);

/** A level of a spring brick, whose break earns a floor bounce by the stand-ins' rules. */
const ONE_SPRING = levelFrom(["S........"]);

/** A level of a row of plain bricks. */
const A_ROW = levelFrom(["ooooooooo"]);

/** The aim at 45°. */
const AT_45 = 148;

/** An aim that breaks {@link ONE_SPRING}'s brick. */
const BREAKS_THE_SPRING = 4;

describe("linePlayOf", () => {
  it("gives every aim one shot, its index alone, in the order of the aims", () => {
    const { shots } = linePlayOf(ONE_BRICK, 11);

    expect({
      aims: shots.length,
      first: shots[0],
      fourth: shots[4],
      last: shots.at(-1),
    }).toEqual({ aims: 657, first: [0], fourth: [4], last: [656] });
  });

  it("opens where the level's first round starts on the field's depth", () => {
    expect(linePlayOf(A_ROW, 16).opening).toEqual(levelStart(A_ROW, 16));
  });

  it("plays a round as playRound() plays a shot at the aim", () => {
    const play = linePlayOf(A_ROW, 11);

    const round = play.play(play.opening, AT_45);

    expect(round).toStrictEqual(
      playRound(play.opening, { aim: AT_45 }, FLIGHT_RULES),
    );
  });

  it("plays through the rules it is handed", () => {
    const short = { ...FLIGHT_RULES, bored: 6 };
    const play = linePlayOf(A_ROW, 11, short);

    const { flight } = play.play(play.opening, AT_45);

    expect(flight.events.some(({ kind }) => kind === "bored")).toBe(true);
  });

  it("plays through the trait rules it is handed", () => {
    const noSprings = { ...STAND_INS, springs: {} };
    const without = linePlayOf(ONE_SPRING, 11, FLIGHT_RULES, noSprings);
    const standIns = linePlayOf(ONE_SPRING, 11, FLIGHT_RULES, STAND_INS);

    expect([
      without.play(without.opening, BREAKS_THE_SPRING).outcome,
      standIns.play(standIns.opening, BREAKS_THE_SPRING).outcome,
    ]).toMatchObject([
      { broken: 1, earned: 0 },
      { broken: 1, earned: 1 },
    ]);
  });

  it("measures a round by wallScore() and needs broken what the wall's rules do", () => {
    const { score, wallRules } = linePlayOf(ONE_BRICK, 11);

    expect([score, wallRules]).toEqual([wallScore, WALL_RULES]);
  });

  it("throws a RangeError for an aim that isn't one of the 657", () => {
    const play = linePlayOf(ONE_BRICK, 11);

    expect(() => play.play(play.opening, 657)).toThrow(RangeError);
  });
});

describe("linePlayOf's keys", () => {
  const play = linePlayOf(A_ROW, 11);
  const { opening } = play;
  const worn: RoundStart = {
    ...opening,
    wall: {
      ...opening.wall,
      bricks: opening.wall.bricks.map((brick, cell) =>
        cell === 0 ? null : brick,
      ),
    },
  };

  it("tells apart starts whose walls, heights, fuzzballs or shots differ", () => {
    const keys = [
      opening,
      worn,
      { ...opening, wall: { ...opening.wall, lowestRow: 4 } },
      { ...opening, x: 2 },
      { ...opening, hot: true },
    ].map(play.keyOf);

    expect(new Set(keys).size).toBe(5);
  });

  it("keys alike two starts that play alike", () => {
    expect(play.keyOf(structuredClone(worn))).toBe(play.keyOf(worn));
  });
});

describe("levelPlayOf", () => {
  it("plays one of the game's levels as it is laid out", () => {
    const [entry] = LEVELS;

    const { opening } = levelPlayOf(entry!, 13);

    expect(opening).toEqual(levelStart(parseLevel(entry!.data), 13));
  });
});

describe("the library's players over the game's play", () => {
  it("finds a line greedily of every fourth aim's indices alone", () => {
    expect(solveLine(linePlayOf(A_ROW, 11))).toEqual({
      line: [0, 212, 24],
      jumps: 0,
      search: { aimStep: 4, beam: 1 },
    });
  });

  it("finds a line its replay clears in as many rounds", () => {
    const play = linePlayOf(A_ROW, 11);
    const { line } = solveLine(play)!;

    expect(replayLine(play, line)).toMatchObject({
      cleared: true,
      rounds: line.length,
    });
  });

  it("plays carelessly the aims its seed draws from every aim", () => {
    // A change to the flight or the tuning may change this game: then take
    // the one it plays, if its aims still aren't all every fourth.
    expect(playCarelessly(linePlayOf(A_ROW, 11), 1)).toMatchObject({
      cleared: true,
      rounds: 3,
      line: [411, 259, 298],
    });
  });
});
