import { describe, it, expect } from "vitest";
import {
  BoardArrangement,
  DEFAULT_BOARD_ARRANGEMENT,
  resolveArrangement,
} from "@/engine/render/layout/board_arrangement";

describe("resolveArrangement", () => {
  it.each([
    ["roomy", { piles: "top", stockSide: "left" }],
    ["phone-portrait", { piles: "bottom", stockSide: "right" }],
    ["phone-landscape", { piles: "bottom", stockSide: "right" }],
  ] as const)("decides Auto on a %s screen", (formFactor, resolved) => {
    expect(resolveArrangement(DEFAULT_BOARD_ARRANGEMENT, formFactor)).toEqual(
      resolved,
    );
  });

  it("keeps what the player chose, whatever the screen", () => {
    const chosen: BoardArrangement = { piles: "bottom", stockSide: "left" };

    expect(resolveArrangement(chosen, "roomy")).toEqual(chosen);
  });

  it("decides only what was left to Auto", () => {
    expect(
      resolveArrangement({ piles: "top", stockSide: "auto" }, "phone-portrait"),
    ).toEqual({ piles: "top", stockSide: "right" });
  });
});
