// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";

describe("ConfirmationService", () => {
  let service: ConfirmationService;

  beforeEach(() => {
    service = TestBed.inject(ConfirmationService);
  });

  it("starts closed with no message", () => {
    expect(service.isOpen()).toBe(false);
    expect(service.message()).toBe("");
  });

  it("opens with the given message when an action is requested", () => {
    service.request("Are you sure?", () => {});

    expect(service.isOpen()).toBe(true);
    expect(service.message()).toBe("Are you sure?");
  });

  it("runs the pending action and closes on accept", () => {
    const action = vi.fn();
    service.request("Confirm?", action);

    service.accept();

    expect(action).toHaveBeenCalledOnce();
    expect(service.isOpen()).toBe(false);
  });

  it("does not run the action and closes on cancel", () => {
    const action = vi.fn();
    service.request("Confirm?", action);

    service.cancel();

    expect(action).not.toHaveBeenCalled();
    expect(service.isOpen()).toBe(false);
  });

  it("does not re-run the action on a second accept", () => {
    const action = vi.fn();
    service.request("Confirm?", action);

    service.accept();
    service.accept();

    expect(action).toHaveBeenCalledOnce();
  });
});
