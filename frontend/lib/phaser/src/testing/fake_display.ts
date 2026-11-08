import type { PixelRatioQuery, PixelRatioWindow } from "../measure";

/** Records a media query asked of a {@link FakeDisplay}, with what listens to it. */
export interface FakeMediaQuery extends PixelRatioQuery {
  /** The query, as it was asked. */
  readonly media: string;
  /** What listens for its change. */
  readonly listeners: ReadonlySet<() => void>;
}

/**
 * Stands in for a window's display, as far as its pixel ratio and the
 * `(resolution)` media queries asked of it go, which a spec changes as a
 * zoom or another display does.
 */
export class FakeDisplay implements PixelRatioWindow {
  /** Every query asked of it, in order. */
  readonly queries: FakeMediaQuery[] = [];

  constructor(public devicePixelRatio: number) {}

  matchMedia(media: string): FakeMediaQuery {
    const listeners = new Set<() => void>();
    const query: FakeMediaQuery = {
      media,
      listeners,
      addEventListener: (_type, listener) => {
        listeners.add(listener);
      },
      removeEventListener: (_type, listener) => {
        listeners.delete(listener);
      },
    };
    this.queries.push(query);
    return query;
  }

  /**
   * Sets the display's pixel ratio, as a zoom or another display does, and
   * tells every query whose answer that changes, as a browser does.
   */
  setPixelRatio(ratio: number): void {
    const before = this.devicePixelRatio;
    this.devicePixelRatio = ratio;
    for (const query of [...this.queries]) {
      if (matches(query, before) === matches(query, ratio)) continue;
      for (const listener of [...query.listeners]) listener();
    }
  }

  /** The queries something listens to, as they were asked. */
  get listenedTo(): string[] {
    return this.queries
      .filter((query) => query.listeners.size > 0)
      .map((query) => query.media);
  }
}

/** Returns whether a `(resolution)` query holds on a display of a ratio. */
function matches(query: FakeMediaQuery, ratio: number): boolean {
  return query.media === `(resolution: ${String(ratio)}dppx)`;
}
