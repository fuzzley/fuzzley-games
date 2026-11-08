import { TestBed } from "@angular/core/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { TUNED, tuningLines } from "../../view/debug_tuning";
import { DebugTuningComponent } from "./debug_tuning.component";
import { TuningService } from "./tuning.service";

/** What a spec gets back from rendering the debug menu. */
interface RenderedMenu {
  readonly user: UserEvent;
  readonly tuner: TuningService;
}

/** Renders the debug menu, at `tuning.ts`'s numbers. */
async function renderMenu(): Promise<RenderedMenu> {
  await render(DebugTuningComponent);
  return { user: userEvent.setup(), tuner: TestBed.inject(TuningService) };
}

/** Moves a slider to a value, as a finger or the arrow keys would. */
function slide(name: string, value: number): void {
  fireEvent.input(screen.getByRole("slider", { name }), {
    target: { value: String(value) },
  });
}

// user-event's setup() puts a clipboard of its own on the page.
describe("DebugTuningComponent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts each slider at tuning.ts's number, saying it in its unit", async () => {
    await renderMenu();

    const thrust = screen.getByRole("slider", { name: "Thrust" });
    expect(thrust).toHaveValue(String(TUNED.thrust));
    expect(thrust).toHaveAttribute("aria-valuetext", "24 u/s²");
  });

  it("tunes the numbers as a slider moves", async () => {
    const { tuner } = await renderMenu();

    slide("Rocks' speed", 1.5);

    expect(tuner.tuning().rockSpeed).toBe(1.5);
    expect(
      screen.getByRole("slider", { name: "Rocks' speed" }),
    ).toHaveAttribute("aria-valuetext", "×1.50");
  });

  it("lets shots leave without the ship's speed at its checkbox", async () => {
    const { user, tuner } = await renderMenu();

    await user.click(
      screen.getByRole("checkbox", { name: "Shots carry the ship's speed" }),
    );

    expect(tuner.tuning().carryShip).toBe(false);
  });

  it("puts every number back to tuning.ts's at Reset the numbers", async () => {
    const { user, tuner } = await renderMenu();
    slide("Thrust", 40);
    slide("A shot every", 90);

    await user.click(screen.getByRole("button", { name: "Reset the numbers" }));

    expect(tuner.tuning()).toEqual(TUNED);
  });

  it("puts the numbers on the clipboard as tuning.ts's lines at Copy the numbers, and says so", async () => {
    const { user, tuner } = await renderMenu();
    slide("Top speed", 18);

    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    expect(await navigator.clipboard.readText()).toBe(
      tuningLines(tuner.tuning()),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Copied the numbers.");
  });

  it("says nothing of the last copy once a number moves, as the clipboard holds the old ones", async () => {
    const { user } = await renderMenu();
    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    slide("Thrust", 30);

    expect(screen.getByRole("status")).toHaveTextContent(/^$/);
  });

  it("says nothing of the last copy once the shots' switch changes", async () => {
    const { user } = await renderMenu();
    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    await user.click(
      screen.getByRole("checkbox", { name: "Shots carry the ship's speed" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(/^$/);
  });

  it("says nothing of the last copy once the numbers are reset", async () => {
    const { user } = await renderMenu();
    slide("Thrust", 30);
    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    await user.click(screen.getByRole("button", { name: "Reset the numbers" }));

    expect(screen.getByRole("status")).toHaveTextContent(/^$/);
  });

  it("shows the lines where the browser keeps the clipboard shut", async () => {
    const { user } = await renderMenu();
    Reflect.deleteProperty(navigator, "clipboard");

    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "The browser kept the clipboard shut",
    );
    expect(screen.getByText(/^export const THRUST = 24;/)).toBeVisible();
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
    expect(screen.getByText(/^export const THRUST = 24;/)).toBeVisible();
  });

  it("shows the lines again at another Copy the browser keeps from the clipboard, once they are shut", async () => {
    const { user } = await renderMenu();
    Reflect.deleteProperty(navigator, "clipboard");
    const copy = screen.getByRole("button", { name: "Copy the numbers" });
    await user.click(copy);
    await user.click(screen.getByText("The lines of", { selector: "summary" }));

    await user.click(copy);

    expect(screen.getByText(/^export const THRUST = 24;/)).toBeVisible();
  });

  it("keeps the lines shown where the clipboard was shut as a number moves, as they follow it", async () => {
    const { user } = await renderMenu();
    Reflect.deleteProperty(navigator, "clipboard");
    await user.click(screen.getByRole("button", { name: "Copy the numbers" }));

    slide("Thrust", 30);

    expect(screen.getByText(/^export const THRUST = 30;/)).toBeVisible();
  });
});
