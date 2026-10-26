import { Component } from "@angular/core";
import { fireEvent, render, screen } from "@testing-library/angular";
import { LONG_PRESS_MS, LongPressDirective } from "./long_press.directive";

/** Hosts a long press, and writes down what reaches its own listeners. */
@Component({
  selector: "app-test-long-press-host",
  imports: [LongPressDirective],
  template: `
    <button
      type="button"
      appLongPress
      (longPress)="onLongPress($event)"
      (click)="heard.push('click')"
      (contextmenu)="heard.push('menu')"
    >
      <span data-testid="spot">Press here</span>
    </button>
  `,
})
class LongPressHostComponent {
  readonly heard: string[] = [];
  /** What the last long press began on. */
  pressed: EventTarget | null = null;

  onLongPress(event: PointerEvent): void {
    this.heard.push("long press");
    this.pressed = event.target;
  }
}

/** Renders the host, then stops the clock, so a press is timed by hand. */
async function renderPad(): Promise<LongPressHostComponent> {
  const { fixture } = await render(LongPressHostComponent);
  vi.useFakeTimers();
  return fixture.componentInstance;
}

/** Rests a pointer on the host's spot, a finger unless asked otherwise. */
function press(pointerType = "touch"): void {
  fireEvent.pointerDown(screen.getByTestId("spot"), {
    pointerType,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
  });
}

/** Moves a pointer across the host's spot as far as asked. */
function move(movedPx: number, pointerId = 1): void {
  fireEvent.pointerMove(screen.getByTestId("spot"), {
    pointerType: "touch",
    pointerId,
    clientX: movedPx,
    clientY: 0,
  });
}

describe("LongPressDirective", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tells a finger resting long enough", async () => {
    const host = await renderPad();

    press();
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(host.heard).toEqual(["long press"]);
  });

  it("tells nothing of a finger lifted sooner", async () => {
    const host = await renderPad();
    press();

    fireEvent.pointerUp(screen.getByTestId("spot"), { pointerId: 1 });
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(host.heard).toEqual([]);
  });

  it("tells nothing of a press the browser cancels", async () => {
    const host = await renderPad();
    press();

    fireEvent.pointerCancel(screen.getByTestId("spot"), { pointerId: 1 });
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(host.heard).toEqual([]);
  });

  it("tells nothing of a mouse held down", async () => {
    const host = await renderPad();

    press("mouse");
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(host.heard).toEqual([]);
  });

  it("tells a pen resting long enough", async () => {
    const host = await renderPad();

    press("pen");
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(host.heard).toEqual(["long press"]);
  });

  it("tells what the finger rests on", async () => {
    const host = await renderPad();

    press();
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(host.pressed).toBe(screen.getByTestId("spot"));
  });

  it("gives up once the finger moves, as it does to scroll", async () => {
    const host = await renderPad();
    press();

    move(30);
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(host.heard).toEqual([]);
  });

  it("allows a finger to drift a little", async () => {
    const host = await renderPad();
    press();

    move(5);
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(host.heard).toEqual(["long press"]);
  });

  it("pays no heed to another finger moving", async () => {
    const host = await renderPad();
    press();

    move(30, 2);
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(host.heard).toEqual(["long press"]);
  });

  it("keeps the click that ends a long press from the element", async () => {
    const host = await renderPad();
    press();
    vi.advanceTimersByTime(LONG_PRESS_MS);

    fireEvent.click(screen.getByTestId("spot"));

    expect(host.heard).toEqual(["long press"]);
  });

  it("lets the click after that one through", async () => {
    const host = await renderPad();
    press();
    vi.advanceTimersByTime(LONG_PRESS_MS);
    fireEvent.click(screen.getByTestId("spot"));

    fireEvent.click(screen.getByTestId("spot"));

    expect(host.heard).toEqual(["long press", "click"]);
  });

  it("lets a tap's click through", async () => {
    const host = await renderPad();
    press();
    fireEvent.pointerUp(screen.getByTestId("spot"), { pointerId: 1 });

    fireEvent.click(screen.getByTestId("spot"));

    expect(host.heard).toEqual(["click"]);
  });

  it("keeps the browser from opening its menu on a finger's press", async () => {
    await renderPad();
    press();

    const shown = fireEvent.contextMenu(screen.getByTestId("spot"));

    expect(shown).toBe(false);
  });

  it("keeps the menu a finger's press opens from the element's listeners", async () => {
    const host = await renderPad();
    press();

    fireEvent.contextMenu(screen.getByTestId("spot"));

    expect(host.heard).toEqual([]);
  });

  it("lets a mouse's right-click through", async () => {
    const host = await renderPad();
    press("mouse");

    fireEvent.contextMenu(screen.getByTestId("spot"));

    expect(host.heard).toEqual(["menu"]);
  });

  it("stops timing when the element goes", async () => {
    const { fixture } = await render(LongPressHostComponent);
    vi.useFakeTimers();
    const host = fixture.componentInstance;
    press();

    fixture.destroy();
    vi.advanceTimersByTime(LONG_PRESS_MS);

    expect(host.heard).toEqual([]);
  });
});
