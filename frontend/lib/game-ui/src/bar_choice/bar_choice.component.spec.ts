import { Component, input } from "@angular/core";
import { fireEvent, render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { type BarPlacement, GameBarComponent } from "../game_bar";
import {
  BarChoiceComponent,
  type BarChoiceOption,
} from "./bar_choice.component";

const OPTIONS: readonly BarChoiceOption[] = [
  { id: "easy", name: "Easy", detail: "Singles only" },
  { id: "medium", name: "Medium", detail: "Pairs and pointing" },
  { id: "hard", name: "Hard" },
];

@Component({
  imports: [BarChoiceComponent, GameBarComponent],
  template: `
    <fz-game-bar
      [placement]="placement()"
      [reversed]="reversed()"
      [compact]="compact()"
    >
      <fz-bar-choice
        fzBarTitle
        label="Level"
        value="medium"
        [options]="options"
      />
    </fz-game-bar>
  `,
})
class TestBarHostComponent {
  readonly placement = input<BarPlacement>("top");
  readonly reversed = input(false);
  readonly compact = input(false);
  protected readonly options = OPTIONS;
}

@Component({
  imports: [BarChoiceComponent],
  template: `
    <fz-bar-choice
      label="Level"
      value="medium"
      [options]="options"
      (choose)="choose()($event)"
    >
      <div fzBarChoiceExtra>
        <label for="spec-range">Pace</label>
        <input id="spec-range" type="range" />
      </div>
    </fz-bar-choice>
  `,
})
class TestExtraHostComponent {
  readonly choose = input.required<(id: string) => void>();
  protected readonly options = OPTIONS;
}

describe("BarChoiceComponent", () => {
  interface Rendered {
    readonly user: UserEvent;
    readonly choose: ReturnType<typeof vi.fn>;
    readonly container: Element;
    readonly setValue: (value: string) => Promise<void>;
  }

  async function renderChoice(value = "medium"): Promise<Rendered> {
    const choose = vi.fn();
    const { container, fixture } = await render(BarChoiceComponent, {
      inputs: { label: "Level", options: OPTIONS, value },
      on: { choose },
    });
    const setValue = async (next: string): Promise<void> => {
      fixture.componentRef.setInput("value", next);
      await fixture.whenStable();
    };
    return { user: userEvent.setup(), choose, container, setValue };
  }

  async function renderInBar(
    placement: BarPlacement,
    reversed = false,
    compact = false,
  ): Promise<{ readonly user: UserEvent; readonly host: Element }> {
    const { container } = await render(TestBarHostComponent, {
      inputs: { placement, reversed, compact },
    });
    const host = container.querySelector("fz-bar-choice");
    if (!host) throw new Error("No fz-bar-choice in the bar");
    return { user: userEvent.setup(), host };
  }

  /** Renders a choice with a slider of the host's own beneath its choices. */
  async function renderWithExtra(): Promise<{
    readonly user: UserEvent;
    readonly choose: ReturnType<typeof vi.fn>;
  }> {
    const choose = vi.fn();
    await render(TestExtraHostComponent, { inputs: { choose } });
    return { user: userEvent.setup(), choose };
  }

  /** Returns the slider the host adds beneath the choices. */
  function extraSlider(): HTMLElement {
    return screen.getByRole("slider", { name: "Pace" });
  }

  function badge(): HTMLElement {
    return screen.getByRole("button", { name: /^Level:/ });
  }

  function choice(name: string): HTMLElement {
    return screen.getByRole("menuitemradio", { name: new RegExp(`^${name}`) });
  }

  /** Returns the layer that covers the page while the menu is open. */
  function dismissLayer(container: Element): HTMLElement | null {
    return container.querySelector(".dismiss");
  }

  it("names its badge with the label and the choice checked", async () => {
    await renderChoice();

    expect(badge()).toHaveAccessibleName("Level: Medium");
  });

  it("shows the choice checked on its badge", async () => {
    await renderChoice();

    expect(badge()).toHaveTextContent("Medium");
  });

  it("follows the choice it is given", async () => {
    const { setValue } = await renderChoice();

    await setValue("hard");

    expect(badge()).toHaveAccessibleName("Level: Hard");
  });

  it("starts closed", async () => {
    await renderChoice();

    expect(badge()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens a menu of its choices, in order", async () => {
    const { user } = await renderChoice();

    await user.click(badge());

    expect(
      screen
        .getAllByRole("menuitemradio")
        .map((each) => each.querySelector(".name")?.textContent),
    ).toEqual(["Easy", "Medium", "Hard"]);
  });

  it("names the menu by its label", async () => {
    const { user } = await renderChoice();

    await user.click(badge());

    expect(screen.getByRole("menu", { name: "Level" })).toBeInTheDocument();
  });

  it("checks the choice it holds, and no other", async () => {
    const { user } = await renderChoice();

    await user.click(badge());

    expect(
      screen
        .getAllByRole("menuitemradio")
        .map((each) => each.getAttribute("aria-checked")),
    ).toEqual(["false", "true", "false"]);
  });

  it("shows each choice's detail beside its name", async () => {
    const { user } = await renderChoice();

    await user.click(badge());

    expect(choice("Medium")).toHaveTextContent("Pairs and pointing");
  });

  it("emits the choice clicked and closes", async () => {
    const { user, choose } = await renderChoice();
    await user.click(badge());

    await user.click(choice("Hard"));

    expect(choose).toHaveBeenCalledExactlyOnceWith("hard");
    expect(badge()).toHaveAttribute("aria-expanded", "false");
  });

  it("emits the choice made from the keyboard and hands focus back", async () => {
    const { user, choose } = await renderChoice();
    badge().focus();
    await user.keyboard("{Enter}");

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(choose).toHaveBeenCalledExactlyOnceWith("hard");
    expect(badge()).toHaveFocus();
  });

  it("emits nothing for the choice already checked, and closes", async () => {
    const { user, choose } = await renderChoice();
    await user.click(badge());

    await user.click(choice("Medium"));

    expect(choose).not.toHaveBeenCalled();
    expect(badge()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape and hands focus back to its badge", async () => {
    const { user } = await renderChoice();
    await user.click(badge());

    await user.keyboard("{Escape}");

    expect(badge()).toHaveAttribute("aria-expanded", "false");
    expect(badge()).toHaveFocus();
  });

  it("covers the page only while it is open", async () => {
    const { user, container } = await renderChoice();
    const closed = dismissLayer(container);

    await user.click(badge());

    expect([closed, dismissLayer(container)]).toEqual([
      null,
      expect.any(HTMLElement),
    ]);
  });

  it("closes when the page around it is tapped, choosing nothing", async () => {
    const { user, choose, container } = await renderChoice();
    await user.click(badge());

    await user.click(dismissLayer(container)!);

    expect(badge()).toHaveAttribute("aria-expanded", "false");
    expect(choose).not.toHaveBeenCalled();
  });

  it("hands focus back to its badge when the page around it is tapped", async () => {
    const { user, container } = await renderChoice();
    await user.click(badge());

    await user.click(dismissLayer(container)!);

    expect(badge()).toHaveFocus();
  });

  describe("with what the app adds beneath the choices", () => {
    it("shows it in the menu, after the last choice", async () => {
      const { user } = await renderWithExtra();

      await user.click(badge());

      expect(screen.getByRole("menu")).toContainElement(extraSlider());
      expect(
        choice("Hard").compareDocumentPosition(extraSlider()) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("reaches it with Tab from the choices, keeping the menu open", async () => {
      const { user } = await renderWithExtra();
      badge().focus();
      await user.keyboard("{Enter}");

      await user.tab();

      expect(extraSlider()).toHaveFocus();
      expect(badge()).toHaveAttribute("aria-expanded", "true");
    });

    // Pressed with fireEvent, since user-event's Home and End on a range
    // input reach for a text selection jsdom doesn't have.
    it.each(["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "h"])(
      "leaves %j pressed in it to it, choosing nothing",
      async (key) => {
        const { user, choose } = await renderWithExtra();
        await user.click(badge());
        await user.click(extraSlider());

        fireEvent.keyDown(extraSlider(), { key });

        expect(extraSlider()).toHaveFocus();
        expect(badge()).toHaveAttribute("aria-expanded", "true");
        expect(choose).not.toHaveBeenCalled();
      },
    );

    it("closes on Escape from it and hands focus back to its badge", async () => {
      const { user } = await renderWithExtra();
      await user.click(badge());
      await user.click(extraSlider());

      await user.keyboard("{Escape}");

      expect(badge()).toHaveAttribute("aria-expanded", "false");
      expect(badge()).toHaveFocus();
    });

    it("chooses nothing when it is pressed", async () => {
      const { user, choose } = await renderWithExtra();
      await user.click(badge());

      await user.click(screen.getByText("Pace"));

      expect(choose).not.toHaveBeenCalled();
      expect(badge()).toHaveAttribute("aria-expanded", "true");
    });
  });

  it.each<[BarPlacement, string]>([
    ["top", "below"],
    ["bottom", "above"],
    ["start", "after"],
    ["end", "before"],
  ])(
    "opens away from the edge its bar stands against: %s",
    async (placement, side) => {
      const { user } = await renderInBar(placement);

      await user.click(badge());

      expect(screen.getByRole("menu")).toHaveAttribute("data-side", side);
    },
  );

  it.each<[BarPlacement, boolean]>([
    ["top", false],
    ["bottom", false],
    ["start", true],
    ["end", true],
  ])(
    "sets itself for a rail in a bar at the %s: %s",
    async (placement, rail) => {
      const { host } = await renderInBar(placement);

      expect(host.classList.contains("rail")).toBe(rail);
    },
  );

  it.each<[BarPlacement, boolean, boolean]>([
    ["bottom", true, true],
    ["top", true, true],
    ["bottom", false, false],
    ["end", true, false],
  ])(
    "hangs its menu from the bar in a bar at the %s, compact %s: %s",
    async (placement, compact, fromBar) => {
      const { host } = await renderInBar(placement, false, compact);

      expect(host.classList.contains("from-bar")).toBe(fromBar);
    },
  );

  it("hangs its menu from the bar's end in a compact, reversed bar", async () => {
    const { user, host } = await renderInBar("bottom", true, true);

    await user.click(badge());

    expect(host).toHaveClass("from-bar");
    expect(screen.getByRole("menu")).toHaveClass("align-end");
  });

  it("lines up with its badge's end in a reversed bar", async () => {
    const { user } = await renderInBar("top", true);

    await user.click(badge());

    expect(screen.getByRole("menu")).toHaveClass("align-end");
  });

  it("lines up with its badge's start in a bar that isn't reversed", async () => {
    const { user } = await renderInBar("top");

    await user.click(badge());

    expect(screen.getByRole("menu")).not.toHaveClass("align-end");
  });

  it("ignores reversal on a rail, which runs one way", async () => {
    const { user } = await renderInBar("end", true);

    await user.click(badge());

    expect(screen.getByRole("menu")).not.toHaveClass("align-end");
  });
});
