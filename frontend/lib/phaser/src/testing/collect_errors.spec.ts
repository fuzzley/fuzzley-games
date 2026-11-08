import { ErrorHandler } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { collectErrors } from "./collect_errors";

describe("collectErrors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("collects what the app's error handler is handed, rather than printing it", () => {
    const errors = collectErrors();
    const print = vi.spyOn(console, "error");

    TestBed.inject(ErrorHandler).handleError(new Error("Expected"));

    expect({ errors, printed: print.mock.calls }).toEqual({
      errors: [new Error("Expected")],
      printed: [],
    });
  });
});
