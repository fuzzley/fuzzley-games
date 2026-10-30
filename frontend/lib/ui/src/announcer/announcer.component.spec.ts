import { Component, inject } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { render } from "@testing-library/angular";
import { ARRIVAL_MS, AnnouncerComponent } from "./announcer.component";
import { AnnouncerService } from "./announcer.service";

/** Says something as it is made, after the region before it in the template. */
@Component({ selector: "fz-speaker", template: "" })
class SpeakerComponent {
  constructor() {
    inject(AnnouncerService).say("Your last game is paused.");
  }
}

/** Holds a region, then something that speaks before the region renders. */
@Component({
  imports: [AnnouncerComponent, SpeakerComponent],
  template: "<fz-announcer /><fz-speaker />",
})
class PageComponent {}

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

/**
 * Renders a page whose region is made before something speaks, on fake
 * timers, and returns the region.
 */
function placedBeforeSpeaking(): HTMLElement {
  vi.useFakeTimers();
  const fixture = TestBed.createComponent(PageComponent);
  fixture.detectChanges();
  const page = fixture.nativeElement as HTMLElement;
  const shown = page.querySelector<HTMLElement>("fz-announcer");
  if (!shown) throw new Error("The page has no region.");
  return shown;
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

  it("starts empty when words are said after it was made but before it rendered", () => {
    const shown = placedBeforeSpeaking();

    expect(shown).toHaveTextContent(/^$/);
  });

  it("says words said before it rendered once it has been there a moment", () => {
    const shown = placedBeforeSpeaking();

    vi.advanceTimersByTime(ARRIVAL_MS);
    TestBed.tick();

    expect(shown).toHaveTextContent("Your last game is paused.");
  });

  it("arrives holding the words said while another region was in the page", () => {
    placed();
    TestBed.inject(AnnouncerService).say("Paused, with a score of 0.");

    const later = placed();

    expect(later).toHaveTextContent("Paused, with a score of 0.");
  });

  it("arrives holding early words another region has said", () => {
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
