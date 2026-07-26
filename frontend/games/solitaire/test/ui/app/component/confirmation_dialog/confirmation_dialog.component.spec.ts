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
    confirmation.isOpen.set(false);
    fixture.detectChanges();

    expect(query(fixture, ".confirmation-overlay")).toBeNull();
  });

  it("renders the confirmation dialog overlay when isOpen is true", () => {
    confirmation.isOpen.set(true);
    confirmation.message.set("Test confirmation message?");
    fixture.detectChanges();

    expect(query(fixture, ".confirmation-overlay")).not.toBeNull();
  });

  it("renders the message it was opened with", () => {
    confirmation.isOpen.set(true);
    confirmation.message.set("Test confirmation message?");
    fixture.detectChanges();

    expect(queryText(fixture, ".confirmation-message")).toBe(
      "Test confirmation message?",
    );
  });

  it("triggers confirmation.cancel() when Backdrop is clicked", () => {
    confirmation.isOpen.set(true);
    fixture.detectChanges();
    const cancelSpy = vi.spyOn(confirmation, "cancel");

    clickElement(fixture, ".confirmation-overlay");

    expect(cancelSpy).toHaveBeenCalled();
  });

  it("triggers confirmation.cancel() when Cancel button is clicked", () => {
    confirmation.isOpen.set(true);
    fixture.detectChanges();
    const cancelSpy = vi.spyOn(confirmation, "cancel");

    clickElement(fixture, ".btn-secondary");

    expect(cancelSpy).toHaveBeenCalled();
  });

  it("triggers confirmation.accept() when Confirm button is clicked", () => {
    confirmation.isOpen.set(true);
    fixture.detectChanges();
    const acceptSpy = vi.spyOn(confirmation, "accept");

    clickElement(fixture, ".btn-danger");

    expect(acceptSpy).toHaveBeenCalled();
  });
});
