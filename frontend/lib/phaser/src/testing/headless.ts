/** Whether {@link installHeadlessPhaser} has run. */
let installed = false;

/**
 * Lets real Phaser load and boot in jsdom, which can draw nothing and loads no
 * images: a 2D context that draws nothing, which Phaser sniffs the browser's
 * canvas with as it loads, and `data:` images that load at once, since Phaser
 * boots only once its default textures, written as `data:` URLs, have loaded.
 *
 * Call it from a workspace's test setup, before anything imports Phaser.
 * Other images load as jsdom loads them, which is not at all.
 */
export function installHeadlessPhaser(): void {
  if (installed) return;
  installed = true;

  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    kind: string,
  ) {
    // Phaser falls back from WebGL to the canvas when there is none; a game
    // in a spec runs HEADLESS, which needs neither.
    return kind === "2d" ? blankContext(this) : null;
  } as typeof HTMLCanvasElement.prototype.getContext;

  const src = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "src",
  );
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true,
    enumerable: true,
    get(this: HTMLImageElement): string {
      return (src?.get?.call(this) as string | undefined) ?? "";
    },
    set(this: HTMLImageElement, value: string): void {
      src?.set?.call(this, value);
      if (value.startsWith("data:")) {
        setTimeout(() => {
          this.dispatchEvent(new Event("load"));
        });
      }
    },
  });
}

/** Does nothing, as every drawing call on a blank context does. */
const doNothing = (): undefined => undefined;

/** A gradient or pattern that paints nothing. */
const BLANK_PAINT = { addColorStop: doNothing };

/**
 * Returns a 2D context that draws nothing: every method does nothing, but
 * those Phaser reads an answer from, and every property keeps what it was
 * last set to.
 */
function blankContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const state: Record<PropertyKey, unknown> = { canvas };
  const pixels = (
    _x = 0,
    _y = 0,
    width = 1,
    height = 1,
  ): { width: number; height: number; data: Uint8ClampedArray } => ({
    width,
    height,
    data: new Uint8ClampedArray(4 * width * height),
  });
  const answers: Record<PropertyKey, unknown> = {
    getImageData: pixels,
    createImageData: (width = 1, height = 1) => pixels(0, 0, width, height),
    measureText: () => ({ width: 0 }),
    createLinearGradient: () => BLANK_PAINT,
    createRadialGradient: () => BLANK_PAINT,
    createPattern: () => BLANK_PAINT,
  };
  const context = new Proxy(state, {
    get: (target, key) =>
      key in target ? target[key] : (answers[key] ?? doNothing),
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  });
  // A stand-in for the browser's context, which Phaser only calls into.
  return context as unknown as CanvasRenderingContext2D;
}
