// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";

describe("ConfirmationService", () => {
  let confirmation: ConfirmationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    confirmation = TestBed.inject(ConfirmationService);
  });

  it("starts closed with no message", () => {
    expect(confirmation.isOpen()).toBe(false);
    expect(confirmation.message()).toBe("");
  });

  it("opens with the message it was given", () => {
    void confirmation.ask("Throw the game away?");

    expect(confirmation.isOpen()).toBe(true);
    expect(confirmation.message()).toBe("Throw the game away?");
  });

  it("resolves true when accepted", async () => {
    const answer = confirmation.ask("Sure?");

    confirmation.accept();

    await expect(answer).resolves.toBe(true);
  });

  it("resolves false when cancelled", async () => {
    const answer = confirmation.ask("Sure?");

    confirmation.cancel();

    await expect(answer).resolves.toBe(false);
  });

  it("closes once answered", async () => {
    const answer = confirmation.ask("Sure?");
    confirmation.accept();
    await answer;

    expect(confirmation.isOpen()).toBe(false);
  });

  it("declines an outstanding question when a second one arrives", async () => {
    const first = confirmation.ask("First?");

    void confirmation.ask("Second?");

    // Otherwise the first caller waits forever on a promise whose dialog has
    // been replaced.
    await expect(first).resolves.toBe(false);
    expect(confirmation.message()).toBe("Second?");
  });

  it("ignores an answer when nothing was asked", () => {
    expect(() => confirmation.accept()).not.toThrow();
    expect(confirmation.isOpen()).toBe(false);
  });
});
