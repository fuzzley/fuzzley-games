import { TestBed } from "@angular/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { SettingsService } from "./settings.service";

/** Where the settings are kept, in their own words, so a rename fails. */
const SETTINGS_KEY = "fuzz-flux-settings";

/** Returns the settings, kept in a store. */
function settingsIn(storage = new MemoryStorage()): SettingsService {
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage)],
  });
  return TestBed.inject(SettingsService);
}

/** Returns a store holding the settings a visit before kept. */
function stored(settings: Readonly<Record<string, unknown>>): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, version: 1 }));
  return storage;
}

describe("SettingsService", () => {
  it("plays at Normal speed, with sound, at first", () => {
    expect(settingsIn().settings()).toEqual({
      speed: "normal",
      lessMotion: null,
      sound: true,
    });
  });

  it("reads the settings as a visit before kept them", () => {
    const kept = { speed: "fast", lessMotion: true, sound: false };

    expect(settingsIn(stored(kept)).settings()).toEqual(kept);
  });

  it("reads each setting that makes no sense as its default", () => {
    const kept = { speed: "slow", lessMotion: "yes", sound: 1 };

    expect(settingsIn(stored(kept)).settings()).toEqual({
      speed: "normal",
      lessMotion: null,
      sound: true,
    });
  });

  it("keeps a change for the next visit", () => {
    const storage = new MemoryStorage();
    settingsIn(storage).update({ speed: "fast" });
    TestBed.resetTestingModule();

    expect(settingsIn(storage).settings().speed).toBe("fast");
  });

  describe("Less motion", () => {
    it.each([
      ["allows motion", false, false],
      ["asks for less", true, true],
    ])(
      "follows the system until the player sets it: where it %s, %s",
      (_, reduced, lessMotion) => {
        installFakeViewport(390, 844).setReducedMotion(reduced);

        expect(settingsIn().lessMotion()).toBe(lessMotion);
      },
    );

    it("is the player's once set, whatever the system asks", () => {
      installFakeViewport(390, 844).setReducedMotion(true);
      const settings = settingsIn();

      settings.update({ lessMotion: false });

      expect(settings.lessMotion()).toBe(false);
    });
  });
});
