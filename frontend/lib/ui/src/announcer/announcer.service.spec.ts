import { TestBed } from "@angular/core/testing";
import { AnnouncerService } from "./announcer.service";

describe("AnnouncerService", () => {
  it("says what it is given", () => {
    const announcer = TestBed.inject(AnnouncerService);

    announcer.say("Revealed 4 squares.");

    expect(announcer.message()).toBe("Revealed 4 squares.");
  });

  it("changes the words it repeats, so a screen reader says them again", () => {
    const announcer = TestBed.inject(AnnouncerService);
    announcer.say("Flagged.");

    announcer.say("Flagged.");

    expect(announcer.message()).toBe("Flagged.\u00a0");
  });

  it("says a third repeat as it said the first", () => {
    const announcer = TestBed.inject(AnnouncerService);
    announcer.say("Flagged.");
    announcer.say("Flagged.");

    announcer.say("Flagged.");

    expect(announcer.message()).toBe("Flagged.");
  });

  it("says nothing once cleared", () => {
    const announcer = TestBed.inject(AnnouncerService);
    announcer.say("Flagged.");

    announcer.clear();

    expect(announcer.message()).toBe("");
  });

  it("counts words said before any region was in the page as early", () => {
    const announcer = TestBed.inject(AnnouncerService);

    announcer.say("Your last game is paused.");

    expect(announcer.early).toBe(true);
  });

  it("counts words said once a region is in the page as not early", () => {
    const announcer = TestBed.inject(AnnouncerService);
    announcer.notePlaced();

    announcer.say("Flagged.");

    expect(announcer.early).toBe(false);
  });

  it("counts early words as said once a region has said them", () => {
    const announcer = TestBed.inject(AnnouncerService);
    announcer.say("Your last game is paused.");

    announcer.noteEarlyWordsSaid();

    expect(announcer.early).toBe(false);
  });

  it("counts nothing as early once cleared", () => {
    const announcer = TestBed.inject(AnnouncerService);
    announcer.say("Your last game is paused.");

    announcer.clear();

    expect(announcer.early).toBe(false);
  });
});
