import type { Game } from "phaser";
import { type Insets, NO_INSETS } from "../insets";
import { type DevicePixelSize, canvasSizeFor } from "../layout";
import {
  type PixelRatioWindow,
  type StyleWindow,
  type StyledElement,
  type WatchDevicePixels,
  canvasInsetsOf,
  watchDevicePixelRatio,
  watchDevicePixels,
} from "../measure";

/** Describes the slice of `Window` the scaler reads. */
export interface ScalerWindow extends PixelRatioWindow, StyleWindow {
  addEventListener(type: "resize", listener: () => void): void;
  removeEventListener(type: "resize", listener: () => void): void;
}

/**
 * Describes the element the canvas fills and is sized from, which has no border
 * or padding of its own, declares the canvas's insets, and is measured
 * through its own window, if its document has one.
 */
export interface MeasurableParent extends StyledElement {
  readonly ownerDocument: { readonly defaultView: ScalerWindow | null };
  getBoundingClientRect(): { width: number; height: number };
}

/**
 * Sizes the game canvas so it rasterizes at the display's true resolution.
 *
 * Phaser's own scale modes size the canvas in CSS pixels, which blurs the board
 * on any display with more than one device pixel per CSS pixel.
 */
export class ViewportScaler {
  /** The insets as last read, in CSS pixels. */
  private insetsValue: Insets = NO_INSETS;

  /** The pixel ratio the canvas was last sized at. */
  private pixelRatioValue = 1;

  /** The parent's size in device pixels, as the browser last counted it. */
  private devicePixelSize: DevicePixelSize | null = null;

  /**
   * Stops watching the parent for size changes the window never hears about,
   * such as a side panel opening.
   */
  private stopWatchingParent: (() => void) | null = null;

  /**
   * Stops watching the display's pixel ratio, which a change of zoom or of
   * display changes.
   */
  private stopWatchingRatio: (() => void) | null = null;

  /** The parent's own window, which the scaler reads it all through. */
  private readonly window: ScalerWindow | null;

  private readonly onViewportChange = (): void => {
    this.apply();
  };

  /**
   * Creates a scaler that sizes the game's canvas to fill `parent`, at the
   * pixel ratio of its own window, or 1 in a document with none.
   *
   * @param watchParent Reports the parent's size as it changes.
   */
  constructor(
    private readonly game: Game,
    private readonly parent: MeasurableParent,
    private readonly watchParent: WatchDevicePixels = watchDevicePixels,
  ) {
    this.window = parent.ownerDocument.defaultView;
  }

  /**
   * The pixel ratio the canvas is currently rendered at, or 1 before it has
   * been sized, as `canvasSizeFor()` works it out.
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
      this.window?.addEventListener("resize", this.onViewportChange);
    }
    this.stopWatchingRatio = watchDevicePixelRatio(
      this.window,
      this.onViewportChange,
    );
  }

  /** Stops tracking changes, releasing every listener the scaler registered. */
  stop(): void {
    this.window?.removeEventListener("resize", this.onViewportChange);
    this.stopWatchingRatio?.();
    this.stopWatchingRatio = null;
    this.stopWatchingParent?.();
    this.stopWatchingParent = null;
  }

  /** Resizes the canvas to the parent's current size at the current DPR. */
  apply(): void {
    const size = canvasSizeFor(
      this.parent.getBoundingClientRect(),
      this.window?.devicePixelRatio ?? 1,
      this.devicePixelSize,
    );
    this.pixelRatioValue = size.pixelRatio;

    // Makes Phaser's displayScale the pixel ratio, so pointer input maps from
    // CSS pixels into the device-pixel game space.
    this.game.scale.setZoom(1 / size.pixelRatio);
    this.game.scale.resize(size.width, size.height);
    // Phaser only rewrites the canvas CSS size when zoom is not 1, so a resize
    // taken at a pixel ratio of 1 would otherwise leave behind the pixel
    // values written while an earlier, higher ratio was in effect.
    const style = this.game.canvas.style;
    style.width = `${size.cssWidth}px`;
    style.height = `${size.cssHeight}px`;
    // Phaser measured the canvas, to convert pointer positions, before its CSS
    // size was pinned.
    this.game.scale.refresh();

    this.refreshInsets();
  }

  /**
   * Reads the insets the parent declares again, for chrome that moved without
   * the canvas changing size, such as a rail changing sides.
   */
  refreshInsets(): void {
    this.insetsValue = canvasInsetsOf(this.parent);
  }
}
