/**
 * Stands in for `window.matchMedia`, which jsdom lacks, answering width,
 * height and orientation queries against a size a spec sets. It is the
 * Solitaire Collection's, which the two games may one day share.
 */
export interface FakeViewport {
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
  /^\(\s*(max-width|max-height|orientation)\s*:\s*([\w.]+?)(px)?\s*\)$/;

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
        default:
          // As CSS reads it: a square viewport is portrait.
          return size.height >= size.width === (value === "portrait");
      }
    }),
  );
}

/**
 * Installs the fake at a size.
 *
 * Call {@link FakeViewport.restore} in an `afterEach`, so a spec that never
 * asked for one still sees a host without `matchMedia`.
 */
export function installFakeViewport(
  width: number,
  height: number,
): FakeViewport {
  const queries: FakeQuery[] = [];
  const current: Size = { width, height };

  window.matchMedia = (query: string) => {
    const state = { matches: evaluate(query, current) };
    const listeners = new Set<() => void>();
    queries.push({ query, state, listeners });

    // Only what the viewport service reads: a real MediaQueryList can't be
    // built outside the browser.
    return {
      media: query,
      // A getter, because the service reads `matches` again when it is told
      // the query changed rather than trusting the event.
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
    setSize(nextWidth: number, nextHeight: number): void {
      current.width = nextWidth;
      current.height = nextHeight;
      for (const query of queries) {
        const matches = evaluate(query.query, current);
        if (matches === query.state.matches) continue;
        query.state.matches = matches;
        for (const listener of query.listeners) listener();
      }
    },
    restore(): void {
      Reflect.deleteProperty(window, "matchMedia");
    },
  };
}
