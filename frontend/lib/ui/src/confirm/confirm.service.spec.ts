import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "./confirm.service";

describe("ConfirmService", () => {
  let confirm: ConfirmService;

  beforeEach(() => {
    confirm = TestBed.inject(ConfirmService);
  });

  /** Asks a question with only the parts a caller must give. */
  function ask(message = "Sure?"): Promise<boolean> {
    return confirm.ask({ title: "Confirm", message });
  }

  it("starts closed", () => {
    expect(confirm.isOpen()).toBe(false);
  });

  it("opens with what it was asked", () => {
    void ask("Throw the game away?");

    expect(confirm.isOpen()).toBe(true);
    expect(confirm.prompt().message).toBe("Throw the game away?");
  });

  it("labels the buttons Confirm and Cancel unless told otherwise", () => {
    void ask();

    expect(confirm.prompt()).toMatchObject({
      confirmLabel: "Confirm",
      cancelLabel: "Cancel",
    });
  });

  it("takes the labels it is given", () => {
    void confirm.ask({
      title: "Restart?",
      message: "Your moves will be lost.",
      confirmLabel: "Restart",
      cancelLabel: "Keep playing",
    });

    expect(confirm.prompt()).toMatchObject({
      confirmLabel: "Restart",
      cancelLabel: "Keep playing",
    });
  });

  it("is not a danger unless told so", () => {
    void ask();

    expect(confirm.isDanger()).toBe(false);
  });

  it("is a danger when told so", () => {
    void confirm.ask({ title: "Delete?", message: "Gone", tone: "danger" });

    expect(confirm.isDanger()).toBe(true);
  });

  it("forgets the last question's parts when a new one arrives", () => {
    void confirm.ask({ title: "A", message: "a", confirmLabel: "Delete" });
    confirm.cancel();

    void ask();

    expect(confirm.prompt().confirmLabel).toBe("Confirm");
  });

  it("resolves true when accepted", async () => {
    const answer = ask();

    confirm.accept();

    await expect(answer).resolves.toBe(true);
  });

  it("resolves false when cancelled", async () => {
    const answer = ask();

    confirm.cancel();

    await expect(answer).resolves.toBe(false);
  });

  it("closes once answered", () => {
    void ask();

    confirm.accept();

    expect(confirm.isOpen()).toBe(false);
  });

  it("keeps what it asked while it closes, so the card stays filled", () => {
    void ask("Throw the game away?");

    confirm.cancel();

    expect(confirm.prompt().message).toBe("Throw the game away?");
  });

  it("declines an outstanding question when a second one arrives", async () => {
    const first = ask("First?");

    void ask("Second?");

    // Otherwise the first caller waits forever on a promise whose dialog has
    // been replaced.
    await expect(first).resolves.toBe(false);
    expect(confirm.prompt().message).toBe("Second?");
  });

  it("ignores an answer when nothing was asked", () => {
    confirm.accept();

    expect(confirm.isOpen()).toBe(false);
  });
});
