import { TestBed } from "@angular/core/testing";
import { LEVEL_MARKS } from "../rules/levels/level_marks";
import { LEVELS } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import { DebugMenuComponent } from "./debug/debug_menu.component";
import { HelpComponent } from "./help/help.component";
import {
  GAME_LEVELS,
  GAME_MARKS,
  LOAD_DEBUG_MENU,
  LOAD_HELP,
  PLAY_ROUND,
} from "./tokens";

describe("the game's tokens", () => {
  it("play the game's levels", () => {
    expect(TestBed.inject(GAME_LEVELS)).toBe(LEVELS);
  });

  it("play each round as the rules' playRound() does", () => {
    expect(TestBed.inject(PLAY_ROUND)).toBe(playRound);
  });

  it("load the debug menu, but in specs", async () => {
    await expect(TestBed.inject(LOAD_DEBUG_MENU)()).resolves.toBe(
      DebugMenuComponent,
    );
  });

  it("load How to play, but in specs", async () => {
    await expect(TestBed.inject(LOAD_HELP)()).resolves.toBe(HelpComponent);
  });

  it("read every set's marks, as the levels' certify script wrote them", () => {
    expect(TestBed.inject(GAME_MARKS)).toBe(LEVEL_MARKS);
  });
});
