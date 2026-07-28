/**
 * The slice of `Phaser.Game` the scaler drives. Narrowed to what is actually
 * used so the scaler can be unit tested without booting a real game;
 * `Phaser.Game` satisfies this structurally.
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

/**
 * The subscription surface of a media query. `MediaQueryList` satisfies this
 * structurally.
 */
export interface PixelRatioQuery {
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
}

/**
 * The slice of `Window` the scaler reads. `Window` satisfies this structurally.
 */
export interface ScalerWindow {
  /** Device pixels per CSS pixel for the display the window is on. */
  readonly devicePixelRatio: number;
  addEventListener(type: "resize", listener: () => void): void;
  removeEventListener(type: "resize", listener: () => void): void;
  /** Absent on hosts without media query support, in which case DPR changes go unobserved. */
  matchMedia?(query: string): PixelRatioQuery;
}

/** The element the canvas fills, measured for the CSS layout size. */
export interface MeasurableParent {
  getBoundingClientRect(): { width: number; height: number };
}

/**
 * Sizes the game canvas so it rasterizes at the display's true resolution.
 *
 * Phaser's scale modes size the canvas backing store in CSS pixels and never
 * consult `devicePixelRatio`, so on any display where a CSS pixel is more than
 * one device pixel — Windows at 125%, a HiDPI panel, browser zoom — the browser
 * upscales the finished frame and everything drawn softens. This runs the game
 * in `NONE` mode instead and sets the backing store to the CSS size times the
 * pixel ratio, while pinning the canvas' CSS size to the layout size.
 *
 * Zoom is set to the reciprocal of the pixel ratio so Phaser's `displayScale`
 * resolves to the pixel ratio, which keeps pointer input converting correctly
 * from CSS coordinates into the now device-pixel game space.
 */
export class ViewportScaler {
  /**
   * Upper bound on the pixel ratio the canvas is rendered at. Beyond roughly 2x
   * the sharpness gain stops being visible while the pixel count keeps growing
   * quadratically, so 3x and 4x mobile panels are rendered at 2x.
   */
  public static readonly MAX_PIXEL_RATIO = 2;

  /** Media query tracking the current pixel ratio, re-armed after each change. */
  private pixelRatioQuery: PixelRatioQuery | null = null;

  /**
   * Watches the parent for size changes the window never hears about.
   *
   * The canvas fills a box the application lays out, and that box can change
   * without the window doing anything — a side panel opening, for one. Without
   * this the board would keep the size it had before and either overflow its
   * box or leave a gap beside it.
   */
  private parentObserver: ResizeObserver | null = null;

  private readonly onViewportChange = (): void => {
    this.apply();
  };

  /**
   * Constructs the viewport scaler.
   *
   * @param window The browser Window context the game is running in.
   * @param game The game whose canvas and scale manager are driven.
   * @param parent The element the canvas fills, measured for the CSS size.
   */
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

  /** Applies the current size and starts tracking viewport and DPR changes. */
  public start(): void {
    this.apply();
    this.window.addEventListener("resize", this.onViewportChange);
    this.observeParent();
  }

  /**
   * Watches the parent box, when the host supports it. Guarded because the
   * parent is only required to be measurable, not to be a real element.
   */
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

    this.game.scale.setZoom(1 / pixelRatio);
    this.game.scale.resize(cssWidth * pixelRatio, cssHeight * pixelRatio);

    // Phaser only rewrites the canvas CSS size when zoom is not 1, so a resize
    // taken at a pixel ratio of 1 would otherwise leave behind the pixel values
    // written while an earlier, higher ratio was in effect.
    this.game.canvas.style.width = `${cssWidth}px`;
    this.game.canvas.style.height = `${cssHeight}px`;

    this.watchPixelRatio();
  }

  /** The display's raw pixel ratio, floored at 1 for non-conforming hosts. */
  private get devicePixelRatio(): number {
    return Math.max(this.window.devicePixelRatio || 1, 1);
  }

  /**
   * Re-arms the pixel ratio media query. The query matches only the ratio in
   * effect when it was created, so moving the window to a different display or
   * changing browser zoom stops it matching and fires `change`, at which point
   * it is replaced with a query for the new ratio.
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
