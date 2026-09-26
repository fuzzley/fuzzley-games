/**
 * Stands in for `window.matchMedia`, which jsdom lacks, answering `max-width`
 * queries against a width a spec sets.
 */
export interface FakeViewport {
  /** Sets the viewport width and tells every live query about it. */
  setWidth(px: number): void;
  /** Takes the fake back off the window. */
  restore(): void;
}

/** Records one `max-width` query the code under test holds. */
interface FakeQuery {
  readonly maxWidth: number;
  readonly state: { matches: boolean };
  readonly listeners: Set<() => void>;
}

const MAX_WIDTH = /max-width:\s*([\d.]+)px/;

/**
 * Installs the fake at a starting width.
 *
 * Call {@link FakeViewport.restore} in an `afterEach`, so a spec that never
 * asked for one still sees a host without `matchMedia`.
 *
 * @param width The viewport width to start at, in CSS pixels.
 */
export function installFakeViewport(width: number): FakeViewport {
  const queries: FakeQuery[] = [];
  let current = width;

  window.matchMedia = (query: string) => {
    const parsed = MAX_WIDTH.exec(query);
    if (!parsed) {
      throw new Error(`Fake viewport answers max-width queries only: ${query}`);
    }

    const maxWidth = Number(parsed[1]);
    const state = { matches: current <= maxWidth };
    const listeners = new Set<() => void>();
    queries.push({ maxWidth, state, listeners });

    return {
      media: query,
      // A getter, because the application reads `matches` again when it is
      // told the query changed rather than trusting the event.
      get matches(): boolean {
        return state.matches;
      },
      addEventListener: (_type: "change", listener: () => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: "change", listener: () => void) => {
        listeners.delete(listener);
      },
    } as unknown as MediaQueryList;
  };

  return {
    setWidth(px: number): void {
      current = px;
      for (const query of queries) {
        query.state.matches = px <= query.maxWidth;
        for (const listener of query.listeners) listener();
      }
    },
    restore(): void {
      Reflect.deleteProperty(window, "matchMedia");
    },
  };
}
