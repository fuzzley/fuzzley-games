import { TestBed } from "@angular/core/testing";
import { installFakeViewport } from "@fz/game-ui/testing";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { SettingsComponent } from "./settings.component";
import { SettingsService } from "./settings.service";

/** Renders the settings drawer, open, and returns how often it asked to close. */
async function renderSettings(): Promise<{
  closed: ReturnType<typeof vi.fn>;
}> {
  const closed = vi.fn();
  await render(SettingsComponent, {
    inputs: { open: true },
    on: { closed },
  });
  return { closed };
}

/** Returns the settings in use. */
function settings(): SettingsService {
  return TestBed.inject(SettingsService);
}

describe("SettingsComponent", () => {
  beforeEach(() => {
    // A system that allows motion, which jsdom alone doesn't say.
    installFakeViewport(390, 844);
  });

  it("offers each speed, Normal checked at first", async () => {
    await renderSettings();

    expect(
      within(screen.getByRole("radiogroup", { name: "Speed" }))
        .getAllByRole("radio")
        .map((speed) => [
          speed.textContent.trim(),
          speed.getAttribute("aria-checked"),
        ]),
    ).toEqual([
      [
        expect.stringMatching(/^Normal\s*Easy to follow every bunch\.$/),
        "true",
      ],
      [
        expect.stringMatching(/^Fast\s*Quicker, for levels you know well\.$/),
        "false",
      ],
    ]);
  });

  it("keeps the speed chosen", async () => {
    await renderSettings();

    await userEvent.click(screen.getByRole("radio", { name: /^Fast/ }));

    expect(settings().settings().speed).toBe("fast");
  });

  it("says what Less motion stops", async () => {
    await renderSettings();

    expect(
      screen.getByRole("checkbox", { name: "Less motion" }),
    ).toHaveAccessibleDescription(
      "Stops the shaking, the flashes and the fuzzballs flying to the goals. If your device is set to reduce motion, this starts on.",
    );
  });

  it.each([
    ["allows motion", false, false],
    ["asks for less", true, true],
  ])(
    "shows Less motion as the system has it until it is set: where it %s, checked %s",
    async (_, reduced, checked) => {
      installFakeViewport(390, 844).setReducedMotion(reduced);

      await renderSettings();

      expect(
        screen.getByRole("checkbox", { name: "Less motion" }),
      ).toHaveProperty("checked", checked);
    },
  );

  it("turns Less motion on as its box is checked", async () => {
    await renderSettings();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Less motion" }),
    );

    expect(settings().lessMotion()).toBe(true);
  });

  it("turns the sound off as its box is cleared", async () => {
    await renderSettings();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Play sounds" }),
    );

    expect(settings().settings().sound).toBe(false);
  });

  it("offers the palettes", async () => {
    await renderSettings();

    expect(screen.getByRole("radiogroup", { name: /theme/i })).toBeVisible();
  });

  it("asks to close from its close button", async () => {
    const { closed } = await renderSettings();

    await userEvent.click(
      screen.getByRole("button", { name: "Close settings" }),
    );

    expect(closed).toHaveBeenCalledOnce();
  });
});
