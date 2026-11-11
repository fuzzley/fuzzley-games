import { signal } from "@angular/core";
import { showsEveryFigure } from "./figures";

/** Returns a viewport's two signals the bar's figures read, as given. */
function viewport(isCompact: boolean, fitsActionLabels: boolean) {
  return {
    isCompact: signal(isCompact).asReadonly(),
    fitsActionLabels: signal(fitsActionLabels).asReadonly(),
  };
}

describe("showsEveryFigure", () => {
  it("shows every figure in a roomy window that keeps the actions' labels", () => {
    expect(showsEveryFigure(viewport(false, true))).toBe(true);
  });

  it.each([
    { where: "an upright phone", compact: true, labels: false },
    { where: "a compact window, however wide", compact: true, labels: true },
    {
      where: "a window too narrow for the labels",
      compact: false,
      labels: false,
    },
  ])("shows only the rounds and the score in $where", ({ compact, labels }) => {
    expect(showsEveryFigure(viewport(compact, labels))).toBe(false);
  });
});
