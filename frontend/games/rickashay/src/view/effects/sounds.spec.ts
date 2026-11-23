import { SOUNDS } from "./sounds";

describe("SOUNDS", () => {
  it('lists the twenty-five sounds of the design\'s "Sound"', () => {
    expect(SOUNDS).toHaveLength(25);
  });

  it("names each sound once", () => {
    expect(new Set(SOUNDS).size).toBe(SOUNDS.length);
  });

  it.each(SOUNDS)(
    "names %s in lower case, its words joined by hyphens",
    (name) => {
      expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
    },
  );
});
