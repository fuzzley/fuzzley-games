import { TestBed } from "@angular/core/testing";
import { LEVELS } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import { DebugMenuComponent } from "./debug/debug_menu.component";
import { HelpComponent } from "./help/help.component";
import { GAME_LEVELS, LOAD_DEBUG_MENU, LOAD_HELP, PLAY_ROUND } from "./tokens";

describe("the game's tokens", () => {
  it("hand the game its own levels, but in specs", () => {
    expect(TestBed.inject(GAME_LEVELS)).toBe(LEVELS);
  });

  it("play each round through the rules, but in specs", () => {
    expect(TestBed.inject(PLAY_ROUND)).toBe(playRound);
  });

  it("load How to play, but in specs", async () => {
    await expect(TestBed.inject(LOAD_HELP)()).resolves.toBe(HelpComponent);
  });

  it("load the debug menu, but in specs", async () => {
    await expect(TestBed.inject(LOAD_DEBUG_MENU)()).resolves.toBe(
      DebugMenuComponent,
    );
  });
});
