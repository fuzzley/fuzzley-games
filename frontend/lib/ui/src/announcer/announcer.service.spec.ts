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
});
