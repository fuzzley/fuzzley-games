import { TestBed } from "@angular/core/testing";
import { render } from "@testing-library/angular";
import { ARRIVAL_MS, AnnouncerComponent } from "./announcer.component";
import { AnnouncerService } from "./announcer.service";

/** Returns the region a rendered announcer speaks through. */
async function region(): Promise<HTMLElement> {
  const { fixture } = await render(AnnouncerComponent);
  return fixture.nativeElement as HTMLElement;
}

describe("AnnouncerComponent", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is a polite live region", async () => {
    expect(await region()).toHaveAttribute("aria-live", "polite");
  });

  it("keeps out of sight", async () => {
    expect(await region()).toHaveClass("fz-visually-hidden");
  });

  it("says what was said before it was in the page only once it has been there a moment", () => {
    TestBed.inject(AnnouncerService).say("Your last game is paused.");
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(AnnouncerComponent);
    const shown = fixture.nativeElement as HTMLElement;

    fixture.detectChanges();
    const arriving = shown.textContent;
    vi.advanceTimersByTime(ARRIVAL_MS);
    fixture.detectChanges();

    expect([arriving, shown.textContent]).toEqual([
      "",
      "Your last game is paused.",
    ]);
  });

  it("says what the service says", async () => {
    const shown = await region();

    TestBed.inject(AnnouncerService).say("Mine. 2 lives left.");
    TestBed.tick();

    expect(shown).toHaveTextContent("Mine. 2 lives left.");
  });
});
