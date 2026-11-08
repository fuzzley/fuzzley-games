import { NO_INSETS } from "../../insets";
import { viewport } from "./viewports";

describe("viewport", () => {
  it("counts a CSS size in whole device pixels at a pixel ratio", () => {
    expect(viewport(517, 301, 2.625, { ...NO_INSETS, top: 60 })).toEqual({
      width: 1357,
      height: 790,
      pixelRatio: 2.625,
      insets: { ...NO_INSETS, top: 60 },
    });
  });

  it("is one device pixel to a CSS pixel, with no chrome, unless told", () => {
    expect(viewport(400, 300)).toEqual({
      width: 400,
      height: 300,
      pixelRatio: 1,
      insets: NO_INSETS,
    });
  });
});
