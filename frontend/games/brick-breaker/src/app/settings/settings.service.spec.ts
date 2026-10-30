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
  it("starts a new player steering by dragging", () => {
    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({ touch: "drag" });
  });

  it("changes the settings given", () => {
    const settings = TestBed.inject(SettingsService);

    settings.update({ touch: "follow" });

    expect(settings.settings()).toEqual({ touch: "follow" });
  });

  it("keeps the settings for the next visit", () => {
    TestBed.inject(SettingsService).update({ touch: "follow" });

    TestBed.resetTestingModule();

    expect(TestBed.inject(SettingsService).settings().touch).toBe("follow");
  });

  it("takes the default for a stored setting that makes no sense", () => {
    store({ version: 1, touch: "swipe" });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });

  it("starts afresh from settings stored in another shape", () => {
    store({ version: 2, touch: "follow" });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });
});
