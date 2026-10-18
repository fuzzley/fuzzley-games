// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { ConfirmationDialogComponent } from "@/ui/app/component/confirmation_dialog/confirmation_dialog.component";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";
import { clickElement, query, queryText } from "@test/support/dom";
import { isDialogOpen, clickBackdrop, pressEscape } from "@test/support/dialog";

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

  /** Asks a question and renders the prompt. */
  function ask(message = "Confirm?"): Promise<boolean> {
    const answer = confirmation.ask(message);
    fixture.detectChanges();
    return answer;
  }

  it("stays closed until something asks for confirmation", () => {
    expect(isDialogOpen(fixture)).toBe(false);
  });

  it("opens when confirmation is requested", () => {
    void ask();

    expect(isDialogOpen(fixture)).toBe(true);
  });

  it("announces itself as an alert dialog, since it interrupts to ask", () => {
    void ask();

    expect(query(fixture, "dialog")?.getAttribute("role")).toBe("alertdialog");
  });

  it("points the dialog's description at the message, not just its title", () => {
    void ask("Your current progress will be lost.");

    const describedBy = query(fixture, "dialog")?.getAttribute(
      "aria-describedby",
    );

    expect(describedBy).toBe("confirmation-message");
    expect(query(fixture, `#${describedBy}`)?.textContent?.trim()).toBe(
      "Your current progress will be lost.",
    );
  });

  it("renders the message it was opened with", () => {
    void ask("Test confirmation message?");

    expect(queryText(fixture, ".confirmation-message")).toBe(
      "Test confirmation message?",
    );
  });

  it("answers yes when Confirm is clicked", async () => {
    const answer = ask();

    clickElement(fixture, ".btn-danger");
    fixture.detectChanges();

    await expect(answer).resolves.toBe(true);
    expect(isDialogOpen(fixture)).toBe(false);
  });

  it("answers no when Cancel is clicked", async () => {
    const answer = ask();

    clickElement(fixture, ".btn-secondary");
    fixture.detectChanges();

    await expect(answer).resolves.toBe(false);
    expect(isDialogOpen(fixture)).toBe(false);
  });

  it("answers no on Escape", async () => {
    const answer = ask();

    pressEscape();
    fixture.detectChanges();

    await expect(answer).resolves.toBe(false);
  });

  it("answers no when the backdrop outside the card is clicked", async () => {
    const answer = ask();

    clickBackdrop(fixture);
    fixture.detectChanges();

    await expect(answer).resolves.toBe(false);
  });

  it("stays open when the card itself is clicked", () => {
    void ask();

    query(fixture, ".confirmation-card")?.click();
    fixture.detectChanges();

    expect(confirmation.isOpen()).toBe(true);
  });
});
