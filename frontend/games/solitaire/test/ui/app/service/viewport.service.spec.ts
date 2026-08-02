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
   * A service built through the injector, so DestroyRef resolves and the
   * media-query listener is released with the test's injector.
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
