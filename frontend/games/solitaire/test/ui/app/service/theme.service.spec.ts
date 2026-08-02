// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ThemeService } from "@/ui/app/service/theme.service";
import { PresentationSettingsService } from "@/ui/app/service/presentation_settings.service";
import {
  createMockPresentation,
  asPresentation,
  type MockPresentation,
} from "@test/support/ui/presentation_mock";

function buildService(presentation: MockPresentation): ThemeService {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: PresentationSettingsService,
        useValue: asPresentation(presentation),
      },
    ],
  });
  return TestBed.inject(ThemeService);
}

describe("ThemeService", () => {
  it("defaults to the green theme", () => {
    const presentation = createMockPresentation();

    const service = buildService(presentation);

    expect(service.selectedTheme()).toBe("green");
    expect(service.currentBgClass()).toBe("theme-green");
  });

  it("applies the default theme color on load", () => {
    const presentation = createMockPresentation();

    buildService(presentation);

    expect(presentation.setBackgroundColor).toHaveBeenCalledWith("#0f4d0e");
  });

  it("restores the theme matching the persisted background color", () => {
    const presentation = createMockPresentation({
      backgroundColor: "#3c096c",
    });

    const service = buildService(presentation);

    expect(service.selectedTheme()).toBe("purple");
    expect(service.currentBgClass()).toBe("theme-purple");
  });

  it("pushes the selected theme color to the presentation settings", () => {
    const presentation = createMockPresentation();
    const service = buildService(presentation);

    service.setTheme("blue");

    expect(service.selectedTheme()).toBe("blue");
    expect(presentation.setBackgroundColor).toHaveBeenLastCalledWith("#1b4353");
  });
});
