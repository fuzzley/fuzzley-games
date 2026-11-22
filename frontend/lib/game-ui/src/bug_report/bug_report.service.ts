import { DOCUMENT } from "@angular/common";
import { Injectable, inject, signal } from "@angular/core";
import { ThemeService } from "@fz/ui/theme";
import { BUILD_INFO } from "../build_info";
import { GameViewportService } from "../viewport";
import { type ReportEnvironment, environmentList } from "./environment";
import { issueLink, issueTitle } from "./issue_link";
import { unpackState } from "./packed";
import {
  BUG_REPORT_CONFIG,
  BUG_REPORT_SOURCE,
  type BugReportSource,
  REPORT_PICTURE,
  type ReportState,
} from "./tokens";

/** How long the report waits for its picture before it opens without one. */
export const PICTURE_LIMIT_MS = 3000;

/** Describes the report the dialog shows, ready to file. */
export interface OpenReport {
  /** The issue's title as the link fills it in: the game's name in brackets. */
  readonly title: string;
  /** The link that opens the issue, filled in. */
  readonly url: string;
  /** The PNG of the page as the player left it, or null where none was taken. */
  readonly picture: Blob | null;
}

/**
 * Files a bug report about the game in play: takes the game's state and a
 * picture of the page, builds the issue's link, and holds the report the
 * dialog shows, or loads a reported state back.
 */
@Injectable({ providedIn: "root" })
export class BugReportService {
  private readonly config = inject(BUG_REPORT_CONFIG);
  private readonly source = inject(BUG_REPORT_SOURCE, { optional: true });
  private readonly picture = inject(REPORT_PICTURE);
  private readonly build = inject(BUILD_INFO);
  private readonly viewport = inject(GameViewportService);
  private readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);

  private readonly opened = signal<OpenReport | null>(null);
  private starting = false;

  /** Whether a report is open, and what it holds, for the dialog. */
  readonly report = this.opened.asReadonly();

  /**
   * Takes the game's state at once, then, two frames on, so that what was
   * pressed is gone from the page, its picture, waiting
   * {@link PICTURE_LIMIT_MS} at most, then opens the report. It does nothing
   * where no game provides a source, or while a report is being taken.
   *
   * @throws Error where the game can't give its state, or the state can't be
   *   packed, and then opens no report.
   */
  async start(): Promise<void> {
    const { source } = this;
    if (!source || this.starting) return;
    this.starting = true;
    try {
      const state = source.capture();
      await this.nextFrames();
      const picture = await this.takePicture();
      const url = await this.issueUrl(state);
      this.opened.set({ title: issueTitle(source.title), url, picture });
    } finally {
      this.starting = false;
    }
  }

  /**
   * Returns the issue's link for a state of the game's, with the game, its
   * settings and the page as they are now, the state fitted to the link.
   *
   * @throws Error where no game provides a source.
   */
  async issueUrl(state: ReportState): Promise<string> {
    const source = this.requireSource();
    return issueLink(this.config, {
      title: source.title,
      tag: source.tag,
      game: source.game(),
      environment: environmentList(this.environment(), source.settings()),
      state,
    });
  }

  /**
   * Loads a state pasted from a report, such as its whole game-state field,
   * into the game; resolves to whether the game put it in play.
   *
   * @throws Error saying what is wrong with the state, or where no game
   *   provides a source.
   */
  async load(text: string): Promise<boolean> {
    const source = this.requireSource();
    return source.load(await unpackState(source.tag, text));
  }

  /** Closes the report. */
  close(): void {
    this.opened.set(null);
  }

  private requireSource(): BugReportSource {
    if (!this.source) throw new Error("No game provides BUG_REPORT_SOURCE.");
    return this.source;
  }

  /** Resolves after two animation frames, or at once with no window. */
  private nextFrames(): Promise<void> {
    const view = this.document.defaultView;
    return new Promise((resolve) => {
      if (!view) {
        resolve();
        return;
      }
      view.requestAnimationFrame(() => {
        view.requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  /** Takes the picture, or null where it fails or takes too long. */
  private async takePicture(): Promise<Blob | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limit = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        resolve(null);
      }, PICTURE_LIMIT_MS);
    });
    try {
      return await Promise.race([this.picture().catch(() => null), limit]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Describes the page as it is now. */
  private environment(): ReportEnvironment {
    const view = this.document.defaultView;
    return {
      build: this.build,
      browser: view
        ? {
            userAgent: view.navigator.userAgent,
            width: view.innerWidth,
            height: view.innerHeight,
            pixelRatio: view.devicePixelRatio,
          }
        : null,
      compact: this.viewport.isCompact(),
      portrait: this.viewport.isPortrait(),
      barPlacement: this.viewport.barPlacement(),
      touch: this.viewport.isTouchScreen(),
      allowsMotion: this.viewport.allowsMotion(),
      theme: this.theme.current(),
    };
  }
}
