import { TestBed } from "@angular/core/testing";
import { DEFAULT_SETTINGS, SettingsService } from "./settings.service";

describe("SettingsService", () => {
  it("starts from the settings a player starts with", () => {
    const store = TestBed.inject(SettingsService);

    expect(store.settings()).toEqual(DEFAULT_SETTINGS);
  });

  it("changes the settings given, keeping the rest as they were last set", () => {
    const store = TestBed.inject(SettingsService);
    store.update({ stickOnRight: true });

    store.update({ deck: "never" });

    expect(store.settings()).toEqual({
      speed: "normal",
      deck: "never",
      stickOnRight: true,
      fireByItself: false,
      haptics: true,
    });
  });
});
