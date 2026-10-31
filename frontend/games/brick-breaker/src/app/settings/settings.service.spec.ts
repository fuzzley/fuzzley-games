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
  it("starts a new player at Normal, steering by dragging, with sound, and Custom at 100%", () => {
    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      speed: "normal",
      touch: "drag",
      sound: true,
      customPercent: 100,
    });
  });

  it("changes only the settings given", () => {
    const settings = TestBed.inject(SettingsService);

    settings.update({ touch: "follow" });

    expect(settings.settings()).toEqual({
      speed: "normal",
      touch: "follow",
      sound: true,
      customPercent: 100,
    });
  });

  it("keeps the settings for the next visit", () => {
    TestBed.inject(SettingsService).update({
      speed: "custom",
      touch: "follow",
      customPercent: 135,
    });

    TestBed.resetTestingModule();

    expect(TestBed.inject(SettingsService).settings()).toMatchObject({
      speed: "custom",
      touch: "follow",
      customPercent: 135,
    });
  });

  it("takes each stored setting that makes sense, and the default for the rest", () => {
    store({
      version: 1,
      speed: "slow",
      touch: "swipe",
      sound: false,
      customPercent: 50,
    });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      speed: "normal",
      touch: "drag",
      sound: false,
      customPercent: 50,
    });
  });

  it("takes a setting kept before it was offered as its default", () => {
    store({ version: 1, touch: "follow" });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      speed: "normal",
      touch: "follow",
      sound: true,
      customPercent: 100,
    });
  });

  it.each([45, 205, 123, "fast", null])(
    "takes a Custom speed stored as %j as 100%",
    (customPercent) => {
      store({ version: 1, customPercent });

      const settings = TestBed.inject(SettingsService);

      expect(settings.settings().customPercent).toBe(100);
    },
  );

  it("starts afresh from settings stored in another shape", () => {
    store({ version: 2, touch: "follow" });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });
});
