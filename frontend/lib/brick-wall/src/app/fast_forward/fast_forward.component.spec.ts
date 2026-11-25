import type { DebugElement } from "@angular/core";
import { By } from "@angular/platform-browser";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import type { Mock } from "vitest";
import {
  FastForwardComponent,
  fastForwardWords,
} from "./fast_forward.component";

/** What a spec gets back from rendering the button. */
interface Rendered {
  readonly user: UserEvent;
  /** Heard at each press the button passed on. */
  readonly pressed: Mock<() => void>;
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
 * Renders the button, fast-forward on or off, beside a board that can take
 * the focus, and listens to it.
 */
async function renderFastForward({ fast = false } = {}): Promise<Rendered> {
  const pressed = vi.fn<() => void>();
  const { debugElement } = await render(
    `<button type="button">Board</button>
    <button
      fzFastForward
      type="button"
      [fast]="fast"
      (fastForward)="pressed()"
    ></button>`,
    {
      imports: [FastForwardComponent],
      componentProperties: { fast, pressed },
    },
  );
  return {
    user: userEvent.setup(),
    pressed,
    icon: () => iconIn(debugElement),
  };
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

  it("isn't pressed while fast-forward is off", async () => {
    await renderFastForward();

    expect(fastForward()).toHaveAttribute("aria-pressed", "false");
  });

  it("is pressed while fast-forward is on", async () => {
    await renderFastForward({ fast: true });

    expect(fastForward()).toHaveAttribute("aria-pressed", "true");
  });

  it("is never dimmed, as it can be pressed whenever it shows", async () => {
    await renderFastForward();

    expect(fastForward()).not.toHaveAttribute("aria-disabled");
  });

  it.each([
    ["off", false],
    ["on", true],
  ])(
    "asks to switch fast-forward at a press while it is %s",
    async (_, fast) => {
      const { user, pressed } = await renderFastForward({ fast });

      await user.click(fastForward());

      expect(pressed).toHaveBeenCalledOnce();
    },
  );

  it("asks from the keyboard", async () => {
    const { user, pressed } = await renderFastForward();
    fastForward().focus();

    await user.keyboard("{Enter}");

    expect(pressed).toHaveBeenCalledOnce();
  });

  it("keeps the focus where it was through a press with a pointer", async () => {
    const { user } = await renderFastForward();
    const board = screen.getByRole("button", { name: "Board" });
    board.focus();

    await user.click(fastForward());

    expect(board).toHaveFocus();
  });
});

describe("fastForwardWords", () => {
  it("says fast-forward on or off", () => {
    expect([fastForwardWords(true), fastForwardWords(false)]).toEqual([
      "Fast-forward on.",
      "Fast-forward off.",
    ]);
  });
});
