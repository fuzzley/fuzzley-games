import { computed } from "@angular/core";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import {
  DebugTuningComponent,
  type TuningSlider,
} from "./debug_tuning.component";
import { type Tuning, createTuning } from "./tuning";

/** Describes a game's tuned numbers, a switch among them. */
interface Feel {
  readonly speed: number;
  readonly reach: number;
  readonly wrap: boolean;
}

/** A game's own numbers. */
const TUNED: Feel = { speed: 20, reach: 4, wrap: true };

/** The game's sliders, all but its switch. */
const SLIDERS = [
  { id: "speed", name: "Speed", least: 10, most: 40, step: 1 },
  { id: "reach", name: "Reach", least: 1, most: 8, step: 0.5 },
] as const satisfies readonly TuningSlider<"speed" | "reach">[];

/** Returns the lines of code a game's numbers would replace. */
function linesOf({ speed, reach, wrap }: Feel): string {
  return [
    `export const SPEED = ${String(speed)};`,
    `export const REACH = ${String(reach)};`,
    `export const WRAP = ${String(wrap)};`,
  ].join("\n");
}

/** What a spec gets back from rendering the debug menu. */
interface RenderedMenu {
  readonly user: UserEvent;
  readonly tuner: Tuning<Feel>;
}

/**
 * Renders a debug menu as a game shows it, at the game's own numbers, taking
 * each move and Reset into the game's tuning, with its switch among the
 * sliders.
 */
async function renderMenu(): Promise<RenderedMenu> {
  const tuner = createTuning(TUNED);
  const sliders = computed(() => {
    const { speed, reach } = tuner.tuning();
    const [speedSlider, reachSlider] = SLIDERS;
    return [
      { ...speedSlider, value: speed, valueText: `${String(speed)} u` },
      {
        ...reachSlider,
        value: reach,
        valueText: `${String(reach)} u`,
        description: `A reach of ${String(reach)} cells.`,
      },
    ];
  });
  const lines = computed(() => linesOf(tuner.tuning()));
  await render(
    `<fz-debug-tuning
      [sliders]="sliders()"
      [lines]="lines()"
      (tune)="tuner.tune($event.id, $event.value)"
      (resetNumbers)="tuner.reset()"
    >
      <div class="setting-check">
        <input #wrap id="wrap" type="checkbox" [checked]="tuner.tuning().wrap"
          (change)="tuner.tune('wrap', wrap.checked)" />
        <label for="wrap">Wrap around</label>
      </div>
    </fz-debug-tuning>`,
    {
      imports: [DebugTuningComponent],
      componentProperties: { tuner, sliders, lines },
    },
  );
  return { user: userEvent.setup(), tuner };
}

/** Moves a slider to a value, as a finger or the arrow keys would. */
function slide(name: string, value: number): void {
  fireEvent.input(screen.getByRole("slider", { name }), {
    target: { value: String(value) },
  });
}

/** Returns the lines shown, by the line they start with. */
function shownLines(): HTMLElement {
  return screen.getByText(/^export const SPEED/);
}

// user-event's setup() puts a clipboard of its own on the page.
describe("DebugTuningComponent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is a region named by its heading, Debug", async () => {
    await renderMenu();

    expect(
      within(screen.getByRole("region", { name: "Debug" })).getByRole(
        "heading",
        { level: 3, name: "Debug" },
      ),
    ).toBeInTheDocument();
  });

  it("starts each slider at the number in use, saying it in its unit", async () => {
    await renderMenu();

    const speed = screen.getByRole("slider", { name: "Speed" });
    expect(speed).toHaveValue("20");
    expect(speed).toHaveAttribute("aria-valuetext", "20 u");
  });

  it("gives each slider its range and its steps", async () => {
    await renderMenu();

    const reach = screen.getByRole("slider", { name: "Reach" });
    expect([reach.getAttribute("min"), reach.getAttribute("max")]).toEqual([
      "1",
      "8",
    ]);
    expect(reach).toHaveAttribute("step", "0.5");
  });

  it("describes a slider by what the game says its number comes to", async () => {
    await renderMenu();

    expect(
      screen.getByRole("slider", {
        name: "Reach",
        description: "A reach of 4 cells.",
      }),
    ).toBeInTheDocument();
  });

  it("describes a slider by nothing where the game says nothing", async () => {
    await renderMenu();

    expect(screen.getByRole("slider", { name: "Speed" })).not.toHaveAttribute(
      "aria-describedby",
    );
  });

  it("tunes a number as its slider moves", async () => {
    const { tuner } = await renderMenu();

    slide("Reach", 6.5);

    expect(tuner.tuning().reach).toBe(6.5);
    expect(screen.getByRole("slider", { name: "Reach" })).toHaveAttribute(
      "aria-valuetext",
      "6.5 u",
    );
  });

  it("shows the game's own controls among its own", async () => {
    await renderMenu();

    expect(screen.getByRole("region", { name: "Debug" })).toContainElement(
      screen.getByRole("checkbox", { name: "Wrap around" }),
    );
  });

  it("puts every number back to the game's own at Reset the numbers", async () => {
    const { user, tuner } = await renderMenu();
    slide("Speed", 30);
    await user.click(screen.getByRole("checkbox", { name: "Wrap around" }));

    await user.click(screen.getByRole("button", { name: "Reset the numbers" }));

    expect(tuner.tuning()).toEqual({ speed: 20, reach: 4, wrap: true });
  });

  it("puts the lines on the clipboard at Copy the numbers, and says so", async () => {
    const { user, tuner } = await renderMenu();
    slide("Speed", 30);

    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    expect(await navigator.clipboard.readText()).toBe(linesOf(tuner.tuning()));
    expect(screen.getByRole("status")).toHaveTextContent("Copied the numbers.");
  });

  it("says nothing of the last copy once a number moves, as the clipboard holds the old ones", async () => {
    const { user } = await renderMenu();
    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    slide("Speed", 30);

    expect(screen.getByRole("status")).toHaveTextContent(/^$/);
  });

  it("says nothing of the last copy once the game's own control changes the lines", async () => {
    const { user } = await renderMenu();
    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    await user.click(screen.getByRole("checkbox", { name: "Wrap around" }));

    expect(screen.getByRole("status")).toHaveTextContent(/^$/);
  });

  it("says nothing of the last copy once the numbers are reset", async () => {
    const { user } = await renderMenu();
    slide("Speed", 30);
    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    await user.click(screen.getByRole("button", { name: "Reset the numbers" }));

    expect(screen.getByRole("status")).toHaveTextContent(/^$/);
  });

  it("still says the numbers were copied while the lines stay as they were", async () => {
    const { user } = await renderMenu();
    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    await user.click(screen.getByRole("button", { name: "Reset the numbers" }));

    expect(screen.getByRole("status")).toHaveTextContent("Copied the numbers.");
  });

  it("keeps the lines shut until asked", async () => {
    await renderMenu();

    expect(shownLines()).not.toBeVisible();
  });

  it("shows the lines where the browser keeps the clipboard shut", async () => {
    const { user } = await renderMenu();
    Reflect.deleteProperty(navigator, "clipboard");

    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "The browser kept the clipboard shut",
    );
    expect(shownLines()).toBeVisible();
  });

  it("shows the lines where the browser refuses to write to the clipboard", async () => {
    const { user } = await renderMenu();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new DOMException("Write permission denied.", "NotAllowedError"),
    );

    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "The browser kept the clipboard shut",
    );
    expect(shownLines()).toBeVisible();
  });

  it("shows the lines again at another Copy the browser keeps from the clipboard, once they are shut", async () => {
    const { user } = await renderMenu();
    Reflect.deleteProperty(navigator, "clipboard");
    const copy = screen.getByRole("button", { name: "Copy the numbers" });
    await user.click(copy);
    await user.click(
      screen.getByText("The lines to paste back", { selector: "summary" }),
    );

    await user.click(copy);

    expect(shownLines()).toBeVisible();
  });

  it("keeps the lines shown where the clipboard was shut as a number moves, as they follow it", async () => {
    const { user } = await renderMenu();
    Reflect.deleteProperty(navigator, "clipboard");
    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    slide("Speed", 30);

    expect(screen.getByText(/^export const SPEED = 30;/)).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "The browser kept the clipboard shut",
    );
  });

  it("names its sliders, their descriptions and its heading by ids apart from another menu's on the page", async () => {
    const sliders = SLIDERS.map((slider) => ({
      ...slider,
      value: TUNED[slider.id],
      valueText: "",
      description: `${slider.name}, in words.`,
    }));
    await render(
      `<fz-debug-tuning [sliders]="sliders" lines="" />
      <fz-debug-tuning [sliders]="sliders" lines="" />`,
      { imports: [DebugTuningComponent], componentProperties: { sliders } },
    );

    const ids = [...document.querySelectorAll("[id]")].map(({ id }) => id);
    expect(screen.getAllByRole("slider", { name: "Speed" })).toHaveLength(2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names its sliders apart from its heading and its descriptions, whatever their ids", async () => {
    const slider = { least: 0, most: 10, step: 1, value: 5, valueText: "5" };
    const sliders = [
      { ...slider, id: "heading", name: "Heading" },
      { ...slider, id: "speed", name: "Speed", description: "How fast." },
      {
        ...slider,
        id: "speed-description",
        name: "Speed's words",
        description: "How it reads.",
      },
    ];
    await render(`<fz-debug-tuning [sliders]="sliders" lines="" />`, {
      imports: [DebugTuningComponent],
      componentProperties: { sliders },
    });

    const menu = screen.getByRole("region", { name: "Debug" });
    const ids = [...menu.querySelectorAll("[id]")].map(({ id }) => id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      screen.getByRole("slider", { name: "Speed" }),
    ).toHaveAccessibleDescription("How fast.");
  });
});
