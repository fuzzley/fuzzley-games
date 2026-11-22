import { DOCUMENT } from "@angular/common";
import { TestBed } from "@angular/core/testing";
import { ThemeService } from "@fz/ui/theme";
import { CompressionStream, DecompressionStream } from "node:stream/web";
import { BUILD_INFO } from "../build_info";
import { installFakeViewport } from "../testing";
import { BugReportService, PICTURE_LIMIT_MS } from "./bug_report.service";
import { ISSUE_FIELDS } from "./issue_link";
import { packState, unpackState } from "./packed";
import {
  BUG_REPORT_SOURCE,
  type BugReportSource,
  REPORT_PICTURE,
  type ReportState,
} from "./tokens";

/** Stands in for a game's reports: Snake's, at a speed a spec can change. */
class FakeSource implements BugReportSource {
  readonly title = "Snake";
  readonly tag = "sn1";

  /** The speed the game is set to. */
  speed = "Normal";
  /** The game's state now. */
  state: ReportState = { summary: "Score 12", value: { score: 12 } };
  /** Whether the game puts a reported state in play. */
  accepts = true;
  /** The states the game was asked to load, in order. */
  readonly loaded: unknown[] = [];

  game(): string {
    return `Snake · ${this.speed}`;
  }

  settings(): readonly string[] {
    return [`Speed: ${this.speed}`];
  }

  capture(): ReportState {
    return this.state;
  }

  load(state: unknown): Promise<boolean> {
    this.loaded.push(state);
    return Promise.resolve(this.accepts);
  }
}

/** A PNG of the page, as far as the report can tell. */
const PICTURE = new Blob(["png"], { type: "image/png" });

/** What a spec gets back from making the service. */
interface Harness {
  readonly service: BugReportService;
  readonly source: FakeSource;
}

/**
 * Makes the service over a source of its own, taking its picture with
 * `picture`, which resolves {@link PICTURE} unless given another.
 */
function makeService(
  picture: () => Promise<Blob | null> = () => Promise.resolve(PICTURE),
): Harness {
  const source = new FakeSource();
  TestBed.configureTestingModule({
    providers: [
      { provide: BUG_REPORT_SOURCE, useValue: source },
      { provide: REPORT_PICTURE, useValue: picture },
    ],
  });
  return { service: TestBed.inject(BugReportService), source };
}

/** Resolves once the promises waiting now have run on. */
function settled(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Returns one field of a link, as the issue form will receive it. */
function fieldOf(url: string, fieldId: string): string {
  return new URL(url).searchParams.get(fieldId) ?? "";
}

// jsdom has no compression streams, so Node's stand in.
beforeAll(() => {
  vi.stubGlobal("CompressionStream", CompressionStream);
  vi.stubGlobal("DecompressionStream", DecompressionStream);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BugReportService", () => {
  describe("starting a report", () => {
    it("opens no report until one is started", () => {
      const { service } = makeService();

      expect(service.report()).toBeNull();
    });

    it("opens the report with the picture of the page", async () => {
      const { service } = makeService();

      await service.start();

      expect(service.report()?.picture).toBe(PICTURE);
    });

    it("titles the issue with the game's name", async () => {
      const { service } = makeService();

      await service.start();

      expect(service.report()?.title).toBe("[Snake] ");
    });

    it("opens the report with the issue's link for the state", async () => {
      const { service, source } = makeService();

      await service.start();

      expect(service.report()?.url).toBe(await service.issueUrl(source.state));
    });

    it("takes the game's state at once, as it stood when started", async () => {
      const { service, source } = makeService();
      const reported = source.state;

      const started = service.start();
      source.state = { summary: "Score 20", value: { score: 20 } };
      await started;

      const url = service.report()?.url ?? "";
      expect(
        await unpackState("sn1", fieldOf(url, ISSUE_FIELDS.gameState)),
      ).toEqual(reported.value);
    });

    it("takes the picture two frames on, once what was pressed is gone", async () => {
      vi.useFakeTimers({ toFake: ["requestAnimationFrame"] });
      const picture = vi.fn(() => Promise.resolve(PICTURE));
      const { service } = makeService(picture);

      const started = service.start();
      vi.advanceTimersToNextFrame();
      await settled();
      const afterOneFrame = picture.mock.calls.length;
      vi.advanceTimersToNextFrame();
      await started;

      expect(afterOneFrame).toBe(0);
      expect(picture).toHaveBeenCalledOnce();
    });

    it("opens with no picture where none is provided", async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: BUG_REPORT_SOURCE, useValue: new FakeSource() }],
      });
      const service = TestBed.inject(BugReportService);

      await service.start();

      expect(service.report()?.picture).toBeNull();
    });

    it("opens with no picture where taking one fails", async () => {
      const { service } = makeService(() =>
        Promise.reject(new Error("The canvas is tainted.")),
      );

      await service.start();

      expect(service.report()?.picture).toBeNull();
    });

    it("opens with no picture where taking one takes too long", async () => {
      vi.useFakeTimers({
        toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame"],
      });
      const { service } = makeService(() => new Promise<never>(() => {}));

      const started = service.start();
      // The two frames first, then the limit from when the picture was asked.
      await vi.advanceTimersByTimeAsync(PICTURE_LIMIT_MS + 100);
      await started;

      expect(service.report()).toEqual(
        expect.objectContaining({ picture: null }),
      );
    });

    it("takes one report at a time", async () => {
      const { service, source } = makeService();
      const capture = vi.spyOn(source, "capture");

      await Promise.all([service.start(), service.start()]);

      expect(capture).toHaveBeenCalledOnce();
    });

    it("starts another once the first is open", async () => {
      const { service, source } = makeService();
      await service.start();
      source.state = { summary: "Score 20", value: { score: 20 } };

      await service.start();

      expect(service.report()?.url).toBe(await service.issueUrl(source.state));
    });

    it("opens nothing where the game can't give its state", async () => {
      const { service, source } = makeService();
      vi.spyOn(source, "capture").mockImplementation(() => {
        throw new Error("The board is gone.");
      });

      await expect(service.start()).rejects.toThrow("The board is gone.");
      expect(service.report()).toBeNull();
    });

    it("starts again after a report that failed", async () => {
      const { service, source } = makeService();
      vi.spyOn(source, "capture").mockImplementationOnce(() => {
        throw new Error("The board is gone.");
      });
      await service.start().catch(() => undefined);

      await service.start();

      expect(service.report()).not.toBeNull();
    });

    it("opens nothing where no game provides a source", async () => {
      const service = TestBed.inject(BugReportService);

      await service.start();

      expect(service.report()).toBeNull();
    });

    it("closes the report", async () => {
      const { service } = makeService();
      await service.start();

      service.close();

      expect(service.report()).toBeNull();
    });
  });

  describe("the issue's link", () => {
    it("names the game as it is now", async () => {
      const { service, source } = makeService();
      source.speed = "Fast";

      const url = await service.issueUrl(source.state);

      expect(fieldOf(url, ISSUE_FIELDS.game)).toBe("Snake · Fast");
    });

    it("lists the page, then the game's settings", async () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: BUILD_INFO,
            useValue: { commit: "549c93a", buildTime: "2031-06-15T09:30:00Z" },
          },
        ],
      });
      installFakeViewport(390, 844).setCoarsePointer(true);
      const { service, source } = makeService();
      const theme = TestBed.inject(ThemeService).current();

      const url = await service.issueUrl(source.state);

      expect(fieldOf(url, ISSUE_FIELDS.environment).split("\n")).toEqual([
        "- Build: 549c93a, built 2031-06-15T09:30:00Z",
        `- Browser: ${navigator.userAgent}`,
        `- Window: ${window.innerWidth}×${window.innerHeight} at 1× pixel ratio`,
        "- Screen: compact, portrait, bar at the bottom, touch",
        "- Motion: full",
        `- Theme: ${theme}`,
        "- Speed: Normal",
      ]);
    });

    it("describes a page with no window by what it has", async () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: DOCUMENT,
            useValue: document.implementation.createHTMLDocument(),
          },
        ],
      });
      const { service } = makeService();

      await service.start();

      const url = service.report()?.url ?? "";
      expect(fieldOf(url, ISSUE_FIELDS.environment)).not.toContain("- Window:");
    });

    it("can't be built where no game provides a source", async () => {
      const service = TestBed.inject(BugReportService);

      await expect(
        service.issueUrl({ summary: "", value: null }),
      ).rejects.toThrow("No game provides BUG_REPORT_SOURCE.");
    });
  });

  describe("loading a reported state", () => {
    it("hands the game the state in a report's field", async () => {
      const { service, source } = makeService();
      const packed = await packState("sn1", { score: 40 });

      await service.load(`Score 40\n\n\`\`\`\n${packed}\n\`\`\``);

      expect(source.loaded).toEqual([{ score: 40 }]);
    });

    it("resolves true where the game put it in play", async () => {
      const { service } = makeService();

      expect(await service.load(await packState("sn1", {}))).toBe(true);
    });

    it("resolves false where the game didn't, as when the player kept theirs", async () => {
      const { service, source } = makeService();
      source.accepts = false;

      expect(await service.load(await packState("sn1", {}))).toBe(false);
    });

    it("says what is wrong with a state it can't read", async () => {
      const { service } = makeService();

      await expect(service.load("It froze.")).rejects.toThrow(
        "There is no game state in that text.",
      );
    });

    it("can't load where no game provides a source", async () => {
      const service = TestBed.inject(BugReportService);

      await expect(service.load("sn1.H4sI")).rejects.toThrow(
        "No game provides BUG_REPORT_SOURCE.",
      );
    });
  });
});
