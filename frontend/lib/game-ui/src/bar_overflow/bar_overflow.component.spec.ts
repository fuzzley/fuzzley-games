import { Component, input } from "@angular/core";
import { fireEvent, render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { type BarPlacement, GameBarComponent } from "../game_bar";
import {
  BarOverflowComponent,
  type BarOverflowItem,
} from "./bar_overflow.component";

const ITEMS: readonly BarOverflowItem[] = [
  { id: "restart", label: "Restart", icon: "restart" },
  { id: "rules", label: "How to Play", icon: "help" },
  { id: "settings", label: "Settings", icon: "settings" },
];

/** The menu led by a link out of the game, set apart from the actions. */
const WITH_LINK: readonly BarOverflowItem[] = [
  { id: "home", label: "Fuzzley Games", icon: "home", href: "#home" },
  { ...ITEMS[0]!, startsGroup: true },
  ...ITEMS.slice(1),
];

@Component({
  imports: [BarOverflowComponent, GameBarComponent],
  template: `
    <fz-game-bar [placement]="placement()" [reversed]="reversed()">
      <fz-bar-overflow fzBarActions [items]="items" />
    </fz-game-bar>
  `,
})
class TestBarHostComponent {
  readonly placement = input<BarPlacement>("top");
  readonly reversed = input(false);
  protected readonly items = ITEMS;
}

describe("BarOverflowComponent", () => {
  interface Rendered {
    readonly user: UserEvent;
    readonly choose: ReturnType<typeof vi.fn>;
    readonly container: Element;
  }

  async function renderMenu(
    inputs: { items?: readonly BarOverflowItem[]; label?: string } = {},
  ): Promise<Rendered> {
    const choose = vi.fn();
    const { container } = await render(BarOverflowComponent, {
      inputs: { items: ITEMS, ...inputs },
      on: { choose },
    });
    return { user: userEvent.setup(), choose, container };
  }

  async function renderInBar(
    placement: BarPlacement,
    reversed = false,
  ): Promise<UserEvent> {
    await render(TestBarHostComponent, { inputs: { placement, reversed } });
    return userEvent.setup();
  }

  function trigger(): HTMLElement {
    return screen.getByRole("button", { name: "More actions" });
  }

  function item(name: string): HTMLElement {
    return screen.getByRole("menuitem", { name });
  }

  /** Returns the layer that covers the page while the menu is open. */
  function dismissLayer(container: Element): HTMLElement | null {
    return container.querySelector(".dismiss");
  }

  it("names its button More actions", async () => {
    await renderMenu();

    expect(trigger()).toBeInTheDocument();
  });

  it("takes another name when the app gives one", async () => {
    await renderMenu({ label: "Game menu" });

    expect(
      screen.getByRole("button", { name: "Game menu" }),
    ).toBeInTheDocument();
  });

  it("starts closed", async () => {
    await renderMenu();

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens a menu of its items, in order", async () => {
    const { user } = await renderMenu();

    await user.click(trigger());

    expect(
      screen.getAllByRole("menuitem").map((each) => each.textContent.trim()),
    ).toEqual(["Restart", "How to Play", "Settings"]);
  });

  it("names the menu as its button", async () => {
    const { user } = await renderMenu();

    await user.click(trigger());

    expect(
      screen.getByRole("menu", { name: "More actions" }),
    ).toBeInTheDocument();
  });

  it("puts focus on the first item as it opens", async () => {
    const { user } = await renderMenu();

    await user.click(trigger());

    expect(item("Restart")).toHaveFocus();
  });

  it("moves through the items with the arrow keys", async () => {
    const { user } = await renderMenu();
    await user.click(trigger());

    await user.keyboard("{ArrowDown}");

    expect(item("How to Play")).toHaveFocus();
  });

  it("emits the action clicked and closes", async () => {
    const { user, choose } = await renderMenu();
    await user.click(trigger());

    await user.click(item("How to Play"));

    expect(choose).toHaveBeenCalledExactlyOnceWith("rules");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("emits the action chosen from the keyboard and hands focus back", async () => {
    const { user, choose } = await renderMenu();
    trigger().focus();
    await user.keyboard("{Enter}");

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(choose).toHaveBeenCalledExactlyOnceWith("settings");
    expect(trigger()).toHaveFocus();
  });

  it("closes on Escape and hands focus back to its button", async () => {
    const { user } = await renderMenu();
    await user.click(trigger());

    await user.keyboard("{Escape}");

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveFocus();
  });

  it("covers the page only while it is open", async () => {
    const { user, container } = await renderMenu();
    const closed = dismissLayer(container);

    await user.click(trigger());

    expect([closed, dismissLayer(container)]).toEqual([
      null,
      expect.any(HTMLElement),
    ]);
  });

  it("closes when the page around it is tapped, choosing nothing", async () => {
    const { user, choose, container } = await renderMenu();
    await user.click(trigger());

    await user.click(dismissLayer(container)!);

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(choose).not.toHaveBeenCalled();
  });

  it("hands focus back to its button when the page around it is tapped", async () => {
    const { user, container } = await renderMenu();
    await user.click(trigger());

    await user.click(dismissLayer(container)!);

    expect(trigger()).toHaveFocus();
  });

  it("offers a link as a link", async () => {
    const { user } = await renderMenu({ items: WITH_LINK });

    await user.click(trigger());

    expect(item("Fuzzley Games")).toHaveAttribute("href", "#home");
  });

  it("lets Enter follow a link, rather than cancelling it", async () => {
    const { user } = await renderMenu({ items: WITH_LINK });
    await user.click(trigger());

    const followed = fireEvent.keyDown(item("Fuzzley Games"), {
      key: "Enter",
    });

    expect(followed).toBe(true);
  });

  it("follows a link rather than emitting it", async () => {
    const { user, choose } = await renderMenu({ items: WITH_LINK });
    await user.click(trigger());

    await user.click(item("Fuzzley Games"));

    expect(choose).not.toHaveBeenCalled();
  });

  it("sets a group apart with a rule", async () => {
    const { user } = await renderMenu({ items: WITH_LINK });

    await user.click(trigger());

    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it.each<[BarPlacement, string]>([
    ["top", "below"],
    ["bottom", "above"],
    ["start", "after"],
    ["end", "before"],
  ])(
    "opens away from the edge its bar stands against: %s",
    async (placement, side) => {
      const user = await renderInBar(placement);

      await user.click(trigger());

      expect(screen.getByRole("menu")).toHaveAttribute("data-side", side);
    },
  );

  it("lines up with its button's start in a reversed bar", async () => {
    const user = await renderInBar("bottom", true);

    await user.click(trigger());

    expect(screen.getByRole("menu")).toHaveClass("align-start");
  });
});
