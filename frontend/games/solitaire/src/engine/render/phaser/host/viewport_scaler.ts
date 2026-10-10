import { Insets, NO_INSETS } from "../../layout/viewport";

/**
 * Describes the slice of `Phaser.Game` the scaler drives, so a test need not
 * boot a real game.
 */
export interface ScalableGame {
  /** The game's canvas element, whose CSS size the scaler pins. */
  readonly canvas: { style: { width: string; height: string } };
  /** The scale manager, driven directly because the game runs in NONE mode. */
  readonly scale: {
    setZoom(zoom: number): unknown;
    resize(width: number, height: number): unknown;
  };
}

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

/** Describes the element the canvas fills and is sized from. */
export interface MeasurableParent {
  getBoundingClientRect(): { width: number; height: number };
}

/**
 * Sizes the game canvas so it rasterizes at the display's true resolution.
 *
 * Phaser's own scale modes size the canvas in CSS pixels, which blurs the board
 * on any display with more than one device pixel per CSS pixel.
 */
export class ViewportScaler {
  /**
   * The highest pixel ratio the canvas is rendered at, beyond which sharpness
   * stops visibly improving while the pixel count keeps growing.
   */
  public static readonly MAX_PIXEL_RATIO = 2;

  /**
   * The custom properties the parent declares its insets in: how far in from
   * each edge the shell's own chrome, such as a header, lies over the canvas.
   */
  public static readonly INSET_PROPERTIES: {
    readonly [Edge in keyof Insets]: string;
  } = {
    top: "--board-inset-top",
    right: "--board-inset-right",
    bottom: "--board-inset-bottom",
    left: "--board-inset-left",
  };

  /** The insets as last read, in CSS pixels. */
  private insetsValue: Insets = NO_INSETS;

  /** Media query tracking the current pixel ratio, re-armed after each change. */
  private pixelRatioQuery: PixelRatioQuery | null = null;

  /**
   * Watches the parent for size changes the window never hears about, such as
   * a side panel opening.
   */
  private parentObserver: ResizeObserver | null = null;

  private readonly onViewportChange = (): void => {
    this.apply();
  };

  /** Creates a scaler that sizes the game's canvas to fill `parent`. */
  constructor(
    private readonly window: ScalerWindow,
    private readonly game: ScalableGame,
    private readonly parent: MeasurableParent,
  ) {}

  /**
   * The pixel ratio the canvas is currently rendered at: the display's ratio,
   * clamped to at least 1 and at most {@link ViewportScaler.MAX_PIXEL_RATIO}.
   */
  public get pixelRatio(): number {
    return Math.min(this.devicePixelRatio, ViewportScaler.MAX_PIXEL_RATIO);
  }

  /**
   * How far in from each edge the shell's chrome lies over the canvas, in CSS
   * pixels, as the parent declared it when the canvas was last sized.
   *
   * Read once per resize rather than per frame, since reading a computed style
   * can force the browser to lay the page out again.
   */
  public get insets(): Insets {
    return this.insetsValue;
  }

  /** Applies the current size and starts tracking viewport and DPR changes. */
  public start(): void {
    this.apply();
    this.window.addEventListener("resize", this.onViewportChange);
    this.observeParent();
  }

  /** Watches the parent box, if it is a real element and the host allows it. */
  private observeParent(): void {
    if (
      typeof ResizeObserver === "undefined" ||
      typeof Element === "undefined" ||
      !(this.parent instanceof Element)
    ) {
      return;
    }
    this.parentObserver = new ResizeObserver(this.onViewportChange);
    this.parentObserver.observe(this.parent);
  }

  /** Stops tracking changes, releasing every listener the scaler registered. */
  public stop(): void {
    this.window.removeEventListener("resize", this.onViewportChange);
    this.pixelRatioQuery?.removeEventListener("change", this.onViewportChange);
    this.pixelRatioQuery = null;
    this.parentObserver?.disconnect();
    this.parentObserver = null;
  }

  /** Resizes the canvas to the parent's current size at the current DPR. */
  public apply(): void {
    const pixelRatio = this.pixelRatio;
    const bounds = this.parent.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.floor(bounds.width));
    const cssHeight = Math.max(1, Math.floor(bounds.height));

    // Makes Phaser's displayScale the pixel ratio, so pointer input maps from
    // CSS pixels into the device-pixel game space.
    this.game.scale.setZoom(1 / pixelRatio);
    this.game.scale.resize(cssWidth * pixelRatio, cssHeight * pixelRatio);

    // Phaser only rewrites the canvas CSS size when zoom is not 1, so a resize
    // taken at a pixel ratio of 1 would otherwise leave behind the pixel values
    // written while an earlier, higher ratio was in effect.
    this.game.canvas.style.width = `${cssWidth}px`;
    this.game.canvas.style.height = `${cssHeight}px`;

    this.refreshInsets();
    this.watchPixelRatio();
  }

  /**
   * Reads the insets the parent declares again, for chrome that moved without
   * the canvas changing size, such as a rail changing sides.
   */
  public refreshInsets(): void {
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

  /** The display's raw pixel ratio, floored at 1 for non-conforming hosts. */
  private get devicePixelRatio(): number {
    return Math.max(this.window.devicePixelRatio || 1, 1);
  }

  /**
   * Replaces the pixel ratio media query with one for the current ratio, whose
   * `change` fires when the window moves display or the browser zooms.
   */
  private watchPixelRatio(): void {
    const query = this.window.matchMedia?.(
      `(resolution: ${this.devicePixelRatio}dppx)`,
    );
    if (!query) {
      return;
    }

    this.pixelRatioQuery?.removeEventListener("change", this.onViewportChange);
    this.pixelRatioQuery = query;
    query.addEventListener("change", this.onViewportChange);
  }
}
