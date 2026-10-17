import { TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { userEvent, type UserEvent } from "@testing-library/user-event";
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

  it("starts closed", async () => {
    await renderMenu();

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /^Casino night/ })).toBeNull();
  });

  it("opens the list of palettes", async () => {
    const user = await renderMenu();

    await user.click(trigger());

    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: /^Casino night/ }),
    ).toBeInTheDocument();
  });

  it("applies the palette chosen and closes", async () => {
    const user = await renderMenu();
    await user.click(trigger());

    await user.click(screen.getByRole("button", { name: /^Casino night/ }));

    expect(TestBed.inject(ThemeService).current()).toBe("casino");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("marks the palette in use", async () => {
    const user = await renderMenu();

    await user.click(trigger());

    expect(
      screen.getByRole("button", { name: /^Classic felt/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("closes on Escape and hands focus back to its button", async () => {
    const user = await renderMenu();
    await user.click(trigger());
    screen.getByRole("button", { name: /^Casino night/ }).focus();

    await user.keyboard("{Escape}");

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveFocus();
  });
});
