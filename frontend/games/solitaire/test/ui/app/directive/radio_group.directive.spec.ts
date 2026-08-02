// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { RadioGroupDirective } from "@/ui/app/directive/radio_group.directive";
import { queryAll, queryRequired } from "@test/support/dom";
import { flushMicrotasks } from "@test/support/async";

/**
 * A group shaped like the ones in the application: buttons carrying
 * `role="radio"`, one of them checked, with the checked one bound rather than
 * fixed so the roving tab stop has something to follow.
 */
@Component({
  selector: "test-radio-host",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RadioGroupDirective],
  template: `
    <div appRadioGroup aria-label="Colours">
      @for (colour of colours; track colour) {
        <button
          type="button"
          role="radio"
          [attr.data-colour]="colour"
          [attr.aria-checked]="chosen() === colour"
          (click)="chosen.set(colour)"
        >
          <span>{{ colour }}</span>
        </button>
      }
    </div>
  `,
})
class RadioHostComponent {
  readonly colours = ["red", "green", "blue"];
  readonly chosen = signal("green");
}

describe("RadioGroupDirective", () => {
  let fixture: ComponentFixture<RadioHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RadioHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  /** The group's radios, in document order. */
  function radios(): HTMLElement[] {
    return queryAll(fixture, '[role="radio"]');
  }

  /** Each radio's tabindex, in document order. */
  function tabStops(): number[] {
    return radios().map((radio) => radio.tabIndex);
  }

  /**
   * Presses a key on one of the radios.
   *
   * `cancelable`, like a real keydown: `preventDefault()` is a no-op otherwise,
   * and the assertion that the directive claims the arrows would pass on an
   * event that could never have been claimed.
   */
  function pressKey(index: number, key: string): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
    });
    radios()[index].dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  it("declares the group's role, so a host cannot take the behaviour without it", () => {
    expect(queryRequired(fixture, "[appRadioGroup]").getAttribute("role")).toBe(
      "radiogroup",
    );
  });

  it("leaves only the checked radio in the tab order", () => {
    expect(tabStops()).toEqual([-1, 0, -1]);
  });

  it("moves the tab stop when the choice changes", async () => {
    fixture.componentInstance.chosen.set("blue");
    fixture.detectChanges();
    await flushMicrotasks();

    expect(tabStops()).toEqual([-1, -1, 0]);
  });

  it("falls back to the first radio when none is checked", async () => {
    fixture.componentInstance.chosen.set("none of them");
    fixture.detectChanges();
    await flushMicrotasks();

    expect(tabStops()).toEqual([0, -1, -1]);
  });

  it("moves focus to the next radio on ArrowRight", () => {
    pressKey(1, "ArrowRight");

    expect(document.activeElement).toBe(radios()[2]);
  });

  it("moves focus to the previous radio on ArrowLeft", () => {
    pressKey(1, "ArrowLeft");

    expect(document.activeElement).toBe(radios()[0]);
  });

  it("wraps past the end of the group", () => {
    pressKey(2, "ArrowRight");

    expect(document.activeElement).toBe(radios()[0]);
  });

  it("wraps past the start of the group", () => {
    pressKey(0, "ArrowLeft");

    expect(document.activeElement).toBe(radios()[2]);
  });

  it("takes Home to the first radio", () => {
    pressKey(2, "Home");

    expect(document.activeElement).toBe(radios()[0]);
  });

  it("takes End to the last radio", () => {
    pressKey(0, "End");

    expect(document.activeElement).toBe(radios()[2]);
  });

  it("carries the tab stop along with the arrows, so the group stays one stop", () => {
    pressKey(1, "ArrowRight");

    expect(tabStops()).toEqual([-1, -1, 0]);
  });

  it("moves focus without choosing, so a rule change is never a keystroke away", () => {
    pressKey(1, "ArrowRight");

    expect(fixture.componentInstance.chosen()).toBe("green");
    expect(radios()[2].getAttribute("aria-checked")).toBe("false");
  });

  it("chooses on click, which is what Space and Enter reach on a button", async () => {
    radios()[2].click();
    fixture.detectChanges();
    await flushMicrotasks();

    expect(fixture.componentInstance.chosen()).toBe("blue");
    expect(tabStops()).toEqual([-1, -1, 0]);
  });

  it("leaves keys it does not navigate with to the host", () => {
    const event = pressKey(1, "a");

    expect(event.defaultPrevented).toBe(false);
  });

  it("claims the arrows, so the drawer does not scroll under them", () => {
    const event = pressKey(1, "ArrowRight");

    expect(event.defaultPrevented).toBe(true);
  });
});
