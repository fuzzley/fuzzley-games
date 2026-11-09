/**
 * Stands in for the browser's ResizeObserver, which jsdom lacks, reporting
 * the heights a spec gives; a spec stubs it with `vi.stubGlobal()`.
 */
export class FakeResizeObserver {
  /** The observer made last, which a spec reports through. */
  static latest: FakeResizeObserver | null = null;
  private readonly targets: Element[] = [];

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.latest = this;
  }

  observe(target: Element): void {
    this.targets.push(target);
  }

  disconnect(): void {
    this.targets.length = 0;
  }

  /**
   * Reports the heights of what it watches, in the order it was asked to
   * watch them: the hint's room, then all its words, then the short form.
   */
  report(...heights: readonly number[]): void {
    const entries = this.targets.map((target, i) => ({
      target,
      contentRect: { height: heights[i] ?? 0 },
    }));
    // The entries hold only what the hint reads, and the observer stands in
    // for the real one, so neither is the full type.
    this.callback(
      entries as unknown as ResizeObserverEntry[],
      this as unknown as ResizeObserver,
    );
  }
}
