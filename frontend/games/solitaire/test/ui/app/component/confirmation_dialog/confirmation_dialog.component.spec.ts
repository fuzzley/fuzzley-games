// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { ConfirmationDialogComponent } from "@/ui/app/component/confirmation_dialog/confirmation_dialog.component";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";

describe("ConfirmationDialogComponent", () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  let confirmation: ConfirmationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent],
      providers: [ConfirmationService],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
    confirmation = TestBed.inject(ConfirmationService);
    fixture.detectChanges();
  });

  it("does not render the confirmation dialog overlay by default", () => {
    confirmation.isOpen.set(false);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector(
      ".confirmation-overlay",
    );
    expect(overlay).toBeNull();
  });

  it("renders the confirmation dialog overlay when isOpen is true", () => {
    confirmation.isOpen.set(true);
    confirmation.message.set("Test confirmation message?");
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector(
      ".confirmation-overlay",
    );
    expect(overlay).not.toBeNull();

    const msg = fixture.nativeElement
      .querySelector(".confirmation-message")
      .textContent.trim();
    expect(msg).toBe("Test confirmation message?");
  });

  it("triggers confirmation.cancel() when Backdrop is clicked", () => {
    confirmation.isOpen.set(true);
    fixture.detectChanges();

    const cancelSpy = vi.spyOn(confirmation, "cancel");
    const backdrop = fixture.nativeElement.querySelector(
      ".confirmation-overlay",
    );
    backdrop.click();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it("triggers confirmation.cancel() when Cancel button is clicked", () => {
    confirmation.isOpen.set(true);
    fixture.detectChanges();

    const cancelSpy = vi.spyOn(confirmation, "cancel");
    const cancelBtn = fixture.nativeElement.querySelector(".btn-secondary");
    cancelBtn.click();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it("triggers confirmation.accept() when Confirm button is clicked", () => {
    confirmation.isOpen.set(true);
    fixture.detectChanges();

    const acceptSpy = vi.spyOn(confirmation, "accept");
    const confirmBtn = fixture.nativeElement.querySelector(".btn-danger");
    confirmBtn.click();

    expect(acceptSpy).toHaveBeenCalled();
  });
});
