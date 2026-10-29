import { render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { HelpComponent } from "./help.component";

describe("HelpComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(HelpComponent, { inputs: { open: false } });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says how to play, and the controls", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByRole("dialog", { name: "How to play" })).toBeVisible();
    expect(
      screen.getByRole("rowheader", { name: "Start, or turn" }),
    ).toBeInTheDocument();
  });

  it("says the run goes on at P too", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/Pausing./).parentElement).toHaveTextContent(
      "Space or P, or Resume",
    );
  });

  it("says how to start again once a run has ended", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      screen.getByRole("rowheader", {
        name: "Start again, once a run has ended",
      }),
    ).toBeInTheDocument();
  });

  it("asks to close at its close button", async () => {
    const closed = vi.fn();
    await render(HelpComponent, { inputs: { open: true }, on: { closed } });

    await userEvent.click(
      screen.getByRole("button", { name: "Close How to play" }),
    );

    expect(closed).toHaveBeenCalledOnce();
  });
});
