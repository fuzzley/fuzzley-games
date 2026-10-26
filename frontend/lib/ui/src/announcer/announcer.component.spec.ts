import { TestBed } from "@angular/core/testing";
import { render } from "@testing-library/angular";
import { AnnouncerComponent } from "./announcer.component";
import { AnnouncerService } from "./announcer.service";

/** Returns the region a rendered announcer speaks through. */
async function region(): Promise<HTMLElement> {
  const { fixture } = await render(AnnouncerComponent);
  return fixture.nativeElement as HTMLElement;
}

describe("AnnouncerComponent", () => {
  it("is a polite live region", async () => {
    expect(await region()).toHaveAttribute("aria-live", "polite");
  });

  it("keeps out of sight", async () => {
    expect(await region()).toHaveClass("fz-visually-hidden");
  });

  it("says what the service says", async () => {
    const shown = await region();

    TestBed.inject(AnnouncerService).say("Mine. 2 lives left.");
    TestBed.tick();

    expect(shown).toHaveTextContent("Mine. 2 lives left.");
  });
});
