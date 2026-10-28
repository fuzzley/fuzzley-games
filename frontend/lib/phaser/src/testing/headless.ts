import { blankWebGLContext } from "./blank_webgl";

/** Whether {@link installHeadlessPhaser} has run. */
let installed = false;

/**
 * Lets real Phaser load, boot and run its WebGL renderer in jsdom, which can
 * draw nothing and loads no images: a 2D context and a WebGL context that draw
 * nothing ({@link blankWebGLContext}), and `data:` images that load at once,
 * since Phaser boots only once its default textures, written as `data:` URLs,
 * have loaded.
 *
 * Call it from a workspace's test setup, before anything imports Phaser, which
 * tests for WebGL as its module loads. Other images load as jsdom loads them,
 * which is not at all.
 */
export function installHeadlessPhaser(): void {
  if (installed) return;
  installed = true;

  // A canvas keeps one WebGL context, as a browser's does, so whoever asks for
  // it again can lose and restore the same one.
  const webGLContexts = new WeakMap<HTMLCanvasElement, WebGLRenderingContext>();
  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    kind: string,
  ) {
    if (kind === "2d") return blankContext(this);
    if (kind !== "webgl" && kind !== "experimental-webgl") return null;
    let context = webGLContexts.get(this);
    if (!context) {
      context = blankWebGLContext(this);
      webGLContexts.set(this, context);
    }
    return context;
  } as typeof HTMLCanvasElement.prototype.getContext;
  // Phaser offers WebGL only where the window has it. The blank context isn't
  // one of these, so Phaser takes it for a WebGL 2 context rather than fold
  // WebGL 1's extensions into it, and the blank context answers either.
  if (!("WebGLRenderingContext" in window)) {
    Object.defineProperty(window, "WebGLRenderingContext", {
      configurable: true,
      writable: true,
      value: function WebGLRenderingContext(): never {
        throw new TypeError("Illegal constructor");
      },
    });
  }

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
