import { fieldFrom, pictureOf } from "../testing/field_picture";
import { PRESETS } from "./difficulty";
import {
  canClearAround,
  clearedShare,
  createField,
  isOver,
  layMines,
  minesLeft,
  neighbors,
  restart,
  reveal,
  revealedCount,
  toggleFlag,
} from "./field";

/** A field split by a wall of mines, so a reveal on one side stops at it. */
const WALLED = ["..*..", "..*..", "..*.."];

describe("createField", () => {
  it("starts every square hidden, before any mine is placed", () => {
    const field = createField({ rows: 3, cols: 4, mines: 2 }, 3, 7);

    expect(field.squares).toEqual(new Array(12).fill("hidden"));
    expect(field.layout).toBeNull();
    expect(field.outcome).toBe("ready");
    expect(field.livesLeft).toBe(3);
  });
});

describe("neighbors", () => {
  const size = { rows: 3, cols: 3, mines: 1 };

  it("finds three around a corner", () => {
    expect(neighbors(size, 0)).toEqual([1, 3, 4]);
  });

  it("finds five along an edge", () => {
    expect(neighbors(size, 1)).toEqual([0, 2, 3, 4, 5]);
  });

  it("finds eight in the middle", () => {
    expect(neighbors(size, 4)).toEqual([0, 1, 2, 3, 5, 6, 7, 8]);
  });
});

describe("layMines", () => {
  it("places as many mines as the field hides", () => {
    const layout = layMines(PRESETS.easy.size, 1, 40);

    expect(layout.mines.filter(Boolean)).toHaveLength(10);
  });

  it("keeps the first square and its neighbors clear, whatever the seed", () => {
    const size = PRESETS.hard.size;
    const clear = [40, ...neighbors(size, 40)];

    const mined = Array.from({ length: 50 }, (_, seed) =>
      layMines(size, seed, 40),
    ).filter((layout) => clear.some((i) => layout.mines[i]));

    expect(mined).toEqual([]);
  });

  it("lays the same mines for the same seed and first square", () => {
    expect(layMines(PRESETS.medium.size, 9, 3)).toEqual(
      layMines(PRESETS.medium.size, 9, 3),
    );
  });

  it("fills every square but the first's ground at the most mines", () => {
    const layout = layMines({ rows: 5, cols: 5, mines: 16 }, 4, 12);

    expect(
      pictureOf({
        ...createField({ rows: 5, cols: 5, mines: 16 }, 3, 4),
        layout,
      }),
    ).toEqual(["*****", "*...*", "*...*", "*...*", "*****"]);
  });
});

describe("reveal", () => {
  describe("the first reveal", () => {
    const first = () => reveal(createField(PRESETS.medium.size, 3, 1), 0);

    it("places the mines, clear of the square revealed", () => {
      const field = first();

      expect(field.layout?.mines.filter(Boolean)).toHaveLength(40);
      expect(field.layout?.mines[0]).toBe(false);
    });

    it("opens ground, since nothing around the square is a mine", () => {
      expect(revealedCount(first())).toBeGreaterThan(3);
    });

    it("starts the game", () => {
      expect(first().outcome).toBe("playing");
    });
  });

  it("opens a number alone", () => {
    const field = fieldFrom(WALLED);

    const after = reveal(field, 1);

    expect(pictureOf(after)).toEqual([".2*..", "..*..", "..*.."]);
  });

  it("opens the ground around a blank square, up to the numbers", () => {
    const field = fieldFrom(WALLED);

    const after = reveal(field, 0);

    expect(pictureOf(after)).toEqual(["_2*..", "_3*..", "_2*.."]);
  });

  it("floods a field of 900 squares without running out of stack", () => {
    const rows = Array.from({ length: 30 }, (_, row) =>
      row === 29 ? `${".".repeat(29)}*` : ".".repeat(30),
    );
    const field = fieldFrom(rows);

    const after = reveal(field, 0);

    expect(revealedCount(after)).toBe(899);
  });

  it("charges a life for a mine, and plays on", () => {
    const field = fieldFrom(WALLED);

    const after = reveal(field, 2);

    expect(pictureOf(after)).toEqual(["..x..", "..*..", "..*.."]);
    expect(after.livesLeft).toBe(2);
    expect(after.outcome).toBe("playing");
  });

  it("loses the game on the last life", () => {
    const field = fieldFrom(WALLED, { livesLeft: 1 });

    const after = reveal(field, 2);

    expect(after.livesLeft).toBe(0);
    expect(after.outcome).toBe("lost");
  });

  it("wins once every safe square is revealed, flagging the mines left", () => {
    const field = fieldFrom(["*1.", "11.", "..."]);

    const after = reveal(field, 8);

    expect(after.outcome).toBe("won");
    expect(pictureOf(after)).toEqual(["F1_", "11_", "___"]);
  });

  it("leaves a flagged square shut", () => {
    const field = fieldFrom(["f.*", "..*"]);

    expect(reveal(field, 0)).toBe(field);
  });

  it("leaves a mine already stepped on as it is", () => {
    const field = fieldFrom(["x.*", "..*"]);

    expect(reveal(field, 0)).toBe(field);
  });

  it("changes nothing once the game is over", () => {
    const field = fieldFrom(WALLED, { outcome: "lost", livesLeft: 0 });

    expect(reveal(field, 0)).toBe(field);
  });

  it("changes nothing for a square off the field", () => {
    const field = fieldFrom(WALLED);

    expect(reveal(field, 99)).toBe(field);
  });

  describe("on a number", () => {
    it("opens the squares around it once its flags match it", () => {
      const field = fieldFrom(["F1.*.", "11.*.", "...*."]);

      const after = reveal(field, 6);

      expect(pictureOf(after)).toEqual(["F12*.", "113*.", "__2*."]);
    });

    it("counts a mine stepped on as found", () => {
      const field = fieldFrom(["x1.*.", "11.*.", "...*."]);

      const after = reveal(field, 6);

      expect(pictureOf(after)).toEqual(["x12*.", "113*.", "__2*."]);
    });

    it("steps on the mine a wrong flag left, and charges a life", () => {
      const field = fieldFrom(["*1.*.", "f1.*.", "...*."]);

      const after = reveal(field, 6);

      expect(pictureOf(after)).toEqual(["x12*.", "f13*.", "__2*."]);
      expect(after.livesLeft).toBe(2);
    });

    it("does nothing while its flags fall short of it", () => {
      const field = fieldFrom(["*1.*.", ".1.*.", "...*."]);

      expect(reveal(field, 6)).toBe(field);
    });
  });
});

describe("canClearAround", () => {
  it("is true for a number whose flags match it, with squares to open", () => {
    expect(canClearAround(fieldFrom(["F1.*.", "11.*.", "...*."]), 6)).toBe(
      true,
    );
  });

  it("is false for a number short of flags", () => {
    expect(canClearAround(fieldFrom(["*1.*.", ".1.*.", "...*."]), 6)).toBe(
      false,
    );
  });

  it("is false for a number with nothing left around it", () => {
    expect(canClearAround(fieldFrom(["F1_", "11_", "___"]), 1)).toBe(false);
  });

  it("is false for a hidden square", () => {
    expect(canClearAround(fieldFrom(WALLED), 0)).toBe(false);
  });

  it("is false before the mines are placed", () => {
    expect(canClearAround(createField(PRESETS.easy.size, 3, 1), 0)).toBe(false);
  });
});

describe("toggleFlag", () => {
  it("flags a hidden square", () => {
    const after = toggleFlag(fieldFrom(WALLED), 2);

    expect(pictureOf(after)[0]).toBe("..F..");
  });

  it("takes a flag off", () => {
    const after = toggleFlag(fieldFrom(["..F..", "..*..", "..*.."]), 2);

    expect(pictureOf(after)[0]).toBe("..*..");
  });

  it("flags before the mines are placed", () => {
    const after = toggleFlag(createField(PRESETS.easy.size, 3, 1), 4);

    expect(after.squares[4]).toBe("flagged");
  });

  it("leaves a revealed square as it is", () => {
    const field = fieldFrom(["_2*..", "_3*..", "_2*.."]);

    expect(toggleFlag(field, 0)).toBe(field);
  });

  it("changes nothing once the game is over", () => {
    const field = fieldFrom(["F1_", "11_", "___"]);

    expect(toggleFlag(field, 0)).toBe(field);
  });
});

describe("restart", () => {
  it("hides every square again and gives back the lives, with the same mines", () => {
    const played = fieldFrom(["x12*.", "f13*.", "__2*."]);

    const field = restart(played);

    expect(pictureOf(field)).toEqual(["*..*.", "...*.", "...*."]);
    expect(field.livesLeft).toBe(3);
    expect(field.outcome).toBe("ready");
  });

  it("keeps the mines where they were on the next reveal", () => {
    const field = restart(fieldFrom(WALLED));

    const after = reveal(field, 0);

    expect(pictureOf(after)).toEqual(["_2*..", "_3*..", "_2*.."]);
  });
});

describe("the field's figures", () => {
  it("counts the mines left as the mines less the flags and the mines stepped on", () => {
    expect(minesLeft(fieldFrom(["F*x*", "f..."]))).toBe(1);
  });

  it("measures the share of the safe ground revealed", () => {
    expect(clearedShare(fieldFrom(["_2*..", "_3*..", "_2*.."]))).toBe(0.5);
  });

  it("calls a won or lost game over", () => {
    expect(isOver(fieldFrom(["F1_", "11_", "___"]))).toBe(true);
    expect(isOver(fieldFrom(WALLED, { livesLeft: 0 }))).toBe(true);
  });

  it("calls a game in play not over", () => {
    expect(isOver(fieldFrom(WALLED))).toBe(false);
  });
});
