import { render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { HelpComponent } from "./help.component";

describe("HelpComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(HelpComponent, { inputs: { open: false } });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a dialog named How to play", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      screen.getByRole("dialog", { name: "How to play" }),
    ).toBeInTheDocument();
  });

  it("gives the rule", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/the digits 1 to 9 once/)).toBeInTheDocument();
  });

  it("gives the keys for each control", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByRole("row", { name: /^Notes mode/ })).toHaveTextContent(
      "N",
    );
  });

  it("asks to close from its close button", async () => {
    const closed = vi.fn();
    await render(HelpComponent, { inputs: { open: true }, on: { closed } });

    await userEvent.click(
      screen.getByRole("button", { name: "Close How to play" }),
    );

    expect(closed).toHaveBeenCalledOnce();
  });
});
