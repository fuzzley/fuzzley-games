import { afterEach, describe, it, expect, vi } from "vitest";
import {
  DevicePixelSize,
  MeasurableParent,
  PixelRatioQuery,
  ScalableGame,
  ScalerWindow,
  ViewportScaler,
  watchDevicePixels,
} from "@/engine/render/phaser/host/viewport_scaler";
import { NO_INSETS } from "@/engine/render/layout/viewport";

/** Stands in for a media query, recording listeners to fire a DPR change. */
class FakePixelRatioQuery implements PixelRatioQuery {
  public readonly listeners: (() => void)[] = [];

  constructor(public readonly query: string) {}

  addEventListener(_type: "change", listener: () => void): void {
    this.listeners.push(listener);
  }

  removeEventListener(_type: "change", listener: () => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) this.listeners.splice(index, 1);
  }

  /** Fires the change event, as the browser does when the DPR stops matching. */
  fireChange(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

/** Stands in for a window whose pixel ratio and size a test drives. */
class FakeWindow implements ScalerWindow {
  public devicePixelRatio: number;
  public readonly resizeListeners: (() => void)[] = [];
  public readonly queries: FakePixelRatioQuery[] = [];
  /** The custom properties the parent declares, by name. */
  public readonly parentStyle = new Map<string, string>();

  constructor(devicePixelRatio: number) {
    this.devicePixelRatio = devicePixelRatio;
  }

  addEventListener(_type: "resize", listener: () => void): void {
    this.resizeListeners.push(listener);
  }

  removeEventListener(_type: "resize", listener: () => void): void {
    const index = this.resizeListeners.indexOf(listener);
    if (index !== -1) this.resizeListeners.splice(index, 1);
  }

  matchMedia(query: string): PixelRatioQuery {
    const created = new FakePixelRatioQuery(query);
    this.queries.push(created);
    return created;
  }

  getComputedStyle(): { getPropertyValue(property: string): string } {
    return {
      getPropertyValue: (property) => this.parentStyle.get(property) ?? "",
    };
  }

  /** Fires the resize event, as the browser does when the window changes size. */
  fireResize(): void {
    for (const listener of [...this.resizeListeners]) listener();
  }

  /** The most recently armed pixel ratio query. */
  get latestQuery(): FakePixelRatioQuery {
    return this.queries[this.queries.length - 1];
  }
}

/** Stands in for a game, recording the canvas size and zoom it is given. */
class FakeGame implements ScalableGame {
  public readonly canvas = { style: { width: "", height: "" } };
  public zoom = 1;
  public backingWidth = 0;
  public backingHeight = 0;
  /** The canvas's CSS width when Phaser last measured it for input. */
  public measuredWidth = "";

  public readonly scale = {
    setZoom: (zoom: number): void => {
      this.zoom = zoom;
    },
    resize: (width: number, height: number): void => {
      this.backingWidth = width;
      this.backingHeight = height;
    },
    refresh: (): void => {
      this.measuredWidth = this.canvas.style.width;
    },
  };
}

/** Stands in for a parent element of a fixed CSS size. */
class FakeParent implements MeasurableParent {
  constructor(
    public width: number,
    public height: number,
  ) {}

  getBoundingClientRect(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}

/** Stands in for the browser counting the parent's device pixels. */
class FakeParentWatch {
  private onResize: ((size: DevicePixelSize | null) => void) | null = null;
  public stopped = false;

  readonly watch = (
    _target: MeasurableParent,
    onResize: (size: DevicePixelSize | null) => void,
  ): (() => void) => {
    this.onResize = onResize;
    return () => {
      this.stopped = true;
    };
  };

  /** Reports the parent's size, as the browser does after laying it out. */
  report(size: DevicePixelSize | null): void {
    this.onResize?.(size);
  }
}

/** Builds a started scaler along with the fakes driving it. */
function startScaler(
  devicePixelRatio: number,
  cssWidth = 800,
  cssHeight = 600,
): {
  window: FakeWindow;
  game: FakeGame;
  parent: FakeParent;
  parentWatch: FakeParentWatch;
  scaler: ViewportScaler;
} {
  const window = new FakeWindow(devicePixelRatio);
  const game = new FakeGame();
  const parent = new FakeParent(cssWidth, cssHeight);
  const parentWatch = new FakeParentWatch();
  const scaler = new ViewportScaler(window, game, parent, parentWatch.watch);
  scaler.start();
  return { window, game, parent, parentWatch, scaler };
}

describe("ViewportScaler's insets", () => {
  const { top, right, bottom, left } = ViewportScaler.INSET_PROPERTIES;

  it("reads the inset its parent declares", () => {
    const { window, scaler } = startScaler(1);
    window.parentStyle.set(top, "73px");

    scaler.apply();

    expect(scaler.insets.top).toBe(73);
  });

  it("reads an inset on every edge", () => {
    const { window, scaler } = startScaler(1);
    window.parentStyle.set(top, "1px");
    window.parentStyle.set(right, "2px");
    window.parentStyle.set(bottom, "3px");
    window.parentStyle.set(left, "4px");

    scaler.apply();

    expect(scaler.insets).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
  });

  it("reads no inset when the parent declares none", () => {
    const { scaler } = startScaler(1);

    expect(scaler.insets).toEqual(NO_INSETS);
  });

  it("reads the inset afresh when the window changes size", () => {
    const { window, scaler } = startScaler(1);
    window.parentStyle.set(top, "73px");
    scaler.apply();
    window.parentStyle.set(top, "0px");
    window.parentStyle.set(left, "60px");

    window.fireResize();

    expect([scaler.insets.top, scaler.insets.left]).toEqual([0, 60]);
  });

  it("reads the insets again when asked, without the window resizing", () => {
    const { window, scaler } = startScaler(1);
    window.parentStyle.set(left, "64px");
    scaler.apply();
    window.parentStyle.set(left, "0px");
    window.parentStyle.set(right, "64px");

    scaler.refreshInsets();

    expect([scaler.insets.left, scaler.insets.right]).toEqual([0, 64]);
  });

  it("reads no inset from a host that cannot read styles", () => {
    const window = Object.assign(new FakeWindow(1), {
      getComputedStyle: undefined,
    });
    const scaler = new ViewportScaler(
      window,
      new FakeGame(),
      new FakeParent(800, 600),
    );

    scaler.start();

    expect(scaler.insets).toEqual(NO_INSETS);
  });
});

describe("ViewportScaler", () => {
  it("sizes the canvas backing store in device pixels", () => {
    const { game } = startScaler(2, 800, 600);

    expect([game.backingWidth, game.backingHeight]).toEqual([1600, 1200]);
  });

  it("pins the canvas CSS size to the parent's layout size", () => {
    const { game } = startScaler(2, 800, 600);

    expect([game.canvas.style.width, game.canvas.style.height]).toEqual([
      "800px",
      "600px",
    ]);
  });

  it("zooms by the reciprocal of the pixel ratio so input still converts", () => {
    const { game } = startScaler(2);

    expect(game.zoom).toBe(0.5);
  });

  it("leaves the backing store at the layout size on a 1x display", () => {
    const { game } = startScaler(1, 800, 600);

    expect([game.backingWidth, game.backingHeight, game.zoom]).toEqual([
      800, 600, 1,
    ]);
  });

  it("clamps the pixel ratio so very high density displays stay affordable", () => {
    const { scaler, game } = startScaler(4, 800, 600);

    expect([scaler.pixelRatio, game.backingWidth]).toEqual([
      ViewportScaler.MAX_PIXEL_RATIO,
      800 * ViewportScaler.MAX_PIXEL_RATIO,
    ]);
  });

  it("renders a phone at its own ratio of 3, so the browser need not stretch it", () => {
    const { game } = startScaler(3, 390, 844);

    expect([game.backingWidth, game.backingHeight]).toEqual([1170, 2532]);
  });

  it("renders a fractional ratio above 2 as it is", () => {
    const { scaler } = startScaler(2.625, 412, 915);

    expect(scaler.pixelRatio).toBe(2.625);
  });

  it("holds a canvas above 2x to the budget of device pixels", () => {
    const { scaler } = startScaler(3, 1280, 720);

    expect(scaler.pixelRatio).toBeCloseTo(
      Math.sqrt(ViewportScaler.MAX_BUDGETED_DEVICE_PIXELS / (1280 * 720)),
    );
  });

  it("never holds a canvas below 2x, however large", () => {
    const { scaler } = startScaler(3, 2560, 1440);

    expect(scaler.pixelRatio).toBe(ViewportScaler.UNBUDGETED_PIXEL_RATIO);
  });

  it("renders at 2x whatever the canvas size, as before the budget", () => {
    const { scaler } = startScaler(2, 2560, 1440);

    expect(scaler.pixelRatio).toBe(2);
  });

  it("lowers the ratio when the canvas grows past the budget", () => {
    const { window, parent, scaler } = startScaler(3, 390, 844);
    parent.width = 2560;
    parent.height = 1440;

    window.fireResize();

    expect(scaler.pixelRatio).toBe(ViewportScaler.UNBUDGETED_PIXEL_RATIO);
  });

  it("reports a ratio of 1 before the canvas has been sized", () => {
    const scaler = new ViewportScaler(
      new FakeWindow(3),
      new FakeGame(),
      new FakeParent(390, 844),
    );

    expect(scaler.pixelRatio).toBe(1);
  });

  it("treats a non-conforming pixel ratio as 1", () => {
    const { scaler } = startScaler(0);

    expect(scaler.pixelRatio).toBe(1);
  });

  it("floors fractional layout sizes so the backing store is a whole number", () => {
    const { game } = startScaler(2, 800.6, 600.4);

    expect([game.backingWidth, game.backingHeight]).toEqual([1600, 1200]);
  });

  it("keeps a collapsed parent from producing a zero-sized canvas", () => {
    const { game } = startScaler(1, 0, 0);

    expect([game.backingWidth, game.backingHeight]).toEqual([1, 1]);
  });

  it("resizes the canvas when the window resizes", () => {
    const { window, game, parent } = startScaler(2, 800, 600);
    parent.width = 1000;
    parent.height = 750;

    window.fireResize();

    expect([game.backingWidth, game.backingHeight]).toEqual([2000, 1500]);
  });

  it("rewrites the CSS size on a resize taken at a pixel ratio of 1", () => {
    const { window, game, parent } = startScaler(1, 800, 600);
    parent.width = 1000;

    window.fireResize();

    expect(game.canvas.style.width).toBe("1000px");
  });

  it("observes the pixel ratio currently in effect", () => {
    const { window } = startScaler(2);

    expect(window.latestQuery.query).toBe("(resolution: 2dppx)");
  });

  it("re-sizes the canvas when the display's pixel ratio changes", () => {
    const { window, game } = startScaler(2, 800, 600);
    window.devicePixelRatio = 1;

    window.latestQuery.fireChange();

    expect([game.backingWidth, game.backingHeight]).toEqual([800, 600]);
  });

  it("re-arms the query against the new ratio after a change", () => {
    const { window } = startScaler(2);
    window.devicePixelRatio = 1;

    window.latestQuery.fireChange();

    expect(window.latestQuery.query).toBe("(resolution: 1dppx)");
  });

  it("leaves only one live pixel ratio query after a change", () => {
    const { window } = startScaler(2);
    window.devicePixelRatio = 1;

    window.latestQuery.fireChange();

    expect(window.queries.map((query) => query.listeners.length)).toEqual([
      0, 1,
    ]);
  });

  it("releases every listener on stop", () => {
    const { window, scaler } = startScaler(2);

    scaler.stop();

    expect([
      window.resizeListeners.length,
      window.latestQuery.listeners.length,
    ]).toEqual([0, 0]);
  });

  it("still sizes the canvas on a host without media query support", () => {
    const window: ScalerWindow = {
      devicePixelRatio: 2,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    const game = new FakeGame();
    const scaler = new ViewportScaler(window, game, new FakeParent(800, 600));

    scaler.start();

    expect(game.backingWidth).toBe(1600);
  });
});

describe("ViewportScaler in device pixels", () => {
  it("sizes the canvas to the device pixels the browser counted", () => {
    // 412 CSS px at 2.625 is 1081.5 device px, which the browser makes 1082.
    const { game, parentWatch } = startScaler(2.625, 412, 915);

    parentWatch.report({ width: 1082, height: 2402 });

    expect([game.backingWidth, game.backingHeight]).toEqual([1082, 2402]);
  });

  it("pins the canvas to the parent's unrounded CSS size", () => {
    const { game, parentWatch } = startScaler(3, 390.4, 844);

    parentWatch.report({ width: 1171, height: 2532 });

    expect([game.canvas.style.width, game.canvas.style.height]).toEqual([
      "390.4px",
      "844px",
    ]);
  });

  it("ignores a count from before a resize the browser has yet to report", () => {
    const { window, game, parent, parentWatch } = startScaler(3, 390, 844);
    parentWatch.report({ width: 1170, height: 2532 });
    parent.width = 500;

    window.fireResize();

    expect(game.backingWidth).toBe(1500);
  });

  it("ignores the count while the budget holds the ratio down", () => {
    const { scaler, game, parentWatch } = startScaler(3, 1280, 720);

    parentWatch.report({ width: 3840, height: 2160 });

    expect(game.backingWidth).toBeCloseTo(1280 * scaler.pixelRatio);
  });

  it("sizes from CSS pixels where the browser cannot count device pixels", () => {
    const { game, parentWatch } = startScaler(2, 800, 600);

    parentWatch.report(null);

    expect([game.backingWidth, game.canvas.style.width]).toEqual([
      1600,
      "800px",
    ]);
  });

  it("measures the canvas for input only once its CSS size is pinned", () => {
    // Phaser converts a pointer position by the canvas's measured size, which
    // it took before the scaler pinned it.
    const { game, parentWatch } = startScaler(3, 390.4, 844);

    parentWatch.report({ width: 1171, height: 2532 });

    expect(game.measuredWidth).toBe("390.4px");
  });

  it("stops watching the parent on stop", () => {
    const { scaler, parentWatch } = startScaler(2);

    scaler.stop();

    expect(parentWatch.stopped).toBe(true);
  });
});

describe("watchDevicePixels", () => {
  /** Stands in for a browser's ResizeObserver, recording how it was asked. */
  class FakeResizeObserver {
    static latest: FakeResizeObserver | null = null;
    static acceptsDevicePixelBox = true;
    public options: ResizeObserverOptions | undefined;
    public disconnected = false;

    constructor(public readonly callback: ResizeObserverCallback) {
      FakeResizeObserver.latest = this;
    }

    observe(_target: Element, options?: ResizeObserverOptions): void {
      if (options && !FakeResizeObserver.acceptsDevicePixelBox) {
        throw new TypeError("Unsupported box");
      }
      this.options = options;
    }

    disconnect(): void {
      this.disconnected = true;
    }

    /** Reports entries, as the browser does after laying the page out. */
    report(entry: Partial<ResizeObserverEntry>): void {
      this.callback(
        [entry as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      );
    }
  }

  /** Stands in for an element, so the watcher accepts it. */
  class FakeElement {
    getBoundingClientRect(): { width: number; height: number } {
      return { width: 0, height: 0 };
    }
  }

  /** Watches a fake element and returns what it reported. */
  function watchFakeElement(): {
    sizes: (DevicePixelSize | null)[];
    stop: (() => void) | null;
  } {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    vi.stubGlobal("Element", FakeElement);
    const sizes: (DevicePixelSize | null)[] = [];
    const stop = watchDevicePixels(new FakeElement(), (size) => {
      sizes.push(size);
    });
    return { sizes, stop };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    FakeResizeObserver.latest = null;
    FakeResizeObserver.acceptsDevicePixelBox = true;
  });

  it("does not watch a host without elements", () => {
    const stop = watchDevicePixels(new FakeParent(800, 600), () => {});

    expect(stop).toBeNull();
  });

  it("asks the browser to count the device pixel box", () => {
    watchFakeElement();

    expect(FakeResizeObserver.latest?.options).toEqual({
      box: "device-pixel-content-box",
    });
  });

  it("reports the size the browser counted", () => {
    const { sizes } = watchFakeElement();

    FakeResizeObserver.latest?.report({
      devicePixelContentBoxSize: [{ inlineSize: 1082, blockSize: 2402 }],
    });

    expect(sizes).toEqual([{ width: 1082, height: 2402 }]);
  });

  it("still reports a resize where the browser has no device pixel box", () => {
    FakeResizeObserver.acceptsDevicePixelBox = false;
    const { sizes } = watchFakeElement();

    FakeResizeObserver.latest?.report({});

    expect(sizes).toEqual([null]);
  });

  it("stops the observer when asked", () => {
    const { stop } = watchFakeElement();

    stop?.();

    expect(FakeResizeObserver.latest?.disconnected).toBe(true);
  });
});
