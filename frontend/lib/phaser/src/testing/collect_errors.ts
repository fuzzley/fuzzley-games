import { ErrorHandler } from "@angular/core";
import { TestBed } from "@angular/core/testing";

/**
 * Has the app's `ErrorHandler` collect what it is handed, rather than print
 * it, and returns what it collects; called before the component is rendered.
 *
 * A spec that fails a scene on purpose asserts on what this collects, so the
 * run prints no error it expects.
 */
export function collectErrors(): readonly unknown[] {
  const errors: unknown[] = [];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ErrorHandler,
        useValue: {
          handleError: (error: unknown) => {
            errors.push(error);
          },
        },
      },
    ],
  });
  return errors;
}
