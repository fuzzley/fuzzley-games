import type { ComponentFixture } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { playOn } from "../../testing/game";
import type { GameService } from "../play/game.service";
import { HintComponent, fitOf } from "./hint.component";

/** The words the measured copies hold, which a query looks past. */
const SHOWN = { ignore: "[aria-hidden] *" };

/** Stands in for the browser's ResizeObserver, reporting heights a spec gives. */
class FakeResizeObserver {
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
   * Reports the heights of what it watches: the room, then all the words,
   * then the short form, the order the hint watches them in.
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

/** What a spec gets back from rendering the words over a hint. */
interface RenderedHint {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly handBack: ReturnType<typeof vi.fn>;
  readonly fixture: ComponentFixture<HintComponent>;
}

/** Renders the words, and asks for a hint on `EASY`, a hidden single. */
async function renderHint(): Promise<RenderedHint> {
  const handBack = vi.fn();
  const { fixture } = await render(HintComponent, { on: { handBack } });
  const game = playOn();
  game.useHint();
  await fixture.whenStable();
  return { user: userEvent.setup(), game, handBack, fixture };
}

/** Renders the words over a hint, in a room of a height, the words' given. */
async function renderInRoom(
  room: number,
  full: number,
  short: number,
): Promise<RenderedHint> {
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  const rendered = await renderHint();
  FakeResizeObserver.latest?.report(room, full, short);
  await rendered.fixture.whenStable();
  return rendered;
}

describe("fitOf", () => {
  it.each([
    [200, 120, 50, "full"],
    [120.5, 121, 50, "full"],
    [64, 120, 50, "short"],
    [12, 120, 50, "none"],
  ] as const)(
    "fits words %d px tall in a room %d px tall, the short form %d px, as %s",
    (room, full, short, fit) => {
      expect(fitOf(room, full, short)).toBe(fit);
    },
  );
});

describe("HintComponent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeResizeObserver.latest = null;
  });

  it("shows nothing without a hint", async () => {
    const { container } = await render(HintComponent);

    expect(container).toHaveTextContent("");
  });

  it("shows all the words where they fit", async () => {
    const { game } = await renderHint();

    expect(screen.getByText(game.hint()?.text ?? "", SHOWN)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Why?" })).toBeNull();
  });

  it("shows the title and what to do, with Why?, where all the words don't fit", async () => {
    const { game } = await renderInRoom(64, 120, 50);

    expect(screen.getByText(/The 5 goes in row 3, column 1\./, SHOWN)).toBe(
      screen.getByRole("button", { name: "Why?" }).parentElement,
    );
    expect(screen.queryByText(game.hint()?.text ?? "", SHOWN)).toBeNull();
  });

  it("opens all the words in a sheet from Why?", async () => {
    const { user, game } = await renderInRoom(64, 120, 50);

    await user.click(screen.getByRole("button", { name: "Why?" }));

    expect(
      screen.getByRole("dialog", { name: "Hidden single" }),
    ).toHaveAccessibleDescription(game.hint()?.text ?? "");
    expect(screen.getByRole("button", { name: "Fill in" })).toHaveFocus();
  });

  it("opens the sheet by itself where not even the short form fits", async () => {
    await renderInRoom(12, 120, 50);

    expect(
      screen.getByRole("dialog", { name: "Hidden single" }),
    ).toBeInTheDocument();
  });

  it("fills the hint in from the sheet, closes it and hands the focus back", async () => {
    const { user, game, handBack } = await renderInRoom(12, 120, 50);
    const hint = game.hint();

    await user.click(screen.getByRole("button", { name: "Fill in" }));

    expect(game.grid().digits[hint?.index ?? -1]).toBe(hint?.digit);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(handBack).toHaveBeenCalledOnce();
  });

  it("closes the sheet on Close, keeping the hint", async () => {
    const { user, game, handBack } = await renderInRoom(12, 120, 50);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(game.hint()).not.toBeNull();
    expect(handBack).not.toHaveBeenCalled();
  });
});
