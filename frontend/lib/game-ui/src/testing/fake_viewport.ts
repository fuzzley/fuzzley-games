/**
 * Stands in for `window.matchMedia`, which jsdom lacks, answering width,
 * height and orientation queries against a size a spec sets, and the color
 * scheme query as a light system's.
 */
export interface FakeViewport {
  /** Sets the viewport width and tells every live query about it. */
  setWidth(px: number): void;
  /** Sets the viewport width and height and tells every live query. */
  setSize(width: number, height: number): void;
  /** Takes the fake back off the window. */
  restore(): void;
}

/** Holds the viewport size a fake answers against, in CSS pixels. */
interface Size {
  width: number;
  height: number;
}

/** Records one query the code under test holds. */
interface FakeQuery {
  readonly query: string;
  readonly state: { matches: boolean };
  readonly listeners: Set<() => void>;
}

const CONDITION =
  /^\(\s*(max-width|max-height|orientation|prefers-color-scheme)\s*:\s*([\w.]+?)(px)?\s*\)$/;

/**
 * Returns whether a media query holds at a size: any of its comma-separated
 * alternatives, each true when all of its `and`-joined conditions are.
 *
 * @throws Error for a condition the fake does not understand.
 */
function evaluate(query: string, size: Size): boolean {
  return query.split(",").some((alternative) =>
    alternative.split(/\s+and\s+/).every((condition) => {
      const parsed = CONDITION.exec(condition.trim());
      if (!parsed) {
        throw new Error(`Fake viewport cannot answer: ${condition}`);
      }
      const [, feature, value] = parsed;
      switch (feature) {
        case "max-width":
          return size.width <= Number(value);
        case "max-height":
          return size.height <= Number(value);
        case "prefers-color-scheme":
          return value === "light";
        default:
          // As CSS reads it: a square viewport is portrait.
          return size.height >= size.width === (value === "portrait");
      }
    }),
  );
}

/**
 * Installs the fake at a starting size, in CSS pixels; the height is tall
 * enough by default that only the width decides whether the viewport is
 * compact.
 *
 * Call {@link FakeViewport.restore} in an `afterEach`, so a spec that never
 * asked for one still sees a host without `matchMedia`.
 */
export function installFakeViewport(width: number, height = 900): FakeViewport {
  const queries: FakeQuery[] = [];
  const current: Size = { width, height };

  window.matchMedia = (query: string) => {
    const state = { matches: evaluate(query, current) };
    const listeners = new Set<() => void>();
    queries.push({ query, state, listeners });

    // Only what the code reads of it: a real MediaQueryList can't be built
    // outside the browser.
    return {
      media: query,
      // A getter, because the code reads `matches` again when it is told the
      // query changed rather than trusting the event.
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

  const resize = (next: Size): void => {
    current.width = next.width;
    current.height = next.height;
    for (const query of queries) {
      const matches = evaluate(query.query, current);
      if (matches === query.state.matches) continue;
      query.state.matches = matches;
      for (const listener of query.listeners) listener();
    }
  };

  return {
    setWidth(px: number): void {
      resize({ width: px, height: current.height });
    },
    setSize(nextWidth: number, nextHeight: number): void {
      resize({ width: nextWidth, height: nextHeight });
    },
    restore(): void {
      Reflect.deleteProperty(window, "matchMedia");
    },
  };
}
