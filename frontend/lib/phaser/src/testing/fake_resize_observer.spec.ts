import {
  FakeResizeObserver,
  resize,
  watchResizes,
} from "./fake_resize_observer";

/** Watches an element with the `ResizeObserver` the page has, counting each call back. */
function watch(
  element: Element,
  options?: ResizeObserverOptions,
): { readonly observer: ResizeObserver; readonly heard: unknown[][] } {
  const heard: unknown[][] = [];
  const observer = new ResizeObserver((entries) => {
    heard.push(entries);
  });
  observer.observe(element, options);
  return { observer, heard };
}

describe("FakeResizeObserver", () => {
  watchResizes();

  it("stands in for the page's ResizeObserver, keeping each one made", () => {
    const { observer } = watch(document.createElement("div"));

    expect(FakeResizeObserver.made).toEqual([observer]);
  });

  it("keeps what it watches, with the options it was asked to watch it with", () => {
    const board = document.createElement("div");
    const rail = document.createElement("div");
    const { observer } = watch(board, { box: "device-pixel-content-box" });

    observer.observe(rail);

    expect([...FakeResizeObserver.made[0]!.watched]).toEqual([
      [board, { box: "device-pixel-content-box" }],
      [rail, undefined],
    ]);
  });

  it("hands on the entries a spec gives as what it watches is laid out anew", () => {
    const { heard } = watch(document.createElement("div"));
    const entry = { contentRect: new DOMRect(0, 0, 320, 200) };

    FakeResizeObserver.made[0]!.resized([entry]);

    expect(heard).toEqual([[entry]]);
  });

  it("says nothing once it watches nothing", () => {
    const board = document.createElement("div");
    const kept = watch(board);
    const left = watch(board);
    const disconnected = watch(board);

    left.observer.unobserve(board);
    disconnected.observer.disconnect();
    for (const observer of FakeResizeObserver.made) observer.resized();

    expect([kept.heard, left.heard, disconnected.heard]).toEqual([
      [[]],
      [],
      [],
    ]);
  });
});

describe("resize", () => {
  watchResizes();

  it("lays an element out at a size and tells what watches it", () => {
    const board = document.createElement("div");
    const { heard } = watch(board);

    resize(board, 320, 200);

    expect({
      box: board.getBoundingClientRect(),
      heard,
    }).toEqual({ box: new DOMRect(0, 0, 320, 200), heard: [[]] });
  });

  it("hands what watches it the element's device pixels where the browser counted them", () => {
    const board = document.createElement("div");
    const { heard } = watch(board, { box: "device-pixel-content-box" });

    resize(board, 412, 915, { width: 1082, height: 2402 });

    expect(heard).toEqual([
      [
        {
          target: board,
          devicePixelContentBoxSize: [{ inlineSize: 1082, blockSize: 2402 }],
        },
      ],
    ]);
  });
});

describe("watchResizes", () => {
  watchResizes();

  it("stands the fake in for the page's ResizeObserver, and puts the page's back after each spec", () => {
    const board = document.createElement("div");
    // Registered in the spec, so it runs after the describe's teardown.
    onTestFinished(() => {
      const { width, height } = board.getBoundingClientRect();
      expect({
        observer: typeof globalThis.ResizeObserver,
        size: [width, height],
      }).toEqual({ observer: "undefined", size: [0, 0] });
    });

    resize(board, 320, 200);

    expect(globalThis.ResizeObserver).toBe(FakeResizeObserver);
  });
});
