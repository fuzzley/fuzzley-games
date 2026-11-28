import { FEEL } from "./feel";
import { type Throw, fadeKey, thrownKeys } from "./thrown";

/** A throw of half a second from a square, right at 2 squares a second and up at 4. */
const THROW: Throw = {
  from: { x: 3, y: 5 },
  aside: 2,
  rise: 4,
  atMs: 100,
  ms: 500,
};

describe("thrownKeys", () => {
  it("keys its flight, its fall and its fade, and nothing else", () => {
    const keys = thrownKeys(THROW, FEEL);

    expect(Object.keys(keys)).toEqual(["x", "y", "leanY", "fade"]);
  });

  it("flies straight aside and up at its speeds over its time", () => {
    const { x, y } = thrownKeys(THROW, FEEL);

    expect({ x, y }).toEqual({
      x: [{ atMs: 100, ms: 500, to: 4, easing: "linear" }],
      y: [{ atMs: 100, ms: 500, to: 3, easing: "linear" }],
    });
  });

  it("leans it down as the feel's gravity pulls it from rest, by its time squared", () => {
    const { leanY } = thrownKeys(THROW, FEEL);

    expect(leanY).toEqual([
      { atMs: 100, ms: 500, to: (FEEL.thrownGravity * 0.25) / 2, easing: "in" },
    ]);
  });

  it("fades it toward its end", () => {
    const { fade } = thrownKeys(THROW, FEEL);

    expect(fade).toEqual([fadeKey(100, 500, FEEL)]);
  });
});

describe("fadeKey", () => {
  it("fades over the last share of the time the feel's loose bits fade over, to nothing at its end", () => {
    const feel = { ...FEEL, looseBitFade: 4 };

    expect(fadeKey(100, 500, feel)).toEqual({
      atMs: 475,
      ms: 125,
      to: 1,
      easing: "linear",
    });
  });
});
