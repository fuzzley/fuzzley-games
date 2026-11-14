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
  storage.setItem("brick-fuzz-pop-settings", JSON.stringify(value));
}

describe("SettingsService", () => {
  it("starts a new player pointing and holding at Normal, long flights sped up, with the guide and sound", () => {
    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      aiming: "pointAndHold",
      flightSpeed: "normal",
      speedUpLongFlights: true,
      guide: true,
      sound: true,
    });
  });

  it("changes only the settings given", () => {
    const settings = TestBed.inject(SettingsService);
    settings.update({ guide: false });

    settings.update({ aiming: "pullBack" });

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      aiming: "pullBack",
      guide: false,
    });
  });

  it("keeps the settings for the next visit", () => {
    const kept = {
      aiming: "pullBack",
      flightSpeed: "fast",
      speedUpLongFlights: false,
      guide: false,
      sound: false,
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
      flightSpeed: "fast",
      speedUpLongFlights: "no",
      guide: false,
      sound: 0,
    });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      flightSpeed: "fast",
      guide: false,
    });
  });

  it("takes a way of aiming and a speed it doesn't know as their defaults", () => {
    store({
      version: 1,
      aiming: "point",
      flightSpeed: "slow",
      speedUpLongFlights: false,
      sound: false,
    });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      speedUpLongFlights: false,
      sound: false,
    });
  });

  it("takes a setting kept before it was offered as its default", () => {
    store({ version: 1, aiming: "pullBack" });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      aiming: "pullBack",
    });
  });

  it("points and holds where the player kept aiming by the pointer, no longer offered", () => {
    store({ version: 1, aiming: "byPointer", guide: false });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({
      ...DEFAULT_SETTINGS,
      aiming: "pointAndHold",
      guide: false,
    });
  });

  it("starts afresh from settings kept in another shape", () => {
    store({
      version: 2,
      aiming: "pullBack",
      flightSpeed: "fast",
      speedUpLongFlights: false,
      guide: false,
      sound: false,
    });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });
});
