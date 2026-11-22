import { DOCUMENT, Injectable, inject } from "@angular/core";
import type { SnapdomPlugin } from "@zumer/snapdom";
import { PAGE_DRAWER } from "./page_drawer";

/** Describes a part of the page drawn on a canvas, which gives its own frame. */
export interface CaptureSurface {
  /**
   * The element the canvas fills, whose copy a picture draws as the frame:
   * the canvas's parent, never the canvas, which a copy turns into an image.
   */
  readonly element: HTMLElement;
  /** Returns a copy of what it last drew, taken in a frame, or null. */
  frame(): Promise<CanvasImageSource | null>;
}

/** The attribute that leaves an element out of a picture: `data-fz-capture="skip"`. */
export const CAPTURE_SKIP = { name: "data-fz-capture", value: "skip" } as const;

/** How long a picture may take before it is given up, in milliseconds. */
const CAPTURE_TIMEOUT_MS = 3_000;

/**
 * How long a surface's frame may take, in milliseconds, before the picture
 * draws the surface as the page shows it.
 */
const FRAME_TIMEOUT_MS = 1_000;

/**
 * Starts the name of the attribute that marks a surface's element while a
 * picture is drawn, with the place of its frame among the picture's, so the
 * picture finds the element's copy. Each drawing numbers its own, so one
 * given up on and still drawing never clashes with the next.
 */
const FRAME_MARK = "data-fz-capture-frame";

/** What a PNG's data URL starts with, before its bytes in base64. */
const PNG_DATA_URL = "data:image/png;base64,";

/**
 * Takes pictures of the page as it shows, each canvas on it drawn from its
 * own frame.
 */
@Injectable({ providedIn: "root" })
export class PageCaptureService {
  private readonly document = inject(DOCUMENT);
  private readonly loadDrawer = inject(PAGE_DRAWER);
  private readonly surfaces = new Set<CaptureSurface>();

  /** The picture being drawn, which one asked for meanwhile shares. */
  private drawing: Promise<Blob | null> | undefined;

  /** How many pictures have been drawn, which numbers each drawing's mark. */
  private drawings = 0;

  /** Adds a canvas the picture takes from its own frame, and returns what removes it. */
  register(surface: CaptureSurface): () => void {
    this.surfaces.add(surface);
    return () => {
      this.surfaces.delete(surface);
    };
  }

  /**
   * Takes a PNG of the page as it shows, at CSS pixel size, or null.
   *
   * It leaves out every `<dialog>` and each element marked with
   * {@link CAPTURE_SKIP}, and draws each surface registered from its frame.
   * It resolves to null on any failure, or once `timeoutMs` has passed, 3
   * seconds unless given.
   */
  capture(options: { readonly timeoutMs?: number } = {}): Promise<Blob | null> {
    const { timeoutMs = CAPTURE_TIMEOUT_MS } = options;
    const drawing =
      this.drawing ?? this.draw(`${FRAME_MARK}-${String(++this.drawings)}`);
    this.drawing = drawing;
    const picture = withinLimit(drawing, timeoutMs);
    // Shared no more once done or given up on, so a drawing that hangs
    // keeps no later picture from being drawn.
    void picture.then(() => {
      if (this.drawing === drawing) this.drawing = undefined;
    });
    return picture;
  }

  /**
   * Draws the page with its surfaces' frames, each surface's element marked
   * meanwhile with `mark`, and resolves to its PNG, or to null on any
   * failure.
   */
  private async draw(mark: string): Promise<Blob | null> {
    const marked: HTMLElement[] = [];
    try {
      const [drawPage, frames] = await Promise.all([
        this.loadDrawer(),
        Promise.all(
          [...this.surfaces].map(async (surface) => ({
            element: surface.element,
            url: await frameUrl(surface),
          })),
        ),
      ]);
      const urls = new Map<string, string>();
      for (const { element, url } of frames) {
        if (url === null) continue;
        const place = String(urls.size);
        element.setAttribute(mark, place);
        marked.push(element);
        urls.set(place, url);
      }
      const page = await drawPage(this.document.documentElement, {
        dpr: 1,
        backgroundColor: pageBackground(this.document),
        filter: (element) => isDrawn(element, mark),
        filterMode: "remove",
        plugins: [framesFor(mark, urls)],
      });
      return pngOf(await page.toCanvas());
    } catch {
      return null;
    } finally {
      for (const element of marked) element.removeAttribute(mark);
    }
  }
}

/**
 * Resolves to what a promise resolves to, or to null where it rejects or a
 * limit passes first.
 */
function withinLimit<T>(work: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const settle = (value: T | null): void => {
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      settle(null);
    }, ms);
    work.then(settle, () => {
      settle(null);
    });
  });
}

/**
 * Returns a surface's frame as a PNG's data URL at its element's CSS size,
 * or null where it gives none in time, fails, or its element shows nothing.
 */
async function frameUrl(surface: CaptureSurface): Promise<string | null> {
  try {
    const frame = await withinLimit(surface.frame(), FRAME_TIMEOUT_MS);
    const box = surface.element.getBoundingClientRect();
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    if (!frame || width === 0 || height === 0) return null;
    const canvas = surface.element.ownerDocument.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(frame, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/**
 * Says whether a picture draws an element: not a dialog, nor one marked
 * with {@link CAPTURE_SKIP}, nor one inside a surface marked with `mark`,
 * which its frame stands for.
 */
function isDrawn(element: Element, mark: string): boolean {
  return (
    element.localName !== "dialog" &&
    element.getAttribute(CAPTURE_SKIP.name) !== CAPTURE_SKIP.value &&
    element.parentElement?.hasAttribute(mark) !== true
  );
}

/**
 * Returns the color the browser paints the whole window with: the root's
 * background, or the body's where the root has none. A copy of the root
 * paints it only behind the root's box.
 */
function pageBackground(document: Document): string {
  const colorOf = (element: Element): string =>
    document.defaultView?.getComputedStyle(element).backgroundColor ?? "";
  const root = colorOf(document.documentElement);
  return isClear(root) ? colorOf(document.body) : root;
}

/** Says whether a computed color paints nothing. */
function isClear(color: string): boolean {
  return /^$|^transparent$|^rgba\(.*,\s*0\)$/.test(color);
}

/**
 * Returns the plugin that lays each surface's frame over its element's copy
 * in place of what the element holds: snapdom draws an image put into its
 * copy blurred, but a background sharp.
 */
function framesFor(
  mark: string,
  urls: ReadonlyMap<string, string>,
): SnapdomPlugin {
  return {
    name: "fz-capture-frames",
    afterClone: ({ clone }) => {
      for (const [place, url] of urls) {
        // A surface inside what the picture leaves out has no copy.
        const copy = clone?.querySelector<HTMLElement>(`[${mark}="${place}"]`);
        if (!copy) continue;
        copy.replaceChildren();
        Object.assign(copy.style, {
          backgroundImage: `url("${url}")`,
          backgroundPosition: "0 0",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        });
      }
    },
  };
}

/**
 * Encodes a canvas as a PNG with the browser's own encoder, far quicker than
 * snapdom's, and at once.
 *
 * It reads the canvas with `toDataURL()`, not `toBlob()`: Chrome starts
 * `toBlob()`, and an `OffscreenCanvas`'s `convertToBlob()`, only in an idle
 * period, which a page that draws every frame never has, so either waits
 * about a second for nothing.
 */
function pngOf(canvas: Pick<HTMLCanvasElement, "toDataURL">): Blob {
  const url = canvas.toDataURL("image/png");
  // A canvas the browser can't encode, as one with no pixels, gives "data:,".
  if (!url.startsWith(PNG_DATA_URL)) {
    throw new Error("The picture couldn't be encoded");
  }
  const text = atob(url.slice(PNG_DATA_URL.length));
  const bytes = new Uint8Array(text.length);
  // A loop, as `Uint8Array.from()` with a map takes 15 times as long, and
  // not every browser the games run in has `Uint8Array.fromBase64()`.
  for (let at = 0; at < text.length; at++) bytes[at] = text.charCodeAt(at);
  return new Blob([bytes], { type: "image/png" });
}
