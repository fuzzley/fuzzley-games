import { TestBed } from "@angular/core/testing";
import { render } from "@testing-library/angular";
import { ARRIVAL_MS, AnnouncerComponent } from "./announcer.component";
import { AnnouncerService } from "./announcer.service";

/**
 * Puts a region in the page, on fake timers, and returns it once it has
 * rendered.
 */
function placed(): HTMLElement {
  vi.useFakeTimers();
  const fixture = TestBed.createComponent(AnnouncerComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

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

  it("starts empty when words were said before any region was in the page", () => {
    TestBed.inject(AnnouncerService).say("Your last game is paused.");

    const shown = placed();

    expect(shown).toHaveTextContent(/^$/);
  });

  it("says words said before any region was in the page once it has been there a moment", () => {
    TestBed.inject(AnnouncerService).say("Your last game is paused.");
    const shown = placed();

    vi.advanceTimersByTime(ARRIVAL_MS);
    TestBed.tick();

    expect(shown).toHaveTextContent("Your last game is paused.");
  });

  it("arrives saying the words said while another region was in the page", () => {
    placed();
    TestBed.inject(AnnouncerService).say("Paused, with a score of 0.");

    const later = placed();

    expect(later).toHaveTextContent("Paused, with a score of 0.");
  });

  it("arrives saying early words another region has said", () => {
    TestBed.inject(AnnouncerService).say("Your last game is paused.");
    placed();
    vi.advanceTimersByTime(ARRIVAL_MS);

    const later = placed();

    expect(later).toHaveTextContent("Your last game is paused.");
  });

  it("says what the service says", async () => {
    const shown = await region();

    TestBed.inject(AnnouncerService).say("Mine. 2 lives left.");
    TestBed.tick();

    expect(shown).toHaveTextContent("Mine. 2 lives left.");
  });
});
