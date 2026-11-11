import { eventsOf, near } from "../../testing/flights";
import { wallFrom } from "../../testing/wall_picture";
import { levelStart } from "../levels/level";
import { LEVELS, parseLevel } from "../levels/levels";
import { type RoundStart, playRound } from "../round/round";
import type { Shot } from "../shot";
import {
  AIMS_PER_DEGREE,
  AIM_COUNT,
  FIRST_AIM_DEGREES,
  GUIDE_DOT_GAP,
  GUIDE_PAST_TURN,
} from "../tuning";
import { positionAt } from "./events";
import { type GuidePlace, guideOf } from "./guide";

/** Returns an aim's index from its angle, in degrees counter-clockwise from the floor on the right. */
function aimAt(degrees: number): number {
  return (degrees - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE;
}

/** How far past the first turn the guides these specs work out by hand run, whatever `GUIDE_PAST_TURN` is tuned to. */
const PAST_TURN = 1.5;

/** Returns where a round starts on a field 11 deep, from a place on the floor, at a wall drawn as a picture whose lowest row stands in field row 3. */
function startAt(picture: readonly string[], x = 4.5): RoundStart {
  const wall = wallFrom(picture, { lowestRow: 3 });
  return { wall, depth: 11, x, crew: { friends: [] }, boon: null };
}

/**
 * Returns the dots a guide should show for a shot: where the player's
 * fuzzball is at each gap along the round's flight, to its first turn and
 * the guide's distance past it, or to where it lands.
 */
function dotsOfRound(start: RoundStart, shot: Shot): GuidePlace[] {
  const round = playRound(start, shot, "hot");
  const [track] = round.flight.tracks;
  const turnedAt = eventsOf(round, "turn").find(({ ball }) => ball === 0)!.at;
  const landedAt = track!.waypoints.at(-1)!.at;
  const end = Math.min(turnedAt + GUIDE_PAST_TURN, landedAt);
  return Array.from({ length: Math.floor(end / GUIDE_DOT_GAP) }, (_, i) => {
    const { x, y } = positionAt(track!, (i + 1) * GUIDE_DOT_GAP)!;
    return { x, y };
  });
}

/** Every level's opening wall at the shallowest depth and the deepest, each with four shots across the aims, at charges 0 to 3, the third a triple shot with two friends behind and the last a hot shot. */
const OPENINGS = LEVELS.flatMap(({ number, data }) =>
  [11, 22].flatMap((depth) =>
    ([0, 1, 2, 3] as const).map((charge) => {
      const start = levelStart(parseLevel(data), depth);
      const aim = Math.floor(((charge + 0.5) * AIM_COUNT) / 4);
      const boon = ([null, null, "triple", "hot"] as const)[charge];
      const crew = { friends: charge === 2 ? [0, 1] : [] };
      return [number, depth, aim, { ...start, boon, crew }, charge] as const;
    }),
  ),
);

describe("guideOf()", () => {
  it.each(OPENINGS)(
    "lays its dots along the round's flight at level %i's opening wall %i deep, aimed at %i, to the first turn and past it",
    (_, _depth, aim, start, charge) => {
      const shot = { aim, charge } as const;

      const { dots } = guideOf(start, shot, GUIDE_PAST_TURN);

      expect(dots).toEqual(near(dotsOfRound(start, shot)));
    },
  );

  // Straight up, it turns off the brick in field row 4 at 3.5, its dots a
  // half unit apart.
  it.each([
    [PAST_TURN, 10],
    [3, 13],
  ])(
    "runs on %s past the first turn, its last dot the %ith",
    (pastTurn, count) => {
      const start = startAt(["....o....", "....2...."]);

      const { dots } = guideOf(start, { aim: aimAt(90), charge: 2 }, pastTurn);

      expect(dots).toHaveLength(count);
    },
  );

  // Straight up, it turns off the brick in field row 4 at 3.5, and its
  // dots run on to 5.
  it("ends its dots past the first turn, heading the way the fuzzball turns", () => {
    const start = startAt(["....o....", "....2...."]);

    const { dots } = guideOf(start, { aim: aimAt(90), charge: 2 }, PAST_TURN);

    expect(dots.slice(-4)).toEqual(
      near([
        { x: 4.5, y: 3.75 },
        { x: 4.5, y: 3.25 },
        { x: 4.5, y: 2.75 },
        { x: 4.5, y: 2.25 },
      ]),
    );
  });

  it("outlines the bricks a charged shot punches through, and not the one it turns off", () => {
    const start = startAt(["....o....", "....2....", "....o...."]);

    const { punched } = guideOf(
      start,
      { aim: aimAt(90), charge: 3 },
      PAST_TURN,
    );

    expect(punched).toEqual([4, 13]);
  });

  it("outlines no brick a plain shot breaks, as it turns off each", () => {
    const start = startAt(["....o...."]);

    const { punched } = guideOf(
      start,
      { aim: aimAt(90), charge: 0 },
      PAST_TURN,
    );

    expect(punched).toEqual([]);
  });

  it("outlines every brick a hot shot breaks, whatever the charge chosen", () => {
    const start: RoundStart = {
      ...startAt(["....o....", "....2....", "....o...."]),
      boon: "hot",
    };

    const { punched } = guideOf(
      start,
      { aim: aimAt(90), charge: 0 },
      PAST_TURN,
    );

    expect(punched).toEqual([4, 13, 22]);
  });

  it("leaves what it is handed as it was", () => {
    const start = startAt(["....o....", "....2...."]);
    const shot = { aim: aimAt(90), charge: 2 } as const;
    const handed = structuredClone({ start, shot });

    guideOf(start, shot, PAST_TURN);

    expect({ start, shot }).toStrictEqual(handed);
  });

  // Turned off the steel at about 3.54, it yawns at 4 and drops straight
  // down until the guide ends at about 5.04.
  it("drops a fuzzball that yawns before the guide ends straight down", () => {
    const start = startAt(["....#...."], 2.25);

    const { dots } = guideOf(start, { aim: aimAt(45), charge: 0 }, PAST_TURN, {
      bored: 4,
    });

    const [before, last] = dots.slice(-2);
    expect([last!.x - before!.x, before!.y - last!.y]).toEqual(
      near([0, GUIDE_DOT_GAP]),
    );
  });
});
