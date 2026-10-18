import { TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { ThemeService } from "../../service/theme.service";
import { ThemeMenuComponent } from "./theme_menu.component";

describe("ThemeMenuComponent", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset["theme"] = "classic";
  });

  async function renderMenu(): Promise<UserEvent> {
    await render(ThemeMenuComponent);
    return userEvent.setup();
  }

  function trigger(): HTMLElement {
    return screen.getByRole("button", { name: /^Theme/ });
  }

  function option(name: string): HTMLElement {
    return screen.getByRole("menuitemradio", { name: new RegExp(`^${name}`) });
  }

  it("names its button for the palette in use", async () => {
    await renderMenu();

    expect(trigger()).toHaveAccessibleName("Theme: Classic felt");
  });

  it("starts closed", async () => {
    await renderMenu();

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens a menu of every palette", async () => {
    const user = await renderMenu();

    await user.click(trigger());

    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getAllByRole("menuitemradio").map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining("Classic felt"),
      expect.stringContaining("Soft pastel"),
      expect.stringContaining("Casino night"),
      expect.stringContaining("Midnight blue"),
    ]);
  });

  it("checks the palette in use, and only that one", async () => {
    const user = await renderMenu();

    await user.click(trigger());

    expect(
      screen
        .getAllByRole("menuitemradio")
        .map((item) => item.getAttribute("aria-checked")),
    ).toEqual(["true", "false", "false", "false"]);
  });

  it("applies the palette clicked and closes", async () => {
    const user = await renderMenu();
    await user.click(trigger());

    await user.click(option("Casino night"));

    expect(TestBed.inject(ThemeService).current()).toBe("casino");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("moves through the palettes with the arrow keys", async () => {
    const user = await renderMenu();
    trigger().focus();
    await user.keyboard("{Enter}");

    await user.keyboard("{ArrowDown}");

    expect(option("Soft pastel")).toHaveFocus();
  });

  it("jumps to a palette by the first letters of its name", async () => {
    const user = await renderMenu();
    await user.click(trigger());

    await user.keyboard("m");

    expect(option("Midnight blue")).toHaveFocus();
  });

  it("applies the palette chosen from the keyboard", async () => {
    const user = await renderMenu();
    trigger().focus();
    await user.keyboard("{Enter}");

    await user.keyboard("{ArrowDown}{Enter}");

    expect(TestBed.inject(ThemeService).current()).toBe("pastel");
  });

  it("closes on Escape and hands focus back to its button", async () => {
    const user = await renderMenu();
    await user.click(trigger());

    await user.keyboard("{Escape}");

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveFocus();
  });
});
