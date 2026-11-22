import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { CompressionStream, DecompressionStream } from "node:stream/web";
import { DEBUG_MENU } from "../debug_menu";
import { BugReportLoaderComponent } from "./bug_report_loader.component";
import { packState } from "./packed";
import { BUG_REPORT_SOURCE, type BugReportSource } from "./tokens";

/** Stands in for a game that loads reported states. */
class FakeSource implements BugReportSource {
  readonly title = "Snake";
  readonly tag = "sn1";

  /** What the game answers when asked to load a state. */
  answer: () => Promise<boolean> = () => Promise.resolve(true);
  /** The states the game was asked to load, in order. */
  readonly loaded: unknown[] = [];

  game(): string {
    return "Snake · Normal";
  }

  settings(): readonly string[] {
    return [];
  }

  capture(): never {
    throw new Error("The loader takes no state.");
  }

  load(state: unknown): Promise<boolean> {
    this.loaded.push(state);
    return this.answer();
  }
}

/** What a spec gets back from rendering the loader. */
interface RenderedLoader {
  readonly user: UserEvent;
  readonly source: FakeSource;
  readonly loaded: ReturnType<typeof vi.fn>;
}

/** Renders the loader over a source, its debug menu offered unless told not. */
async function renderLoader(offered = true): Promise<RenderedLoader> {
  const source = new FakeSource();
  const loaded = vi.fn();
  await render(
    `<fz-bug-report-loader (loaded)="loaded()">
      <p>A loaded game counts toward your records.</p>
    </fz-bug-report-loader>`,
    {
      imports: [BugReportLoaderComponent],
      componentProperties: { loaded },
      providers: [
        { provide: BUG_REPORT_SOURCE, useValue: source },
        { provide: DEBUG_MENU, useValue: offered },
      ],
    },
  );
  return { user: userEvent.setup(), source, loaded };
}

/** Pastes text into the loader and presses Load. */
async function loadText(user: UserEvent, text: string): Promise<void> {
  await user.click(screen.getByRole("textbox", { name: "Load game state" }));
  await user.paste(text);
  await user.click(screen.getByRole("button", { name: "Load" }));
}

// jsdom has no compression streams, so Node's stand in.
beforeAll(() => {
  vi.stubGlobal("CompressionStream", CompressionStream);
  vi.stubGlobal("DecompressionStream", DecompressionStream);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("BugReportLoaderComponent", () => {
  it("shows nothing where the game offers no debug menu", async () => {
    await renderLoader(false);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("asks for the game state from a bug report", async () => {
    await renderLoader();

    expect(
      screen.getByRole("textbox", { name: "Load game state" }),
    ).toHaveAttribute("placeholder", "Paste the game state from a bug report");
  });

  it("shows the game's own line under the field", async () => {
    await renderLoader();

    const field = screen.getByRole("textbox", { name: "Load game state" });
    const line = screen.getByText("A loaded game counts toward your records.");

    expect(field.compareDocumentPosition(line)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("hands the game the state in a report's whole field", async () => {
    const { user, source } = await renderLoader();
    const packed = await packState("sn1", { score: 40 });

    await loadText(user, `Score 40\n\n\`\`\`\n${packed}\n\`\`\``);

    await vi.waitFor(() => {
      expect(source.loaded).toEqual([{ score: 40 }]);
    });
  });

  it("says it loaded once the state is in play", async () => {
    const { user, loaded } = await renderLoader();

    await loadText(user, await packState("sn1", { score: 40 }));

    await vi.waitFor(() => {
      expect(loaded).toHaveBeenCalledOnce();
    });
  });

  it("says nothing loaded where the game kept its own", async () => {
    const { user, source, loaded } = await renderLoader();
    source.answer = () => Promise.resolve(false);

    await loadText(user, await packState("sn1", { score: 40 }));
    await vi.waitFor(() => {
      expect(source.loaded).toHaveLength(1);
    });

    expect(loaded).not.toHaveBeenCalled();
  });

  it("says why a state can't be read", async () => {
    const { user } = await renderLoader();

    await loadText(user, "It froze on level 3.");

    await vi.waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "There is no game state in that text.",
      );
    });
  });

  it("says why the game can't take a state", async () => {
    const { user, source } = await renderLoader();
    source.answer = () =>
      Promise.reject(new Error("Level 12 isn't in this build."));

    await loadText(user, await packState("sn1", { level: 12 }));

    await vi.waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Level 12 isn't in this build.",
      );
    });
  });

  it("says what the game threw, whatever it threw", async () => {
    const { user, source } = await renderLoader();
    // A game's own code may reject with something other than an Error.
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    source.answer = () => Promise.reject("No level 12");

    await loadText(user, await packState("sn1", { level: 12 }));

    await vi.waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("No level 12");
    });
  });

  it("clears what went wrong once a state loads", async () => {
    const { user, loaded } = await renderLoader();
    await loadText(user, "It froze on level 3.");
    await screen.findByText("There is no game state in that text.");
    await user.clear(screen.getByRole("textbox", { name: "Load game state" }));

    await loadText(user, await packState("sn1", { score: 40 }));
    await vi.waitFor(() => {
      expect(loaded).toHaveBeenCalledOnce();
    });

    expect(screen.getByRole("status")).toHaveTextContent(/^$/);
  });
});
