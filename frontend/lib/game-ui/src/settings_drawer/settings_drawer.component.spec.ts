import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { SettingsDrawerComponent } from "./settings_drawer.component";

/** What a spec gets back from rendering the drawer. */
interface RenderedDrawer {
  readonly user: UserEvent;
  readonly closed: ReturnType<typeof vi.fn>;
}

/** Renders the drawer around a setting, a checkbox, open unless told otherwise. */
async function renderDrawer(open = true): Promise<RenderedDrawer> {
  const closed = vi.fn();
  await render(
    `<fz-settings-drawer [open]="open" (closed)="closed()">
      <label><input type="checkbox" /> Play sounds</label>
    </fz-settings-drawer>`,
    {
      imports: [SettingsDrawerComponent],
      componentProperties: { open, closed },
    },
  );
  return { user: userEvent.setup(), closed };
}

/** Returns the drawer's native dialog, which jsdom hides from role queries when shut. */
function dialog(): HTMLDialogElement {
  const element = document.querySelector("dialog");
  if (!element) throw new Error("No <dialog> rendered");
  return element;
}

describe("SettingsDrawerComponent", () => {
  it("stays shut until asked to open", async () => {
    await renderDrawer(false);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a dialog named Settings, under its heading", async () => {
    await renderDrawer();

    expect(
      within(screen.getByRole("dialog", { name: "Settings" })).getByRole(
        "heading",
        { level: 2, name: "Settings" },
      ),
    ).toBeInTheDocument();
  });

  it("takes the focus at its close button as it opens", async () => {
    await renderDrawer();

    expect(
      screen.getByRole("button", { name: "Close settings" }),
    ).toHaveFocus();
  });

  it("shows the settings it is given", async () => {
    await renderDrawer();

    expect(screen.getByRole("dialog")).toContainElement(
      screen.getByRole("checkbox", { name: "Play sounds" }),
    );
  });

  it("asks to close from its close button", async () => {
    const { user, closed } = await renderDrawer();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(closed).toHaveBeenCalledOnce();
  });

  it("asks to close on Escape", async () => {
    const { user, closed } = await renderDrawer();

    await user.keyboard("{Escape}");

    expect(closed).toHaveBeenCalledOnce();
  });

  it("asks to close on a click beside it", async () => {
    const { user, closed } = await renderDrawer();

    // A click beside the drawer lands on the <dialog> itself.
    await user.click(dialog());

    expect(closed).toHaveBeenCalledOnce();
  });

  it("stays open until the game lowers open", async () => {
    const { user } = await renderDrawer();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(dialog().open).toBe(true);
  });
});
