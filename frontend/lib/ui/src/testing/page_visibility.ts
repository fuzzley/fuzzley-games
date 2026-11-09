import { onTestFinished } from "vitest";

/**
 * Sets the page's visibility, as switching tabs does, and says so with
 * `visibilitychange`, until the test that set it finishes.
 *
 * jsdom's own visibility never changes, so it stands in for the document's
 * `visibilityState` and gives it back once the test finishes, without a
 * word, so nothing listening hears the page come back.
 */
export function setPageVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  onTestFinished(() => {
    Reflect.deleteProperty(document, "visibilityState");
  });
  document.dispatchEvent(new Event("visibilitychange"));
}
