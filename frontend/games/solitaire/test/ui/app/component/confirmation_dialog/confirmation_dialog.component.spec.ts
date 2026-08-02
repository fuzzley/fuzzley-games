// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { ConfirmationDialogComponent } from "@/ui/app/component/confirmation_dialog/confirmation_dialog.component";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";
import {
  clickElement,
  query,
  queryRequired,
  queryText,
} from "@test/support/dom";
import { pressEscape } from "@test/support/dialog";

describe("ConfirmationDialogComponent", () => {
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  let confirmation: ConfirmationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent],
      providers: [ConfirmationService],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    confirmation = TestBed.inject(ConfirmationService);
    fixture.detectChanges();
  });

  /** Opens the prompt and renders it. */
  function request(message = "Confirm?", action = vi.fn()): typeof action {
    confirmation.request(message, action);
    fixture.detectChanges();
    return action;
  }

  it("stays closed until something asks for confirmation", () => {
    expect(queryRequired<HTMLDialogElement>(fixture, "dialog").open).toBe(
      false,
    );
  });

  it("opens when confirmation is requested", () => {
    request();

    expect(queryRequired<HTMLDialogElement>(fixture, "dialog").open).toBe(true);
  });

  it("announces itself as an alert dialog, since it interrupts to ask", () => {
    request();

    expect(query(fixture, "dialog")?.getAttribute("role")).toBe("alertdialog");
  });

  it("renders the message it was opened with", () => {
    request("Test confirmation message?");

    expect(queryText(fixture, ".confirmation-message")).toBe(
      "Test confirmation message?",
    );
  });

  it("closes without running the action when Cancel is clicked", () => {
    const action = request();

    clickElement(fixture, ".btn-secondary");
    fixture.detectChanges();

    expect(action).not.toHaveBeenCalled();
    expect(confirmation.isOpen()).toBe(false);
  });

  it("runs the action and closes when Confirm is clicked", () => {
    const action = request();

    clickElement(fixture, ".btn-danger");
    fixture.detectChanges();

    expect(action).toHaveBeenCalledOnce();
    expect(confirmation.isOpen()).toBe(false);
  });

  it("cancels on Escape, leaving the action unrun", () => {
    const action = request();

    pressEscape();
    fixture.detectChanges();

    expect(action).not.toHaveBeenCalled();
    expect(confirmation.isOpen()).toBe(false);
  });

  it("cancels when the backdrop outside the card is clicked", () => {
    const action = request();

    queryRequired<HTMLDialogElement>(fixture, "dialog").click();
    fixture.detectChanges();

    expect(action).not.toHaveBeenCalled();
    expect(confirmation.isOpen()).toBe(false);
  });

  it("stays open when the card itself is clicked", () => {
    request();

    queryRequired(fixture, ".confirmation-card").click();
    fixture.detectChanges();

    expect(confirmation.isOpen()).toBe(true);
  });
});
