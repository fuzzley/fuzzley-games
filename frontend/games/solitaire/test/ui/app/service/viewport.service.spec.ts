// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  COMPACT_MAX_WIDTH_PX,
  ViewportService,
} from "@/ui/app/service/viewport.service";
import {
  installFakeViewport,
  type FakeViewport,
} from "@test/support/ui/viewport";

/** A width comfortably inside the compact band, and one comfortably outside. */
const NARROW = COMPACT_MAX_WIDTH_PX - 200;
const WIDE = COMPACT_MAX_WIDTH_PX + 200;

describe("ViewportService", () => {
  let viewport: FakeViewport | null = null;

  /**
   * Returns a service built through the injector, so DestroyRef resolves and
   * releases the media-query listener with it.
   */
  function buildViewport(): ViewportService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(ViewportService);
  }

  afterEach(() => {
    viewport?.restore();
    viewport = null;
  });

  it("reads roomy where the browser cannot be asked, since that hides nothing", () => {
    expect(buildViewport().isCompact()).toBe(false);
  });

  it("starts compact on a window narrower than the breakpoint", () => {
    viewport = installFakeViewport(NARROW);

    expect(buildViewport().isCompact()).toBe(true);
  });

  it("starts roomy on a window wider than the breakpoint", () => {
    viewport = installFakeViewport(WIDE);

    expect(buildViewport().isCompact()).toBe(false);
  });

  it("compacts when the window is narrowed past the breakpoint", () => {
    viewport = installFakeViewport(WIDE);
    const service = buildViewport();

    viewport.setWidth(NARROW);

    expect(service.isCompact()).toBe(true);
  });

  it("opens back up when the window is widened again", () => {
    viewport = installFakeViewport(NARROW);
    const service = buildViewport();

    viewport.setWidth(WIDE);

    expect(service.isCompact()).toBe(false);
  });

  it("stops listening once its injector is gone", () => {
    viewport = installFakeViewport(NARROW);
    const service = buildViewport();

    TestBed.resetTestingModule();
    viewport.setWidth(WIDE);

    expect(service.isCompact()).toBe(true);
  });
});

describe("ViewportService's form factor", () => {
  let viewport: FakeViewport | null = null;

  function buildViewport(): ViewportService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(ViewportService);
  }

  afterEach(() => {
    viewport?.restore();
    viewport = null;
  });

  it("reads a desktop window as roomy", () => {
    viewport = installFakeViewport(1440, 900);

    expect(buildViewport().formFactor()).toBe("roomy");
  });

  it("reads a phone held upright as a phone in portrait", () => {
    viewport = installFakeViewport(390, 844);

    expect(buildViewport().formFactor()).toBe("phone-portrait");
  });

  it("reads a phone on its side as compact, though wider than the breakpoint", () => {
    viewport = installFakeViewport(844, 390);
    const service = buildViewport();

    expect([service.formFactor(), service.isCompact()]).toEqual([
      "phone-landscape",
      true,
    ]);
  });

  it("follows a phone as it turns", () => {
    viewport = installFakeViewport(390, 844);
    const service = buildViewport();

    viewport.setSize(844, 390);

    expect(service.formFactor()).toBe("phone-landscape");
  });

  it("reads a short window as roomy again once it is tall enough", () => {
    viewport = installFakeViewport(1280, 450);
    const service = buildViewport();

    viewport.setSize(1280, 800);

    expect(service.formFactor()).toBe("roomy");
  });
});
