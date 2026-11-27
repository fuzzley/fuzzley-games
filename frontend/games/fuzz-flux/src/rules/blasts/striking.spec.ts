import { gameFrom } from "../../testing/board_picture";
import { DESIGN_PARTS, NO_PART } from "../../testing/made_up_rules";
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

describe("Striking.giveFur", () => {
  it("gives a fuzzball a special's fur, brushing off its burr with no hit, and leaves its id and dust", () => {
    const striking = new Striking(
      gameFrom({ pieces: ["gr"], marks: ["*."], dust: ["10"] }),
      DESIGN_PARTS,
    );

    const took = striking.giveFur(0, "puffer");

    const { hits, game } = striking.struck();
    expect({
      took,
      hits,
      piece: game.board.pieces[0],
      dust: game.board.dust,
    }).toEqual({
      took: true,
      hits: [],
      piece: {
        what: "fuzzball",
        id: 1,
        kind: "green",
        special: "puffer",
        caged: false,
        burred: false,
      },
      dust: [1, 0],
    });
  });

  it("gives no fur to a fuzzball an element's rule keeps from taking it, as a cage does", () => {
    const striking = new Striking(gameFrom(["Gr"]), DESIGN_PARTS);

    const took = striking.giveFur(0, "wisp");

    expect({ took, piece: striking.soFar().board.pieces[0] }).toEqual({
      took: false,
      piece: {
        what: "fuzzball",
        id: 1,
        kind: "green",
        special: null,
        caged: true,
        burred: false,
      },
    });
  });

  it("gives no fur on a square the wave made", () => {
    const striking = new Striking(gameFrom(["gr"]), NO_PART);
    striking.leave(0, "wisp", { square: 0, step: 0, blast: null });

    const took = striking.giveFur(0, "puffer");

    expect({ took, piece: striking.soFar().board.pieces[0] }).toEqual({
      took: false,
      piece: {
        what: "fuzzball",
        id: 1,
        kind: "green",
        special: "wisp",
        caged: false,
        burred: false,
      },
    });
  });

  it("throws for a square that holds no fuzzball", () => {
    const striking = new Striking(gameFrom(["1r"]), NO_PART);

    expect(() => striking.giveFur(0, "puffer")).toThrow(
      "Square 0 holds no fuzzball.",
    );
  });
});
