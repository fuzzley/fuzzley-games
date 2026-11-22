import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { TestBed } from "@angular/core/testing";
import {
  BUG_REPORT_SOURCE,
  BugReportService,
  type BugReportSource,
} from "../bug_report";
import { BUILD_INFO, type BuildInfo } from "../build_info";
import { installCompressionStreams, provideReportPicture } from "../testing";
import { SettingsDrawerComponent } from "./settings_drawer.component";

/** A build stamped with its commit and the time it ran. */
const BUILD: BuildInfo = {
  commit: "549c93a",
  buildTime: "2031-06-15T09:30:00.000Z",
};

/** What a spec gets back from rendering the drawer. */
interface RenderedDrawer {
  readonly user: UserEvent;
  readonly closed: ReturnType<typeof vi.fn>;
}

/** Renders the drawer around a setting, a checkbox, open unless told otherwise. */
async function renderDrawer(open = true): Promise<RenderedDrawer> {
  const closed = vi.fn();
  await render(
    `<fz-settings-drawer [open]="open" (closed)="closed()">
      <label><input type="checkbox" /> Play sounds</label>
    </fz-settings-drawer>`,
    {
      imports: [SettingsDrawerComponent],
      componentProperties: { open, closed },
      providers: [{ provide: BUILD_INFO, useValue: BUILD }],
    },
  );
  return { user: userEvent.setup(), closed };
}

/** Snake's reports, as far as the drawer needs them. */
const SOURCE: BugReportSource = {
  title: "Snake",
  tag: "sn1",
  game: () => "Snake · Normal",
  settings: () => [],
  capture: () => ({ summary: "Score 12", value: { score: 12 } }),
  load: () => Promise.resolve(true),
};

/** Renders the drawer, open, in a game that takes bug reports. */
async function renderReportingDrawer(): Promise<RenderedDrawer> {
  const closed = vi.fn();
  await render(
    `<fz-settings-drawer [open]="true" (closed)="closed()">
      <label><input type="checkbox" /> Play sounds</label>
    </fz-settings-drawer>`,
    {
      imports: [SettingsDrawerComponent],
      componentProperties: { closed },
      providers: [
        { provide: BUILD_INFO, useValue: BUILD },
        { provide: BUG_REPORT_SOURCE, useValue: SOURCE },
        provideReportPicture(),
      ],
    },
  );
  return { user: userEvent.setup(), closed };
}

/** Returns the drawer's native dialog, which jsdom hides from role queries when shut. */
function dialog(): HTMLDialogElement {
  const element = document.querySelector("dialog");
  if (!element) throw new Error("No <dialog> rendered");
  return element;
}

describe("SettingsDrawerComponent", () => {
  it("stays shut until asked to open", async () => {
    await renderDrawer(false);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a dialog named Settings, under its heading", async () => {
    await renderDrawer();

    expect(
      within(screen.getByRole("dialog", { name: "Settings" })).getByRole(
        "heading",
        { level: 2, name: "Settings" },
      ),
    ).toBeInTheDocument();
  });

  it("takes the focus at its close button as it opens", async () => {
    await renderDrawer();

    expect(
      screen.getByRole("button", { name: "Close settings" }),
    ).toHaveFocus();
  });

  it("shows the settings it is given", async () => {
    await renderDrawer();

    expect(screen.getByRole("dialog")).toContainElement(
      screen.getByRole("checkbox", { name: "Play sounds" }),
    );
  });

  it("says which version of the game is running, beneath the settings", async () => {
    await renderDrawer();

    const settings = screen.getByRole("checkbox", { name: "Play sounds" });
    const version = screen.getByRole("link", {
      name: "549c93a (opens in a new tab)",
    });

    expect(settings.compareDocumentPosition(version)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("asks to close from its close button", async () => {
    const { user, closed } = await renderDrawer();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(closed).toHaveBeenCalledOnce();
  });

  it("asks to close on Escape", async () => {
    const { user, closed } = await renderDrawer();

    await user.keyboard("{Escape}");

    expect(closed).toHaveBeenCalledOnce();
  });

  it("asks to close on a click beside it", async () => {
    const { user, closed } = await renderDrawer();

    // A click beside the drawer lands on the <dialog> itself.
    await user.click(dialog());

    expect(closed).toHaveBeenCalledOnce();
  });

  it("stays open until the game lowers open", async () => {
    const { user } = await renderDrawer();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(dialog().open).toBe(true);
  });

  it("offers no bug report in a game that takes none", async () => {
    await renderDrawer();

    expect(
      screen.queryByRole("button", { name: "Report a bug" }),
    ).not.toBeInTheDocument();
  });

  describe("in a game that takes bug reports", () => {
    installCompressionStreams();

    it("offers Report a bug between the settings and the version", async () => {
      await renderReportingDrawer();

      const settings = screen.getByRole("checkbox", { name: "Play sounds" });
      const report = screen.getByRole("button", { name: "Report a bug" });
      const version = screen.getByRole("link", {
        name: "549c93a (opens in a new tab)",
      });

      expect(settings.compareDocumentPosition(report)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(report.compareDocumentPosition(version)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    it("asks to close as Report a bug is pressed", async () => {
      const { user, closed } = await renderReportingDrawer();

      await user.click(screen.getByRole("button", { name: "Report a bug" }));
      // The report it starts packs its state, which ends with the test.
      await vi.waitFor(() => {
        expect(TestBed.inject(BugReportService).report()).not.toBeNull();
      });

      expect(closed).toHaveBeenCalledOnce();
    });
  });
});
