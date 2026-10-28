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
  it("starts a new player at Normal speed, gliding, with sound, and arrows on a touch screen", () => {
    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      speed: "normal",
      movement: "glide",
      arrows: "touch",
      sound: true,
    });
  });

  it("changes only the settings given", () => {
    const settings = TestBed.inject(SettingsService);

    settings.update({ movement: "step" });

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      movement: "step",
    });
  });

  it("keeps the settings for the next visit", () => {
    TestBed.inject(SettingsService).update({ speed: "fast" });

    TestBed.resetTestingModule();

    expect(TestBed.inject(SettingsService).settings().speed).toBe("fast");
  });

  it("takes each stored setting that makes sense, and the default for the rest", () => {
    store({
      version: 1,
      speed: "ludicrous",
      movement: "step",
      arrows: "sometimes",
      sound: false,
    });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      speed: "normal",
      movement: "step",
      arrows: "touch",
      sound: false,
    });
  });

  it("starts afresh from settings stored in another shape", () => {
    store({ version: 2, speed: "slow", movement: "step", sound: false });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });
});
