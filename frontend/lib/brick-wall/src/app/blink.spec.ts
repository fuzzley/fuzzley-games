import { TestBed } from "@angular/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { GameViewportService } from "@fz/game-ui/viewport";
import { steadyForLessMotion } from "./blink";

describe("steadyForLessMotion", () => {
  it("reads a cue blinking where the player asks for no less motion", () => {
    installFakeViewport(1280);

    const steady = steadyForLessMotion(TestBed.inject(GameViewportService));

    expect(steady()).toBe(false);
  });

  it("reads it steady once the player asks for less motion", () => {
    const viewport = installFakeViewport(1280);
    const steady = steadyForLessMotion(TestBed.inject(GameViewportService));

    viewport.setReducedMotion(true);

    expect(steady()).toBe(true);
  });
});
