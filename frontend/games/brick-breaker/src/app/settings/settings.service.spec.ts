import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { SETTINGS_KEY, SettingsService } from "./settings.service";

/** What the player's browser keeps, empty for each test. */
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage)],
  });
});

/** Stores settings as a player's browser would hold them. */
function store(value: unknown): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(value));
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
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });

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
});
