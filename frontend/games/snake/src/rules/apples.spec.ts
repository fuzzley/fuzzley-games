import { runFrom } from "../testing/run_picture";
import { placeApple } from "./apples";

describe("placeApple", () => {
  const run = runFrom(["@<<.", "....", "....", "...."]);

  it("lays the apple on a square the snake doesn't cover", () => {
    const apples = Array.from({ length: 20 }, (_, eaten) =>
      placeApple(run.snake, 4, 9, eaten),
    );

    expect(
      apples.filter((apple) => !apple || (apple.y === 0 && apple.x < 3)),
    ).toEqual([]);
  });

  it("lays the same apple for the same seed and apples eaten", () => {
    expect(placeApple(run.snake, 4, 9, 3)).toEqual(
      placeApple(run.snake, 4, 9, 3),
    );
  });

  it("keeps where apples land, which saved runs rely on", () => {
    const apples = [0, 1, 2].map((eaten) => placeApple(run.snake, 4, 9, eaten));

    expect(apples).toEqual([
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 3 },
    ]);
  });

  it("lays apples in different places as the run goes on", () => {
    const apples = new Set(
      Array.from({ length: 20 }, (_, eaten) =>
        JSON.stringify(placeApple(run.snake, 4, 9, eaten)),
      ),
    );

    expect(apples.size).toBeGreaterThan(5);
  });

  it("lays the last free square", () => {
    const nearlyFull = runFrom(["v>v", ">^v", ".@<"]);

    expect(placeApple(nearlyFull.snake, 3, 1, 0)).toEqual({ x: 0, y: 2 });
  });

  it("lays no apple on a full board", () => {
    const full = runFrom(["v>v", ">^v", "@<<"]);

    expect(placeApple(full.snake, 3, 1, 0)).toBeNull();
  });
});
