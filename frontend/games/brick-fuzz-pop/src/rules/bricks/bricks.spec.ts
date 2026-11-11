import { struckOf } from "../../testing/stand_ins";
import { strike } from "./bricks";

describe("strike()", () => {
  it.each([
    [1, { took: 1, left: 0 }],
    [3, { took: 1, left: 2 }],
  ])(
    "takes one hit off a brick of %i hits a plain fuzzball strikes, which turns",
    (hits, { took, left }) => {
      const struck = struckOf();

      const done = strike(hits, struck);

      expect(done).toEqual({
        took,
        left,
        charge: 0,
        earthed: false,
        passes: false,
      });
    },
  );

  it("spends as much charge as a brick has hits left, and flies on through it with the rest", () => {
    const struck = struckOf({ charge: 3 });

    const done = strike(2, struck);

    expect(done).toEqual({
      took: 2,
      left: 0,
      charge: 1,
      earthed: false,
      passes: true,
    });
  });

  it("spends all its charge breaking a brick of as many hits, and flies on through it plain", () => {
    const struck = struckOf({ charge: 2 });

    const done = strike(2, struck);

    expect(done).toEqual({
      took: 2,
      left: 0,
      charge: 0,
      earthed: false,
      passes: true,
    });
  });

  it("spends all its charge on a brick it doesn't break, and turns", () => {
    const struck = struckOf({ charge: 2 });

    const done = strike(5, struck);

    expect(done).toEqual({
      took: 2,
      left: 3,
      charge: 0,
      earthed: false,
      passes: false,
    });
  });

  it("takes no hit off a brick its rules shield, and keeps its charge", () => {
    const struck = struckOf({ charge: 3, hurts: false });

    const done = strike(1, struck);

    expect(done).toEqual({
      took: 0,
      left: 1,
      charge: 3,
      earthed: false,
      passes: false,
    });
  });

  it("loses its charge to a brick that earths it, as steel does, and turns", () => {
    const struck = struckOf({ charge: 3, hurts: false, earths: true });

    const done = strike(0, struck);

    expect(done).toEqual({
      took: 0,
      left: 0,
      charge: 0,
      earthed: true,
      passes: false,
    });
  });

  it("earths nothing of a plain fuzzball", () => {
    const struck = struckOf({ hurts: false, earths: true });

    const done = strike(0, struck);

    expect(done).toEqual({
      took: 0,
      left: 0,
      charge: 0,
      earthed: false,
      passes: false,
    });
  });

  it("loses what charge is left to a brick that is hurt and earths it, and turns, though it breaks it", () => {
    const struck = struckOf({ charge: 3, earths: true });

    const done = strike(2, struck);

    expect(done).toEqual({
      took: 2,
      left: 0,
      charge: 0,
      earthed: true,
      passes: false,
    });
  });

  it("keeps a hot shot's charge through a brick it breaks", () => {
    const struck = struckOf({ charge: 5, hot: true });

    const done = strike(2, struck);

    expect(done).toEqual({
      took: 2,
      left: 0,
      charge: 5,
      earthed: false,
      passes: true,
    });
  });

  it("turns a hot shot off a brick of six hits, which it leaves with one", () => {
    const struck = struckOf({ charge: 5, hot: true });

    const done = strike(6, struck);

    expect(done).toEqual({
      took: 5,
      left: 1,
      charge: 5,
      earthed: false,
      passes: false,
    });
  });

  it("keeps a hot shot's charge on a brick that earths it", () => {
    const struck = struckOf({
      charge: 5,
      hot: true,
      hurts: false,
      earths: true,
    });

    const done = strike(0, struck);

    expect(done).toEqual({
      took: 0,
      left: 0,
      charge: 5,
      earthed: false,
      passes: false,
    });
  });
});
