import { gameFrom } from "../../testing/board_picture";
import { NO_PART } from "../../testing/made_up_rules";
import { Striking, type Struck } from "./striking";

/** Returns where a hit on a square by the wave's first blast, at its second step, came from. */
function byFirstBlast(square: number): Struck {
  return { square, step: 2, blast: 0 };
}

describe("Striking", () => {
  describe("gather", () => {
    it("gathers the frizzball, which takes no kind and counts toward no goal, and sets it off", () => {
      const striking = new Striking(
        gameFrom(["gfg", "grr"], {
          goals: [{ what: "gather", kind: "green", count: 5 }],
        }),
        NO_PART,
      );

      const setOff = striking.gather(1, byFirstBlast(1));

      const { hits, game } = striking.struck();
      expect({ setOff, hits, goalsLeft: game.goalsLeft }).toEqual({
        setOff: { what: "frizzball", square: 1, piece: 2, kind: "green" },
        hits: [{ ...byFirstBlast(1), what: "gathered", piece: 2, kind: null }],
        goalsLeft: [5],
      });
    });

    it("sets the frizzball off with the kind the board holds most of as it stands", () => {
      const striking = new Striking(gameFrom(["gfg", "grr"]), NO_PART);
      striking.gather(0, byFirstBlast(0));
      striking.gather(2, byFirstBlast(2));

      const setOff = striking.gather(1, byFirstBlast(1));

      expect(setOff?.kind).toBe("red");
    });
  });
});
