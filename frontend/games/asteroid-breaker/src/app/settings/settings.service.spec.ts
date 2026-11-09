import { TestBed } from "@angular/core/testing";
import { DEFAULT_SETTINGS, SettingsService } from "./settings.service";

/** Stores settings as a player's browser would hold them, under the key every player's are kept by. */
function store(value: unknown): void {
  localStorage.setItem("asteroid-breaker-settings", JSON.stringify(value));
}

describe("SettingsService", () => {
  it("starts a new player at Normal, the deck on a touch screen, with haptics and sound", () => {
    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      speed: "normal",
      deck: "auto",
      stickOnRight: false,
      fireByItself: false,
      haptics: true,
      sound: true,
    });
  });

  it("changes only the settings given", () => {
    const settings = TestBed.inject(SettingsService);
    settings.update({ stickOnRight: true });

    settings.update({ deck: "never" });

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      deck: "never",
      stickOnRight: true,
    });
  });

  it("keeps the settings for the next visit", () => {
    const kept = {
      speed: "fast",
      deck: "always",
      stickOnRight: true,
      fireByItself: true,
      haptics: false,
      sound: false,
    } as const;
    TestBed.inject(SettingsService).update(kept);

    TestBed.resetTestingModule();

    expect(TestBed.inject(SettingsService).settings()).toEqual(kept);
  });

  it("takes each stored setting that makes sense, and the default for the rest", () => {
    store({
      version: 1,
      speed: "slow",
      deck: "sometimes",
      stickOnRight: "yes",
      fireByItself: true,
      haptics: 0,
      sound: false,
    });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      fireByItself: true,
      sound: false,
    });
  });

  it("takes a setting kept before it was offered as its default", () => {
    store({ version: 1, deck: "never" });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({ ...DEFAULT_SETTINGS, deck: "never" });
  });
});
