// @vitest-environment jsdom
import { levelAt } from "@fz/core/levels";
import { type BoardBox, PHASER_CANVAS_READY } from "@fz/dev/layout";
import { recordingPrinter } from "@fz/dev/script";
import { ELEMENT_RULES, WIND_RULE } from "../src/rules/elements/element_rules";
import { LEVELS, type LevelEntry } from "../src/rules/levels/levels";
import { movePlayed, readSavedGame } from "../src/rules/run/saved_game";
import { CERTIFICATES, keptAt } from "../src/testing/certificates";
import { SCREENSHOT_API } from "../src/testing/screenshot_api";
import {
  CLEARED,
  type Ending,
  OUT_OF_MOVES,
  checkLayout,
  inspectPage,
  keepEndingRun,
  keepingNone,
} from "./check-layout.mjs";

/** A board's squares 40 CSS px, laid 20 CSS px in from the window's top left corner. */
const BOX: BoardBox = { left: 20, top: 20, width: 80, height: 80, unit: 40 };

/** Returns the cells of a board 2 squares across and 2 down, each on its square of a box, as Chrome measures them. */
function cellsOn(box: BoardBox): DOMRect[] {
  return [0, 1, 2, 3].map(
    (index) =>
      new DOMRect(
        box.left + (index % 2) * box.unit,
        box.top + Math.floor(index / 2) * box.unit,
        box.unit,
        box.unit,
      ),
  );
}

/** Describes a page as the inspection reads it, each rectangle as Chrome measures it. */
interface Laid {
  /** The level the board shows, by its number, and how it stands. */
  readonly level: number;
  readonly outcome: string;
  /** Where the bar stands, as `<fz-game-bar>` says it. */
  readonly placement: string;
  /** The bar, its status, and each of its figures, the goals' then the moves'. */
  readonly bar: DOMRect;
  readonly status: DOMRect;
  readonly figures: readonly DOMRect[];
  /** The board's cells, 2 across. */
  readonly cells: readonly DOMRect[];
  readonly buttons: readonly DOMRect[];
  /** How each button is written. */
  readonly button: string;
  /** How much of what the panel holds it shows, across and down, in CSS px. */
  readonly panel: {
    readonly shows: readonly [across: number, down: number];
    readonly holds: readonly [across: number, down: number];
  };
}

/** A page laid out as the check asks: level 1 in play, its bar across the window's foot, a goal and the moves whole in a row inside it. */
const LAID: Laid = {
  level: 1,
  outcome: "playing",
  placement: "bottom",
  bar: new DOMRect(0, 784, 390, 60),
  status: new DOMRect(80, 790, 200, 48),
  figures: [new DOMRect(80, 800, 46, 24), new DOMRect(134, 796, 30, 32)],
  cells: cellsOn(BOX),
  buttons: [new DOMRect(290, 792, 44, 44)],
  button: "<button>Hint</button>",
  panel: { shows: [172, 300], holds: [172, 300] },
};

/** Measures an element as Chrome would. */
function measure(element: Element, rect: DOMRect | undefined): void {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
    rect ?? new DOMRect(),
  );
}

/** Lays a page out in the document, and says which level the check kept, and how it left it, as the check says it before the page loads. */
function lay(
  laid: Laid,
  kept: { readonly level: number | null; readonly outcome: string | null },
): void {
  const goals = '<div class="figure goal"></div>'.repeat(
    laid.figures.length - 1,
  );
  document.body.innerHTML = `
    <fz-game-bar data-placement="${laid.placement}">
      <header class="bar"><div class="status">
        <app-bar>${goals}<div class="figure moves"></div></app-bar>
      </div></header>
    </fz-game-bar>
    <app-board data-level="${String(laid.level)}" data-outcome="${laid.outcome}" style="--across: 2">
      ${laid.cells.map((_, index) => `<div role="gridcell" data-index="${String(index)}"></div>`).join("")}
      <section class="panel"></section>
    </app-board>
    ${laid.buttons.map(() => laid.button).join("")}`;
  const pairs: [string, readonly DOMRect[]][] = [
    ["fz-game-bar .bar", [laid.bar]],
    ["fz-game-bar .status", [laid.status]],
    [".figure", laid.figures],
    ["[role=gridcell]", laid.cells],
    ["button", laid.buttons],
  ];
  for (const [selector, rects] of pairs) {
    document.querySelectorAll(selector).forEach((element, index) => {
      measure(element, rects[index]);
    });
  }
  const panel = document.querySelector(".panel");
  if (panel) {
    const { shows, holds } = laid.panel;
    Object.defineProperties(panel, {
      clientWidth: { value: shows[0] },
      clientHeight: { value: shows[1] },
      scrollWidth: { value: holds[0] },
      scrollHeight: { value: holds[1] },
    });
  }
  Reflect.set(window, "keptLevel", kept.level);
  Reflect.set(window, "keptOutcome", kept.outcome);
}

/** Returns what the inspection finds wrong with a page laid out as given, over a board laid as a box says, the check having kept no level. */
function inspected(laid: Partial<Laid>, box: BoardBox = BOX): string[] {
  lay({ ...LAID, ...laid }, { level: null, outcome: null });
  return inspectPage(box);
}

describe("inspectPage", () => {
  it("finds nothing wrong with a page laid out as the check asks", () => {
    expect(inspected({})).toEqual([]);
  });

  it("says where nothing said which level the page shows", () => {
    lay(LAID, { level: null, outcome: null });
    Reflect.deleteProperty(window, "keptLevel");

    expect(inspectPage(BOX)).toEqual([
      "Nothing said which level the page shows.",
    ]);
  });

  it("says a level other than the one a new player begins on", () => {
    expect(inspected({ level: 3 })).toEqual([
      "The page shows level 3, where a new player begins on 1.",
    ]);
  });

  it("says a level other than the one the page took up", () => {
    lay(LAID, { level: 6, outcome: "playing" });

    expect(inspectPage(BOX)).toEqual([
      "The page shows level 1, where it took up 6.",
    ]);
  });

  it("finds nothing wrong with the level the page took up, ended as the check left it", () => {
    lay({ ...LAID, level: 6, outcome: "over" }, { level: 6, outcome: "over" });

    expect(inspectPage(BOX)).toEqual([]);
  });

  it("says a level that doesn't stand as the check left it", () => {
    lay(LAID, { level: 1, outcome: "cleared" });

    expect(inspectPage(BOX)).toEqual([
      "The level is playing, where the check left it cleared.",
    ]);
  });

  it("says a square under 40 CSS px", () => {
    const box = { ...BOX, unit: 39 };

    expect(inspected({ cells: cellsOn(box) }, box)).toEqual([
      "A square is 39 CSS px, under 40.",
    ]);
  });

  it("says a cell of the grid off its square", () => {
    const [, ...others] = LAID.cells;

    expect(
      inspected({ cells: [new DOMRect(21, 20, 40, 40), ...others] }),
    ).toEqual(["The grid's cell 0 lies off its square."]);
  });

  it("says a button under 44 CSS px across or down", () => {
    expect(inspected({ buttons: [new DOMRect(290, 792, 120, 42)] })).toEqual([
      "The Hint button is 120 by 42 CSS px, under 44 across or down.",
    ]);
  });

  it.each([
    ["its label", '<button aria-label="Close"><b>x</b></button>', "Close"],
    [
      "its tooltip, where it has no words",
      '<button title="Turn sound off"></button>',
      "Turn sound off",
    ],
  ])("names a button by %s, as a screen reader does", (_, button, name) => {
    expect(
      inspected({ buttons: [new DOMRect(290, 792, 40, 40)], button }),
    ).toEqual([
      `The ${name} button is 40 by 40 CSS px, under 44 across or down.`,
    ]);
  });

  it("leaves a button out of sight be, as in a closed dialog", () => {
    expect(inspected({ buttons: [new DOMRect()] })).toEqual([]);
  });

  it("says a figure the bar's status cuts off", () => {
    expect(
      inspected({
        figures: [new DOMRect(80, 800, 46, 24), new DOMRect(260, 796, 30, 32)],
      }),
    ).toEqual(["The bar cuts off its moves figure."]);
  });

  it("says a figure the bar cuts off, inside its status", () => {
    expect(
      inspected({
        status: new DOMRect(80, 760, 200, 100),
        figures: [new DOMRect(80, 800, 46, 24), new DOMRect(134, 770, 30, 32)],
      }),
    ).toEqual(["The bar cuts off its moves figure."]);
  });

  it("says figures in more than one row where the bar lies across the window", () => {
    expect(
      inspected({
        figures: [new DOMRect(80, 790, 46, 24), new DOMRect(134, 814, 30, 24)],
      }),
    ).toEqual(["The bar's figures stand in more than one row."]);
  });

  it("leaves figures one over the next be on the rail", () => {
    expect(
      inspected({
        placement: "end",
        bar: new DOMRect(780, 0, 64, 390),
        status: new DOMRect(788, 40, 48, 100),
        figures: [new DOMRect(788, 40, 46, 24), new DOMRect(796, 70, 30, 32)],
      }),
    ).toEqual([]);
  });

  it.each<[string, readonly [number, number]]>([
    ["down", [172, 312]],
    ["across", [180, 300]],
  ])("says a panel that cuts off what it holds %s", (_, holds) => {
    const [across, down] = holds;

    expect(inspected({ panel: { shows: [172, 300], holds } })).toEqual([
      `A panel shows 172 by 300 CSS px of the ${String(across)} by ${String(down)} it holds.`,
    ]);
  });
});

describe("what the page runs before its own scripts", () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("says, keeping no level, that the page shows the one a new player begins on, in play", () => {
    keepingNone();

    expect([
      Reflect.get(window, "keptLevel"),
      Reflect.get(window, "keptOutcome"),
    ]).toEqual([null, null]);
  });

  it("keeps a level in play where the game keeps one, and says which, and how it ends", () => {
    vi.useFakeTimers();
    document.body.innerHTML = "";

    keepEndingRun(
      "fuzz-flux-game",
      "{}",
      9,
      [52, 53],
      "cleared",
      PHASER_CANVAS_READY,
    );

    expect([
      localStorage.getItem("fuzz-flux-game"),
      Reflect.get(window, "keptLevel"),
      Reflect.get(window, "keptOutcome"),
    ]).toEqual(["{}", 9, "cleared"]);
  });

  /** Lays a board 8 squares across with a few cells, its canvas drawn or not, and returns the keys each cell hears, by its index, each as "code keyCode type". */
  function boardHearing(drawn: boolean): Map<string, string[]> {
    document.body.innerHTML = `
      <app-board data-outcome="playing" style="--across: 8">
        <fz-phaser-canvas data-state="${drawn ? "ready" : "loading"}"></fz-phaser-canvas>
        ${[44, 52, 53, 60].map((index) => `<div role="gridcell" tabindex="-1" data-index="${String(index)}"></div>`).join("")}
      </app-board>`;
    const heard = new Map<string, string[]>();
    for (const cell of document.querySelectorAll("[role=gridcell]")) {
      const keys: string[] = [];
      heard.set(cell.getAttribute("data-index") ?? "", keys);
      for (const type of ["keydown", "keyup"]) {
        cell.addEventListener(type, (event) => {
          // Phaser reads `keyCode`, which the web has deprecated.
          const keyCode: unknown = Reflect.get(event, "keyCode");
          if (event instanceof KeyboardEvent) {
            keys.push(`${event.code} ${String(keyCode)} ${type}`);
          }
        });
      }
    }
    return heard;
  }

  it("makes no move while the board is drawn only in CSS, as the scene loads", () => {
    vi.useFakeTimers();
    const heard = boardHearing(false);
    keepEndingRun(
      "fuzz-flux-game",
      "{}",
      9,
      [52, 53],
      "cleared",
      PHASER_CANVAS_READY,
    );

    vi.advanceTimersByTime(1000);

    expect({
      keys: heard.get("52"),
      focused: document.activeElement?.getAttribute("data-index"),
    }).toEqual({ keys: [], focused: null });
  });

  it.each<[string, readonly [number, number], string]>([
    ["right", [52, 53], "ArrowRight 39"],
    ["left", [52, 51], "ArrowLeft 37"],
    ["down", [52, 60], "ArrowDown 40"],
    ["up", [52, 44], "ArrowUp 38"],
  ])(
    "makes the last move by the keys once the board is drawn, the fuzzball picked up and swapped %s",
    (_, last, arrow) => {
      vi.useFakeTimers();
      const heard = boardHearing(false);
      keepEndingRun(
        "fuzz-flux-game",
        "{}",
        9,
        last,
        "cleared",
        PHASER_CANVAS_READY,
      );
      vi.advanceTimersByTime(100);
      document
        .querySelector("fz-phaser-canvas")
        ?.setAttribute("data-state", "ready");

      vi.advanceTimersByTime(50);

      expect({
        keys: heard.get("52"),
        focused: document.activeElement?.getAttribute("data-index"),
      }).toEqual({
        keys: [
          "Space 32 keydown",
          "Space 32 keyup",
          `${arrow} keydown`,
          `${arrow} keyup`,
        ],
        focused: "52",
      });
    },
  );

  it("looks away once the rules have played the move, the focus moved out of the room", () => {
    vi.useFakeTimers();
    boardHearing(true);
    keepEndingRun(
      "fuzz-flux-game",
      "{}",
      9,
      [52, 53],
      "cleared",
      PHASER_CANVAS_READY,
    );
    const focusedWhilePlaying =
      document.activeElement?.getAttribute("data-index");

    document
      .querySelector("app-board")
      ?.setAttribute("data-outcome", "cleared");
    vi.advanceTimersByTime(50);

    expect([focusedWhilePlaying, document.activeElement]).toEqual([
      "52",
      document.body,
    ]);
  });
});

/** Returns whether a page takes up the level in play an ending keeps, what its last move ends it as, and how many of its goals that leaves open. */
function ended({ run, last }: Ending): {
  readonly takenUp: boolean;
  readonly outcome: string | undefined;
  readonly goalsOpen: number | undefined;
} {
  const rules = { elements: ELEMENT_RULES, wind: WIND_RULE };
  const inPlay = readSavedGame(SCREENSHOT_API.keptRun(run), LEVELS, rules);
  const [from, to] = last;
  const after = inPlay && movePlayed(inPlay, { from, to }, rules).inPlay.game;
  return {
    takenUp: inPlay !== null,
    outcome: after?.outcome,
    goalsOpen: after?.goalsLeft.filter((left) => left > 0).length,
  };
}

describe("the levels the check ends", () => {
  it("clears Spring cleaning, taken up, by its last move", () => {
    expect(ended(CLEARED)).toEqual({
      takenUp: true,
      outcome: "cleared",
      goalsOpen: 0,
    });
  });

  // So the Out of moves card shows every goal.
  it("runs Better together out of moves, taken up, by its last move, its every goal open", () => {
    expect(ended(OUT_OF_MOVES)).toEqual({
      takenUp: true,
      outcome: "over",
      goalsOpen: 3,
    });
  });

  it("clears Spring cleaning by its certificate on its deal", () => {
    const { run, last } = CLEARED;
    const { set, data } = levelAt(LEVELS, run.level);

    expect([...run.moves, last]).toEqual(
      keptAt(CERTIFICATES, set.id, data.id, String(run.deal)),
    );
  });

  // So the check meets the board whose squares are smallest, and the goals
  // that take the most room in the bar and on the Out of moves card, as
  // sets join the game.
  it("ends the levels of the widest and tallest board and of the most goals", () => {
    const across = ({ data }: LevelEntry): number => data.board[0]?.length ?? 0;
    const down = ({ data }: LevelEntry): number => data.board.length;
    const goals = ({ data }: LevelEntry): number => data.goals.length;
    const cleared = levelAt(LEVELS, CLEARED.run.level);

    expect({
      across: across(cleared),
      down: down(cleared),
      goals: goals(levelAt(LEVELS, OUT_OF_MOVES.run.level)),
    }).toEqual({
      across: Math.max(...LEVELS.map(across)),
      down: Math.max(...LEVELS.map(down)),
      goals: Math.max(...LEVELS.map(goals)),
    });
  });
});

describe("checkLayout", () => {
  it("prints the usage asked for, naming the game, and exits with 0", async () => {
    const printer = recordingPrinter();

    const code = await checkLayout(["--help"], printer);

    expect({ code, out: printer.out, err: printer.err }).toEqual({
      code: 0,
      out: [
        expect.stringMatching(
          /^Usage: yarn check:layout[^]*Checks Fuzz Flux's layout/,
        ) as unknown,
      ],
      err: [],
    });
  });

  it("prints what is wrong with a command line and the usage as an error, and exits with 2, before Chrome starts", async () => {
    const printer = recordingPrinter();

    const code = await checkLayout(["--pages", "0"], printer);

    expect({ code, out: printer.out, err: printer.err }).toEqual({
      code: 2,
      out: [],
      err: [
        expect.stringMatching(
          /^--pages takes a whole number from 1, not "0"\.\n\nUsage: yarn check:layout/,
        ) as unknown,
      ],
    });
  });
});
