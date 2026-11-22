import { TestBed } from "@angular/core/testing";
import { REPORT_PICTURE } from "../bug_report/tokens";
import { provideReportPicture } from "./report_picture";

describe("provideReportPicture", () => {
  it("takes no picture unless given one", async () => {
    TestBed.configureTestingModule({ providers: [provideReportPicture()] });

    expect(await TestBed.inject(REPORT_PICTURE)()).toBeNull();
  });

  it("takes every picture as the one given", async () => {
    const picture = new Blob(["png"], { type: "image/png" });
    TestBed.configureTestingModule({
      providers: [provideReportPicture(picture)],
    });

    expect(await TestBed.inject(REPORT_PICTURE)()).toBe(picture);
  });
});
