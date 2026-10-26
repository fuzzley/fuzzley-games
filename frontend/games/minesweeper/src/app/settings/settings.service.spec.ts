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

/** Returns the settings as stored. */
function stored(): unknown {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
}

describe("SettingsService", () => {
  it("starts a new player on Medium with 3 lives", () => {
    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });

  it("deals the field its difficulty names", () => {
    store({
      version: 1,
      difficulty: "hard",
      custom: DEFAULT_SETTINGS.custom,
      lives: 3,
    });

    const settings = TestBed.inject(SettingsService);

    expect(settings.size()).toEqual({ rows: 16, cols: 30, mines: 99 });
  });

  it("deals the player's own field on Custom", () => {
    const custom = { rows: 8, cols: 12, mines: 20 };
    store({ version: 1, difficulty: "custom", custom, lives: 3 });

    const settings = TestBed.inject(SettingsService);

    expect(settings.size()).toEqual(custom);
  });

  it("reads the settings stored", () => {
    const saved = {
      difficulty: "easy",
      custom: { rows: 10, cols: 10, mines: 15 },
      lives: 5,
    };
    store({ version: 1, ...saved });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(saved);
  });

  it("keeps each stored setting that makes sense, and defaults the rest", () => {
    store({
      version: 1,
      difficulty: "nightmare",
      custom: { rows: 3, cols: 10, mines: 5 },
      lives: 2,
    });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual({ ...DEFAULT_SETTINGS, lives: 2 });
  });

  it("ignores settings from another version", () => {
    store({ version: 2, difficulty: "easy", lives: 1 });

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });

  it("ignores a stored entry that isn't JSON", () => {
    localStorage.setItem(SETTINGS_KEY, "{oops");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const settings = TestBed.inject(SettingsService);

    expect(settings.settings()).toEqual(DEFAULT_SETTINGS);
  });

  it("changes only the settings asked", () => {
    const settings = TestBed.inject(SettingsService);

    settings.update({ lives: 4 });

    expect(settings.settings()).toEqual({ ...DEFAULT_SETTINGS, lives: 4 });
  });

  it("keeps the settings changed", () => {
    const settings = TestBed.inject(SettingsService);

    settings.update({ difficulty: "hard" });

    expect(stored()).toEqual({
      version: 1,
      ...DEFAULT_SETTINGS,
      difficulty: "hard",
    });
  });
});
