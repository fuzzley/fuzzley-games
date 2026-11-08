import { afterEach, beforeEach, vi } from "vitest";
import type { DevicePixelSize } from "../layout";

/**
 * Stands in for the browser's `ResizeObserver`, which jsdom lacks: the spec
 * says when what it watches was laid out anew.
 */
export class FakeResizeObserver implements ResizeObserver {
  /** Every one made since {@link watchResizes} last stood them in, in order. */
  static made: FakeResizeObserver[] = [];
  /** What it watches, each with the options it was asked to watch it with. */
  readonly watched = new Map<Element, ResizeObserverOptions | undefined>();

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.made.push(this);
  }

  observe(target: Element, options?: ResizeObserverOptions): void {
    this.watched.set(target, options);
  }

  unobserve(target: Element): void {
    this.watched.delete(target);
  }

  disconnect(): void {
    this.watched.clear();
  }

  /**
   * Tells it what it watches was laid out anew, if it watches anything,
   * handing it the entries given, as a browser hands them after laying the
   * page out.
   */
  resized(entries: readonly Partial<ResizeObserverEntry>[] = []): void {
    if (this.watched.size > 0) {
      this.callback([...entries] as ResizeObserverEntry[], this);
    }
  }
}

/**
 * Stands {@link FakeResizeObserver} in for the browser's in each spec of the
 * describe it is called in, and puts back what the specs stubbed and spied on
 * after each.
 */
export function watchResizes(): void {
  beforeEach(() => {
    FakeResizeObserver.made = [];
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
}

/**
 * Lays an element out at a size in CSS px, as a browser would, and tells
 * every fake observer that watches anything, handing it the element's size
 * in device pixels where the spec says the browser `counted` them.
 */
export function resize(
  element: Element,
  width: number,
  height: number,
  counted?: DevicePixelSize,
): void {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, width, height),
  );
  const entries: Partial<ResizeObserverEntry>[] = counted
    ? [
        {
          target: element,
          devicePixelContentBoxSize: [
            { inlineSize: counted.width, blockSize: counted.height },
          ],
        },
      ]
    : [];
  for (const observer of FakeResizeObserver.made) observer.resized(entries);
}
