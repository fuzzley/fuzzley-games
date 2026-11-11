import type { DebugElement } from "@angular/core";
import { By } from "@angular/platform-browser";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { FastForwardComponent } from "./fast_forward.component";

/** What a spec gets back from rendering the button. */
interface Rendered {
  readonly user: UserEvent;
  /** What the button asked for, each press's wish to play fast or not. */
  readonly asked: boolean[];
  /** Returns the name of the icon the button shows. */
  readonly icon: () => IconName;
}

/** Returns the name of the one icon drawn in a rendered template. */
function iconIn(debugElement: DebugElement): IconName {
  return debugElement
    .query(By.directive(IconComponent))
    .injector.get(IconComponent)
    .name();
}

/**
 * Renders the button as the flight stands, beside a board that can take the
 * focus, and keeps what it asks for.
 */
async function renderFastForward({
  fast = false,
  flying = true,
} = {}): Promise<Rendered> {
  const asked: boolean[] = [];
  const { debugElement } = await render(
    `<button type="button">Board</button>
    <button
      appFastForward
      type="button"
      [fast]="fast"
      [flying]="flying"
      (fastForward)="ask($event)"
    ></button>`,
    {
      imports: [FastForwardComponent],
      componentProperties: {
        fast,
        flying,
        ask: (wanted: boolean) => {
          asked.push(wanted);
        },
      },
    },
  );
  return { user: userEvent.setup(), asked, icon: () => iconIn(debugElement) };
}

/** Returns the button. */
function fastForward(): HTMLElement {
  return screen.getByRole("button", { name: "Fast-forward" });
}

describe("FastForwardComponent", () => {
  it("shows the fast-forward icon", async () => {
    const { icon } = await renderFastForward();

    expect(icon()).toBe("fast-forward");
  });

  it("isn't pressed while the flight plays at its speed", async () => {
    await renderFastForward();

    expect(fastForward()).toHaveAttribute("aria-pressed", "false");
  });

  it("is pressed while the flight plays fast", async () => {
    await renderFastForward({ fast: true });

    expect(fastForward()).toHaveAttribute("aria-pressed", "true");
  });

  it("can be pressed while a flight is under way", async () => {
    await renderFastForward();

    expect(fastForward()).not.toHaveAttribute("aria-disabled");
  });

  it("is dimmed while there is no flight", async () => {
    await renderFastForward({ flying: false });

    expect(fastForward()).toHaveAttribute("aria-disabled", "true");
  });

  it("asks for the flight fast", async () => {
    const { user, asked } = await renderFastForward();

    await user.click(fastForward());

    expect(asked).toEqual([true]);
  });

  it("asks for the flight at its speed again while it plays fast", async () => {
    const { user, asked } = await renderFastForward({ fast: true });

    await user.click(fastForward());

    expect(asked).toEqual([false]);
  });

  it("asks from the keyboard", async () => {
    const { user, asked } = await renderFastForward();
    fastForward().focus();

    await user.keyboard("{Enter}");

    expect(asked).toEqual([true]);
  });

  it("asks nothing while dimmed", async () => {
    const { user, asked } = await renderFastForward({ flying: false });

    await user.click(fastForward());

    expect(asked).toEqual([]);
  });

  it("keeps the focus where it was through a press with a pointer", async () => {
    const { user } = await renderFastForward();
    const board = screen.getByRole("button", { name: "Board" });
    board.focus();

    await user.click(fastForward());

    expect(board).toHaveFocus();
  });
});
