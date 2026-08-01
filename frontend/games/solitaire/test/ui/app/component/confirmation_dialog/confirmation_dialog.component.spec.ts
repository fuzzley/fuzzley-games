// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { ConfirmationDialogComponent } from "@/ui/app/component/confirmation_dialog/confirmation_dialog.component";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";
import { clickElement, query, queryText } from "@test/support/dom";

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

  it("does not render the confirmation dialog overlay by default", () => {
    expect(query(fixture, ".confirmation-overlay")).toBeNull();
  });

  it("renders the confirmation dialog overlay when requested", () => {
    confirmation.request("Test confirmation message?", vi.fn());
    fixture.detectChanges();

    expect(query(fixture, ".confirmation-overlay")).not.toBeNull();
  });

  it("renders the message it was opened with", () => {
    confirmation.request("Test confirmation message?", vi.fn());
    fixture.detectChanges();

    expect(queryText(fixture, ".confirmation-message")).toBe(
      "Test confirmation message?",
    );
  });

  it("closes the dialog without running the action when backdrop is clicked", () => {
    const action = vi.fn();
    confirmation.request("Confirm?", action);
    fixture.detectChanges();

    clickElement(fixture, ".confirmation-overlay");
    fixture.detectChanges();

    expect(action).not.toHaveBeenCalled();
    expect(query(fixture, ".confirmation-overlay")).toBeNull();
  });

  it("closes the dialog without running the action when Cancel button is clicked", () => {
    const action = vi.fn();
    confirmation.request("Confirm?", action);
    fixture.detectChanges();

    clickElement(fixture, ".btn-secondary");
    fixture.detectChanges();

    expect(action).not.toHaveBeenCalled();
    expect(query(fixture, ".confirmation-overlay")).toBeNull();
  });

  it("executes the action and closes the dialog when Confirm button is clicked", () => {
    const action = vi.fn();
    confirmation.request("Confirm?", action);
    fixture.detectChanges();

    clickElement(fixture, ".btn-danger");
    fixture.detectChanges();

    expect(action).toHaveBeenCalledOnce();
    expect(query(fixture, ".confirmation-overlay")).toBeNull();
  });
});
