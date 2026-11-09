import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  SettingsService,
} from "./settings.service";

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
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });

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

  it("takes the default for a movement the game doesn't offer", () => {
    store({ version: 1, movement: "slither" });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });

  it("takes the default for a sound kept as neither on nor off", () => {
    store({ version: 1, sound: "off" });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });
});
