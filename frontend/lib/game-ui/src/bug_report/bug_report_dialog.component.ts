import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from "@angular/core";
import { AnnouncerComponent, AnnouncerService } from "@fz/ui/announcer";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { BugReportService } from "./bug_report.service";
import { BUG_REPORT_SOURCE } from "./tokens";

/** What the dialog says with a mouse, the picture copied as GitHub opens. */
const COPY_WORDS =
  "When you click Open GitHub, the report opens in a new tab with this game filled in. The picture is copied too, so you can paste it under Screenshot.";

/** What the dialog says on a touch screen, where the picture is saved first. */
const SAVE_WORDS =
  "Tap Save picture, then Open GitHub, and add the picture under Screenshot.";

/** What the dialog says where no picture could be taken. */
const NO_PICTURE_WORDS = "GitHub opens in a new tab with this game filled in.";

/** What the dialog shows and says where the browser refuses the copy. */
const COPY_FAILED = "Couldn't copy the picture";

/** The picture's type, the one image type a clipboard takes everywhere. */
const PNG = "image/png";

/** Describes the picture as the dialog shows it, and the file it saves. */
interface ShownPicture {
  readonly blob: Blob;
  /** The link the page shows it from. */
  readonly src: string;
  /** The file it is saved as, "brick-breaker-bug.png". */
  readonly fileName: string;
}

/** Tells one dialog's words apart from another's on the same page. */
let nextDialog = 0;

/**
 * Shows the report `BugReportService.start()` opened: the picture of the
 * page, Save picture, and Open GitHub, a link to the issue filled in.
 *
 * A game that provides `BUG_REPORT_SOURCE` puts one in its root template,
 * with `touch` bound to its viewport's touch screen. With a mouse, Open
 * GitHub's click copies the picture as GitHub opens, and says so where the
 * browser refuses. On a touch screen, where sharing uses the tap up, Save
 * picture comes first: the share sheet where the browser shares files, else
 * a download.
 */
@Component({
  selector: "fz-bug-report-dialog",
  imports: [AnnouncerComponent, DialogComponent, IconComponent],
  templateUrl: "./bug_report_dialog.component.html",
  styleUrl: "./bug_report_dialog.component.scss",
})
export class BugReportDialogComponent {
  /** Whether the main pointer is a finger, as the game's viewport says. */
  readonly touch = input.required<boolean>();

  private readonly reports = inject(BugReportService);
  private readonly announcer = inject(AnnouncerService);
  private readonly fileName = `${inject(BUG_REPORT_SOURCE)
    .title.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-bug.png`;

  protected readonly wordsId = `fz-bug-report-words-${String(nextDialog++)}`;

  /** Whether the report is open. */
  protected readonly isOpen = computed(() => this.reports.report() !== null);

  /** Whether copying this report's picture failed. */
  protected readonly copyFailed = linkedSignal({
    source: this.reports.report,
    computation: () => false,
  });

  /** The open report's picture, as the dialog shows it, or null. */
  private readonly picture = signal<ShownPicture | null>(null);

  /** What the dialog shows of the open report, or null while none is. */
  protected readonly shown = computed(() => {
    const report = this.reports.report();
    if (!report) return null;
    const picture = this.picture();
    return { url: report.url, picture, words: this.wordsFor(picture) };
  });

  constructor() {
    // Each picture's link is made as its report opens and let go as the
    // dialog stops showing it, on a close, another report, or the dialog's
    // end.
    effect((onCleanup) => {
      const blob = this.reports.report()?.picture;
      if (!blob) {
        this.picture.set(null);
        return;
      }
      const src = URL.createObjectURL(blob);
      this.picture.set({ blob, src, fileName: this.fileName });
      onCleanup(() => {
        URL.revokeObjectURL(src);
      });
    });
  }

  /** Returns what the dialog says, by whether it has a picture to hand over. */
  private wordsFor(picture: ShownPicture | null): string {
    if (!picture) return NO_PICTURE_WORDS;
    return this.touch() ? SAVE_WORDS : COPY_WORDS;
  }

  /** Closes the report. */
  protected close(): void {
    this.reports.close();
  }

  /**
   * Offers the share sheet on a touch screen where the browser shares files,
   * which takes the tap, and otherwise leaves the link to download the
   * picture, as a mouse's player expects of Save.
   */
  protected savePicture(event: Event, picture: ShownPicture): void {
    if (!this.touch()) return;
    const file = new File([picture.blob], picture.fileName, { type: PNG });
    if (!("canShare" in navigator) || !navigator.canShare({ files: [file] })) {
      return;
    }
    event.preventDefault();
    // The player putting the sheet away rejects it too, which needs no word.
    navigator.share({ files: [file] }).catch(() => undefined);
  }

  /**
   * Copies the picture as the link opens GitHub, with a mouse, and says so
   * where the browser refuses.
   */
  protected openGitHub(picture: ShownPicture | null): void {
    if (this.touch() || !picture) return;
    this.copy(picture.blob).catch(() => {
      this.copyFailed.set(true);
      this.announcer.say(COPY_FAILED);
    });
  }

  /**
   * Writes the picture to the clipboard, the write called inside the click
   * before anything is awaited, since Safari refuses one after an `await`.
   */
  private async copy(blob: Blob): Promise<void> {
    await navigator.clipboard.write([
      new ClipboardItem({ [PNG]: Promise.resolve(blob) }),
    ]);
  }
}
