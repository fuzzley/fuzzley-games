import { TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { type ConfirmRequest, ConfirmService } from "./confirm.service";
import { ConfirmDialogComponent } from "./confirm_dialog.component";

/** A question the dialog is showing, and the answer it will settle. */
interface Asked {
  readonly answer: Promise<boolean>;
  readonly dialog: HTMLElement;
}

describe("ConfirmDialogComponent", () => {
  let confirm: ConfirmService;
  let user: UserEvent;

  beforeEach(async () => {
    await render(ConfirmDialogComponent);
    confirm = TestBed.inject(ConfirmService);
    user = userEvent.setup();
  });

  /** Asks a question and waits for the dialog to show it. */
  async function ask(request: Partial<ConfirmRequest> = {}): Promise<Asked> {
    const answer = confirm.ask({
      title: "Start over?",
      message: "Your moves will be lost.",
      ...request,
    });
    const dialog = await screen.findByRole("alertdialog");
    return { answer, dialog };
  }

  /** Returns the native dialog, which jsdom hides from role queries when shut. */
  function nativeDialog(): HTMLDialogElement {
    const element = document.querySelector("dialog");
    if (!element) throw new Error("No <dialog> rendered");
    return element;
  }

  it("stays shut until something asks", () => {
    expect(nativeDialog().open).toBe(false);
  });

  it("opens as an alert dialog, since it interrupts to ask", async () => {
    const { dialog } = await ask();

    expect(dialog).toBeInTheDocument();
  });

  it("takes its name from the title", async () => {
    const { dialog } = await ask({ title: "Restart this game?" });

    expect(dialog).toHaveAccessibleName("Restart this game?");
  });

  it("shows the title as a heading", async () => {
    await ask({ title: "Restart this game?" });

    expect(
      screen.getByRole("heading", { name: "Restart this game?" }),
    ).toBeInTheDocument();
  });

  it("is described by the message, not just its title", async () => {
    const { dialog } = await ask({ message: "Your moves will be lost." });

    expect(dialog).toHaveAccessibleDescription("Your moves will be lost.");
  });

  it("labels its buttons as asked", async () => {
    await ask({ confirmLabel: "Restart", cancelLabel: "Keep playing" });

    expect(screen.getByRole("button", { name: "Restart" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Keep playing" }),
    ).toBeInTheDocument();
  });

  it("focuses Cancel first, so a stray Enter backs out", async () => {
    await ask();

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("fills the confirm button with the accent by default", async () => {
    await ask();

    expect(screen.getByRole("button", { name: "Confirm" })).not.toHaveClass(
      "fz-button-danger",
    );
  });

  it("fills the confirm button with danger for a danger", async () => {
    await ask({ tone: "danger" });

    expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass(
      "fz-button-danger",
    );
  });

  it("shows a warning icon for a danger", async () => {
    const { dialog } = await ask({ tone: "danger" });

    expect(dialog.querySelector("fz-icon")).toBeInTheDocument();
  });

  it("shows no icon otherwise", async () => {
    const { dialog } = await ask();

    expect(dialog.querySelector("fz-icon")).toBeNull();
  });

  it("answers yes when Confirm is clicked", async () => {
    const { answer } = await ask();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await expect(answer).resolves.toBe(true);
  });

  it("answers no when Cancel is clicked", async () => {
    const { answer } = await ask();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await expect(answer).resolves.toBe(false);
  });

  it("shuts once answered", async () => {
    await ask();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(nativeDialog().open).toBe(false);
  });

  it("answers no on Escape", async () => {
    const { answer } = await ask();

    await user.keyboard("{Escape}");

    await expect(answer).resolves.toBe(false);
  });

  it("answers no when the backdrop outside the card is clicked", async () => {
    const { answer, dialog } = await ask();

    // A backdrop click targets the <dialog> itself.
    await user.click(dialog);

    await expect(answer).resolves.toBe(false);
  });

  it("stays open when the card itself is clicked", async () => {
    await ask();

    await user.click(screen.getByText("Your moves will be lost."));

    expect(confirm.isOpen()).toBe(true);
  });
});
