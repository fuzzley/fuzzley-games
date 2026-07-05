// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ThemeService } from "@/ui/app/service/theme.service";
import { GAME_MODEL } from "@/ui/app/provider/game_model.provider";
import {
  createMockGameModel,
  asGameModel,
  type MockGameModel,
} from "@test/support/game_model_mock";

function buildService(model: MockGameModel): ThemeService {
  TestBed.configureTestingModule({
    providers: [{ provide: GAME_MODEL, useValue: asGameModel(model) }],
  });
  return TestBed.inject(ThemeService);
}

describe("ThemeService", () => {
  it("defaults to the green theme", () => {
    const model = createMockGameModel();

    const service = buildService(model);

    expect(service.selectedTheme()).toBe("green");
    expect(service.currentBgClass()).toBe("theme-green");
  });

  it("applies the default theme color to the model on load", () => {
    const model = createMockGameModel();

    buildService(model);

    expect(model.setBackgroundColor).toHaveBeenCalledWith("#0f4d0e");
  });

  it("restores the theme matching the persisted background color", () => {
    const model = createMockGameModel({ backgroundColor: "#3c096c" });

    const service = buildService(model);

    expect(service.selectedTheme()).toBe("purple");
    expect(service.currentBgClass()).toBe("theme-purple");
  });

  it("pushes the selected theme color to the model", () => {
    const model = createMockGameModel();
    const service = buildService(model);

    service.setTheme("blue");

    expect(service.selectedTheme()).toBe("blue");
    expect(model.setBackgroundColor).toHaveBeenLastCalledWith("#1b4353");
  });
});
