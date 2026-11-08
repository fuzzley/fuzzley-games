import { FakeDisplay } from "../testing/fake_display";
import { watchDevicePixelRatio } from "./device_pixel_ratio";

/** Watches a display's ratio, counting each change heard. */
function watch(display: FakeDisplay): {
  heard: { changes: number };
  stop: () => void;
} {
  const heard = { changes: 0 };
  const stop = watchDevicePixelRatio(display, () => {
    heard.changes++;
  });
  if (!stop) throw new Error("Nothing watches the display");
  return { heard, stop };
}

describe("watchDevicePixelRatio", () => {
  it("watches the ratio the display has", () => {
    const display = new FakeDisplay(2);

    watch(display);

    expect(display.listenedTo).toEqual(["(resolution: 2dppx)"]);
  });

  it("hears a change of ratio", () => {
    const display = new FakeDisplay(1);
    const { heard } = watch(display);

    display.setPixelRatio(1.25);

    expect(heard.changes).toBe(1);
  });

  it("watches the new ratio after a change, and that alone", () => {
    const display = new FakeDisplay(2);
    watch(display);

    display.setPixelRatio(1);

    expect(display.listenedTo).toEqual(["(resolution: 1dppx)"]);
  });

  it("hears each change in turn", () => {
    const display = new FakeDisplay(1);
    const { heard } = watch(display);

    display.setPixelRatio(2);
    display.setPixelRatio(2.5);

    expect(heard.changes).toBe(2);
  });

  it("watches a ratio below 1, as a page zoomed out has", () => {
    const display = new FakeDisplay(0.5);
    const { heard } = watch(display);

    display.setPixelRatio(0.67);

    expect(heard.changes).toBe(1);
  });

  it("watches a ratio of 1 for a window that gives none", () => {
    const display = new FakeDisplay(0);

    watch(display);

    expect(display.listenedTo).toEqual(["(resolution: 1dppx)"]);
  });

  it("stops listening when asked", () => {
    const display = new FakeDisplay(2);
    const { stop } = watch(display);

    stop();

    expect(display.listenedTo).toEqual([]);
  });

  it("does not watch a window without media queries", () => {
    expect(watchDevicePixelRatio({ devicePixelRatio: 2 }, () => {})).toBeNull();
  });

  it("does not watch where there is no window", () => {
    expect(watchDevicePixelRatio(null, () => {})).toBeNull();
  });
});
