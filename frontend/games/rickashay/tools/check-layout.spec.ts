// @vitest-environment jsdom
import { thirdsOf } from "@fz/brick-wall/rules/wall";
import { fieldMetrics, fieldShape } from "@fz/brick-wall/view/field_metrics";
import type { BoardBox } from "@fz/dev/layout";
import { recordingPrinter } from "@fz/dev/script";
import {
  type Viewport,
  cssRectOf,
  rectAttribute,
  roomInside,
} from "@fz/phaser/layout";
import { SCREENSHOT_API } from "../src/testing/screenshot_api";
import {
  checkLayout,
  inspectField,
  keepRun,
  keepingNone,
  keepingRun,
} from "./check-layout.mjs";
import { LAYOUT_RUN, SAVED_GAME_KEY, storedRun } from "./stored_run.mjs";

/** Describes what the board says of the field it laid out, as the inspection reads it, null for what it leaves unsaid. */
interface LaidField {
  /** Where the field lies on the canvas, its lintel to its band, as `data-field` says it. */
  readonly field: string | null;
  /** Where its room lies on the canvas, as `data-room` says it. */
  readonly room: string | null;
  readonly depth: number;
  /** The band and the lintel, in CSS px. */
  readonly band: number | null;
  readonly lintel: number | null;
  readonly ratio: number | null;
  readonly outcome: string;
  /** The field row the wall's lowest row stands in, as `data-wall` says it. */
  readonly wall: number;
  /**
   * The row the run the page took up kept its wall on, as the check says it
   * before the page loads, null for a level waiting for its first shot, or
   * undefined where the check said nothing.
   */
  readonly kept: number | null | undefined;
  /** Where the field lies in the window, and its unit, as the board's own inspection hands it over. */
  readonly box: BoardBox;
}

/**
 * Returns the field as the library lays it out on a canvas of a size, in
 * CSS px, at a pixel ratio, inside the board's margin, 24 CSS px as a roomy
 * screen keeps it unless given, as a level waits for its first shot: its
 * shape worked out from the room, as the board hands it the room, and its
 * wall on the row the level opens on.
 */
function laidOut(
  width: number,
  height: number,
  ratio: number,
  margin = 24,
): LaidField {
  const viewport: Viewport = {
    width: width * ratio,
    height: height * ratio,
    pixelRatio: ratio,
    insets: { top: margin, right: margin, bottom: margin, left: margin },
  };
  const shape = fieldShape(viewport);
  const { css, framed } = fieldMetrics(viewport, shape);
  return {
    field: rectAttribute(framed),
    room: rectAttribute(cssRectOf(roomInside(viewport), ratio)),
    depth: shape.depth,
    band: framed.y + framed.height - css.y - css.height,
    lintel: css.y - framed.y,
    ratio,
    outcome: "ready",
    wall: thirdsOf(shape.depth).opensOn,
    kept: null,
    box: { ...framed, left: framed.x, top: framed.y, unit: framed.width / 9 },
  };
}

/** Lays a board in the document, as the page has it, saying what it laid out and leaving out what it leaves unsaid. */
function lay(laid: LaidField): void {
  document.body.innerHTML = "<fz-wall-board></fz-wall-board>";
  const board = document.querySelector("fz-wall-board");
  if (!(board instanceof HTMLElement)) throw new Error("No board.");
  const attributes = {
    "data-field": laid.field,
    "data-room": laid.room,
    "data-depth": String(laid.depth),
    "data-outcome": laid.outcome,
    "data-wall": String(laid.wall),
  };
  const properties = {
    "--pixel-ratio": laid.ratio === null ? null : String(laid.ratio),
    "--band": laid.band === null ? null : `${String(laid.band)}px`,
    "--lintel": laid.lintel === null ? null : `${String(laid.lintel)}px`,
  };
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== null) board.setAttribute(name, value);
  }
  for (const [name, value] of Object.entries(properties)) {
    if (value !== null) board.style.setProperty(name, value);
  }
  if (laid.kept === undefined) Reflect.deleteProperty(window, "keptWallRow");
  else Reflect.set(window, "keptWallRow", laid.kept);
}

/** Returns what the inspection finds wrong with a field laid out on the page. */
function inspected(laid: LaidField): string[] {
  lay(laid);
  return inspectField(laid.box);
}

/**
 * A phone held upright, its room 684 × 1304 device px: its field 16 rows
 * deep, filling the room's width at a unit of 76, its band 50 and its
 * lintel 38, the room's height.
 */
const UPRIGHT = laidOut(390, 700, 2);

/**
 * A phone on its side, its room 1592 × 584 device px: its field 11 rows
 * deep, filling the room's height at a unit of 48, 24 CSS px, its band 32
 * and its lintel 24.
 */
const SIDEWAYS = laidOut(844, 340, 2);

describe("inspectField", () => {
  it.each([
    ["roomy", laidOut(1280, 700, 2)],
    ["a phone held upright", UPRIGHT],
    ["a phone on its side", SIDEWAYS],
    [
      "a small phone on its side, at 1× and a compact margin",
      laidOut(480, 320, 1, 12),
    ],
  ])(
    "finds nothing wrong with a field laid out as the library lays one out, %s, waiting on the row its level opens on",
    (_shape, laid) => {
      expect(inspected(laid)).toEqual([]);
    },
  );

  it("says a field deeper than its room asks for", () => {
    expect(inspected({ ...UPRIGHT, depth: 17 })).toContain(
      "The field is 17 rows deep, where its room asks for 16.",
    );
  });

  it("says a unit other than its room's", () => {
    const box = { ...UPRIGHT.box, unit: 39 };

    expect(inspected({ ...UPRIGHT, box })).toEqual([
      "The field's unit is 78 device px, where its room, 684 × 1304, asks for 76.",
    ]);
  });

  it("says a unit under 24 CSS px", () => {
    const box = { ...SIDEWAYS.box, unit: 23 };

    expect(inspected({ ...SIDEWAYS, box })).toContain(
      "The field's unit is 23 CSS px, under 24.",
    );
  });

  it("leaves a field the board's own inspection found nowhere to that inspection, finding nothing", () => {
    lay({ ...UPRIGHT, field: null });

    const problems = inspectField();

    expect(problems).toEqual([]);
  });

  it.each([
    ["--pixel-ratio", { ratio: null }],
    ["data-room", { room: null }],
  ])(
    "leaves a board that doesn't say its %s to the library's inspections, holding only its unit to 24 CSS px",
    (_unsaid, unsaid) => {
      const box = { ...SIDEWAYS.box, unit: 23 };

      expect(inspected({ ...SIDEWAYS, ...unsaid, box })).toEqual([
        "The field's unit is 23 CSS px, under 24.",
      ]);
    },
  );

  it.each([
    [{ band: null }, "fz-wall-board gives no --band."],
    [{ lintel: null }, "fz-wall-board gives no --lintel."],
  ])("says a band or a lintel unsaid, %j", (unsaid, problem) => {
    expect(inspected({ ...UPRIGHT, ...unsaid })).toEqual([problem]);
  });

  it.each([
    [
      { band: 24 },
      "The floor's band is 48 device px, where the field's room asks for 50.",
    ],
    [
      { lintel: 20 },
      "The lintel is 40 device px, where the field's room asks for 38.",
    ],
  ])("says a band or a lintel other than its room's, %j", (wrong, problem) => {
    expect(inspected({ ...UPRIGHT, ...wrong })).toEqual([problem]);
  });

  it("says a field that runs out of its room", () => {
    expect(inspected({ ...UPRIGHT, field: "12 24 342 652" })).toEqual([
      "The field runs out of its room.",
    ]);
  });

  it("says a field deeper than 11 rows that leaves 9 device px of its room's width, one a column", () => {
    expect(inspected({ ...UPRIGHT, field: "26.25 24 337.5 652" })).toEqual([
      "The field, 16 rows deep, leaves 9 device px of its room's width.",
    ]);
  });

  it("says a field 11 rows deep that leaves a device pixel of its room's height for each unit it asks for", () => {
    // 11 rows, the band and the lintel ask for 12.17 units.
    expect(inspected({ ...SIDEWAYS, field: "314 30.5 216 285.5" })).toEqual([
      "The field, 11 rows deep, leaves 13 device px of its room's height.",
    ]);
  });

  it("says a level that doesn't wait for its first shot", () => {
    expect(inspected({ ...UPRIGHT, outcome: "playing" })).toEqual([
      "The level doesn't wait for its first shot: it is playing.",
    ]);
  });

  it("says a wall on another row than the level opens on at the field's depth", () => {
    expect(inspected({ ...UPRIGHT, wall: 5 })).toEqual([
      "The wall stands on row 5, where a level 16 rows deep opens on 6.",
    ]);
  });
});

describe("inspectField, of the settings the check kept", () => {
  /** Lays {@link UPRIGHT} out under a bar with Release with a button on or off, the check having said it kept it on or off. */
  function settled(barHasRelease: boolean, kept: boolean): void {
    lay(UPRIGHT);
    const bar = document.createElement("app-bar");
    bar.classList.toggle("release-by-button", barHasRelease);
    document.body.prepend(bar);
    Reflect.set(window, "keptReleaseByButton", kept);
  }

  afterEach(() => {
    Reflect.deleteProperty(window, "keptReleaseByButton");
  });

  it.each([true, false])(
    "finds nothing wrong with a bar whose Release with a button is as the check kept it, %s",
    (release) => {
      settled(release, release);

      expect(inspectField(UPRIGHT.box)).toEqual([]);
    },
  );

  it("says a bar without Release with a button, where the check kept it on", () => {
    settled(false, true);

    expect(inspectField(UPRIGHT.box)).toEqual([
      "The bar doesn't have Release with a button on, as the check kept it.",
    ]);
  });

  it("says a bar with Release with a button, where the check kept it off", () => {
    settled(true, false);

    expect(inspectField(UPRIGHT.box)).toEqual([
      "The bar has Release with a button on, which the check didn't keep.",
    ]);
  });
});

describe("inspectField, over a run taken up", () => {
  /** {@link UPRIGHT} over a run taken up paused, its wall kept on row 4. */
  const TAKEN_UP: LaidField = {
    ...UPRIGHT,
    outcome: "paused",
    wall: 4,
    kept: 4,
  };

  it("finds nothing wrong with a run taken up paused, its wall on the row the run kept it on", () => {
    expect(inspected(TAKEN_UP)).toEqual([]);
  });

  it("says a run kept that the page didn't take up paused", () => {
    expect(inspected({ ...TAKEN_UP, outcome: "ready" })).toEqual([
      "The run kept isn't taken up paused: it is ready.",
    ]);
  });

  it("says a wall on another row than the run kept it on", () => {
    expect(inspected({ ...TAKEN_UP, wall: 6 })).toEqual([
      "The wall stands on row 6, where the run kept it on 4.",
    ]);
  });

  it("says where nothing said which run the page shows", () => {
    expect(inspected({ ...TAKEN_UP, kept: undefined })).toEqual([
      "Nothing said which run the page shows.",
    ]);
  });
});

describe("what the page runs before its own scripts", () => {
  /** Settings handed to keep, where a spec's own key keeps them. */
  const SETTINGS = { key: "a-settings-key", stored: "some settings" };

  afterEach(() => {
    localStorage.clear();
    Reflect.deleteProperty(window, "keptReleaseByButton");
  });

  it("says, kept by no run, that the page shows a level waiting for its first shot", () => {
    Reflect.deleteProperty(window, "keptWallRow");

    keepingNone(null);

    expect(Reflect.get(window, "keptWallRow")).toBeNull();
  });

  it("keeps a run where it is told and says the row its wall stands on", () => {
    localStorage.clear();

    keepRun("a-key", "a run", 7, null);

    expect([
      localStorage.getItem("a-key"),
      Reflect.get(window, "keptWallRow"),
    ]).toEqual(["a run", 7]);
  });

  it("keeps the layout's run where the game keeps one, as the game stores it, its wall on row 4", () => {
    localStorage.clear();
    const { run, args } = keepingRun(SCREENSHOT_API, null);

    run(...args);

    expect([
      localStorage.getItem(SAVED_GAME_KEY),
      Reflect.get(window, "keptWallRow"),
    ]).toEqual([storedRun(SCREENSHOT_API, LAYOUT_RUN).stored, 4]);
  });

  it("keeps the settings handed, kept by no run, and says Release with a button is on", () => {
    keepingNone(SETTINGS);

    expect([
      localStorage.getItem(SETTINGS.key),
      Reflect.get(window, "keptReleaseByButton"),
      Reflect.get(window, "keptWallRow"),
    ]).toEqual([SETTINGS.stored, true, null]);
  });

  it("keeps no settings, handed none, and says Release with a button is off", () => {
    keepingNone(null);

    expect([
      localStorage.getItem(SETTINGS.key),
      Reflect.get(window, "keptReleaseByButton"),
    ]).toEqual([null, false]);
  });

  it("keeps the settings handed beside a run, and says Release with a button is on", () => {
    keepRun("a-key", "a run", 7, SETTINGS);

    expect([
      localStorage.getItem("a-key"),
      localStorage.getItem(SETTINGS.key),
      Reflect.get(window, "keptReleaseByButton"),
    ]).toEqual(["a run", SETTINGS.stored, true]);
  });

  it("keeps no settings beside a run, handed none, and says Release with a button is off", () => {
    keepRun("a-key", "a run", 7, null);

    expect([
      localStorage.getItem(SETTINGS.key),
      Reflect.get(window, "keptReleaseByButton"),
    ]).toEqual([null, false]);
  });

  it("hands the settings on with the layout's run, kept beside it", () => {
    const { run, args } = keepingRun(SCREENSHOT_API, SETTINGS);

    run(...args);

    expect([
      localStorage.getItem(SETTINGS.key),
      Reflect.get(window, "keptReleaseByButton"),
    ]).toEqual([SETTINGS.stored, true]);
  });
});

describe("inspectField, of the bar's title", () => {
  /** Lays {@link UPRIGHT} out under a bar showing the game's name, its width and the width it shows of it, as Chrome measures them. */
  function titled(scrollWidth: number, clientWidth: number): HTMLElement {
    lay(UPRIGHT);
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<fz-game-bar><h1 class="title">Rickaashay</h1></fz-game-bar>',
    );
    const title = document.querySelector<HTMLElement>(".title");
    if (!title) throw new Error("No title.");
    Object.defineProperty(title, "scrollWidth", { value: scrollWidth });
    Object.defineProperty(title, "clientWidth", { value: clientWidth });
    return title;
  }

  it("finds nothing wrong with the game's name shown whole", () => {
    titled(83, 83);

    expect(inspectField(UPRIGHT.box)).toEqual([]);
  });

  it("says the game's name cut short", () => {
    titled(83, 77);

    expect(inspectField(UPRIGHT.box)).toEqual([
      "The bar cuts the game's name short: 77 of its 83 CSS px show.",
    ]);
  });

  it("leaves the game's name be where only a screen reader reads it", () => {
    titled(83, 1).classList.add("fz-visually-hidden");

    expect(inspectField(UPRIGHT.box)).toEqual([]);
  });
});

describe("inspectField, of Coming next", () => {
  /** Says where Coming next's parts lie down the window, in CSS px, as Chrome measures them. */
  interface Panel {
    /** The level's name's foot. */
    readonly level: number;
    /** The picture's box, its head and foot. */
    readonly rows: readonly [number, number];
    /** The head of each row the picture shows, each 12 CSS px tall. */
    readonly shown: readonly number[];
    /** How many rows wrap beside them, out of sight, where the panel is too short for them. */
    readonly hidden: number;
    /** The head of the words under the picture. */
    readonly words: number;
    /** The gap the rows' style sets between them, in CSS px: 2 where left out, null for none, which Chrome reads as `normal`. */
    readonly rowGap?: number | null;
  }

  /** Returns the heads of rows 12 CSS px tall and 2 apart, the first at a head. */
  function rowsFrom(head: number, count: number): readonly number[] {
    return Array.from({ length: count }, (_, i) => head + 14 * i);
  }

  /** Coming next at 1280 × 800, standing from its head, its eleven rows under the level's name. */
  const STANDING: Panel = {
    level: 160,
    rows: [164, 316],
    shown: rowsFrom(164, 11),
    hidden: 0,
    words: 320,
  };

  /** Lays {@link UPRIGHT} out with Coming next on it, its parts where a panel says, as Chrome measures them, its lines 4 CSS px apart and its rows as far as the panel says. */
  function panelled(panel: Panel): void {
    lay(UPRIGHT);
    const { rowGap = 2 } = panel;
    const rowsStyle =
      rowGap === null ? "" : ` style="row-gap: ${String(rowGap)}px"`;
    const rows = '<span class="row"></span>'.repeat(
      panel.shown.length + panel.hidden,
    );
    document.querySelector("fz-wall-board")?.insertAdjacentHTML(
      "beforeend",
      `<fz-coming-next style="row-gap: 4px">
        <h2>Coming next</h2><p class="level"></p>
        <div class="rows"${rowsStyle}>${rows}</div>
        <p></p><p></p>
      </fz-coming-next>`,
    );
    const at = (selector: string, top: number, bottom: number): void => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`No ${selector}.`);
      vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, top, 300, bottom - top),
      );
    };
    at(".level", panel.level - 20, panel.level);
    at(".rows", ...panel.rows);
    at(".rows + p", panel.words, panel.words + 21);
    // The rows out of sight wrap into a column right of the box.
    document.querySelectorAll(".row").forEach((row, i) => {
      const head = panel.shown[i];
      vi.spyOn(row, "getBoundingClientRect").mockReturnValue(
        head === undefined
          ? new DOMRect(310, panel.rows[1] - 12, 300, 12)
          : new DOMRect(0, head, 300, 12),
      );
    });
  }

  it("finds nothing wrong with Coming next standing from its head", () => {
    panelled(STANDING);

    expect(inspectField(UPRIGHT.box)).toEqual([]);
  });

  it("finds nothing wrong with less than a row's room over the rows that show, in a panel too short for them all: 14 CSS px, under a row and its gap", () => {
    panelled({
      ...STANDING,
      rows: [164, 218],
      shown: rowsFrom(178, 3),
      hidden: 8,
      words: 222,
    });

    expect(inspectField(UPRIGHT.box)).toEqual([]);
  });

  it("says a row's room left over the rows that show, where some are out of sight: 15 CSS px, room for one more", () => {
    panelled({
      ...STANDING,
      rows: [164, 219],
      shown: rowsFrom(179, 3),
      hidden: 8,
      words: 223,
    });

    expect(inspectField(UPRIGHT.box)).toEqual([
      "Coming next leaves 15 CSS px empty between the level's name and its wall's picture.",
    ]);
  });

  it("finds nothing wrong with a row's height over rows that stand with no gap between them, in a panel too short for them all: 12 CSS px", () => {
    panelled({
      ...STANDING,
      rows: [164, 212],
      shown: [176, 188, 200],
      hidden: 8,
      words: 216,
      rowGap: null,
    });

    expect(inspectField(UPRIGHT.box)).toEqual([]);
  });

  it("says a row's room left over rows that stand with no gap between them, where some are out of sight: 13 CSS px, room for one more", () => {
    panelled({
      ...STANDING,
      rows: [164, 213],
      shown: [177, 189, 201],
      hidden: 8,
      words: 217,
      rowGap: null,
    });

    expect(inspectField(UPRIGHT.box)).toEqual([
      "Coming next leaves 13 CSS px empty between the level's name and its wall's picture.",
    ]);
  });

  it("says a row cut in two at the picture's head", () => {
    panelled({
      ...STANDING,
      rows: [164, 214],
      shown: rowsFrom(160, 4),
      hidden: 7,
      words: 218,
    });

    expect(inspectField(UPRIGHT.box)).toEqual([
      "Coming next cuts a row of its wall's picture in two.",
    ]);
  });

  it("says a row cut in two at the picture's foot, the rows standing low in it", () => {
    panelled({
      ...STANDING,
      rows: [164, 316],
      shown: rowsFrom(168, 11),
      words: 320,
    });

    expect(inspectField(UPRIGHT.box)).toEqual([
      "Coming next cuts a row of its wall's picture in two.",
      "Coming next leaves 4 CSS px empty between the level's name and its wall's picture.",
    ]);
  });

  it("says room left empty between the level's name and the picture", () => {
    panelled({
      ...STANDING,
      rows: [164, 674],
      shown: rowsFrom(522, 11),
      words: 678,
    });

    expect(inspectField(UPRIGHT.box)).toEqual([
      "Coming next leaves 358 CSS px empty between the level's name and its wall's picture.",
    ]);
  });

  it("says less than a row's room left over the picture, where every row shows", () => {
    panelled({ ...STANDING, rows: [164, 326], shown: rowsFrom(174, 11) });

    expect(inspectField(UPRIGHT.box)).toEqual([
      "Coming next leaves 10 CSS px empty between the level's name and its wall's picture.",
    ]);
  });

  it("says room left empty between the picture and the words under it", () => {
    panelled({ ...STANDING, rows: [164, 674], words: 678 });

    expect(inspectField(UPRIGHT.box)).toEqual([
      "Coming next leaves 358 CSS px empty between its wall's picture and the words under it.",
    ]);
  });

  it("says the room over the rows that show where their picture stands low under the level's name", () => {
    panelled({
      ...STANDING,
      rows: [200, 250],
      shown: rowsFrom(210, 3),
      hidden: 8,
      words: 254,
    });

    expect(inspectField(UPRIGHT.box)).toEqual([
      "Coming next leaves 46 CSS px empty between the level's name and its wall's picture.",
    ]);
  });

  it("leaves Coming next be with no rows waiting to picture", () => {
    panelled({ ...STANDING, rows: [164, 674], shown: [], words: 678 });

    expect(inspectField(UPRIGHT.box)).toEqual([]);
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
          /^Usage: yarn check:layout[^]*Checks Rickaashay's layout/,
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
