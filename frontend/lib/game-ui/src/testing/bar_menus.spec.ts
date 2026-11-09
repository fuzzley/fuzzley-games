import { Component, input } from "@angular/core";
import { render } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { BarChoiceComponent, type BarChoiceOption } from "../bar_choice";
import { BarOverflowComponent, type BarOverflowItem } from "../bar_overflow";
import { barChoice, chooseInBar, openBarMenu } from "./bar_menus";

const LEVELS: readonly BarChoiceOption[] = [
  { id: "easy", name: "Easy", detail: "Singles only" },
  { id: "hard", name: "Hard", detail: "Every technique" },
];

const ITEMS: readonly BarOverflowItem[] = [
  { id: "rules", label: "How to play", icon: "help" },
  { id: "settings", label: "Settings", icon: "settings" },
];

@Component({
  imports: [BarChoiceComponent, BarOverflowComponent],
  template: `
    <fz-bar-choice
      label="Level"
      value="easy"
      [options]="levels"
      (choose)="choose()($event)"
    />
    <fz-bar-overflow [items]="items" />
  `,
})
class TestBarHostComponent {
  readonly choose = input.required<(id: string) => void>();
  protected readonly levels = LEVELS;
  protected readonly items = ITEMS;
}

/** Renders a bar's choice and overflow menu, and listens to what is chosen. */
async function renderBar(): Promise<{
  user: UserEvent;
  choose: ReturnType<typeof vi.fn>;
}> {
  const choose = vi.fn();
  await render(TestBarHostComponent, { inputs: { choose } });
  return { user: userEvent.setup(), choose };
}

describe("barChoice", () => {
  it("finds a choice's badge by what it chooses, whichever choice it shows", async () => {
    await renderBar();

    expect(barChoice("Level")).toHaveAccessibleName("Level: Easy");
  });

  it("throws for a choice the bar doesn't have", async () => {
    await renderBar();

    expect(() => barChoice("Speed")).toThrow();
  });
});

describe("chooseInBar", () => {
  it("chooses from the badge's menu by the start of the choice's name, which its detail follows", async () => {
    const { user, choose } = await renderBar();

    await chooseInBar(user, "Level", "Hard");

    expect(choose).toHaveBeenCalledExactlyOnceWith("hard");
  });

  it("throws for a choice the menu doesn't offer", async () => {
    const { user } = await renderBar();

    const chosen = chooseInBar(user, "Level", "Expert");

    await expect(chosen).rejects.toThrow();
  });
});

describe("openBarMenu", () => {
  it("opens the overflow menu and returns what it offers, in order", async () => {
    const { user } = await renderBar();

    const offered = await openBarMenu(user);

    expect(offered).toEqual(["How to play", "Settings"]);
  });
});
