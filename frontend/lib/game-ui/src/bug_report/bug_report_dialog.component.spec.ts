import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { CompressionStream, DecompressionStream } from "node:stream/web";
import { BugReportService } from "./bug_report.service";
import { BugReportDialogComponent } from "./bug_report_dialog.component";
import {
  BUG_REPORT_SOURCE,
  type BugReportSource,
  REPORT_PICTURE,
} from "./tokens";

/** Brick Breaker's reports, as far as the dialog needs them. */
const SOURCE: BugReportSource = {
  title: "Brick Breaker",
  tag: "bb1",
  game: () => "Brick Breaker · Normal · Level 9: Rocket",
  settings: () => ["Speed: Normal"],
  capture: () => ({ summary: "Level 9 · Score 950", value: { level: 9 } }),
  load: () => Promise.resolve(true),
};

/** A PNG of the page, as far as the dialog can tell. */
const PICTURE = new Blob(["png"], { type: "image/png" });

/** The link the page shows the first picture from, of a report. */
const PICTURE_SRC = "blob:http://localhost/picture-1";

/** What the dialog shows and says where the browser refuses the copy. */
const COPY_FAILED = "Couldn't copy the picture";

/** Stands in for the browser's `ClipboardItem`, which jsdom lacks. */
class FakeClipboardItem {
  constructor(readonly items: Readonly<Record<string, Promise<Blob>>>) {}
}

/** What a spec gets back from opening the dialog. */
interface OpenDialog {
  readonly fixture: ComponentFixture<BugReportDialogComponent>;
  readonly user: UserEvent;
  readonly dialog: HTMLElement;
  readonly service: BugReportService;
}

/** The picture links made, in order. */
let made: string[];

/** The picture links revoked, in order. */
let revoked: string[];

/** Whether each click on a link reached the page with its default prevented. */
let linkClicks: boolean[];

/** Notes whether a click on a link was prevented, and stops jsdom following it. */
function onLinkClick(event: MouseEvent): void {
  if (!(event.target instanceof Element) || !event.target.closest("a")) return;
  linkClicks.push(event.defaultPrevented);
  event.preventDefault();
}

/**
 * Renders the dialog and opens a report in it, with a picture unless told
 * otherwise, as on a mouse unless told it is a touch screen.
 */
async function openDialog({
  touch = false,
  picture = PICTURE,
}: { touch?: boolean; picture?: Blob | null } = {}): Promise<OpenDialog> {
  const { fixture } = await render(BugReportDialogComponent, {
    inputs: { touch },
    providers: [
      { provide: BUG_REPORT_SOURCE, useValue: SOURCE },
      { provide: REPORT_PICTURE, useValue: () => Promise.resolve(picture) },
    ],
  });
  const user = userEvent.setup();
  const service = TestBed.inject(BugReportService);
  await service.start();
  const dialog = await screen.findByRole("dialog", { name: "Report a bug" });
  return { fixture, user, dialog, service };
}

/**
 * Gives the page a clipboard that takes what is written, or refuses it, in
 * place of the one `userEvent.setup()` gives it.
 */
function installClipboard(refuses = false): FakeClipboardItem[] {
  const written: FakeClipboardItem[] = [];
  Object.defineProperty(globalThis, "ClipboardItem", {
    configurable: true,
    value: FakeClipboardItem,
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      write: (items: readonly FakeClipboardItem[]): Promise<void> => {
        written.push(...items);
        return refuses
          ? Promise.reject(new DOMException("Denied", "NotAllowedError"))
          : Promise.resolve();
      },
    },
  });
  return written;
}

/** Gives the page a share sheet, which shares files where `files` is true. */
function installShare(files: boolean): File[] {
  const shared: File[] = [];
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: (): boolean => files,
  });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: (data: ShareData): Promise<void> => {
      shared.push(...(data.files ?? []));
      return Promise.reject(new DOMException("Put away", "AbortError"));
    },
  });
  return shared;
}

// jsdom has no compression streams, so Node's stand in.
beforeAll(() => {
  vi.stubGlobal("CompressionStream", CompressionStream);
  vi.stubGlobal("DecompressionStream", DecompressionStream);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// jsdom makes no links to blobs, and follows no link, so fakes stand in.
beforeEach(() => {
  made = [];
  revoked = [];
  linkClicks = [];
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: (): string => {
      const src = `blob:http://localhost/picture-${made.length + 1}`;
      made.push(src);
      return src;
    },
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: (src: string) => revoked.push(src),
  });
  window.addEventListener("click", onLinkClick);
});

afterEach(() => {
  window.removeEventListener("click", onLinkClick);
  for (const name of ["clipboard", "canShare", "share"]) {
    Reflect.deleteProperty(navigator, name);
  }
  Reflect.deleteProperty(globalThis, "ClipboardItem");
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

describe("BugReportDialogComponent", () => {
  it("stays shut until a report is started", async () => {
    await render(BugReportDialogComponent, {
      inputs: { touch: false },
      providers: [{ provide: BUG_REPORT_SOURCE, useValue: SOURCE }],
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens under its heading", async () => {
    const { dialog } = await openDialog();

    expect(
      within(dialog).getByRole("heading", { level: 2, name: "Report a bug" }),
    ).toBeInTheDocument();
  });

  it("takes the focus at its close button as it opens", async () => {
    await openDialog();

    expect(
      screen.getByRole("button", { name: "Close bug report" }),
    ).toHaveFocus();
  });

  it("shows the picture of the game as the player left it", async () => {
    const { dialog } = await openDialog();

    expect(
      within(dialog).getByRole("img", { name: "The game as you left it" }),
    ).toHaveAttribute("src", PICTURE_SRC);
  });

  it("links Open GitHub to the issue, filled in, in a new tab", async () => {
    const { dialog, service } = await openDialog();

    const link = within(dialog).getByRole("link", {
      name: /^Open GitHub\s*\(opens in a new tab\)$/,
    });

    expect(link).toHaveAttribute("href", service.report()?.url);
    expect(link).toHaveAttribute("target", "_blank");
  });

  describe("with a mouse", () => {
    it("says the picture is copied as GitHub opens", async () => {
      const { dialog } = await openDialog();

      expect(dialog).toHaveAccessibleDescription(
        "When you click Open GitHub, the report opens in a new tab with this game filled in. The picture is copied too, so you can paste it under Screenshot.",
      );
    });

    it("copies the picture as Open GitHub is clicked", async () => {
      const { user, dialog } = await openDialog();
      const written = installClipboard();

      await user.click(within(dialog).getByRole("link", { name: /GitHub/ }));

      expect(written).toHaveLength(1);
      expect(await written[0]?.items["image/png"]).toBe(PICTURE);
    });

    it("opens GitHub whether or not the copy takes", async () => {
      const { user, dialog } = await openDialog();
      installClipboard(true);

      await user.click(within(dialog).getByRole("link", { name: /GitHub/ }));

      expect(linkClicks).toEqual([false]);
    });

    it("says so where the browser refuses the copy", async () => {
      const { user, dialog } = await openDialog();
      installClipboard(true);

      await user.click(within(dialog).getByRole("link", { name: /GitHub/ }));

      expect(
        await within(dialog).findByText(COPY_FAILED, { selector: "p" }),
      ).toBeInTheDocument();
    });

    it("says so where the browser has no clipboard", async () => {
      const { user, dialog } = await openDialog();
      Reflect.deleteProperty(navigator, "clipboard");

      await user.click(within(dialog).getByRole("link", { name: /GitHub/ }));

      expect(
        await within(dialog).findByText(COPY_FAILED, { selector: "p" }),
      ).toBeInTheDocument();
    });

    it("speaks the refusal from inside the dialog", async () => {
      const { user, dialog } = await openDialog();
      installClipboard(true);

      await user.click(within(dialog).getByRole("link", { name: /GitHub/ }));

      expect(
        await within(dialog).findByText(COPY_FAILED, {
          selector: "fz-announcer",
        }),
      ).toBeInTheDocument();
    });

    it("forgets a refused copy once another report opens", async () => {
      const { fixture, user, dialog, service } = await openDialog();
      installClipboard(true);
      await user.click(within(dialog).getByRole("link", { name: /GitHub/ }));
      await within(dialog).findByText(COPY_FAILED, { selector: "p" });

      await service.start();
      await fixture.whenStable();

      expect(
        within(dialog).queryByText(COPY_FAILED, { selector: "p" }),
      ).not.toBeInTheDocument();
    });

    it("leaves the copy alone where no picture was taken", async () => {
      const { user, dialog } = await openDialog({ picture: null });
      const written = installClipboard();

      await user.click(within(dialog).getByRole("link", { name: /GitHub/ }));

      expect(written).toEqual([]);
    });
  });

  describe("on a touch screen", () => {
    it("says to save the picture first", async () => {
      const { dialog } = await openDialog({ touch: true });

      expect(dialog).toHaveAccessibleDescription(
        "Tap Save picture, then Open GitHub, and add the picture under Screenshot.",
      );
    });

    it("copies nothing as Open GitHub is tapped", async () => {
      const { user, dialog } = await openDialog({ touch: true });
      const written = installClipboard();

      await user.click(within(dialog).getByRole("link", { name: /GitHub/ }));

      expect(written).toEqual([]);
    });
  });

  describe("saving the picture", () => {
    it("downloads it, named for the game, where the browser can't share", async () => {
      const { dialog } = await openDialog();

      const save = within(dialog).getByRole("link", { name: "Save picture" });

      expect(save).toHaveAttribute("href", PICTURE_SRC);
      expect(save).toHaveAttribute("download", "brick-breaker-bug.png");
    });

    it("leaves the download to the link where the browser can't share", async () => {
      const { user, dialog } = await openDialog();

      await user.click(
        within(dialog).getByRole("link", { name: "Save picture" }),
      );

      expect(linkClicks).toEqual([false]);
    });

    it("leaves the download to the link where the browser shares no files", async () => {
      const shared = installShare(false);
      const { user, dialog } = await openDialog({ touch: true });

      await user.click(
        within(dialog).getByRole("link", { name: "Save picture" }),
      );

      expect(shared).toEqual([]);
    });

    it("offers the share sheet on a touch screen where the browser shares files", async () => {
      const shared = installShare(true);
      const { user, dialog } = await openDialog({ touch: true });

      await user.click(
        within(dialog).getByRole("link", { name: "Save picture" }),
      );

      expect(shared.map(({ name, type }) => ({ name, type }))).toEqual([
        { name: "brick-breaker-bug.png", type: "image/png" },
      ]);
    });

    it("shares in place of the download", async () => {
      installShare(true);
      const { user, dialog } = await openDialog({ touch: true });

      await user.click(
        within(dialog).getByRole("link", { name: "Save picture" }),
      );

      expect(linkClicks).toEqual([true]);
    });

    it("downloads with a mouse even where the browser shares files", async () => {
      const shared = installShare(true);
      const { user, dialog } = await openDialog();

      await user.click(
        within(dialog).getByRole("link", { name: "Save picture" }),
      );

      expect(shared).toEqual([]);
      expect(linkClicks).toEqual([false]);
    });
  });

  describe("with no picture", () => {
    it("says only what opens", async () => {
      const { dialog } = await openDialog({ picture: null });

      expect(dialog).toHaveAccessibleDescription(
        "GitHub opens in a new tab with this game filled in.",
      );
    });

    it("shows no picture and offers none to save", async () => {
      const { dialog } = await openDialog({ picture: null });

      expect(within(dialog).queryByRole("img")).not.toBeInTheDocument();
      expect(
        within(dialog).queryByRole("link", { name: "Save picture" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("closing", () => {
    it("closes from its close button", async () => {
      const { user, service } = await openDialog();

      await user.click(
        screen.getByRole("button", { name: "Close bug report" }),
      );

      expect(service.report()).toBeNull();
    });

    it("closes on Escape", async () => {
      const { user, service } = await openDialog();

      await user.keyboard("{Escape}");

      expect(service.report()).toBeNull();
    });

    it("lets go of the old picture's link once another report opens", async () => {
      const { fixture, service } = await openDialog();

      await service.start();
      await fixture.whenStable();

      expect(revoked).toEqual([PICTURE_SRC]);
    });

    it("shows the new picture once another report opens", async () => {
      const { fixture, dialog, service } = await openDialog();

      await service.start();
      await fixture.whenStable();

      expect(within(dialog).getByRole("img")).toHaveAttribute(
        "src",
        "blob:http://localhost/picture-2",
      );
    });

    it("lets go of the picture's link once it closes", async () => {
      const { user } = await openDialog();

      await user.click(
        screen.getByRole("button", { name: "Close bug report" }),
      );

      expect(revoked).toEqual([PICTURE_SRC]);
    });
  });
});
