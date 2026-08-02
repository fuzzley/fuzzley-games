// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import {
  ModalDialogComponent,
  type ModalRole,
} from "@/ui/app/component/modal_dialog/modal_dialog.component";
import { query, queryRequired, queryText } from "@test/support/dom";
import { isDialogOpen, clickBackdrop, pressEscape } from "@test/support/dialog";

/**
 * A host shaped like the real ones: it owns the open state and closes on the
 * dialog's request, rather than letting the DOM own half of it.
 */
@Component({
  selector: "test-modal-host",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialogComponent],
  template: `
    <app-modal-dialog
      [open]="open()"
      [label]="label()"
      [describedBy]="describedBy()"
      [dialogRole]="dialogRole()"
      [dismissible]="dismissible()"
      (closed)="closeRequests.set(closeRequests() + 1); open.set(false)"
    >
      <div class="panel">
        <p id="the-description">Everything you have done will be lost.</p>
        <button type="button" class="inner">Inner control</button>
      </div>
    </app-modal-dialog>
  `,
})
class ModalHostComponent {
  readonly open = signal(false);
  readonly label = signal("");
  readonly describedBy = signal("");
  readonly dialogRole = signal<ModalRole>("dialog");
  readonly dismissible = signal(true);

  /** How many times the dialog has asked to be closed. */
  readonly closeRequests = signal(0);
}

describe("ModalDialogComponent", () => {
  let fixture: ComponentFixture<ModalHostComponent>;
  let host: ModalHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Opens the dialog and renders it. */
  function open(): void {
    host.open.set(true);
    fixture.detectChanges();
  }

  describe("opening and closing", () => {
    it("stays shut until its host opens it", () => {
      expect(isDialogOpen(fixture)).toBe(false);
    });

    it("opens as a modal when told to", () => {
      open();

      expect(isDialogOpen(fixture)).toBe(true);
    });

    it("shuts when its host closes it", () => {
      open();

      host.open.set(false);
      fixture.detectChanges();

      expect(isDialogOpen(fixture)).toBe(false);
    });

    it("survives being told to open while already open", () => {
      open();

      // `showModal()` throws on an open dialog, which is why the effect guards
      // on `dialog.open` rather than on the input alone.
      expect(() => {
        host.label.set("Renamed while open");
        fixture.detectChanges();
      }).not.toThrow();
      expect(isDialogOpen(fixture)).toBe(true);
    });

    it("projects its host's content", () => {
      open();

      expect(queryText(fixture, ".panel p")).toBe(
        "Everything you have done will be lost.",
      );
    });

    it("moves focus into the dialog, so the keyboard follows the eye", () => {
      open();

      expect(document.activeElement).toBe(queryRequired(fixture, ".inner"));
    });
  });

  describe("the accessible description", () => {
    it("announces itself as a dialog by default", () => {
      open();

      expect(query(fixture, "dialog")?.getAttribute("role")).toBe("dialog");
    });

    it("announces itself as an alert dialog when it interrupts to ask", () => {
      host.dialogRole.set("alertdialog");
      open();

      expect(query(fixture, "dialog")?.getAttribute("role")).toBe(
        "alertdialog",
      );
    });

    it("takes the name its host gives it", () => {
      host.label.set("Game options");
      open();

      expect(query(fixture, "dialog")?.getAttribute("aria-label")).toBe(
        "Game options",
      );
    });

    it("carries no empty name attribute when unnamed", () => {
      open();

      expect(query(fixture, "dialog")?.getAttribute("aria-label")).toBeNull();
    });

    it("points at what it is about when its host says where that is", () => {
      host.describedBy.set("the-description");
      open();

      expect(query(fixture, "dialog")?.getAttribute("aria-describedby")).toBe(
        "the-description",
      );
    });

    it("carries no empty description attribute when undescribed", () => {
      open();

      expect(
        query(fixture, "dialog")?.getAttribute("aria-describedby"),
      ).toBeNull();
    });
  });

  describe("dismissing", () => {
    it("asks to close on Escape", () => {
      open();

      pressEscape();
      fixture.detectChanges();

      expect(host.closeRequests()).toBe(1);
      expect(isDialogOpen(fixture)).toBe(false);
    });

    it("asks to close when the backdrop is clicked", () => {
      open();

      clickBackdrop(fixture);
      fixture.detectChanges();

      expect(host.closeRequests()).toBe(1);
    });

    it("stays open when the panel itself is clicked", () => {
      open();

      queryRequired(fixture, ".panel").click();
      fixture.detectChanges();

      expect(host.closeRequests()).toBe(0);
      expect(isDialogOpen(fixture)).toBe(true);
    });

    it("refuses Escape when it is not dismissible", () => {
      // The victory card: closing it would leave a finished board with no way
      // back to it.
      host.dismissible.set(false);
      open();

      pressEscape();
      fixture.detectChanges();

      expect(host.closeRequests()).toBe(0);
      expect(isDialogOpen(fixture)).toBe(true);
    });

    it("refuses a backdrop click when it is not dismissible", () => {
      host.dismissible.set(false);
      open();

      clickBackdrop(fixture);
      fixture.detectChanges();

      expect(host.closeRequests()).toBe(0);
      expect(isDialogOpen(fixture)).toBe(true);
    });

    it("does not ask to close when the host has already closed it", () => {
      // The request travels one way. A host lowering `open` itself must not be
      // told to close as a result, or every programmatic close makes a round
      // trip back through the host that started it.
      open();

      host.open.set(false);
      fixture.detectChanges();

      expect(host.closeRequests()).toBe(0);
    });
  });
});
