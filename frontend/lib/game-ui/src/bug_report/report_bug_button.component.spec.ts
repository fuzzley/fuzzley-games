import { ErrorHandler } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { installCompressionStreams, provideReportPicture } from "../testing";
import { BugReportService } from "./bug_report.service";
import { ReportBugButtonComponent } from "./report_bug_button.component";
import { BUG_REPORT_SOURCE, type BugReportSource } from "./tokens";

/** Snake's reports, as far as the button needs them. */
const SOURCE: BugReportSource = {
  title: "Snake",
  tag: "sn1",
  game: () => "Snake · Normal",
  settings: () => [],
  capture: () => ({ summary: "Score 12", value: { score: 12 } }),
  load: () => Promise.resolve(true),
};

/** Renders the button over a source, noting what it emits and what fails. */
async function renderButton(source: BugReportSource = SOURCE): Promise<{
  readonly chosen: ReturnType<typeof vi.fn>;
  readonly handleError: ReturnType<typeof vi.fn>;
}> {
  const chosen = vi.fn();
  const handleError = vi.fn();
  await render(`<fz-report-bug-button (chosen)="chosen()" />`, {
    imports: [ReportBugButtonComponent],
    componentProperties: { chosen },
    providers: [
      { provide: BUG_REPORT_SOURCE, useValue: source },
      provideReportPicture(),
      { provide: ErrorHandler, useValue: { handleError } },
    ],
  });
  return { chosen, handleError };
}

installCompressionStreams();

describe("ReportBugButtonComponent", () => {
  it("asks whether the player found a problem, over the button", async () => {
    await renderButton();

    const question = screen.getByText("Found a problem?");
    const button = screen.getByRole("button", { name: "Report a bug" });

    expect(question.compareDocumentPosition(button)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("says it was chosen as it is pressed", async () => {
    const { chosen } = await renderButton();

    await userEvent.click(screen.getByRole("button", { name: "Report a bug" }));
    // The report it starts packs its state, which ends with the test.
    await vi.waitFor(() => {
      expect(TestBed.inject(BugReportService).report()).not.toBeNull();
    });

    expect(chosen).toHaveBeenCalledOnce();
  });

  it("starts a report on the game in play", async () => {
    await renderButton();
    const service = TestBed.inject(BugReportService);

    await userEvent.click(screen.getByRole("button", { name: "Report a bug" }));

    await vi.waitFor(() => {
      expect(service.report()?.title).toBe("[Snake] ");
    });
  });

  it("hands a report that fails to the app's error handler", async () => {
    const broken = new Error("The board is gone.");
    const { handleError } = await renderButton({
      ...SOURCE,
      capture: () => {
        throw broken;
      },
    });

    await userEvent.click(screen.getByRole("button", { name: "Report a bug" }));

    await vi.waitFor(() => {
      expect(handleError).toHaveBeenCalledWith(broken);
    });
  });
});
