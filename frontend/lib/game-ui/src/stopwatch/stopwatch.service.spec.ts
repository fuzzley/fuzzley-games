import { TestBed } from "@angular/core/testing";
import { StopwatchService } from "./stopwatch.service";

/** Sets the page's visibility, as switching tabs does, and says so. */
function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("StopwatchService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, "visibilityState");
  });

  /** Returns a stopwatch that has been started. */
  function started(): StopwatchService {
    const stopwatch = TestBed.inject(StopwatchService);
    stopwatch.start();
    return stopwatch;
  }

  it("holds no time until it is started", () => {
    const stopwatch = TestBed.inject(StopwatchService);

    vi.advanceTimersByTime(3000);

    expect(stopwatch.seconds()).toBe(0);
  });

  it("counts whole seconds once started", () => {
    const stopwatch = started();

    vi.advanceTimersByTime(2999);

    expect(stopwatch.seconds()).toBe(2);
  });

  it("loses no time when started again while counting", () => {
    const stopwatch = started();
    vi.advanceTimersByTime(600);

    stopwatch.start();
    vi.advanceTimersByTime(600);

    expect(stopwatch.seconds()).toBe(1);
  });

  it("says it is running once started", () => {
    expect(started().running()).toBe(true);
  });

  it("keeps the time counted when stopped", () => {
    const stopwatch = started();
    vi.advanceTimersByTime(3000);

    stopwatch.stop();
    vi.advanceTimersByTime(3000);

    expect(stopwatch.seconds()).toBe(3);
  });

  it("says it isn't running once stopped", () => {
    const stopwatch = started();

    stopwatch.stop();

    expect(stopwatch.running()).toBe(false);
  });

  it("keeps the part of a second under way when stopped", () => {
    const stopwatch = started();
    vi.advanceTimersByTime(600);
    stopwatch.stop();

    stopwatch.start();
    vi.advanceTimersByTime(600);

    expect(stopwatch.seconds()).toBe(1);
  });

  it("counts on from a time it is reset to", () => {
    const stopwatch = TestBed.inject(StopwatchService);
    stopwatch.reset(74);

    stopwatch.start();
    vi.advanceTimersByTime(1000);

    expect(stopwatch.seconds()).toBe(75);
  });

  it("stops when reset", () => {
    const stopwatch = started();

    stopwatch.reset();
    vi.advanceTimersByTime(3000);

    expect(stopwatch.seconds()).toBe(0);
  });

  it("pauses while the page is out of sight", () => {
    const stopwatch = started();
    vi.advanceTimersByTime(1000);

    setVisibility("hidden");
    vi.advanceTimersByTime(3000);

    expect(stopwatch.seconds()).toBe(1);
  });

  it("goes on when the page is back in sight", () => {
    const stopwatch = started();
    setVisibility("hidden");
    setVisibility("visible");

    vi.advanceTimersByTime(2000);

    expect(stopwatch.seconds()).toBe(2);
  });

  it("stays stopped when the page comes back in sight", () => {
    const stopwatch = TestBed.inject(StopwatchService);
    setVisibility("hidden");
    setVisibility("visible");

    vi.advanceTimersByTime(2000);

    expect(stopwatch.seconds()).toBe(0);
  });

  it("starts paused on a page out of sight", () => {
    setVisibility("hidden");

    const stopwatch = started();
    vi.advanceTimersByTime(2000);

    expect(stopwatch.seconds()).toBe(0);
  });
});
