import type { DevicePixelSize } from "../layout";
import {
  FakeResizeObserver,
  resize,
  watchResizes,
} from "../testing/fake_resize_observer";
import { watchDevicePixels } from "./device_pixels";

/** Stands in for a browser that can't count the device pixel box, such as Safari. */
class BoxlessResizeObserver extends FakeResizeObserver {
  override observe(target: Element, options?: ResizeObserverOptions): void {
    if (options) throw new TypeError("Unsupported box");
    super.observe(target);
  }
}

/** Watches an element of the page, gathering what it reports. */
function watchElement(element: Element): {
  sizes: (DevicePixelSize | null)[];
  stop: () => void;
  observer: FakeResizeObserver;
} {
  const sizes: (DevicePixelSize | null)[] = [];
  const stop = watchDevicePixels(element, (size) => {
    sizes.push(size);
  });
  const observer = FakeResizeObserver.made.at(-1);
  if (!stop || !observer) throw new Error("Nothing watches the element");
  return { sizes, stop, observer };
}

describe("watchDevicePixels", () => {
  watchResizes();

  it("does not watch where the browser can't", () => {
    vi.stubGlobal("ResizeObserver", undefined);

    const stop = watchDevicePixels(document.createElement("div"), () => {});

    expect(stop).toBeNull();
  });

  it("does not watch what isn't an element", () => {
    const stop = watchDevicePixels({}, () => {});

    expect(stop).toBeNull();
  });

  it("asks the browser to count the device pixel box", () => {
    const element = document.createElement("div");

    const { observer } = watchElement(element);

    expect(observer.watched.get(element)).toEqual({
      box: "device-pixel-content-box",
    });
  });

  it("reports the size the browser counted", () => {
    const element = document.createElement("div");
    const { sizes } = watchElement(element);

    resize(element, 412, 915, { width: 1082, height: 2402 });

    expect(sizes).toEqual([{ width: 1082, height: 2402 }]);
  });

  it("still reports a resize where the browser has no device pixel box", () => {
    vi.stubGlobal("ResizeObserver", BoxlessResizeObserver);
    const { sizes, observer } = watchElement(document.createElement("div"));

    observer.resized([{ contentRect: new DOMRect(0, 0, 412, 915) }]);

    expect(sizes).toEqual([null]);
  });

  it("stops the observer when asked", () => {
    const { stop, observer } = watchElement(document.createElement("div"));

    stop();

    expect(observer.watched.size).toBe(0);
  });
});
