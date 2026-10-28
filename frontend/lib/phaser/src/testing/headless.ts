import { blankWebGLContext } from "./blank_webgl";
import { installServedFiles } from "./served_files";

/** Whether {@link installHeadlessPhaser} has run. */
let installed = false;

/**
 * Lets real Phaser load, boot and run its WebGL renderer in jsdom, which can
 * draw nothing and fetches nothing: a 2D context and a WebGL context that draw
 * nothing ({@link blankWebGLContext}), and requests and images answered as a
 * browser answers them, from the files a run serves ({@link
 * installServedFiles}), since Phaser boots only once its default textures,
 * written as `data:` URLs, have loaded.
 *
 * Call it from a workspace's test setup, before anything imports Phaser, which
 * tests for WebGL as its module loads. It takes the place of
 * `XMLHttpRequest`, so nothing reaches the network.
 */
export function installHeadlessPhaser(): void {
  if (installed) return;
  installed = true;

  // A canvas keeps the one context it was first asked for, as a browser's
  // does, so whoever asks for it again gets the same one, and none of another
  // kind.
  const contexts = new WeakMap<
    HTMLCanvasElement,
    { readonly kind: string; readonly context: object }
  >();
  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    asked: string,
  ) {
    const kind = asked === "experimental-webgl" ? "webgl" : asked;
    const kept = contexts.get(this);
    if (kept) return kept.kind === kind ? kept.context : null;
    let context: object;
    if (kind === "2d") context = blankContext(this);
    else if (kind === "webgl") context = blankWebGLContext(this);
    else return null;
    contexts.set(this, { kind, context });
    return context;
  } as typeof HTMLCanvasElement.prototype.getContext;
  // Phaser offers a renderer only where the window has its context. The
  // blank WebGL context isn't one of these, so Phaser takes it for a WebGL 2
  // context rather than fold WebGL 1's extensions into it, and it answers
  // either.
  for (const name of ["WebGLRenderingContext", "CanvasRenderingContext2D"]) {
    if (name in window) continue;
    Object.defineProperty(window, name, {
      configurable: true,
      writable: true,
      value: function RenderingContext(): never {
        throw new TypeError("Illegal constructor");
      },
    });
  }

  // jsdom lays nothing out, and Phaser maps the pointer through the canvas's
  // place on the page.
  HTMLCanvasElement.prototype.getBoundingClientRect = function layOut(
    this: HTMLCanvasElement,
  ): DOMRect {
    return laidOut(this);
  };

  // Phaser asks what lies under a moving finger, to know it is still over
  // the canvas.
  Document.prototype.elementFromPoint = function elementFromPoint(
    this: Document,
    x: number,
    y: number,
  ): Element | null {
    const canvases = [...this.querySelectorAll("canvas")].reverse();
    const under = canvases.find((canvas) => {
      const { left, top, right, bottom } = laidOut(canvas);
      return x >= left && x < right && y >= top && y < bottom;
    });
    return under ?? this.body;
  };

  installServedFiles();
}

/**
 * Returns where a browser would lay a canvas out, were it alone at the page's
 * top left corner: at its CSS size, where that is in pixels, or else at the
 * size of its backing store.
 */
function laidOut(canvas: HTMLCanvasElement): DOMRect {
  const css = (length: string): number | undefined =>
    length.endsWith("px") ? Number.parseFloat(length) : undefined;
  const width = css(canvas.style.width) ?? canvas.width;
  const height = css(canvas.style.height) ?? canvas.height;
  const rect = { x: 0, y: 0, width, height, top: 0, left: 0 };
  return {
    ...rect,
    right: width,
    bottom: height,
    toJSON: () => rect,
  };
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
