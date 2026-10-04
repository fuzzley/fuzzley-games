// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { OptionGroupComponent } from "@/ui/app/component/option_group/option_group.component";
import { GameOptionSpec } from "@/ui/app/provider/game_catalog";
import { query, queryAll, queryText, rootElement } from "@test/support/dom";

/**
 * A rule with three choices and a default in the middle, so a spec can tell
 * "the chosen value" apart from "the first one" and from "the default".
 */
const DRAW_COUNT: GameOptionSpec = {
  id: "drawCount",
  label: "Draw Count",
  description: "How many cards come off the stock at a time.",
  choices: [
    { value: 1, rule: 1, label: "Draw 1" },
    { value: 2, rule: 2, label: "Draw 2" },
    { value: 3, rule: 3, label: "Draw 3" },
  ],
  defaultValue: 2,
};

/** The same rule offered one choice to a row, with a line about all but one. */
const LISTED_DRAW_COUNT: GameOptionSpec = {
  ...DRAW_COUNT,
  control: "list",
  choices: [
    { value: 1, rule: 1, label: "Draw 1", description: "One card at a time." },
    { value: 2, rule: 2, label: "Draw 2", description: "Two cards at a time." },
    { value: 3, rule: 3, label: "Draw 3" },
  ],
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

  /** Returns the group's choice buttons, in the order they are offered. */
  function choices(): HTMLElement[] {
    return queryAll(fixture, ".segment-btn");
  }

  /** Returns the label of the choice marked as the current one. */
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

  describe("as a list", () => {
    beforeEach(() => {
      fixture.componentRef.setInput("option", LISTED_DRAW_COUNT);
      fixture.detectChanges();
    });

    /** Returns the list's rows, in the order they are offered. */
    function rows(): HTMLElement[] {
      return queryAll(fixture, ".choice-row");
    }

    /** Returns the text of the element a row's ARIA reference points at. */
    function referencedText(
      row: HTMLElement,
      attribute: "aria-labelledby" | "aria-describedby",
    ): string | undefined {
      const id = row.getAttribute(attribute);
      return id
        ? rootElement(fixture)
            .querySelector(`[id="${id}"]`)
            ?.textContent?.trim()
        : undefined;
    }

    it("offers each choice on a row of its own, named by its label", () => {
      expect(
        rows().map((row) => referencedText(row, "aria-labelledby")),
      ).toEqual(["Draw 1", "Draw 2", "Draw 3"]);
    });

    it("describes a choice by its line", () => {
      expect(referencedText(rows()[0], "aria-describedby")).toBe(
        "One card at a time.",
      );
    });

    it("leaves a choice without a line undescribed", () => {
      expect(rows()[2].hasAttribute("aria-describedby")).toBe(false);
    });

    it("marks the chosen row as checked", () => {
      chooseValue(3);

      const checked = rows().filter(
        (row) => row.getAttribute("aria-checked") === "true",
      );

      expect(
        checked.map((row) => referencedText(row, "aria-labelledby")),
      ).toEqual(["Draw 3"]);
    });

    it("reports the value of the row the player picked", () => {
      const chosen: number[] = [];
      fixture.componentInstance.choose.subscribe((value) => chosen.push(value));

      rows()[0].click();

      expect(chosen).toEqual([1]);
    });

    it("leaves out the rule's description, which the rows' lines replace", () => {
      expect(query(fixture, ".setting-desc")).toBeNull();
    });
  });
});
