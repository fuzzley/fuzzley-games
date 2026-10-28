import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "../testing";
import { GameViewportService } from "./game_viewport.service";

describe("GameViewportService", () => {
  let viewport: FakeViewport | null = null;

  /** Returns the service for a window of this size. */
  function at(width: number, height: number): GameViewportService {
    viewport = installFakeViewport(width, height);
    return TestBed.inject(GameViewportService);
  }

  afterEach(() => {
    viewport?.restore();
    viewport = null;
  });

  it("reads roomy where the browser can't be asked", () => {
    expect(TestBed.inject(GameViewportService).formFactor()).toBe("roomy");
  });

  it("reads wider than tall where the browser can't be asked", () => {
    expect(TestBed.inject(GameViewportService).isPortrait()).toBe(false);
  });

  it("reads as asking for no motion where the browser can't be asked", () => {
    expect(TestBed.inject(GameViewportService).allowsMotion()).toBe(false);
  });

  it("reads as pointed at with a mouse where the browser can't be asked", () => {
    expect(TestBed.inject(GameViewportService).isTouchScreen()).toBe(false);
  });

  it("reads a finger as the main pointer of a touch screen", () => {
    const service = at(390, 844);

    viewport?.setCoarsePointer(true);

    expect(service.isTouchScreen()).toBe(true);
  });

  it("allows motion where the player has no preference", () => {
    expect(at(1280, 800).allowsMotion()).toBe(true);
  });

  it("puts the bar across the top of a roomy window", () => {
    expect(at(1280, 800).barPlacement()).toBe("top");
  });

  it("reads a roomy window as not compact", () => {
    expect(at(1280, 800).isCompact()).toBe(false);
  });

  it("puts the bar along the bottom of an upright phone", () => {
    expect(at(390, 844).barPlacement()).toBe("bottom");
  });

  it("reads an upright phone as compact", () => {
    expect(at(390, 844).isCompact()).toBe(true);
  });

  it("puts the bar down the end of a phone on its side", () => {
    expect(at(844, 390).barPlacement()).toBe("end");
  });

  it("reads a phone on its side", () => {
    expect(at(844, 390).formFactor()).toBe("phone-landscape");
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

  it("has room for the home button from 360 px", () => {
    expect(at(360, 700).fitsHomeButton()).toBe(true);
  });

  it("has no room for the home button below 360 px", () => {
    expect(at(359, 700).fitsHomeButton()).toBe(false);
  });

  it("leads the bar with the wordmark on a roomy window wide enough", () => {
    expect(at(1280, 800).barHome()).toBe("wordmark");
  });

  it("leads the bar with the home button on a roomy window too narrow for the wordmark", () => {
    expect(at(1024, 768).barHome()).toBe("icon");
  });

  it("leads a compact bar with the home button, however wide", () => {
    expect(at(1400, 480).barHome()).toBe("icon");
  });

  it("leaves the link home out of a bar below 360 px", () => {
    expect(at(359, 700).barHome()).toBe("none");
  });
});
