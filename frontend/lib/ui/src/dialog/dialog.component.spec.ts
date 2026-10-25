import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { DialogComponent, type DialogRole } from "./dialog.component";

/**
 * Hosts a dialog as an app does, owning the open state and closing on the
 * dialog's request.
 */
@Component({
  selector: "fz-test-dialog-host",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogComponent],
  template: `
    <button type="button" (click)="open.set(true)">Open</button>
    <fz-dialog
      [open]="open()"
      [label]="label()"
      [describedBy]="describedBy()"
      [dialogRole]="dialogRole()"
      [dismissible]="dismissible()"
      (closed)="closeRequests.set(closeRequests() + 1); open.set(false)"
    >
      <div data-testid="panel">
        <p id="the-description">Everything you have done will be lost.</p>
        <button type="button">Inner control</button>
        <button type="button" (click)="open.set(false)">Done</button>
      </div>
    </fz-dialog>
  `,
})
class DialogHostComponent {
  readonly open = signal(false);
  readonly label = signal("");
  readonly describedBy = signal("");
  readonly dialogRole = signal<DialogRole>("dialog");
  readonly dismissible = signal(true);

  /** How many times the dialog has asked to be closed. */
  readonly closeRequests = signal(0);
}

/** What a spec sets on the host before the dialog opens. */
type HostSettings = Partial<{
  label: string;
  describedBy: string;
  dialogRole: DialogRole;
  dismissible: boolean;
}>;

describe("DialogComponent", () => {
  let host: DialogHostComponent;
  let user: UserEvent;

  /** Renders the host, applies its settings, and opens the dialog by its button. */
  async function openDialog(settings: HostSettings = {}): Promise<void> {
    await renderHost(settings);
    await user.click(screen.getByRole("button", { name: "Open" }));
  }

  /** Renders the host with the dialog shut. */
  async function renderHost(settings: HostSettings = {}): Promise<void> {
    const { fixture } = await render(DialogHostComponent);
    host = fixture.componentInstance;
    host.label.set(settings.label ?? "");
    host.describedBy.set(settings.describedBy ?? "");
    host.dialogRole.set(settings.dialogRole ?? "dialog");
    host.dismissible.set(settings.dismissible ?? true);
    user = userEvent.setup();
  }

  /** Returns the native dialog, which jsdom hides from role queries when shut. */
  function dialog(): HTMLDialogElement {
    const element = document.querySelector("dialog");
    if (!element) throw new Error("No <dialog> rendered");
    return element;
  }

  describe("opening and closing", () => {
    it("stays shut until its host opens it", async () => {
      await renderHost();

      expect(dialog().open).toBe(false);
    });

    it("opens as a modal when told to", async () => {
      await openDialog();

      expect(dialog().open).toBe(true);
    });

    it("shuts when its host closes it", async () => {
      await openDialog();

      await user.click(screen.getByRole("button", { name: "Done" }));

      expect(dialog().open).toBe(false);
    });

    it("survives a change while open", async () => {
      await openDialog();

      // `showModal()` throws on an open dialog, which is why the effect guards
      // on `dialog.open` rather than on the input alone.
      host.label.set("Renamed while open");

      expect(
        await screen.findByRole("dialog", { name: "Renamed while open" }),
      ).toBeInTheDocument();
    });

    it("projects its host's content", async () => {
      await openDialog();

      expect(
        screen.getByText("Everything you have done will be lost."),
      ).toBeInTheDocument();
    });

    it("moves focus into the dialog, so the keyboard follows the eye", async () => {
      await openDialog();

      expect(
        screen.getByRole("button", { name: "Inner control" }),
      ).toHaveFocus();
    });

    it("gives focus back to what opened it", async () => {
      await openDialog();

      await user.click(screen.getByRole("button", { name: "Done" }));

      expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
    });
  });

  describe("the accessible description", () => {
    it("announces itself as a dialog by default", async () => {
      await openDialog();

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("announces itself as an alert dialog when it interrupts to ask", async () => {
      await openDialog({ dialogRole: "alertdialog" });

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("takes the name its host gives it", async () => {
      await openDialog({ label: "Game options" });

      expect(screen.getByRole("dialog")).toHaveAccessibleName("Game options");
    });

    it("carries no empty name attribute when unnamed", async () => {
      await openDialog();

      expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-label");
    });

    it("points at what it is about when its host says where that is", async () => {
      await openDialog({ describedBy: "the-description" });

      expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
        "Everything you have done will be lost.",
      );
    });

    it("carries no empty description attribute when undescribed", async () => {
      await openDialog();

      expect(screen.getByRole("dialog")).not.toHaveAttribute(
        "aria-describedby",
      );
    });
  });

  describe("dismissing", () => {
    it("asks to close on Escape", async () => {
      await openDialog();

      await user.keyboard("{Escape}");

      expect(host.closeRequests()).toBe(1);
    });

    it("closes on Escape once its host agrees", async () => {
      await openDialog();

      await user.keyboard("{Escape}");

      expect(dialog().open).toBe(false);
    });

    it("asks to close when the backdrop is clicked", async () => {
      await openDialog();

      // A backdrop click targets the <dialog> itself.
      await user.click(dialog());

      expect(host.closeRequests()).toBe(1);
    });

    it("stays open when the panel itself is clicked", async () => {
      await openDialog();

      await user.click(screen.getByTestId("panel"));

      expect(host.closeRequests()).toBe(0);
    });

    it("refuses Escape when it is not dismissible", async () => {
      // A game's victory card: closing it would leave a finished board with
      // no way on from it.
      await openDialog({ dismissible: false });

      await user.keyboard("{Escape}");

      expect(dialog().open).toBe(true);
    });

    it("refuses a backdrop click when it is not dismissible", async () => {
      await openDialog({ dismissible: false });

      await user.click(dialog());

      expect(dialog().open).toBe(true);
    });

    it("does not ask to close when its host closes it", async () => {
      // A host that lowers `open` itself is not told to close in return.
      await openDialog();

      await user.click(screen.getByRole("button", { name: "Done" }));

      expect(host.closeRequests()).toBe(0);
    });
  });
});
