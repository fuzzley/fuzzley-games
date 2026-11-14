import { Component } from "@angular/core";
import { render } from "@testing-library/angular";
import { PICTURES_SETTLE_MS, settledPictures } from "./settled_pictures";

/** Stands in for a board, which keeps the pictures its scene's bakes hand it. */
@Component({ selector: "fz-test-board", template: "" })
class TestBoardComponent {
  /** The pictures handed on, in the order they were. */
  readonly handed: string[] = [];

  readonly take = settledPictures<string>((pictures) => {
    this.handed.push(pictures);
  });
}

/** Renders a board, then has the spec move the timers its pictures wait on. */
async function renderBoard(): Promise<{
  board: TestBoardComponent;
  destroy: () => void;
}> {
  const { fixture } = await render(TestBoardComponent);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  return {
    board: fixture.componentInstance,
    destroy: () => {
      fixture.destroy();
    },
  };
}

describe("settledPictures", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("hands on the first bake's pictures at once", async () => {
    const { board } = await renderBoard();

    board.take("first");

    expect(board.handed).toEqual(["first"]);
  });

  it("holds a later bake's until the atlas has settled", async () => {
    const { board } = await renderBoard();
    board.take("first");
    board.take("second");

    vi.advanceTimersByTime(PICTURES_SETTLE_MS - 1);

    expect(board.handed).toEqual(["first"]);
  });

  it("hands on a later bake's once the atlas has settled", async () => {
    const { board } = await renderBoard();
    board.take("first");
    board.take("second");

    vi.advanceTimersByTime(PICTURES_SETTLE_MS);

    expect(board.handed).toEqual(["first", "second"]);
  });

  it("waits again at each bake", async () => {
    const { board } = await renderBoard();
    board.take("first");
    board.take("second");
    vi.advanceTimersByTime(PICTURES_SETTLE_MS - 1);
    board.take("third");

    vi.advanceTimersByTime(PICTURES_SETTLE_MS - 1);

    expect(board.handed).toEqual(["first"]);
  });

  it("hands on only the last of a burst of bakes", async () => {
    const { board } = await renderBoard();
    board.take("first");
    board.take("second");
    vi.advanceTimersByTime(PICTURES_SETTLE_MS - 1);
    board.take("third");

    vi.advanceTimersByTime(PICTURES_SETTLE_MS);

    expect(board.handed).toEqual(["first", "third"]);
  });

  it("hands on nothing still waiting once the board is gone", async () => {
    const { board, destroy } = await renderBoard();
    board.take("first");
    board.take("second");

    destroy();
    vi.advanceTimersByTime(PICTURES_SETTLE_MS);

    expect(board.handed).toEqual(["first"]);
  });

  it("refuses to be made outside an injection context", () => {
    expect(() => settledPictures(() => undefined)).toThrow(
      /settledPictures\(\)/,
    );
  });
});
