import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { RadioGroupDirective } from "./radio_group.directive";

/**
 * Hosts a radio group as an app does, with the checked radio bound so the
 * roving tab stop has something to follow.
 */
@Component({
  selector: "fz-test-radio-host",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RadioGroupDirective],
  template: `
    <div fzRadioGroup aria-label="Colours">
      @for (colour of colours; track colour) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="chosen() === colour"
          (click)="chosen.set(colour)"
        >
          <span>{{ colour }}</span>
        </button>
      }
    </div>
    <button type="button" (click)="chosen.set(null)">Clear</button>
  `,
})
class RadioHostComponent {
  readonly colours = ["red", "green", "blue"];
  readonly chosen = signal<string | null>("green");
}

describe("RadioGroupDirective", () => {
  /** Renders the host with green checked, and returns a user to drive it. */
  async function renderGroup(): Promise<UserEvent> {
    await render(RadioHostComponent);
    return userEvent.setup();
  }

  function radio(name: string): HTMLElement {
    return screen.getByRole("radio", { name });
  }

  /** Returns each radio's tabindex, in document order. */
  function tabStops(): number[] {
    return screen.getAllByRole("radio").map((item) => item.tabIndex);
  }

  /** Focuses a radio and presses a key on it, returning the keydown event. */
  function press(name: string, key: string): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
    });
    radio(name).focus();
    radio(name).dispatchEvent(event);
    return event;
  }

  it("is a radiogroup, so a host can't take the behaviour without the role", async () => {
    await renderGroup();

    expect(screen.getByRole("radiogroup")).toHaveAccessibleName("Colours");
  });

  it("leaves only the checked radio in the tab order", async () => {
    await renderGroup();

    expect(tabStops()).toEqual([-1, 0, -1]);
  });

  it("falls back to the first radio when none is checked", async () => {
    const user = await renderGroup();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(tabStops()).toEqual([0, -1, -1]);
  });

  it("moves focus to the next radio on ArrowRight", async () => {
    const user = await renderGroup();
    radio("green").focus();

    await user.keyboard("{ArrowRight}");

    expect(radio("blue")).toHaveFocus();
  });

  it("moves focus to the previous radio on ArrowUp", async () => {
    const user = await renderGroup();
    radio("green").focus();

    await user.keyboard("{ArrowUp}");

    expect(radio("red")).toHaveFocus();
  });

  it("wraps past the end of the group", async () => {
    const user = await renderGroup();
    radio("blue").focus();

    await user.keyboard("{ArrowDown}");

    expect(radio("red")).toHaveFocus();
  });

  it("wraps past the start of the group", async () => {
    const user = await renderGroup();
    radio("red").focus();

    await user.keyboard("{ArrowLeft}");

    expect(radio("blue")).toHaveFocus();
  });

  it("takes Home to the first radio", async () => {
    const user = await renderGroup();
    radio("blue").focus();

    await user.keyboard("{Home}");

    expect(radio("red")).toHaveFocus();
  });

  it("takes End to the last radio", async () => {
    const user = await renderGroup();
    radio("red").focus();

    await user.keyboard("{End}");

    expect(radio("blue")).toHaveFocus();
  });

  it("carries the tab stop along with the arrows, so the group stays one stop", async () => {
    const user = await renderGroup();
    radio("green").focus();

    await user.keyboard("{ArrowRight}");

    expect(tabStops()).toEqual([-1, -1, 0]);
  });

  it("moves focus without choosing", async () => {
    const user = await renderGroup();
    radio("green").focus();

    await user.keyboard("{ArrowRight}");

    expect(radio("blue")).toHaveAttribute("aria-checked", "false");
  });

  it("chooses on Space, as the button's click", async () => {
    const user = await renderGroup();
    radio("blue").focus();

    await user.keyboard(" ");

    expect(radio("blue")).toHaveAttribute("aria-checked", "true");
  });

  it("moves the tab stop to a radio chosen by click", async () => {
    const user = await renderGroup();

    await user.click(radio("red"));

    expect(tabStops()).toEqual([0, -1, -1]);
  });

  it("claims the arrows, so a scrolling panel doesn't scroll under them", async () => {
    await renderGroup();

    expect(press("green", "ArrowRight").defaultPrevented).toBe(true);
  });

  it("leaves keys it doesn't navigate with to the host", async () => {
    await renderGroup();

    expect(press("green", "a").defaultPrevented).toBe(false);
  });
});
