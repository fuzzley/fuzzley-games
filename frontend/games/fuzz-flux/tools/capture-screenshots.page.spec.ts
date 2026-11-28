// @vitest-environment jsdom
// The page `makeMove()` runs in, apart from the script's other specs, since
// jsdom breaks the Vite config they import.
import {
  MOVE,
  type SteadyClock,
  makeMove,
  steadyFrames,
} from "./capture-screenshots.mjs";

describe("makeMove", () => {
  /** Where the page keeps the level in play, as the game keeps one. */
  const KEY = "kept-run";

  /** The cell the move picks up, on a board 8 squares across. */
  const FROM = 45;

  /** How many frames the move waits for, and how many it holds the page into the move. */
  const BEFORE = 3;
  const IN = 2;

  /** Describes a page of a board on the clock of steady frames, and each key its cell heard, with the frame it heard it in. */
  interface BoardPage {
    readonly clock: SteadyClock;
    readonly heard: readonly string[];
  }

  /** Whether the page's frames still run. */
  let drawing = false;

  /**
   * Lays out a page of a board 8 squares across, a cell over the square
   * the move picks up, as level 12 in play, its frames drawn every few
   * milliseconds as Phaser asks for them, on {@link steadyFrames}' clock;
   * the game keeps a move it is given by the keys, a Space and an arrow,
   * as storage keeps one.
   */
  function boardPage(): BoardPage {
    document.body.innerHTML = `
      <app-board data-level="12" data-outcome="playing" style="--across: 8">
        <div role="gridcell" data-index="${String(FROM)}" tabindex="0"></div>
      </app-board>`;
    localStorage.setItem(KEY, JSON.stringify({ moves: [[1, 2]] }));
    let drawn = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      setTimeout(() => {
        callback((drawn += 16));
      }, 2),
    );
    vi.stubGlobal("performance", { now: () => 0 });
    steadyFrames(16);
    const clock = Reflect.get(window, "steadyClock") as SteadyClock;
    drawing = true;
    const ask = (): void => {
      if (drawing) window.requestAnimationFrame(ask);
    };
    ask();
    const heard: string[] = [];
    const cell = document.querySelector("[role=gridcell]");
    for (const type of ["keydown", "keyup"]) {
      cell?.addEventListener(type, (event) => {
        if (!(event instanceof KeyboardEvent)) return;
        // Phaser reads `keyCode`, which `makeMove()` gives the event it makes.
        const keyCode = String(Reflect.get(event, "keyCode"));
        heard.push(
          `${type} ${event.code} ${keyCode} at frame ${String(clock.frame)}`,
        );
        if (type === "keydown" && event.code === "ArrowDown") {
          localStorage.setItem(KEY, JSON.stringify({ moves: [[1, 2], MOVE] }));
        }
      });
    }
    return { clock, heard };
  }

  afterEach(() => {
    drawing = false;
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "steadyClock");
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("presses Space and the arrow on the cell picked up once the frames before have run, and holds the page the frames into the move", async () => {
    const page = boardPage();

    const held = await makeMove(KEY, [FROM, FROM + 8], BEFORE, IN);

    expect({
      held,
      heard: page.heard,
      heldAfter: page.clock.heldAfter,
    }).toEqual({
      held: { level: "12", outcome: "playing", made: MOVE, held: true },
      heard: [
        "keydown Space 32 at frame 3",
        "keyup Space 32 at frame 3",
        "keydown ArrowDown 40 at frame 3",
        "keyup ArrowDown 40 at frame 3",
      ],
      heldAfter: BEFORE + IN,
    });
  });

  it("presses nothing for a square that isn't the cell's neighbor, and holds nothing", async () => {
    const page = boardPage();

    const held = await makeMove(KEY, [FROM, FROM + 2], BEFORE, IN);

    expect({ held, heard: page.heard }).toEqual({
      held: { level: "12", outcome: "playing", made: null, held: false },
      heard: [],
    });
  });
});
