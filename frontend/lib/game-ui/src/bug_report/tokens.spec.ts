import { TestBed } from "@angular/core/testing";
import { type DrawPage, PAGE_DRAWER } from "@fz/ui/capture";
import { REPORT_PICTURE } from "./tokens";

/** A PNG of the page, as far as the report can tell. */
const PICTURE = new Blob(["png"], { type: "image/png" });

/**
 * Has the page's capture draw with `draw` in place of snapdom, which jsdom
 * can't run.
 */
function drawPagesWith(draw: DrawPage): void {
  TestBed.configureTestingModule({
    providers: [
      { provide: PAGE_DRAWER, useValue: () => Promise.resolve(draw) },
    ],
  });
}

/** Draws every page as {@link PICTURE}, encoded as a data URL. */
const drawPicture: DrawPage = () =>
  Promise.resolve({
    toCanvas: () =>
      Promise.resolve({
        toDataURL: () => `data:image/png;base64,${btoa("png")}`,
      }),
  });

describe("REPORT_PICTURE", () => {
  it("takes the page's picture, as the page's capture draws it", async () => {
    drawPagesWith(drawPicture);

    const picture = await TestBed.inject(REPORT_PICTURE)();

    expect(picture?.type).toBe(PICTURE.type);
    expect(await picture?.text()).toBe(await PICTURE.text());
  });

  it("takes none where the page can't be drawn", async () => {
    drawPagesWith(() => Promise.reject(new Error("The page is gone.")));

    const picture = await TestBed.inject(REPORT_PICTURE)();

    expect(picture).toBeNull();
  });
});
