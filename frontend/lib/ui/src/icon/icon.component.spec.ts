import { render } from "@testing-library/angular";
import { ICON_NAMES, IconComponent, type IconName } from "./icon.component";

describe("IconComponent", () => {
  async function renderIcon(name: IconName): Promise<HTMLElement> {
    const { container } = await render(IconComponent, { inputs: { name } });
    return container;
  }

  it("draws the icon it is named for", async () => {
    const icon = await renderIcon("search");

    expect(icon.querySelector("circle")).toHaveAttribute("r", "6.5");
  });

  it.each(ICON_NAMES)("draws something for %s", async (name) => {
    const icon = await renderIcon(name);

    expect(icon.querySelector("svg")?.childElementCount).toBeGreaterThan(0);
  });

  it.each(["flag", "heart", "mine", "more", "pause", "play"] as const)(
    "fills %s, a solid icon",
    async (name) => {
      const icon = await renderIcon(name);

      expect(icon.querySelector("svg")).toHaveClass("filled");
    },
  );

  it("outlines any other", async () => {
    const icon = await renderIcon("tick");

    expect(icon.querySelector("svg")).not.toHaveClass("filled");
  });

  it("is hidden from assistive technology", async () => {
    const icon = await renderIcon("time");

    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
