import { TestBed } from "@angular/core/testing";
import { CLEARED_BUZZ, LOST_BUZZ } from "../../view/effects/haptics";
import { SettingsService } from "../settings/settings.service";
import { HapticsService } from "./haptics.service";

describe("HapticsService", () => {
  let vibrate: ReturnType<typeof vi.fn<(pattern: VibratePattern) => boolean>>;

  beforeEach(() => {
    vibrate = vi.fn<(pattern: VibratePattern) => boolean>(() => true);
    Object.defineProperty(navigator, "vibrate", {
      value: vibrate,
      configurable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "vibrate");
  });

  it("buzzes the phone in the pattern it is given", () => {
    const haptics = TestBed.inject(HapticsService);

    haptics.buzz(CLEARED_BUZZ);

    expect(vibrate.mock.calls).toEqual([[CLEARED_BUZZ]]);
  });

  it("buzzes nothing where the settings turn the haptics off", () => {
    const haptics = TestBed.inject(HapticsService);
    TestBed.inject(SettingsService).update({ haptics: false });

    haptics.buzz(LOST_BUZZ);

    expect(vibrate).not.toHaveBeenCalled();
  });

  it("buzzes nothing, and throws nothing, where the phone can't buzz", () => {
    const haptics = TestBed.inject(HapticsService);
    Reflect.deleteProperty(navigator, "vibrate");

    const buzz = (): void => {
      haptics.buzz(LOST_BUZZ);
    };

    expect(buzz).not.toThrow();
  });
});
