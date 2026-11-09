import { TestBed } from "@angular/core/testing";
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  SettingsService,
} from "./settings.service";

/** Stores settings as a player's browser would hold them. */
function store(value: unknown): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
}

describe("SettingsService", () => {
  it("starts a new player on Easy, with notes cleared and mistakes unmarked", () => {
    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      level: "easy",
      markMistakes: false,
      clearNotes: true,
    });
  });

  it("changes only the settings given", () => {
    const settings = TestBed.inject(SettingsService);

    settings.update({ markMistakes: true });

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      markMistakes: true,
    });
  });

  it("keeps the settings for the next visit", () => {
    TestBed.inject(SettingsService).update({ level: "expert" });

    TestBed.resetTestingModule();

    expect(TestBed.inject(SettingsService).settings().level).toBe("expert");
  });

  it("takes each stored setting that makes sense, and the default for the rest", () => {
    store({
      version: 1,
      level: "impossible",
      markMistakes: true,
      clearNotes: "yes",
    });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      level: "easy",
      markMistakes: true,
      clearNotes: true,
    });
  });

  it("takes notes kept uncleared, and the default for a setting not kept", () => {
    store({ version: 1, clearNotes: false });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      clearNotes: false,
    });
  });
});
