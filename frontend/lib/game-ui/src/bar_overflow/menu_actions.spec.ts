import { HELP_MENU_ACTION, SETTINGS_MENU_ACTION } from "./menu_actions";

describe("the overflow menu's shared actions", () => {
  it("opens How to play", () => {
    expect(HELP_MENU_ACTION).toEqual({
      id: "help",
      label: "How to play",
      icon: "help",
    });
  });

  it("opens the settings", () => {
    expect(SETTINGS_MENU_ACTION).toEqual({
      id: "settings",
      label: "Settings",
      icon: "settings",
    });
  });
});
