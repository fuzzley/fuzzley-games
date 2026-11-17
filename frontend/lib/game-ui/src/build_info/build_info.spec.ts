import { TestBed } from "@angular/core/testing";
import { stampTags } from "@fz/dev/build-info";
import { BUILD_INFO, type BuildInfo } from "./build_info";

/** A build stamped with its commit and the time it ran. */
const STAMP: BuildInfo = {
  commit: "549c93a",
  buildTime: "2031-06-15T09:30:00.000Z",
};

/** Puts the meta tags `@fz/dev` stamps a game's page with into the page. */
function stampPage(stamp: BuildInfo): void {
  for (const { tag, attrs } of stampTags(stamp)) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs ?? {})) {
      element.setAttribute(name, String(value));
    }
    document.head.append(element);
  }
}

describe("BUILD_INFO", () => {
  afterEach(() => {
    for (const meta of document.head.querySelectorAll("meta")) meta.remove();
  });

  it("reads the stamp @fz/dev writes into a game's page", () => {
    stampPage(STAMP);

    expect(TestBed.inject(BUILD_INFO)).toEqual(STAMP);
  });

  it("is null where the page carries no stamp, as in a spec", () => {
    expect(TestBed.inject(BUILD_INFO)).toBeNull();
  });

  it("is null where the page carries half a stamp", () => {
    stampPage(STAMP);
    document.head.querySelector('meta[name="fz-build-time"]')?.remove();

    expect(TestBed.inject(BUILD_INFO)).toBeNull();
  });
});
