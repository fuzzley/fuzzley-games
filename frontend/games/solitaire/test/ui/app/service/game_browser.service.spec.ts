// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { GameBrowserService } from "@/ui/app/service/game_browser.service";

/** Returns a fresh service. */
function service(): GameBrowserService {
  return TestBed.inject(GameBrowserService);
}

/** Returns a cancelable key press, as the document would receive it. */
function keydown(key: string, modifiers: KeyboardEventInit = {}) {
  return new KeyboardEvent("keydown", { key, cancelable: true, ...modifiers });
}

describe("GameBrowserService", () => {
  it("starts closed", () => {
    expect(service().isOpen()).toBe(false);
  });

  it("opens", () => {
    const browser = service();

    browser.open();

    expect(browser.isOpen()).toBe(true);
  });

  it("closes", () => {
    const browser = service();
    browser.open();

    browser.close();

    expect(browser.isOpen()).toBe(false);
  });

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Command", { metaKey: true }],
  ])("opens on %s and K", (_name, modifiers) => {
    const browser = service();

    browser.openOnShortcut(keydown("k", modifiers));

    expect(browser.isOpen()).toBe(true);
  });

  it("opens on the shortcut with Caps Lock on", () => {
    const browser = service();

    browser.openOnShortcut(keydown("K", { ctrlKey: true }));

    expect(browser.isOpen()).toBe(true);
  });

  it("keeps the shortcut from the web browser's own use of it", () => {
    const event = keydown("k", { ctrlKey: true });

    service().openOnShortcut(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it.each([
    ["K alone", keydown("k")],
    ["Ctrl, Shift and K", keydown("k", { ctrlKey: true, shiftKey: true })],
    ["Ctrl, Alt and K", keydown("k", { ctrlKey: true, altKey: true })],
    ["Ctrl and another key", keydown("j", { ctrlKey: true })],
  ])("ignores %s", (_name, event) => {
    const browser = service();

    browser.openOnShortcut(event);

    expect([browser.isOpen(), event.defaultPrevented]).toEqual([false, false]);
  });

  it("recognises its shortcut", () => {
    expect(service().isShortcut(keydown("k", { metaKey: true }))).toBe(true);
  });

  it("does not take another key press for its shortcut", () => {
    expect(service().isShortcut(keydown("k", { altKey: true }))).toBe(false);
  });

  it("writes the shortcut as it reads off a keyboard that is not a Mac's", () => {
    expect(service().shortcutLabel).toBe("Ctrl K");
  });
});
