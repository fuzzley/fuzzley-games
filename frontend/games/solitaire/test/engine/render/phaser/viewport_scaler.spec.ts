import { describe, it, expect } from "vitest";
import {
  MeasurableParent,
  PixelRatioQuery,
  ScalableGame,
  ScalerWindow,
} from "@/engine/render/phaser/viewport_scaler";
import { ViewportScaler } from "@/engine/render/phaser/viewport_scaler";

/** A media query that records its listeners so tests can fire a DPR change. */
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

/** A window whose pixel ratio and size the test drives directly. */
class FakeWindow implements ScalerWindow {
  public devicePixelRatio: number;
  public readonly resizeListeners: (() => void)[] = [];
  public readonly queries: FakePixelRatioQuery[] = [];

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

  /** Fires the resize event, as the browser does when the window changes size. */
  fireResize(): void {
    for (const listener of [...this.resizeListeners]) listener();
  }

  /** The most recently armed pixel ratio query. */
  get latestQuery(): FakePixelRatioQuery {
    return this.queries[this.queries.length - 1];
  }
}

/** A game recording the canvas size and zoom the scaler applies to it. */
class FakeGame implements ScalableGame {
  public readonly canvas = { style: { width: "", height: "" } };
  public zoom = 1;
  public backingWidth = 0;
  public backingHeight = 0;

  public readonly scale = {
    setZoom: (zoom: number): void => {
      this.zoom = zoom;
    },
    resize: (width: number, height: number): void => {
      this.backingWidth = width;
      this.backingHeight = height;
    },
  };
}

/** A parent element of a fixed CSS size. */
class FakeParent implements MeasurableParent {
  constructor(
    public width: number,
    public height: number,
  ) {}

  getBoundingClientRect(): { width: number; height: number } {
    return { width: this.width, height: this.height };
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
  scaler: ViewportScaler;
} {
  const window = new FakeWindow(devicePixelRatio);
  const game = new FakeGame();
  const parent = new FakeParent(cssWidth, cssHeight);
  const scaler = new ViewportScaler(window, game, parent);
  scaler.start();
  return { window, game, parent, scaler };
}

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
