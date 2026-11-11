// The functions a layout check runs in the page, each sent as its source, so
// each uses nothing from outside itself; a screenshot script waits for its
// page to draw with settle() too. Only a browser runs the rest, so the specs'
// coverage leaves this file out, though its spec runs settle() in jsdom.

/**
 * Resolves to true once the page matches a selector, its fonts have loaded
 * and it has drawn twice more, or to false once a time has passed with
 * nothing matched. It runs in the page.
 */
export function settle(selector: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const started = performance.now();
    const look = (): void => {
      if (document.querySelector(selector)) {
        void document.fonts.ready.then(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve(true);
            });
          });
        });
        return;
      }
      if (performance.now() - started > timeoutMs) {
        resolve(false);
        return;
      }
      requestAnimationFrame(look);
    };
    look();
  });
}

/**
 * Resolves once a page has had time to lay itself out again after its window
 * changed, and has drawn twice more. It runs in the page.
 */
export function settleTurn(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    }, ms);
  });
}

/**
 * Returns each control of the game bar that runs out of the window, where a
 * player can't reach it. It runs in the page.
 */
export function barOutOfWindow(): string[] {
  const problems: string[] = [];
  for (const control of document.querySelectorAll(
    "fz-game-bar button, fz-game-bar a",
  )) {
    const box = control.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    if (
      box.left < -0.5 ||
      box.top < -0.5 ||
      box.right > innerWidth + 0.5 ||
      box.bottom > innerHeight + 0.5
    ) {
      // Named as a screen reader names it: its label, its words, its tooltip.
      const name =
        control.getAttribute("aria-label") ??
        (control.textContent.trim() || (control.getAttribute("title") ?? ""));
      problems.push(`The bar's ${name} runs out of the window.`);
    }
  }
  return problems;
}

/** Returns how the page scrolls, which a game's page never should. */
export function scrolling(): string[] {
  const page = document.scrollingElement ?? document.documentElement;
  const problems: string[] = [];
  if (page.scrollHeight > innerHeight) {
    problems.push(
      `The page scrolls: ${page.scrollHeight}px tall in a window ${innerHeight}px tall.`,
    );
  }
  if (page.scrollWidth > innerWidth) {
    problems.push(
      `The page scrolls: ${page.scrollWidth}px wide in a window ${innerWidth}px wide.`,
    );
  }
  return problems;
}
