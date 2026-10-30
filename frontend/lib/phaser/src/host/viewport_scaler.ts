import type { Game } from "phaser";
import { type Insets, NO_INSETS } from "../insets";
import { canvasPixelRatio } from "../layout";

/** Describes the subscription surface of a `MediaQueryList`. */
export interface PixelRatioQuery {
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
}

/** Describes the slice of `Window` the scaler reads. */
export interface ScalerWindow {
  /** Device pixels per CSS pixel for the display the window is on. */
  readonly devicePixelRatio: number;
  addEventListener(type: "resize", listener: () => void): void;
  removeEventListener(type: "resize", listener: () => void): void;
  /**
   * Matches a media query; a host without them leaves pixel ratio changes
   * unobserved.
   */
  matchMedia?(query: string): PixelRatioQuery;
  /**
   * Reads the parent's computed style; a host without it leaves the board no
   * top inset.
   */
  getComputedStyle?(element: MeasurableParent): {
    getPropertyValue(property: string): string;
  };
}

/**
 * Describes the element the canvas fills and is sized from, which has no border
 * or padding of its own.
 */
export interface MeasurableParent {
  getBoundingClientRect(): { width: number; height: number };
}

/** Describes a size in whole device pixels. */
export interface DevicePixelSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Starts reporting an element's size whenever it changes: in device pixels, or
 * null where the host cannot count them. Returns a function that stops it, or
 * null where the host cannot watch the element at all.
 */
export type WatchDevicePixels = (
  target: MeasurableParent,
  onResize: (size: DevicePixelSize | null) => void,
) => (() => void) | null;

/**
 * Watches an element with a `ResizeObserver`, counting its content box in device
 * pixels where the browser can.
 */
export const watchDevicePixels: WatchDevicePixels = (target, onResize) => {
  if (
    typeof ResizeObserver === "undefined" ||
    typeof Element === "undefined" ||
    !(target instanceof Element)
  ) {
    return null;
  }
  const observer = new ResizeObserver((entries) => {
    // Optional because a browser without the box leaves it out.
    const latest = entries[entries.length - 1] as
      | Partial<Pick<ResizeObserverEntry, "devicePixelContentBoxSize">>
      | undefined;
    const box = latest?.devicePixelContentBoxSize?.[0];
    onResize(box ? { width: box.inlineSize, height: box.blockSize } : null);
  });
  try {
    observer.observe(target, { box: "device-pixel-content-box" });
  } catch {
    // A browser without the box, such as Safari, still reports the resize.
    observer.observe(target);
  }
  return () => {
    observer.disconnect();
  };
};

/**
 * Sizes the game canvas so it rasterizes at the display's true resolution.
 *
 * Phaser's own scale modes size the canvas in CSS pixels, which blurs the board
 * on any display with more than one device pixel per CSS pixel.
 */
export class ViewportScaler {
  /**
   * The pixel ratio a canvas of any size may render at. Above it, the canvas
   * must also hold no more than
   * {@link ViewportScaler.MAX_BUDGETED_DEVICE_PIXELS}.
   */
  static readonly UNBUDGETED_PIXEL_RATIO = 2;

  /**
   * The most device pixels a canvas rendered above
   * {@link ViewportScaler.UNBUDGETED_PIXEL_RATIO} may hold: room for a large
   * phone at 3x, whose canvas a browser would otherwise stretch, but not for a
   * laptop, which keeps to 2x.
   */
  static readonly MAX_BUDGETED_DEVICE_PIXELS = 4_500_000;

  /**
   * The custom properties the parent declares its insets in: how far in from
   * each edge the shell's own chrome, such as a header, lies over the canvas.
   */
  static readonly INSET_PROPERTIES: {
    readonly [Edge in keyof Insets]: string;
  } = {
    top: "--fz-canvas-inset-top",
    right: "--fz-canvas-inset-right",
    bottom: "--fz-canvas-inset-bottom",
    left: "--fz-canvas-inset-left",
  };

  /** The insets as last read, in CSS pixels. */
  private insetsValue: Insets = NO_INSETS;

  /** The pixel ratio the canvas was last sized at. */
  private pixelRatioValue = 1;

  /** Media query tracking the current pixel ratio, re-armed after each change. */
  private pixelRatioQuery: PixelRatioQuery | null = null;

  /** The pixel ratio {@link pixelRatioQuery} watches for a change from. */
  private watchedRatio: number | null = null;

  /** The parent's size in device pixels, as the browser last counted it. */
  private devicePixelSize: DevicePixelSize | null = null;

  /**
   * Stops watching the parent for size changes the window never hears about,
   * such as a side panel opening.
   */
  private stopWatchingParent: (() => void) | null = null;

  private readonly onViewportChange = (): void => {
    this.apply();
  };

  /**
   * Creates a scaler that sizes the game's canvas to fill `parent`.
   *
   * @param watchParent Reports the parent's size as it changes.
   */
  constructor(
    private readonly window: ScalerWindow,
    private readonly game: Game,
    private readonly parent: MeasurableParent,
    private readonly watchParent: WatchDevicePixels = watchDevicePixels,
  ) {}

  /**
   * The pixel ratio the canvas is currently rendered at, or 1 before it has
   * been sized; see {@link ViewportScaler.pixelRatioFor}.
   */
  get pixelRatio(): number {
    return this.pixelRatioValue;
  }

  /**
   * How far in from each edge the shell's chrome lies over the canvas, in CSS
   * pixels, as the parent declared it when the canvas was last sized.
   *
   * Read once per resize rather than per frame, since reading a computed style
   * can force the browser to lay the page out again.
   */
  get insets(): Insets {
    return this.insetsValue;
  }

  /**
   * Applies the current size and starts tracking the parent's size and the
   * DPR.
   *
   * The parent's size comes from watching it, which reports after layout,
   * where the shell has settled; the window's `resize` comes before the shell
   * has moved its chrome, so it sizes the canvas only where nothing can watch
   * the parent.
   */
  start(): void {
    this.apply();
    this.stopWatchingParent = this.watchParent(this.parent, (size) => {
      this.devicePixelSize = size;
      this.apply();
    });
    if (!this.stopWatchingParent) {
      this.window.addEventListener("resize", this.onViewportChange);
    }
  }

  /** Stops tracking changes, releasing every listener the scaler registered. */
  stop(): void {
    this.window.removeEventListener("resize", this.onViewportChange);
    this.pixelRatioQuery?.removeEventListener("change", this.onViewportChange);
    this.pixelRatioQuery = null;
    this.watchedRatio = null;
    this.stopWatchingParent?.();
    this.stopWatchingParent = null;
  }

  /** Resizes the canvas to the parent's current size at the current DPR. */
  apply(): void {
    const bounds = this.parent.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.floor(bounds.width));
    const cssHeight = Math.max(1, Math.floor(bounds.height));
    const pixelRatio = this.pixelRatioFor(cssWidth, cssHeight);
    this.pixelRatioValue = pixelRatio;
    const exact = this.exactDevicePixelSize(bounds, pixelRatio);

    // Makes Phaser's displayScale the pixel ratio, so pointer input maps from
    // CSS pixels into the device-pixel game space.
    this.game.scale.setZoom(1 / pixelRatio);
    const style = this.game.canvas.style;
    if (exact) {
      this.game.scale.resize(exact.width, exact.height);
      // The size the browser counted the device pixels of, unrounded, so each
      // pixel of the canvas lands on one of the screen's.
      style.width = `${bounds.width}px`;
      style.height = `${bounds.height}px`;
    } else {
      this.game.scale.resize(cssWidth * pixelRatio, cssHeight * pixelRatio);
      // Phaser only rewrites the canvas CSS size when zoom is not 1, so a resize
      // taken at a pixel ratio of 1 would otherwise leave behind the pixel
      // values written while an earlier, higher ratio was in effect.
      style.width = `${cssWidth}px`;
      style.height = `${cssHeight}px`;
    }
    // Phaser measured the canvas, to convert pointer positions, before its CSS
    // size was pinned.
    this.game.scale.refresh();

    this.refreshInsets();
    this.watchPixelRatio();
  }

  /**
   * Reads the insets the parent declares again, for chrome that moved without
   * the canvas changing size, such as a rail changing sides.
   */
  refreshInsets(): void {
    this.insetsValue = this.readInsets();
  }

  /** Reads the insets the parent declares, zero for any it declares none for. */
  private readInsets(): Insets {
    const style = this.window.getComputedStyle?.(this.parent);
    const read = (edge: keyof Insets): number => {
      const property = ViewportScaler.INSET_PROPERTIES[edge];
      const inset = Number.parseFloat(style?.getPropertyValue(property) ?? "");
      return Number.isFinite(inset) ? inset : 0;
    };
    return {
      top: read("top"),
      right: read("right"),
      bottom: read("bottom"),
      left: read("left"),
    };
  }

  /**
   * Returns the pixel ratio to render a canvas of a CSS size at: the display's,
   * as {@link canvasPixelRatio} bounds it, but above
   * {@link ViewportScaler.UNBUDGETED_PIXEL_RATIO} only as far as the canvas
   * stays within {@link ViewportScaler.MAX_BUDGETED_DEVICE_PIXELS}.
   */
  private pixelRatioFor(cssWidth: number, cssHeight: number): number {
    const wanted = canvasPixelRatio(this.window.devicePixelRatio);
    if (wanted <= ViewportScaler.UNBUDGETED_PIXEL_RATIO) return wanted;

    const affordable = Math.sqrt(
      ViewportScaler.MAX_BUDGETED_DEVICE_PIXELS / (cssWidth * cssHeight),
    );
    return Math.max(
      ViewportScaler.UNBUDGETED_PIXEL_RATIO,
      Math.min(wanted, affordable),
    );
  }

  /**
   * Returns the parent's size in device pixels, to size the canvas from, when
   * the browser has counted it and the canvas renders at the display's own
   * ratio; or null to size it from CSS pixels.
   *
   * A count that disagrees with the parent's CSS size predates a resize the
   * browser has yet to report, so it is ignored.
   */
  private exactDevicePixelSize(
    bounds: { width: number; height: number },
    pixelRatio: number,
  ): DevicePixelSize | null {
    const size = this.devicePixelSize;
    if (!size || pixelRatio !== this.window.devicePixelRatio) return null;
    const agrees =
      Math.abs(size.width - bounds.width * pixelRatio) <= 1 &&
      Math.abs(size.height - bounds.height * pixelRatio) <= 1;
    return agrees ? size : null;
  }

  /** The display's raw pixel ratio, floored at 1 for non-conforming hosts. */
  private get devicePixelRatio(): number {
    return Math.max(this.window.devicePixelRatio || 1, 1);
  }

  /**
   * Replaces the pixel ratio media query with one for the current ratio, whose
   * `change` fires when the window moves display or the browser zooms; one
   * for the ratio already watched is kept.
   */
  private watchPixelRatio(): void {
    const ratio = this.devicePixelRatio;
    if (ratio === this.watchedRatio) return;
    const query = this.window.matchMedia?.(`(resolution: ${ratio}dppx)`);
    if (!query) {
      return;
    }

    this.pixelRatioQuery?.removeEventListener("change", this.onViewportChange);
    this.pixelRatioQuery = query;
    this.watchedRatio = ratio;
    query.addEventListener("change", this.onViewportChange);
  }
}
