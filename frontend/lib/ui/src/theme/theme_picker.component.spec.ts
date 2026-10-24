import { TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { ThemeService } from "./theme.service";
import { ThemePickerComponent } from "./theme_picker.component";

describe("ThemePickerComponent", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset["theme"] = "emerald";
  });

  async function renderPicker(label?: string): Promise<UserEvent> {
    await render(ThemePickerComponent, {
      inputs: label === undefined ? {} : { label },
    });
    return userEvent.setup();
  }

  function radio(name: string): HTMLElement {
    return screen.getByRole("radio", { name: new RegExp(`^${name}`) });
  }

  it("offers every palette as a radio", async () => {
    await renderPicker();

    expect(
      screen
        .getAllByRole("radio")
        .map((item) => item.closest("label")?.textContent),
    ).toEqual([
      expect.stringContaining("Emerald felt"),
      expect.stringContaining("Classic felt"),
      expect.stringContaining("Soft pastel"),
      expect.stringContaining("Casino night"),
      expect.stringContaining("Midnight blue"),
    ]);
  });

  it("names the group Theme", async () => {
    await renderPicker();

    expect(screen.getByRole("radiogroup")).toHaveAccessibleName("Theme");
  });

  it("names the group as the app asks", async () => {
    await renderPicker("Colors");

    expect(screen.getByRole("radiogroup")).toHaveAccessibleName("Colors");
  });

  it("checks the palette in use", async () => {
    await renderPicker();

    expect(radio("Emerald felt")).toBeChecked();
  });

  it("applies the palette clicked", async () => {
    const user = await renderPicker();

    await user.click(radio("Soft pastel"));

    expect(TestBed.inject(ThemeService).current()).toBe("pastel");
  });

  it("applies the next palette with the arrow keys", async () => {
    const user = await renderPicker();
    radio("Emerald felt").focus();

    await user.keyboard("{ArrowDown}");

    expect(TestBed.inject(ThemeService).current()).toBe("classic");
  });

  it("follows a palette chosen elsewhere", async () => {
    await renderPicker();

    TestBed.inject(ThemeService).select("midnight");
    TestBed.tick();

    expect(radio("Midnight blue")).toBeChecked();
  });
});
