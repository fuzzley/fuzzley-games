import { DESIGN_SETS, designSet } from "../../testing/design_files";
import { layOut } from "../board/picture";
import bedtime from "./bedtime.json";
import bricksAndBars from "./bricks-and-bars.json";
import { type Level, levelSetOf } from "./level";
import { arrivalProblem, levelProblem } from "./level_rules";
import { LEVELS, LEVEL_BRICK_LAYERS, LEVEL_SETS } from "./levels";
import warmUp from "./warm-up.json";
import windyDays from "./windy-days.json";

/** Each set's file as the game keeps it, by the name of the design's file it copies. */
const COPIES: Readonly<Record<(typeof DESIGN_SETS)[number], unknown>> = {
  "warm-up": warmUp,
  "bricks-and-bars": bricksAndBars,
  bedtime,
  "windy-days": windyDays,
};

/** Every level of the four sets, in the order they are played. */
const EVERY_LEVEL: readonly Level[] = DESIGN_SETS.flatMap(
  (set) => levelSetOf(COPIES[set]).levels,
);

describe("the levels", () => {
  it("are the design's four sets, in the order they are played", () => {
    expect(LEVEL_SETS.map(({ id }) => id)).toEqual([
      "warm-up",
      "bricks-and-bars",
      "bedtime",
      "windy-days",
    ]);
  });

  it("number Warm-up's levels 1 to 9, Bricks and bars' 10 to 18, Bedtime's 19 to 27 and Windy days' 28 to 36, each by its id, as the design's appendix does", () => {
    expect(
      LEVELS.map(({ number, data }) => [number, data.id, data.name]),
    ).toEqual([
      [1, "1", "Three's company"],
      [2, "2", "Four across"],
      [3, "3", "Square deal"],
      [4, "4", "Round the bend"],
      [5, "5", "High five"],
      [6, "6", "Better together"],
      [7, "7", "Mind the gap"],
      [8, "8", "Dust-up"],
      [9, "9", "Spring cleaning"],
      [10, "10", "Brick by brick"],
      [11, "11", "Tough crowd"],
      [12, "12", "Swept under"],
      [13, "13", "Jailbreak"],
      [14, "14", "Six of one"],
      [15, "15", "The vault"],
      [16, "16", "Checkerboard"],
      [17, "17", "Tight corners"],
      [18, "18", "Clean sweep"],
      [19, "19", "Lights out"],
      [20, "20", "Bunk beds"],
      [21, "21", "Sleepwalk"],
      [22, "22", "Burr patch"],
      [23, "23", "Sticky situation"],
      [24, "24", "Nap in the thistles"],
      [25, "25", "Dust bunnies"],
      [26, "26", "Long way down"],
      [27, "27", "Pillow fort"],
      [28, "28", "Crosswind"],
      [29, "29", "Updraft"],
      [30, "30", "Weather vane"],
      [31, "31", "Leaf pile"],
      [32, "32", "Kite weather"],
      [33, "33", "Gale"],
      [34, "34", "Burrs on the breeze"],
      [35, "35", "Eye of the storm"],
      [36, "36", "The big bunch"],
    ]);
  });

  it.each(DESIGN_SETS)("keep the set %s as the design's file has it", (set) => {
    expect(COPIES[set]).toEqual(designSet(set));
  });
});

describe("every level of the four sets", () => {
  it("is numbered 1 to 36 in the order the sets are played", () => {
    expect(EVERY_LEVEL.map(({ id }) => id)).toEqual(
      Array.from({ length: 36 }, (_, place) => String(place + 1)),
    );
  });

  it.each(EVERY_LEVEL)(
    "keeps the rules a level keeps: level $id, $name",
    (level) => {
      expect(levelProblem(level)).toBeNull();
    },
  );

  it("brings each new thing in alone, in the order the levels are played", () => {
    expect(arrivalProblem(EVERY_LEVEL)).toBeNull();
  });

  it("lays bricks of as many layers as How to play says, each count on some board", () => {
    const layers = new Set(
      EVERY_LEVEL.flatMap(({ board, dust }) =>
        layOut(board, dust).placed.flatMap((square) =>
          square.what === "brick" ? [square.layers] : [],
        ),
      ),
    );

    expect([...layers].sort((a, b) => a - b)).toEqual(LEVEL_BRICK_LAYERS);
  });
});
