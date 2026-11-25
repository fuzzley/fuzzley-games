import { TestBed } from "@angular/core/testing";
import { LEVELS } from "../rules/levels/levels";
import anglesMarks from "../rules/levels/marks/angles.json";
import { playRound } from "../rules/round/round";
import warmUpMarks from "../testing/warm_up_marks.json";
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

  it("read Warm-up's marks from its fixture, and Angles' as the levels' certify script wrote them", () => {
    expect(TestBed.inject(GAME_MARKS)).toEqual({
      par: { ...warmUpMarks.par, ...anglesMarks.par },
      rally: { ...warmUpMarks.rally, ...anglesMarks.rally },
    });
  });

  it("hold a par and a rally mark for every level the game plays", () => {
    const ids = LEVELS.map(({ data }) => data.id).sort();
    const { par, rally } = TestBed.inject(GAME_MARKS);

    expect([Object.keys(par).sort(), Object.keys(rally).sort()]).toEqual([
      ids,
      ids,
    ]);
  });
});
