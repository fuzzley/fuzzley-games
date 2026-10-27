import type { BarOverflowAction } from "./bar_overflow.component";
import { withHomeLink } from "./home_link";

const ACTIONS: readonly BarOverflowAction<"restart" | "help">[] = [
  { id: "restart", label: "Restart", icon: "restart" },
  { id: "help", label: "How to play", icon: "help" },
];

describe("withHomeLink", () => {
  it("leads the menu with the link home", () => {
    const [home] = withHomeLink(ACTIONS, "/");

    expect(home).toEqual({
      id: "home",
      label: "Fuzzley Games",
      icon: "home",
      href: "/",
    });
  });

  it("sets the first item apart from the link", () => {
    const items = withHomeLink(ACTIONS, "/");

    expect(items.map((item) => [item.id, item.startsGroup ?? false])).toEqual([
      ["home", false],
      ["restart", true],
      ["help", false],
    ]);
  });

  it("holds only the link when there is nothing else", () => {
    expect(withHomeLink([], "/").map((item) => item.id)).toEqual(["home"]);
  });
});
