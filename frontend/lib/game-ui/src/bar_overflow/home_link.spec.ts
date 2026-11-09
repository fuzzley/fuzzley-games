import type { BarOverflowAction } from "./bar_overflow.component";
import { withHomeLink } from "./home_link";

const ACTIONS: readonly BarOverflowAction<"restart" | "help">[] = [
  { id: "restart", label: "Restart", icon: "restart" },
  { id: "help", label: "How to play", icon: "help" },
];

describe("withHomeLink", () => {
  it("leads the menu with the link home to the site where the bar has no room for it", () => {
    const [home] = withHomeLink(ACTIONS, "none");

    expect(home).toEqual({
      id: "home",
      label: "Fuzzley Games",
      icon: "home",
      href: "/",
    });
  });

  it("leads home wherever the app says", () => {
    const [home] = withHomeLink(ACTIONS, "none", "https://fuzzley.games/");

    expect(home).toHaveProperty("href", "https://fuzzley.games/");
  });

  it("sets the first item apart from the link", () => {
    const items = withHomeLink(ACTIONS, "none");

    expect(items.map((item) => [item.id, item.startsGroup ?? false])).toEqual([
      ["home", false],
      ["restart", true],
      ["help", false],
    ]);
  });

  it("holds only the link when there is nothing else", () => {
    expect(withHomeLink([], "none").map((item) => item.id)).toEqual(["home"]);
  });

  it.each(["icon", "wordmark"] as const)(
    "leaves the items as they are where the bar shows the link as its %s",
    (barHome) => {
      expect(withHomeLink(ACTIONS, barHome)).toBe(ACTIONS);
    },
  );
});
