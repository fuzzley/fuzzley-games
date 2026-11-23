import { TestBed } from "@angular/core/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { DEFAULT_SETTINGS, SettingsService } from "./settings.service";

/** What the player's browser keeps, empty for each test. */
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage)],
  });
});

/** Stores settings as a player's browser would hold them, under the key every player's are kept by. */
function store(value: unknown): void {
  storage.setItem("rickashay-settings", JSON.stringify(value));
}

describe("SettingsService", () => {
  it("starts a new player pointing and holding, letting go to release, the guide to the third turn, at Normal, with sound and fast-forward off", () => {
    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      aiming: "pointAndHold",
      releaseByButton: false,
      guideTurns: 3,
      flightSpeed: "normal",
      sound: true,
      fastForward: false,
    });
  });

  it("changes only the settings given", () => {
    const settings = TestBed.inject(SettingsService);
    settings.update({ guideTurns: 5 });

    settings.update({ aiming: "pullBack" });

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      aiming: "pullBack",
      guideTurns: 5,
    });
  });

  it("keeps the settings for the next visit", () => {
    const kept = {
      aiming: "pullBack",
      releaseByButton: true,
      guideTurns: 1,
      flightSpeed: "fast",
      sound: false,
      fastForward: true,
    } as const;
    TestBed.inject(SettingsService).update(kept);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });

    expect(TestBed.inject(SettingsService).settings()).toEqual(kept);
  });

  it("takes each stored setting that makes sense, and the default for the rest", () => {
    store({
      version: 1,
      aiming: "byKeys",
      releaseByButton: "yes",
      guideTurns: 2,
      flightSpeed: "fast",
      sound: 0,
      fastForward: true,
    });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      flightSpeed: "fast",
      fastForward: true,
    });
  });

  it("takes each setting kept as the others' defaults", () => {
    store({
      version: 1,
      aiming: "pullBack",
      releaseByButton: true,
      guideTurns: 5,
      sound: false,
    });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      aiming: "pullBack",
      releaseByButton: true,
      guideTurns: 5,
      sound: false,
    });
  });

  it("starts afresh from settings kept in another shape", () => {
    store({ version: 2, aiming: "pullBack", sound: false });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });
});
