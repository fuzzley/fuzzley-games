import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { StageScroll, StageScrollDirective } from "./stage_scroll";

/** Renders a stage as the root template marks it. */
async function renderStage(): Promise<ComponentFixture<unknown>> {
  const { fixture } = await render(`<main appStageScroll></main>`, {
    imports: [StageScrollDirective],
  });
  return fixture;
}

/** Returns what holds the stage, as a report reads and sets it. */
function stageScroll(): StageScroll {
  return TestBed.inject(StageScroll);
}

describe("StageScroll", () => {
  it("reads no scroll before there is a stage", () => {
    expect(stageScroll().at()).toEqual({ left: 0, top: 0 });
  });

  it("reads how far the stage is scrolled, in whole pixels", async () => {
    await renderStage();
    const stage = screen.getByRole("main");
    stage.scrollLeft = 120.6;
    stage.scrollTop = 48;

    expect(stageScroll().at()).toEqual({ left: 121, top: 48 });
  });

  it("scrolls the stage", async () => {
    await renderStage();

    stageScroll().scrollTo({ left: 120, top: 48 });

    const stage = screen.getByRole("main");
    expect([stage.scrollLeft, stage.scrollTop]).toEqual([120, 48]);
  });

  it("lets the stage go once it is gone", async () => {
    const fixture = await renderStage();
    screen.getByRole("main").scrollLeft = 120;

    fixture.destroy();

    expect(stageScroll().at()).toEqual({ left: 0, top: 0 });
  });
});
