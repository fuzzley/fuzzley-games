import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { HelpDialogComponent } from "./help_dialog.component";

/** What a spec gets back from rendering the dialog. */
interface RenderedHelp {
  readonly user: UserEvent;
  readonly closed: ReturnType<typeof vi.fn>;
}

/** Renders How to play around a paragraph with a link in it, open unless told otherwise. */
async function renderHelp(open = true): Promise<RenderedHelp> {
  const closed = vi.fn();
  await render(
    `<fz-help-dialog [open]="open" (closed)="closed()">
      <p>Clear the board. <a href="/rules">The rules</a> say how.</p>
    </fz-help-dialog>`,
    {
      imports: [HelpDialogComponent],
      componentProperties: { open, closed },
    },
  );
  return { user: userEvent.setup(), closed };
}

/** Returns the dialog's native dialog, which jsdom hides from role queries when shut. */
function dialog(): HTMLDialogElement {
  const element = document.querySelector("dialog");
  if (!element) throw new Error("No <dialog> rendered");
  return element;
}

describe("HelpDialogComponent", () => {
  it("stays shut until asked to open", async () => {
    await renderHelp(false);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a dialog named How to play, under its heading", async () => {
    await renderHelp();

    expect(
      within(screen.getByRole("dialog", { name: "How to play" })).getByRole(
        "heading",
        { level: 2, name: "How to play" },
      ),
    ).toBeInTheDocument();
  });

  it("takes the focus at its close button as it opens", async () => {
    await renderHelp();

    expect(
      screen.getByRole("button", { name: "Close How to play" }),
    ).toHaveFocus();
  });

  it("shows what the game says", async () => {
    await renderHelp();

    expect(screen.getByRole("dialog")).toContainElement(
      screen.getByRole("link", { name: "The rules" }),
    );
  });

  it("asks to close from its close button", async () => {
    const { user, closed } = await renderHelp();

    await user.click(screen.getByRole("button", { name: "Close How to play" }));

    expect(closed).toHaveBeenCalledOnce();
  });

  it("asks to close on Escape", async () => {
    const { user, closed } = await renderHelp();

    await user.keyboard("{Escape}");

    expect(closed).toHaveBeenCalledOnce();
  });

  it("asks to close on a click beside it", async () => {
    const { user, closed } = await renderHelp();

    // A click beside the card lands on the <dialog> itself.
    await user.click(dialog());

    expect(closed).toHaveBeenCalledOnce();
  });

  it("stays open until the game lowers open", async () => {
    const { user } = await renderHelp();

    await user.click(screen.getByRole("button", { name: "Close How to play" }));

    expect(dialog().open).toBe(true);
  });
});
