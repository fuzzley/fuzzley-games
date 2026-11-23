import { describe, expect, it } from "vitest";
import type { Guide } from "../rules/flight/guide";
import { WallGuides } from "./wall_guides";

/** A guide of two dots that punches through the bricks in wall cells 3 and 12. */
const GUIDE: Guide = {
  dots: [
    { x: 4.5, y: 9 },
    { x: 4.8, y: 8.4 },
  ],
  punched: [3, 12],
};

describe("WallGuides", () => {
  it("reads a guide's dots, rings no turn, and marks the bricks it punches through", () => {
    const guides = new WallGuides();

    const made = guides.of(GUIDE);

    expect(made).toEqual({ dots: GUIDE.dots, turns: [], struck: [3, 12] });
  });

  it("hands back the same guide while handed the same one", () => {
    const guides = new WallGuides();
    const first = guides.of(GUIDE);

    const again = guides.of(GUIDE);

    expect(again).toBe(first);
  });

  it("makes a guide anew once handed another", () => {
    const guides = new WallGuides();
    const first = guides.of(GUIDE);

    const next = guides.of({ ...GUIDE, punched: [3] });

    expect(next).not.toBe(first);
    expect(next?.struck).toEqual([3]);
  });

  it("shows none where none is handed", () => {
    const guides = new WallGuides();
    guides.of(GUIDE);

    const made = guides.of(null);

    expect(made).toBeNull();
  });
});
