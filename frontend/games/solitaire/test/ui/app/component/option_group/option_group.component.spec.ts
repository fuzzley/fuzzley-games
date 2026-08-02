// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { OptionGroupComponent } from "@/ui/app/component/option_group/option_group.component";
import { GameOptionSpec } from "@/ui/app/provider/game_catalog";
import { query, queryAll, queryText } from "@test/support/dom";

/**
 * A rule with three choices and a default in the middle, so a spec can tell
 * "the chosen value" apart from "the first one" and from "the default".
 */
const DRAW_COUNT: GameOptionSpec = {
  id: "drawCount",
  label: "Draw Count",
  description: "How many cards come off the stock at a time.",
  choices: [
    { value: 1, label: "Draw 1" },
    { value: 2, label: "Draw 2" },
    { value: 3, label: "Draw 3" },
  ],
  defaultValue: 2,
};

describe("OptionGroupComponent", () => {
  let fixture: ComponentFixture<OptionGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OptionGroupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OptionGroupComponent);
    fixture.componentRef.setInput("option", DRAW_COUNT);
    fixture.detectChanges();
  });

  /** The group's choice buttons, in the order they are offered. */
  function choices(): HTMLElement[] {
    return queryAll(fixture, ".segment-btn");
  }

  /** Which choice is marked as the current one, by label. */
  function checkedLabel(): string | undefined {
    return choices()
      .find((button) => button.getAttribute("aria-checked") === "true")
      ?.textContent?.trim();
  }

  /** Renders with an explicitly chosen value. */
  function chooseValue(value: number | undefined): void {
    fixture.componentRef.setInput("value", value);
    fixture.detectChanges();
  }

  it("names the rule being offered", () => {
    expect(queryText(fixture, ".setting-label")).toBe("Draw Count");
  });

  it("offers every choice the rule declares, in order", () => {
    expect(choices().map((button) => button.textContent?.trim())).toEqual([
      "Draw 1",
      "Draw 2",
      "Draw 3",
    ]);
  });

  it("marks the chosen value as checked", () => {
    chooseValue(3);

    expect(checkedLabel()).toBe("Draw 3");
  });

  it("falls back to the rule's default when no value is chosen", () => {
    expect(checkedLabel()).toBe("Draw 2");
  });

  it("checks exactly one choice, so the group is never ambiguous", () => {
    chooseValue(1);

    const checked = choices().filter(
      (button) => button.getAttribute("aria-checked") === "true",
    );

    expect(checked).toHaveLength(1);
  });

  it("reports the value the player picked", () => {
    const chosen: number[] = [];
    fixture.componentInstance.choose.subscribe((value) => chosen.push(value));

    choices()[2].click();

    expect(chosen).toEqual([3]);
  });

  it("reports a pick even when it is the one already checked", () => {
    // The group does not filter: whether re-picking the current value is worth
    // acting on is the host's decision, and the lifecycle service makes it.
    const chosen: number[] = [];
    fixture.componentInstance.choose.subscribe((value) => chosen.push(value));

    choices()[1].click();

    expect(chosen).toEqual([2]);
  });

  it("explains the rule when it carries a description", () => {
    expect(queryText(fixture, ".setting-desc")).toBe(
      "How many cards come off the stock at a time.",
    );
  });

  it("omits the description entirely when the rule has none", () => {
    const withoutDescription: GameOptionSpec = {
      ...DRAW_COUNT,
      description: undefined,
    };
    fixture.componentRef.setInput("option", withoutDescription);
    fixture.detectChanges();

    expect(query(fixture, ".setting-desc")).toBeNull();
  });

  it("names the group after its label, since the label is a heading not a <label>", () => {
    const labelId = query(fixture, ".setting-label")?.id;

    expect(labelId).toBeTruthy();
    expect(
      query(fixture, "[role='radiogroup']")?.getAttribute("aria-labelledby"),
    ).toBe(labelId);
  });

  it("gives each instance its own label id, so two groups do not collide", () => {
    const second = TestBed.createComponent(OptionGroupComponent);
    second.componentRef.setInput("option", DRAW_COUNT);
    second.detectChanges();

    const first = query(fixture, ".setting-label")?.id;
    const other = (second.nativeElement as HTMLElement).querySelector(
      ".setting-label",
    )?.id;

    expect(first).not.toBe(other);
  });

  it("renders the label plainly by default", () => {
    expect(
      query(fixture, ".setting-label")?.classList.contains(
        "setting-label-compact",
      ),
    ).toBe(false);
  });

  it("renders the label quietly when asked, for the debug panel's nested rules", () => {
    fixture.componentRef.setInput("compactLabel", true);
    fixture.detectChanges();

    expect(
      query(fixture, ".setting-label")?.classList.contains(
        "setting-label-compact",
      ),
    ).toBe(true);
  });
});
