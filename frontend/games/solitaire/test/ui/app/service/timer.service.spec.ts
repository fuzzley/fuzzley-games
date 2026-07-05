// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { TimerService } from "@/ui/app/service/timer.service";

describe("TimerService", () => {
  let timer: TimerService;

  beforeEach(() => {
    vi.useFakeTimers();
    timer = TestBed.inject(TimerService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts at zero", () => {
    expect(timer.timerText()).toBe("00:00");
    expect(timer.isRunning).toBe(false);
  });

  it("counts elapsed seconds once started", () => {
    timer.start();

    vi.advanceTimersByTime(5000);

    expect(timer.timerText()).toBe("00:05");
    expect(timer.isRunning).toBe(true);
  });

  it("formats minutes and seconds as mm:ss", () => {
    timer.start();

    vi.advanceTimersByTime(75000);

    expect(timer.timerText()).toBe("01:15");
  });

  it("does not advance after being stopped", () => {
    timer.start();
    vi.advanceTimersByTime(3000);

    timer.stop();
    vi.advanceTimersByTime(5000);

    expect(timer.timerText()).toBe("00:03");
    expect(timer.isRunning).toBe(false);
  });

  it("returns to zero when reset", () => {
    timer.start();
    vi.advanceTimersByTime(3000);

    timer.reset();

    expect(timer.timerText()).toBe("00:00");
    expect(timer.isRunning).toBe(false);
  });

  it("ignores a redundant start while already running", () => {
    timer.start();
    timer.start();
    vi.advanceTimersByTime(1000);

    expect(timer.timerText()).toBe("00:01");
  });
});
