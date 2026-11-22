import { TestBed } from "@angular/core/testing";
import type {
  CaptureContext,
  PluginUse,
  SnapdomOptions,
  SnapdomPlugin,
} from "@zumer/snapdom";
import {
  CAPTURE_SKIP,
  type CaptureSurface,
  type DrawPage,
  type DrawnPage,
  PAGE_DRAWER,
  PageCaptureService,
} from ".";

/** What a fake drawer was asked to draw. */
interface DrawAsked {
  readonly element: Element;
  readonly options: SnapdomOptions;
}

/** Stands in for snapdom, which jsdom can't run, and keeps what it was asked. */
interface FakeDrawer {
  readonly draw: DrawPage;
  readonly asked: DrawAsked[];
}

/** Says whether a plugin given to snapdom is one of the object kind. */
function isPlugin(use: PluginUse): use is SnapdomPlugin {
  return typeof use === "object" && !Array.isArray(use) && "name" in use;
}

/**
 * Copies an element as snapdom does: each element the filter turns down is
 * removed, or, as snapdom does unless told to remove it, stands in its place
 * hidden and empty.
 */
function copyOf(element: Element, options: SnapdomOptions): Element {
  const { filter = () => true, filterMode = "hide" } = options;
  const copy = element.ownerDocument.importNode(element, false);
  for (const child of element.childNodes) {
    if (!(child instanceof Element)) {
      copy.append(element.ownerDocument.importNode(child, false));
    } else if (filter(child)) {
      copy.append(copyOf(child, options));
    } else if (filterMode === "hide") {
      const standIn = element.ownerDocument.importNode(child, false);
      if (standIn instanceof HTMLElement) standIn.style.visibility = "hidden";
      copy.append(standIn);
    }
  }
  return copy;
}

/**
 * Returns a drawer that copies the page as snapdom does, runs each plugin
 * over the copy, and gives a picture whose bytes are the copy's HTML, or
 * the picture `picture` makes of the copy.
 */
function fakeDrawer(
  picture: (copy: Element) => DrawnPage = (copy) => ({
    toCanvas: () =>
      Promise.resolve({
        toBlob: (done: BlobCallback) => {
          done(new Blob([copy.outerHTML], { type: "image/png" }));
        },
      }),
  }),
): FakeDrawer {
  const asked: DrawAsked[] = [];
  const draw: DrawPage = async (element, options) => {
    asked.push({ element, options });
    const copy = copyOf(element, options);
    for (const plugin of (options.plugins ?? []).filter(isPlugin)) {
      // The fake hands a plugin only the copy, which is all the service's
      // plugin reads of snapdom's context.
      await plugin.afterClone?.({ clone: copy } as unknown as CaptureContext);
    }
    return picture(copy);
  };
  return { draw, asked };
}

/**
 * Stands in for the 2D canvas jsdom lacks: a canvas's data URL names the
 * frame last drawn on it, by its title, and its size.
 */
function installFakeCanvas(): void {
  const drawn = new WeakMap<HTMLCanvasElement, string>();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      const context = {
        drawImage: (source: HTMLCanvasElement) => {
          drawn.set(this, source.title);
        },
      };
      // A stand-in for the browser's context, of which the service only
      // draws an image.
      return context as unknown as CanvasRenderingContext2D;
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(
    function (this: HTMLCanvasElement) {
      const from = drawn.get(this) ?? "nothing";
      return `data:image/png;from=${from};size=${String(this.width)}x${String(this.height)},`;
    },
  );
}

/**
 * Returns a drawer that waits, on each page it is asked to draw, until the
 * test lets it go on, and what lets each go on, in the order asked.
 */
function heldDrawer(drawer: FakeDrawer): {
  readonly draw: DrawPage;
  readonly release: (() => void)[];
} {
  const release: (() => void)[] = [];
  const draw: DrawPage = async (element, options) => {
    await new Promise<void>((resolve) => {
      release.push(resolve);
    });
    return drawer.draw(element, options);
  };
  return { draw, release };
}

/** Returns a frame a surface gives, a canvas named by its title. */
function frameNamed(title: string): HTMLCanvasElement {
  const frame = document.createElement("canvas");
  frame.title = title;
  return frame;
}

/**
 * Puts a board drawn on a canvas into the page, laid out at a size in CSS
 * px, and returns it with a surface that gives `frame` as its frame.
 */
function boardDrawn(
  frame: () => Promise<CanvasImageSource | null>,
  width = 640,
  height = 360,
  parent: HTMLElement = document.body,
): { readonly board: HTMLElement; readonly surface: CaptureSurface } {
  const board = document.createElement("div");
  board.id = "board";
  board.append(document.createElement("canvas"));
  board.getBoundingClientRect = () => new DOMRect(0, 0, width, height);
  parent.append(board);
  return { board, surface: { element: board, frame } };
}

/**
 * Reads a picture the fake drawer made back as the page it copied, a
 * document with no window, which jest-dom's matchers refuse.
 */
async function pageIn(picture: Blob | null): Promise<Document> {
  if (!picture) throw new Error("No picture was taken");
  return new DOMParser().parseFromString(await picture.text(), "text/html");
}

/** Returns the text a picture the fake drawer made shows. */
async function textIn(picture: Blob | null): Promise<string> {
  return (await pageIn(picture)).body.textContent;
}

/** Returns the board's copy in a picture, failing where it has none. */
function boardIn(page: Document): HTMLElement {
  const board = page.getElementById("board");
  if (!board) throw new Error("The picture has no board");
  return board;
}

/** Provides a drawer, as snapdom loaded, in place of any before, and returns the service. */
function captureWith(draw: () => Promise<DrawPage>): PageCaptureService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: PAGE_DRAWER, useValue: draw }],
  });
  return TestBed.inject(PageCaptureService);
}

describe("PageCaptureService", () => {
  let drawer: FakeDrawer;
  let capture: PageCaptureService;

  beforeEach(() => {
    installFakeCanvas();
    drawer = fakeDrawer();
    capture = captureWith(() => Promise.resolve(drawer.draw));
  });

  afterEach(() => {
    document.body.replaceChildren();
    document.documentElement.removeAttribute("style");
    document.body.removeAttribute("style");
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("draws the whole page at CSS pixel size", async () => {
    await capture.capture();

    expect(drawer.asked).toEqual([
      {
        element: document.documentElement,
        options: expect.objectContaining({ dpr: 1 }) as unknown,
      },
    ]);
  });

  it("lays the picture on the body's background where the root has none", async () => {
    document.body.style.backgroundColor = "rgb(1, 2, 3)";

    await capture.capture();

    expect(drawer.asked[0]?.options.backgroundColor).toBe("rgb(1, 2, 3)");
  });

  it("lays the picture on the root's background where it has one", async () => {
    document.documentElement.style.backgroundColor = "rgb(4, 5, 6)";
    document.body.style.backgroundColor = "rgb(1, 2, 3)";

    await capture.capture();

    expect(drawer.asked[0]?.options.backgroundColor).toBe("rgb(4, 5, 6)");
  });

  it("leaves out every dialog", async () => {
    document.body.innerHTML =
      "<main>The board</main><dialog open>Report a bug</dialog>";

    const page = await pageIn(await capture.capture());

    expect(page.querySelector("dialog")).toBeNull();
    expect(page.body.textContent).toBe("The board");
  });

  it("leaves out what is marked to skip, as a game marks its Paused card", async () => {
    document.body.innerHTML =
      '<main>The board</main><div data-fz-capture="skip">Paused</div>';

    const page = await pageIn(await capture.capture());

    expect(page.querySelector('[data-fz-capture="skip"]')).toBeNull();
    expect(page.body.textContent).toBe("The board");
  });

  it("names the attribute that marks what a picture leaves out", () => {
    expect(CAPTURE_SKIP).toEqual({ name: "data-fz-capture", value: "skip" });
  });

  it("draws a surface from its frame at its element's CSS size, in place of its canvas", async () => {
    const { surface } = boardDrawn(() => Promise.resolve(frameNamed("snake")));
    capture.register(surface);

    const board = boardIn(await pageIn(await capture.capture()));

    expect(board.children).toHaveLength(0);
    expect(board.style.backgroundImage).toBe(
      'url("data:image/png;from=snake;size=640x360,")',
    );
    expect(board.style.backgroundSize).toBe("100% 100%");
  });

  it("keeps what lies over a surface", async () => {
    const { surface } = boardDrawn(() => Promise.resolve(frameNamed("snake")));
    document.body.insertAdjacentHTML("beforeend", "<p>Game over</p>");
    capture.register(surface);

    const text = await textIn(await capture.capture());

    expect(text).toBe("Game over");
  });

  it("draws a surface as the page shows it where it gives no frame", async () => {
    const { surface } = boardDrawn(() => Promise.resolve(null));
    capture.register(surface);

    const board = boardIn(await pageIn(await capture.capture()));

    expect(board.querySelector("canvas")).not.toBeNull();
    expect(board.style.backgroundImage).toBe("");
  });

  it("draws a surface as the page shows it where its frame fails", async () => {
    const { surface } = boardDrawn(() =>
      Promise.reject(new Error("The game has ended")),
    );
    capture.register(surface);

    const board = boardIn(await pageIn(await capture.capture()));

    expect(board.querySelector("canvas")).not.toBeNull();
  });

  it("draws a surface as the page shows it where asking for its frame throws", async () => {
    const { surface } = boardDrawn(() => {
      throw new Error("The game has ended");
    });
    capture.register(surface);

    const board = boardIn(await pageIn(await capture.capture()));

    expect(board.querySelector("canvas")).not.toBeNull();
  });

  it("draws a surface as the page shows it where its frame takes over a second", async () => {
    vi.useFakeTimers();
    const { surface } = boardDrawn(() => new Promise(() => undefined));
    capture.register(surface);

    const picture = capture.capture();
    await vi.advanceTimersByTimeAsync(1_000);

    const board = boardIn(await pageIn(await picture));
    expect(board.querySelector("canvas")).not.toBeNull();
  });

  it("draws a surface that shows nothing as the page shows it", async () => {
    const { surface } = boardDrawn(
      () => Promise.resolve(frameNamed("snake")),
      0,
      0,
    );
    capture.register(surface);

    const board = boardIn(await pageIn(await capture.capture()));

    expect(board.style.backgroundImage).toBe("");
  });

  it("draws a surface as the page shows it where the browser gives no 2D canvas", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { surface } = boardDrawn(() => Promise.resolve(frameNamed("snake")));
    capture.register(surface);

    const board = boardIn(await pageIn(await capture.capture()));

    expect(board.querySelector("canvas")).not.toBeNull();
  });

  it("takes no frame from a surface once it is removed", async () => {
    const frame = vi.fn(() => Promise.resolve(frameNamed("snake")));
    const { surface } = boardDrawn(frame);
    const remove = capture.register(surface);

    remove();
    await capture.capture();

    expect(frame).not.toHaveBeenCalled();
  });

  it("leaves a surface in what it leaves out out of the picture", async () => {
    const paused = document.createElement("div");
    paused.setAttribute(CAPTURE_SKIP.name, CAPTURE_SKIP.value);
    document.body.append(paused);
    const { surface } = boardDrawn(
      () => Promise.resolve(frameNamed("snake")),
      640,
      360,
      paused,
    );
    capture.register(surface);

    const page = await pageIn(await capture.capture());

    expect(page.getElementById("board")).toBeNull();
  });

  it("leaves the page as it found it", async () => {
    const { board, surface } = boardDrawn(() =>
      Promise.resolve(frameNamed("snake")),
    );
    capture.register(surface);

    await capture.capture();

    expect(board.getAttributeNames()).toEqual(["id"]);
  });

  it("resolves to null where the page can't be drawn", async () => {
    capture = captureWith(() =>
      Promise.resolve(() => Promise.reject(new Error("Out of memory"))),
    );

    await expect(capture.capture()).resolves.toBeNull();
  });

  it("resolves to null where snapdom can't be loaded", async () => {
    capture = captureWith(() => Promise.reject(new Error("Offline")));

    await expect(capture.capture()).resolves.toBeNull();
  });

  it("resolves to null where the picture can't be encoded", async () => {
    const unencoded = fakeDrawer(() => ({
      toCanvas: () =>
        Promise.resolve({
          toBlob: (done: BlobCallback) => {
            done(null);
          },
        }),
    }));
    capture = captureWith(() => Promise.resolve(unencoded.draw));

    await expect(capture.capture()).resolves.toBeNull();
  });

  it("resolves to null once 3 seconds have passed", async () => {
    vi.useFakeTimers();
    capture = captureWith(() => new Promise(() => undefined));

    const picture = capture.capture();
    await vi.advanceTimersByTimeAsync(3_000);

    await expect(picture).resolves.toBeNull();
  });

  it("resolves to null once the time it is given has passed", async () => {
    vi.useFakeTimers();
    capture = captureWith(() => new Promise(() => undefined));

    const picture = capture.capture({ timeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(500);

    await expect(picture).resolves.toBeNull();
  });

  it("gives a picture asked for while one is drawn the same picture", async () => {
    const first = capture.capture();
    const second = capture.capture();

    const [firstPicture, secondPicture] = await Promise.all([first, second]);

    expect(secondPicture).toBe(firstPicture);
    expect(drawer.asked).toHaveLength(1);
  });

  it("draws a new picture once the last is done", async () => {
    await capture.capture();

    await capture.capture();

    expect(drawer.asked).toHaveLength(2);
  });

  it("draws a new picture once the last is given up on", async () => {
    vi.useFakeTimers();
    const loads = [
      new Promise<DrawPage>(() => undefined),
      Promise.resolve(drawer.draw),
    ];
    capture = captureWith(() => loads.shift() ?? Promise.reject(new Error()));
    void capture.capture();
    await vi.advanceTimersByTimeAsync(3_000);

    const picture = capture.capture();
    await vi.advanceTimersByTimeAsync(0);

    await expect(picture).resolves.not.toBeNull();
  });

  it("draws each surface from its frame while a picture given up on ends", async () => {
    vi.useFakeTimers();
    const held = heldDrawer(drawer);
    capture = captureWith(() => Promise.resolve(held.draw));
    const { surface } = boardDrawn(() => Promise.resolve(frameNamed("snake")));
    capture.register(surface);
    void capture.capture();
    await vi.advanceTimersByTimeAsync(3_000);
    const picture = capture.capture();
    await vi.advanceTimersByTimeAsync(0);

    held.release[0]?.();
    await vi.advanceTimersByTimeAsync(0);
    held.release[1]?.();

    const board = boardIn(await pageIn(await picture));
    expect(board.style.backgroundImage).toBe(
      'url("data:image/png;from=snake;size=640x360,")',
    );
  });
});

describe("PAGE_DRAWER", () => {
  it("loads snapdom", async () => {
    const load = TestBed.inject(PAGE_DRAWER);

    const draw = await load();

    expect(draw).toBe((await import("@zumer/snapdom")).snapdom);
  });
});
