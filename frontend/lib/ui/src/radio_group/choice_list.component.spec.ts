import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import type { ComponentFixture } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import {
  ChoiceListComponent,
  type ChoiceOption,
} from "./choice_list.component";

type Speed = "slow" | "normal" | "fast";

const SPEEDS: readonly ChoiceOption<Speed>[] = [
  { id: "slow", name: "Slow", detail: "For a first run." },
  { id: "normal", name: "Normal", detail: "As the game is meant." },
  { id: "fast", name: "Fast" },
];

/**
 * Hosts a choice list as a settings drawer does, beside the label that names
 * it and the words that describe it, with the speed in use bound and every
 * press kept.
 */
@Component({
  selector: "fz-test-choice-host",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChoiceListComponent],
  template: `
    <span id="speed-label">Speed</span>
    <fz-choice-list
      labelledBy="speed-label"
      [describedBy]="describedBy()"
      [options]="speeds"
      [value]="speed()"
      (choose)="presses.update((all) => [...all, $event])"
    />
    <p id="speed-desc">Changing the speed starts a new run.</p>
  `,
})
class ChoiceHostComponent {
  readonly speeds = SPEEDS;
  readonly speed = signal<Speed>("normal");
  readonly describedBy = signal<string | undefined>("speed-desc");
  readonly presses = signal<readonly Speed[]>([]);
}

describe("ChoiceListComponent", () => {
  let fixture: ComponentFixture<ChoiceHostComponent>;
  let host: ChoiceHostComponent;
  let user: UserEvent;

  /** Renders the host at Normal, described. */
  async function renderList(): Promise<void> {
    ({ fixture } = await render(ChoiceHostComponent));
    host = fixture.componentInstance;
    user = userEvent.setup();
  }

  function radio(name: RegExp): HTMLElement {
    return screen.getByRole("radio", { name });
  }

  /** Returns each radio's `aria-checked`, in order. */
  function checks(): (string | null)[] {
    return screen
      .getAllByRole("radio")
      .map((each) => each.getAttribute("aria-checked"));
  }

  it("offers each choice as a radio, in order, named by its name and its detail", async () => {
    await renderList();

    expect(screen.getAllByRole("radio")).toEqual([
      radio(/^Slow\s*For a first run\.$/),
      radio(/^Normal\s*As the game is meant\.$/),
      radio(/^Fast$/),
    ]);
  });

  it("names the list by the element labelledBy names", async () => {
    await renderList();

    expect(screen.getByRole("radiogroup")).toHaveAccessibleName("Speed");
  });

  it("describes the list by the element describedBy names", async () => {
    await renderList();

    expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription(
      "Changing the speed starts a new run.",
    );
  });

  it("leaves the list undescribed without describedBy", async () => {
    await renderList();

    host.describedBy.set(undefined);
    await fixture.whenStable();

    expect(screen.getByRole("radiogroup")).not.toHaveAttribute(
      "aria-describedby",
    );
  });

  it("checks the value's choice, and only it", async () => {
    await renderList();

    expect(checks()).toEqual(["false", "true", "false"]);
  });

  it("follows a new value", async () => {
    await renderList();

    host.speed.set("fast");
    await fixture.whenStable();

    expect(checks()).toEqual(["false", "false", "true"]);
  });

  it("emits the choice pressed", async () => {
    await renderList();

    await user.click(radio(/^Slow/));

    expect(host.presses()).toEqual(["slow"]);
  });

  it("leaves checking the choice pressed to the app", async () => {
    await renderList();

    await user.click(radio(/^Slow/));

    expect(checks()).toEqual(["false", "true", "false"]);
  });

  it("emits the checked choice pressed again, so the app decides what that does", async () => {
    await renderList();

    await user.click(radio(/^Normal/));

    expect(host.presses()).toEqual(["normal"]);
  });

  it("is one tab stop, at the checked choice", async () => {
    await renderList();

    expect(screen.getAllByRole("radio").map((each) => each.tabIndex)).toEqual([
      -1, 0, -1,
    ]);
  });

  it("moves focus with the arrows without choosing", async () => {
    await renderList();
    radio(/^Normal/).focus();

    await user.keyboard("{ArrowDown}");

    expect(radio(/^Fast/)).toHaveFocus();
    expect(host.presses()).toEqual([]);
  });
});
