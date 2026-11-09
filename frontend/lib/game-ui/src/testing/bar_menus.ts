import { screen, within } from "@testing-library/dom";
import type { UserEvent } from "@testing-library/user-event";

/**
 * Returns a game bar's choice badge, by what it chooses, such as "Speed",
 * whichever choice it shows.
 */
export function barChoice(label: string): HTMLElement {
  return screen.getByRole("button", {
    name: (name) => name.startsWith(`${label}: `),
  });
}

/**
 * Opens the badge of the game bar's choice that `label` names and picks the
 * option whose name starts with `name`, as a player does.
 *
 * An option's name runs on into its detail ("EasySingles only"), so `name`
 * is matched as its start.
 */
export async function chooseInBar(
  user: UserEvent,
  label: string,
  name: string,
): Promise<void> {
  await user.click(barChoice(label));
  const menu = screen.getByRole("menu", { name: label });
  await user.click(
    within(menu).getByRole("menuitemradio", {
      name: (itemName) => itemName.startsWith(name),
    }),
  );
}

/** Opens a game bar's overflow menu and returns the names of what it offers, in order. */
export async function openBarMenu(user: UserEvent): Promise<string[]> {
  await user.click(screen.getByRole("button", { name: "More actions" }));
  const menu = screen.getByRole("menu", { name: "More actions" });
  return within(menu)
    .getAllByRole("menuitem")
    .map((item) => item.textContent.trim());
}
