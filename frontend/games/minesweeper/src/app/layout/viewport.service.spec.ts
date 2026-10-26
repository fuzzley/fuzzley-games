import { TestBed } from "@angular/core/testing";
import {
  type FakeViewport,
  installFakeViewport,
} from "../../testing/fake_viewport";
import { ViewportService } from "./viewport.service";

describe("ViewportService", () => {
  let viewport: FakeViewport | null = null;

  /** Returns the service for a window of this size. */
  function at(width: number, height: number): ViewportService {
    viewport = installFakeViewport(width, height);
    return TestBed.inject(ViewportService);
  }

  afterEach(() => {
    viewport?.restore();
    viewport = null;
  });

  it("reads roomy and wide where the browser can't be asked", () => {
    const service = TestBed.inject(ViewportService);

    expect(service.formFactor()).toBe("roomy");
    expect(service.isPortrait()).toBe(false);
  });

  it("puts the bar across the top of a roomy window", () => {
    expect(at(1280, 800).barPlacement()).toBe("top");
  });

  it("puts the bar along the bottom of an upright phone", () => {
    const service = at(390, 844);

    expect(service.formFactor()).toBe("phone-portrait");
    expect(service.barPlacement()).toBe("bottom");
  });

  it("puts the bar down the end of a phone on its side", () => {
    const service = at(844, 390);

    expect(service.formFactor()).toBe("phone-landscape");
    expect(service.barPlacement()).toBe("end");
  });

  it("tells an upright window from a wide one", () => {
    expect(at(768, 1024).isPortrait()).toBe(true);
  });

  it("follows the window as it turns", () => {
    const service = at(390, 844);

    viewport?.setSize(844, 390);

    expect(service.barPlacement()).toBe("end");
  });

  it("has room for the wordmark from 1280 px", () => {
    expect(at(1280, 800).fitsWordmark()).toBe(true);
  });

  it("has no room for the wordmark below 1280 px", () => {
    expect(at(1279, 800).fitsWordmark()).toBe(false);
  });

  it("has no room for the home button below 360 px", () => {
    expect(at(359, 700).fitsHomeButton()).toBe(false);
  });
});
