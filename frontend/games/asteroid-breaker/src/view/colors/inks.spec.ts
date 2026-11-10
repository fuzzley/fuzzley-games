import { DARK_ROCK_INKS, LIGHT_ROCK_INKS } from "./inks";

describe("the inks", () => {
  it.each([
    ["light", LIGHT_ROCK_INKS],
    ["dark", DARK_ROCK_INKS],
  ])("give each kind of rock a %s ink of its own", (_, inks) => {
    const bodies = Object.values(inks.kinds);

    expect(new Set(bodies).size).toBe(bodies.length);
  });
});
