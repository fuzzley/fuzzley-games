import {
  EnvironmentInjector,
  createEnvironmentInjector,
  runInInjectionContext,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { setPageVisibility } from "../testing";
import { keepOnLeave } from "./keep_on_leave";

describe("keepOnLeave", () => {
  let saves = 0;

  /** Counts a save. */
  function save(): void {
    saves += 1;
  }

  beforeEach(() => {
    saves = 0;
  });

  /** Saves on leaving until the test's injector is destroyed. */
  function kept(): void {
    TestBed.runInInjectionContext(() => {
      keepOnLeave(save);
    });
  }

  /** Saves on leaving, in an injector of its own, and returns that injector. */
  function keptIn(): EnvironmentInjector {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector),
    );
    runInInjectionContext(injector, () => {
      keepOnLeave(save);
    });
    return injector;
  }

  it("saves as the page is hidden", () => {
    kept();

    setPageVisibility("hidden");

    expect(saves).toBe(1);
  });

  it("doesn't save as the page comes back into sight", () => {
    kept();

    setPageVisibility("visible");

    expect(saves).toBe(0);
  });

  it("saves as the page goes away", () => {
    kept();

    window.dispatchEvent(new Event("pagehide"));

    expect(saves).toBe(1);
  });

  it("stops once its injector is destroyed", () => {
    keptIn().destroy();

    setPageVisibility("hidden");
    window.dispatchEvent(new Event("pagehide"));

    expect(saves).toBe(0);
  });

  it("must be called in an injection context", () => {
    expect(() => {
      keepOnLeave(save);
    }).toThrow();
  });
});
