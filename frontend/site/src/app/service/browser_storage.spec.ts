import { DOCUMENT } from "@angular/common";
import { TestBed } from "@angular/core/testing";
import { BROWSER_STORAGE } from "./browser_storage";

describe("BROWSER_STORAGE", () => {
  function storageIn(view: object | null): Storage | null {
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: view } }],
    });
    return TestBed.inject(BROWSER_STORAGE);
  }

  it("is the window's localStorage", () => {
    expect(TestBed.inject(BROWSER_STORAGE)).toBe(localStorage);
  });

  it("is null where reading it throws, as with site data blocked", () => {
    const blocked = {
      get localStorage(): Storage {
        throw new DOMException("blocked", "SecurityError");
      },
    };

    expect(storageIn(blocked)).toBeNull();
  });

  it("is null without a window", () => {
    expect(storageIn(null)).toBeNull();
  });
});
